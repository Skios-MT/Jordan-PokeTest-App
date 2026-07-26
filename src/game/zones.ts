import { getMap } from "./mapData";

export interface ZoneEncounterSettings {
  baseLevel: number;
  levelSpread?: number;
  /** Hard floor for the ultra-rare legendary encounter in this zone — always well above the
   * zone's normal wild-level range, and higher again in each later zone. */
  legendaryMinLevel: number;
}

/** The further along the chain a zone is, the higher its wild-level range. */
const ZONE_ENCOUNTER_SETTINGS: Record<string, ZoneEncounterSettings> = {
  melita_woods: { baseLevel: 4, levelSpread: 2, legendaryMinLevel: 25 },
  luzzu_harbour: { baseLevel: 10, levelSpread: 3, legendaryMinLevel: 32 },
  azure_caverns: { baseLevel: 17, levelSpread: 3, legendaryMinLevel: 40 },
  ramla_dunes: { baseLevel: 24, levelSpread: 4, legendaryMinLevel: 48 },
};

const DEFAULT_SETTINGS: ZoneEncounterSettings = { baseLevel: 4, levelSpread: 2, legendaryMinLevel: 25 };

export function getZoneEncounterSettings(zoneId: string): ZoneEncounterSettings {
  return ZONE_ENCOUNTER_SETTINGS[zoneId] ?? DEFAULT_SETTINGS;
}

export function getZoneName(zoneId: string): string {
  return getMap(zoneId).zoneName;
}
