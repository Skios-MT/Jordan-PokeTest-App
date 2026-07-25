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
import type { BiomeType } from "./mapData";

const regionalVariants = RegionalVariantsFileSchema.parse(regionalVariantsData).regionalVariants;
const wildCreatures = WildCreaturesFileSchema.parse(wildCreaturesData).wildCreatures;
const legendaries = LegendariesFileSchema.parse(legendariesData).legendaries;

/** legendaries.json only carries a flavor `signatureMove` name, not a real moveset — these are
 * the closest-fit moves from the actual move pool (src/data/moves.json), same placeholder
 * approach as the regional variants' movesets. */
const LEGENDARY_MOVE_IDS: Record<string, string[]> = {
  aegilord: ["metal_claw", "tackle"],
  megalithos: ["rock_throw", "tackle"],
  siroccus: ["sand_blast", "tackle"],
};

/** Vanishingly rare relative to the rest of any biome's table (a single wild creature alone
 * outweighs all three legendaries combined) — this is the "you might see one, once in a long
 * while" tier, and unlike everything else here it's available from every biome rather than
 * being biome-locked, since there are only three of them across the whole game. */
const LEGENDARY_ENCOUNTER_WEIGHT = 0.3;

/** Which starter line's "other starter" wild encounter fits which biome, by loose elemental
 * association. Fire has no dedicated biome of its own, so it's paired with Rock (volcanic/
 * mountain flavor) rather than appearing everywhere. */
const STARTER_LINE_BIOME: Record<StarterLineName, BiomeType> = {
  Grass: "grass",
  Water: "water",
  Fire: "rock",
};

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
 * Weighted wild-encounter pool for one specific biome tile (see mapData.ts's BiomeType) — each
 * biome only spawns wildCreatures.json/regionalVariants.json entries tagged with that exact
 * biome, so a Rock tile and a Water tile in the same zone (or in different zones) draw from
 * genuinely different species, not one shared list with only the level range shifting. The three
 * legendaries remain a vanishingly rare universal layer on top of every biome (see
 * LEGENDARY_ENCOUNTER_WEIGHT) rather than being biome-locked themselves, since there are too few
 * of them to meaningfully split four ways.
 */
export function buildBiomeEncounterTable(
  biome: BiomeType,
  playerLine: StarterLineName,
  config: ZoneEncounterConfig
): EncounterOption[] {
  const { baseLevel, levelSpread = 3 } = config;
  const table: EncounterOption[] = [];

  for (const wc of wildCreatures) {
    if (wc.biome !== biome) continue;
    table.push({
      weight: 5,
      build: (id) =>
        buildParticipant(id, wc.id, wc.name, wc.types, wc.baseStats, randomWildLevel(baseLevel, levelSpread), wc.moveIds),
    });
  }

  for (const line of otherStarterLines(playerLine)) {
    if (STARTER_LINE_BIOME[line] !== biome) continue;
    table.push({
      weight: 3,
      build: (id) => buildStarterParticipant(line, randomWildLevel(baseLevel, levelSpread), id),
    });
  }

  for (const rv of regionalVariants) {
    if (rv.biome !== biome) continue;
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
