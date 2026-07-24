import type { Creature } from "../engine/types";
import { NEUTRAL_STAT_STAGES } from "../engine/types";
import type { StatBlock, TypeName } from "../data/schemas";
import type { BattleParticipant } from "./creatureFactory";
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

export function partyMemberFromParticipant(
  participant: BattleParticipant,
  sourceCategory: PartySourceCategory
): PartyMember {
  return {
    uid: participant.creature.id,
    speciesId: participant.creature.speciesId,
    displayName: participant.displayName,
    types: participant.creature.types,
    level: participant.creature.level,
    xp: 0,
    baseStats: { ...participant.baseStats },
    currentHp: participant.creature.currentHp,
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
}

/**
 * Adds XP to a party member, applying as many level-ups as the XP covers.
 * On level-up, max HP grows (via the stat curve) and current HP grows by
 * the same amount — a partial top-up, not a full heal, since levelling up
 * mid-battle shouldn't erase damage already taken.
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

  const newMaxHp = effectiveStats(member.baseStats, level).hp;
  const hpGain = newMaxHp - prevMaxHp;

  return {
    member: {
      ...member,
      xp,
      level,
      currentHp: levelsGained > 0 ? Math.min(newMaxHp, member.currentHp + hpGain) : member.currentHp,
    },
    leveledUp: levelsGained > 0,
    newLevel: level,
    levelsGained,
  };
}

/** Direct +1 level (e.g. the Kinnie item) — same partial-HP-top-up rule as a level-up from XP. */
export function applyLevelUp(member: PartyMember): PartyMember {
  const prevMaxHp = effectiveStats(member.baseStats, member.level).hp;
  const newLevel = member.level + 1;
  const newMaxHp = effectiveStats(member.baseStats, newLevel).hp;
  const hpGain = newMaxHp - prevMaxHp;
  return {
    ...member,
    level: newLevel,
    currentHp: Math.min(newMaxHp, member.currentHp + hpGain),
  };
}
