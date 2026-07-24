import startersData from "../data/starters.json";
import { StartersFileSchema, type StarterLine } from "../data/schemas";
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

  const creature: Creature = {
    id: instanceId,
    speciesId: stageOne.id,
    level,
    types: stageOne.types,
    stats: { ...starterLine.baseStatsFinal },
    statStages: { ...NEUTRAL_STAT_STAGES },
    currentHp: starterLine.baseStatsFinal.hp,
    status: "none",
    flinched: false,
    activeEffects: [],
  };

  return {
    creature,
    moveIds: STARTER_MOVESETS[line],
    displayName: stageOne.name,
  };
}

export function getStarterStageOne(line: StarterLineName) {
  return getStarterLine(line).stages[0];
}

export function otherStarterLines(line: StarterLineName): StarterLineName[] {
  return (["Grass", "Fire", "Water"] as StarterLineName[]).filter((l) => l !== line);
}

export const ALL_STARTER_LINES = starters.map((s) => s.line);
