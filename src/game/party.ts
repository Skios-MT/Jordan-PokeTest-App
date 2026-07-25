import type { Creature } from "../engine/types";
import { NEUTRAL_STAT_STAGES } from "../engine/types";
import type { StatBlock, TypeName } from "../data/schemas";
import type { BattleParticipant } from "./creatureFactory";
import { checkEvolution, defaultDisplayNameForSpecies } from "./creatureFactory";
import { effectiveStats, xpToNextLevel } from "./progression";

export type PartySourceCategory = "starter" | "regional" | "wild";

export interface PartyMember {
  uid: string;
  speciesId: string;
  displayName: string;
  types: TypeName[];
  level: number;
  xp: number;
  /** Species reference stats (unscaled) — use effectiveStats()/partyMemberStats() for battle-ready numbers. */
  baseStats: StatBlock;
  currentHp: number;
  moveIds: string[];
  sourceCategory: PartySourceCategory;
}

/** Describes an evolution that just happened, for the UI to play a reveal animation. */
export interface EvolutionReveal {
  oldSpeciesId: string;
  oldDisplayName: string;
  oldTypes: TypeName[];
  newSpeciesId: string;
  newDisplayName: string;
  newTypes: TypeName[];
}

interface EvolutionChainResult {
  speciesId: string;
  displayName: string;
  types: TypeName[];
  baseStats: StatBlock;
  evolution: EvolutionReveal | null;
}

/**
 * Repeatedly applies checkEvolution starting from (speciesId, displayName, types, baseStats) at
 * the given level, in case a big level jump crosses more than one evolution threshold at once —
 * the reveal (if any) always describes the true starting form -> the true final form, skipping
 * over an intermediate stage's reveal rather than playing one per hop.
 *
 * A custom nickname (displayName no longer matching the current stage's own default name) is
 * preserved through evolution rather than overwritten — only an un-nicknamed member's displayName
 * follows the species name, matching how nicknames survive evolution in the mainline games.
 */
function resolveEvolutionChain(
  speciesId: string,
  displayName: string,
  types: TypeName[],
  baseStats: StatBlock,
  level: number
): EvolutionChainResult {
  const wasDefaultName = defaultDisplayNameForSpecies(speciesId) === displayName;
  const startSpeciesId = speciesId;
  const startDisplayName = displayName;
  const startTypes = types;
  let evolved = false;

  for (;;) {
    const candidate = checkEvolution(speciesId, level);
    if (!candidate) break;
    speciesId = candidate.nextSpeciesId;
    types = candidate.nextTypes;
    baseStats = candidate.nextBaseStats;
    if (wasDefaultName) displayName = candidate.nextName;
    evolved = true;
  }

  return {
    speciesId,
    displayName,
    types,
    baseStats,
    evolution: evolved
      ? {
          oldSpeciesId: startSpeciesId,
          oldDisplayName: startDisplayName,
          oldTypes: startTypes,
          newSpeciesId: speciesId,
          newDisplayName: displayName,
          newTypes: types,
        }
      : null,
  };
}

export function partyMemberFromParticipant(
  participant: BattleParticipant,
  sourceCategory: PartySourceCategory
): PartyMember {
  const level = participant.creature.level;
  // Silently pre-evolve on creation — relevant for a caught wild "other starter line" encounter
  // already above its evolution threshold; a starter itself always begins well below every
  // line's first threshold, so this is a no-op there. No reveal animation plays here: the
  // creature already *is* whatever stage its level warrants, there's nothing to "transform" from.
  const resolved = resolveEvolutionChain(
    participant.creature.speciesId,
    participant.displayName,
    participant.creature.types,
    participant.baseStats,
    level
  );
  // currentHp on the incoming participant may already be partial (a wild creature caught
  // mid-battle, HP down from the fight) — a pre-evolution here must carry that damage forward
  // proportionally (same partial-top-up rule as a normal level-up), not silently top it back up.
  const oldMaxHp = effectiveStats(participant.baseStats, level).hp;
  const newMaxHp = effectiveStats(resolved.baseStats, level).hp;
  const currentHp = resolved.evolution
    ? Math.min(newMaxHp, participant.creature.currentHp + (newMaxHp - oldMaxHp))
    : participant.creature.currentHp;
  return {
    uid: participant.creature.id,
    speciesId: resolved.speciesId,
    displayName: resolved.displayName,
    types: resolved.types,
    level,
    xp: 0,
    baseStats: { ...resolved.baseStats },
    currentHp,
    moveIds: participant.moveIds,
    sourceCategory,
  };
}

/** Level-scaled effective stats for a party member (see progression.ts). */
export function partyMemberStats(member: PartyMember): StatBlock {
  return effectiveStats(member.baseStats, member.level);
}

/** Rebuilds a battle-ready engine Creature from a persisted party member. */
export function creatureFromPartyMember(member: PartyMember): Creature {
  const stats = partyMemberStats(member);
  return {
    id: member.uid,
    speciesId: member.speciesId,
    level: member.level,
    types: member.types,
    stats,
    statStages: { ...NEUTRAL_STAT_STAGES },
    currentHp: Math.min(member.currentHp, stats.hp),
    status: "none",
    flinched: false,
    activeEffects: [],
  };
}

export interface LevelUpResult {
  member: PartyMember;
  leveledUp: boolean;
  newLevel: number;
  levelsGained: number;
  /** Set when this level-up crossed a starter's evolvesAtLevel threshold — the UI should play an
   * evolution reveal before (or alongside) the usual level-up stat comparison. */
  evolution: EvolutionReveal | null;
}

/**
 * Adds XP to a party member, applying as many level-ups as the XP covers.
 * On level-up, max HP grows (via the stat curve) and current HP grows by
 * the same amount — a partial top-up, not a full heal, since levelling up
 * mid-battle shouldn't erase damage already taken. If the new level crosses
 * an evolution threshold, species/types/baseStats update too (see
 * resolveEvolutionChain) before the new max HP is computed, so the HP gain
 * reflects the evolved form's stats, not the pre-evolution ones.
 */
export function addExperience(member: PartyMember, xpGained: number): LevelUpResult {
  let xp = member.xp + xpGained;
  let level = member.level;
  let levelsGained = 0;
  const prevMaxHp = effectiveStats(member.baseStats, level).hp;

  while (xp >= xpToNextLevel(level)) {
    xp -= xpToNextLevel(level);
    level += 1;
    levelsGained += 1;
  }

  const resolved = resolveEvolutionChain(member.speciesId, member.displayName, member.types, member.baseStats, level);
  const newMaxHp = effectiveStats(resolved.baseStats, level).hp;
  const hpGain = newMaxHp - prevMaxHp;

  return {
    member: {
      ...member,
      xp,
      level,
      speciesId: resolved.speciesId,
      displayName: resolved.displayName,
      types: resolved.types,
      baseStats: resolved.baseStats,
      currentHp: levelsGained > 0 ? Math.min(newMaxHp, member.currentHp + hpGain) : member.currentHp,
    },
    leveledUp: levelsGained > 0,
    newLevel: level,
    levelsGained,
    evolution: resolved.evolution,
  };
}

export interface DirectLevelUpResult {
  member: PartyMember;
  evolution: EvolutionReveal | null;
}

/** Direct +1 level (e.g. the Kinnie item) — same partial-HP-top-up and evolution-check rules as
 * a level-up from XP (see addExperience). */
export function applyLevelUp(member: PartyMember): DirectLevelUpResult {
  const prevMaxHp = effectiveStats(member.baseStats, member.level).hp;
  const newLevel = member.level + 1;
  const resolved = resolveEvolutionChain(member.speciesId, member.displayName, member.types, member.baseStats, newLevel);
  const newMaxHp = effectiveStats(resolved.baseStats, newLevel).hp;
  const hpGain = newMaxHp - prevMaxHp;
  return {
    member: {
      ...member,
      level: newLevel,
      speciesId: resolved.speciesId,
      displayName: resolved.displayName,
      types: resolved.types,
      baseStats: resolved.baseStats,
      currentHp: Math.min(newMaxHp, member.currentHp + hpGain),
    },
    evolution: resolved.evolution,
  };
}
