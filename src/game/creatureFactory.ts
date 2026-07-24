import startersData from "../data/starters.json";
import { StartersFileSchema, type StarterLine, type StatBlock, type TypeName } from "../data/schemas";
import type { Creature } from "../engine/types";
import { NEUTRAL_STAT_STAGES } from "../engine/types";
import { STARTER_MOVESETS } from "./movesRepo";

const starters = StartersFileSchema.parse(startersData).starters;

export type StarterLineName = "Grass" | "Fire" | "Water";

/** Fixed demo level for the vertical slice — no XP/leveling system is wired up yet. */
export const DEMO_BATTLE_LEVEL = 12;

export interface BattleParticipant {
  creature: Creature;
  moveIds: string[];
  displayName: string;
}

/** Shared Creature-construction path for anything battle-ready: starters, regional variants, wild species. */
export function buildParticipant(
  instanceId: string,
  speciesId: string,
  displayName: string,
  types: TypeName[],
  stats: StatBlock,
  level: number,
  moveIds: string[]
): BattleParticipant {
  const creature: Creature = {
    id: instanceId,
    speciesId,
    level,
    types,
    stats: { ...stats },
    statStages: { ...NEUTRAL_STAT_STAGES },
    currentHp: stats.hp,
    status: "none",
    flinched: false,
    activeEffects: [],
  };
  return { creature, moveIds, displayName };
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
 * As a placeholder pending a real level/stat-growth curve, this reuses the
 * line's baseStatsFinal directly rather than inventing new "canon" numbers.
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

export const ALL_STARTER_LINES = starters.map((s) => s.line);
