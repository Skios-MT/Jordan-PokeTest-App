import regionalVariantsData from "../data/regionalVariants.json";
import wildCreaturesData from "../data/wildCreatures.json";
import { RegionalVariantsFileSchema, WildCreaturesFileSchema } from "../data/schemas";
import {
  buildParticipant,
  buildStarterParticipant,
  otherStarterLines,
  randomWildLevel,
  DEMO_BATTLE_LEVEL,
  type BattleParticipant,
  type StarterLineName,
} from "./creatureFactory";

const regionalVariants = RegionalVariantsFileSchema.parse(regionalVariantsData).regionalVariants;
const wildCreatures = WildCreaturesFileSchema.parse(wildCreaturesData).wildCreatures;

export const ENEMY_BASE_LEVEL = Math.max(1, DEMO_BATTLE_LEVEL - 2);

export interface EncounterOption {
  weight: number;
  build: (instanceId: string) => BattleParticipant;
}

/**
 * Melita's only implemented zone so far. Weighted so the zone's own wild
 * species (Fossary) is common, an "other starter line" wild encounter is
 * uncommon, and the regional variants are rare — there's no real per-zone
 * spawn table yet (spec 2.2's "seasonal spawn table" isn't built), this is
 * a single flat table standing in for it.
 */
export function buildMelitaWoodsEncounterTable(playerLine: StarterLineName): EncounterOption[] {
  const table: EncounterOption[] = [];

  for (const wc of wildCreatures) {
    table.push({
      weight: 5,
      build: (id) => buildParticipant(id, wc.id, wc.name, wc.types, wc.baseStats, randomWildLevel(ENEMY_BASE_LEVEL), wc.moveIds),
    });
  }

  for (const line of otherStarterLines(playerLine)) {
    table.push({
      weight: 3,
      build: (id) => buildStarterParticipant(line, randomWildLevel(ENEMY_BASE_LEVEL), id),
    });
  }

  for (const rv of regionalVariants) {
    table.push({
      weight: 1,
      build: (id) =>
        buildParticipant(id, rv.id, rv.name, rv.types, rv.baseStats, randomWildLevel(ENEMY_BASE_LEVEL), rv.moveIds),
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
