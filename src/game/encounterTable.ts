import regionalVariantsData from "../data/regionalVariants.json";
import wildCreaturesData from "../data/wildCreatures.json";
import { RegionalVariantsFileSchema, WildCreaturesFileSchema } from "../data/schemas";
import {
  buildParticipant,
  buildStarterParticipant,
  otherStarterLines,
  randomWildLevel,
  type BattleParticipant,
  type StarterLineName,
} from "./creatureFactory";

const regionalVariants = RegionalVariantsFileSchema.parse(regionalVariantsData).regionalVariants;
const wildCreatures = WildCreaturesFileSchema.parse(wildCreaturesData).wildCreatures;

export interface EncounterOption {
  weight: number;
  build: (instanceId: string) => BattleParticipant;
}

export interface ZoneEncounterConfig {
  /** Center of the wild-level range for this zone/tier. */
  baseLevel: number;
  levelSpread?: number;
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
