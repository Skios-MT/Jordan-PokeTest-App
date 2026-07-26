import type { Creature, Move } from "../types";
import { NEUTRAL_STAT_STAGES } from "../types";
import type { TypeName } from "../../data/schemas";

export function makeCreature(overrides: Partial<Creature> = {}): Creature {
  return {
    id: "creature",
    speciesId: "test_species",
    level: 50,
    types: ["Water"],
    stats: { hp: 100, atk: 80, def: 80, spatk: 80, spdef: 80, speed: 80 },
    statStages: { ...NEUTRAL_STAT_STAGES },
    currentHp: 100,
    status: "none",
    flinched: false,
    activeEffects: [],
    ...overrides,
  };
}

export function makeMove(overrides: Partial<Move> = {}): Move {
  return {
    id: "test_move",
    name: "Test Move",
    type: "Water" as TypeName,
    category: "physical",
    power: 80,
    accuracy: 100,
    basePriority: 0,
    ...overrides,
  };
}
