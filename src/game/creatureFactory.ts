import startersData from "../data/starters.json";
import { StartersFileSchema, type StarterLine, type StatBlock, type TypeName } from "../data/schemas";
import type { Creature } from "../engine/types";
import { NEUTRAL_STAT_STAGES } from "../engine/types";
import { STARTER_MOVESETS } from "./movesRepo";
import { effectiveStats } from "./progression";

const starters = StartersFileSchema.parse(startersData).starters;

export type StarterLineName = "Grass" | "Fire" | "Water";

/** Every starter begins at this level (spec: "Every Starter begins at level 5"). */
export const STARTER_STARTING_LEVEL = 5;

export interface BattleParticipant {
  creature: Creature;
  moveIds: string[];
  displayName: string;
  /** Species reference stats (unscaled) — carried forward so a catch can persist the true base, not the level-scaled numbers. */
  baseStats: StatBlock;
}

/** Shared Creature-construction path for anything battle-ready: starters, regional variants, wild species. */
export function buildParticipant(
  instanceId: string,
  speciesId: string,
  displayName: string,
  types: TypeName[],
  baseStats: StatBlock,
  level: number,
  moveIds: string[]
): BattleParticipant {
  const stats = effectiveStats(baseStats, level);
  const creature: Creature = {
    id: instanceId,
    speciesId,
    level,
    types,
    stats,
    statStages: { ...NEUTRAL_STAT_STAGES },
    currentHp: stats.hp,
    status: "none",
    flinched: false,
    activeEffects: [],
  };
  return { creature, moveIds, displayName, baseStats: { ...baseStats } };
}

function getStarterLine(line: StarterLineName): StarterLine {
  const found = starters.find((s) => s.line === line);
  if (!found) throw new Error(`Unknown starter line: ${line}`);
  return found;
}

/** Builds a battle-ready stage-1 starter at the given level. Levels above the stage's own
 * evolvesAtLevel are handled separately by party.ts, which silently pre-evolves a freshly-built
 * PartyMember to whatever stage its level actually warrants (relevant for a caught wild "other
 * starter line" encounter above the evolution threshold — a starter always begins at
 * STARTER_STARTING_LEVEL, well below every line's first threshold, so this never applies there). */
export function buildStarterParticipant(
  line: StarterLineName,
  level: number,
  instanceId: string
): BattleParticipant {
  const starterLine = getStarterLine(line);
  const stageOne = starterLine.stages[0];
  return buildParticipant(instanceId, stageOne.id, stageOne.name, stageOne.types, stageOne.baseStats, level, STARTER_MOVESETS[line]);
}

export function getStarterStageOne(line: StarterLineName) {
  return getStarterLine(line).stages[0];
}

export interface EvolutionCandidate {
  nextSpeciesId: string;
  nextName: string;
  nextTypes: TypeName[];
  nextBaseStats: StatBlock;
}

/** Finds which starter line/stage a speciesId belongs to, if any — non-starter species (every
 * wild creature, regional variant, and legendary) never evolve, since only starters.json carries
 * stage/evolvesAtLevel data. */
function findStarterStage(speciesId: string): { line: StarterLine; stageIndex: number } | null {
  for (const line of starters) {
    const stageIndex = line.stages.findIndex((s) => s.id === speciesId);
    if (stageIndex !== -1) return { line, stageIndex };
  }
  return null;
}

/** The stage's own default display name (used to detect whether a party member has been given a
 * custom nickname — if its displayName no longer matches this, evolution must not overwrite it). */
export function defaultDisplayNameForSpecies(speciesId: string): string | null {
  const found = findStarterStage(speciesId);
  return found ? found.line.stages[found.stageIndex].name : null;
}

/** Returns the next evolution stage for a species at the given level, or null if it doesn't
 * evolve here — a non-starter species, an already-final stage, or a level below the threshold.
 * Callers should loop this (see party.ts) since a large level jump can cross more than one
 * threshold at once. */
export function checkEvolution(speciesId: string, level: number): EvolutionCandidate | null {
  const found = findStarterStage(speciesId);
  if (!found) return null;
  const { line, stageIndex } = found;
  const currentStage = line.stages[stageIndex];
  if (currentStage.evolvesAtLevel === null || level < currentStage.evolvesAtLevel) return null;
  const nextStage = line.stages[stageIndex + 1];
  if (!nextStage) return null;
  return {
    nextSpeciesId: nextStage.id,
    nextName: nextStage.name,
    nextTypes: nextStage.types,
    nextBaseStats: nextStage.baseStats,
  };
}

export function otherStarterLines(line: StarterLineName): StarterLineName[] {
  return (["Grass", "Fire", "Water"] as StarterLineName[]).filter((l) => l !== line);
}

/** Picks a random wild-encounter line so the same starter choice doesn't always face the same opponent. */
export function randomOtherStarterLine(line: StarterLineName): StarterLineName {
  const options = otherStarterLines(line);
  return options[Math.floor(Math.random() * options.length)];
}

/** Wild-encounter level with +/- spread around a base, floored at 1. */
export function randomWildLevel(baseLevel: number, spread = 3): number {
  const offset = Math.floor(Math.random() * (spread * 2 + 1)) - spread;
  return Math.max(1, baseLevel + offset);
}

/** Like randomWildLevel, but only ever rolls upward from a hard floor — used for the rare
 * legendary encounter, which should never dip below its zone's minimum level. */
export function randomLevelAtLeast(minLevel: number, spread = 5): number {
  return minLevel + Math.floor(Math.random() * (spread + 1));
}

export const ALL_STARTER_LINES = starters.map((s) => s.line);
