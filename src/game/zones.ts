import { getMap } from "./mapData";

export interface ZoneEncounterSettings {
  baseLevel: number;
  levelSpread?: number;
}

/** The further along the chain a zone is, the higher its wild-level range. */
const ZONE_ENCOUNTER_SETTINGS: Record<string, ZoneEncounterSettings> = {
  melita_woods: { baseLevel: 4, levelSpread: 2 },
  luzzu_harbour: { baseLevel: 10, levelSpread: 3 },
  azure_caverns: { baseLevel: 17, levelSpread: 3 },
};

const DEFAULT_SETTINGS: ZoneEncounterSettings = { baseLevel: 4, levelSpread: 2 };

export function getZoneEncounterSettings(zoneId: string): ZoneEncounterSettings {
  return ZONE_ENCOUNTER_SETTINGS[zoneId] ?? DEFAULT_SETTINGS;
}

export function getZoneName(zoneId: string): string {
  return getMap(zoneId).zoneName;
}
