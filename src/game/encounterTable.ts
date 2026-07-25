import regionalVariantsData from "../data/regionalVariants.json";
import wildCreaturesData from "../data/wildCreatures.json";
import legendariesData from "../data/legendaries.json";
import { RegionalVariantsFileSchema, WildCreaturesFileSchema, LegendariesFileSchema } from "../data/schemas";
import {
  buildParticipant,
  buildStarterParticipant,
  otherStarterLines,
  randomWildLevel,
  randomLevelAtLeast,
  type BattleParticipant,
  type StarterLineName,
} from "./creatureFactory";

const regionalVariants = RegionalVariantsFileSchema.parse(regionalVariantsData).regionalVariants;
const wildCreatures = WildCreaturesFileSchema.parse(wildCreaturesData).wildCreatures;
const legendaries = LegendariesFileSchema.parse(legendariesData).legendaries;

/** legendaries.json only carries a flavor `signatureMove` name, not a real moveset — these are
 * the closest-fit moves from the actual move pool (src/data/moves.json), same placeholder
 * approach as the regional variants' movesets. */
const LEGENDARY_MOVE_IDS: Record<string, string[]> = {
  aegilord: ["metal_claw", "tackle"],
  megalithos: ["rock_throw", "tackle"],
  siroccus: ["rock_throw", "tackle"],
};

/** Vanishingly rare relative to the rest of the table (a single wild creature alone outweighs
 * all three legendaries combined) — this is the "you might see one, once in a long while" tier. */
const LEGENDARY_ENCOUNTER_WEIGHT = 0.3;

export interface EncounterOption {
  weight: number;
  build: (instanceId: string) => BattleParticipant;
}

export interface ZoneEncounterConfig {
  /** Center of the wild-level range for this zone/tier. */
  baseLevel: number;
  levelSpread?: number;
  /** Hard floor for the ultra-rare legendary encounter — see zones.ts. */
  legendaryMinLevel: number;
}

/**
 * Weighted wild-encounter pool for a zone: the zone's own wild species
 * (Fossary) is common, an "other starter line" wild encounter is uncommon,
 * and the regional variants are rare — there's no real per-zone species
 * pool yet (spec 2.2's "seasonal spawn table" isn't built), every zone
 * draws from the same species list and only the level range shifts by tier.
 */
export function buildZoneEncounterTable(
  playerLine: StarterLineName,
  config: ZoneEncounterConfig
): EncounterOption[] {
  const { baseLevel, levelSpread = 3 } = config;
  const table: EncounterOption[] = [];

  for (const wc of wildCreatures) {
    table.push({
      weight: 5,
      build: (id) =>
        buildParticipant(id, wc.id, wc.name, wc.types, wc.baseStats, randomWildLevel(baseLevel, levelSpread), wc.moveIds),
    });
  }

  for (const line of otherStarterLines(playerLine)) {
    table.push({
      weight: 3,
      build: (id) => buildStarterParticipant(line, randomWildLevel(baseLevel, levelSpread), id),
    });
  }

  for (const rv of regionalVariants) {
    table.push({
      weight: 1,
      build: (id) =>
        buildParticipant(id, rv.id, rv.name, rv.types, rv.baseStats, randomWildLevel(baseLevel, levelSpread), rv.moveIds),
    });
  }

  for (const legend of legendaries) {
    table.push({
      weight: LEGENDARY_ENCOUNTER_WEIGHT,
      build: (id) =>
        buildParticipant(
          id,
          legend.id,
          legend.name,
          legend.types,
          legend.baseStats,
          randomLevelAtLeast(config.legendaryMinLevel),
          LEGENDARY_MOVE_IDS[legend.id]
        ),
    });
  }

  return table;
}

/** Weighted random pick from an encounter table. */
export function rollEncounter(table: EncounterOption[], instanceId: string): BattleParticipant {
  const totalWeight = table.reduce((sum, o) => sum + o.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const option of table) {
    if (roll < option.weight) return option.build(instanceId);
    roll -= option.weight;
  }
  return table[table.length - 1].build(instanceId);
}
