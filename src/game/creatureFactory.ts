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

/**
 * Builds a battle-ready stage-1 starter at the given level.
 *
 * Note: starters.json (spec 3.1) only defines stats for the final evolution
 * stage, not stage 1 — there's no per-stage stat block in the source data.
 * As a placeholder pending real per-stage numbers, this treats the line's
 * baseStatsFinal as the species' scaling reference rather than inventing
 * new "canon" numbers; progression.ts's effectiveStats() scales it by level.
 */
export function buildStarterParticipant(
  line: StarterLineName,
  level: number,
  instanceId: string
): BattleParticipant {
  const starterLine = getStarterLine(line);
  const stageOne = starterLine.stages[0];
  return buildParticipant(
    instanceId,
    stageOne.id,
    stageOne.name,
    stageOne.types,
    starterLine.baseStatsFinal,
    level,
    STARTER_MOVESETS[line]
  );
}

export function getStarterStageOne(line: StarterLineName) {
  return getStarterLine(line).stages[0];
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
