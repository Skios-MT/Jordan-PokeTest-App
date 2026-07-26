import type { BiomeType } from "../game/mapData";

export type CreatureDetailParams =
  | { source: "party"; uid: string }
  | { source: "species"; speciesId: string };

export type RootStackParamList = {
  Title: undefined;
  NameEntry: undefined;
  RegionSelect: undefined;
  StarterQuiz: undefined;
  StarterSelect: undefined;
  Home: undefined;
  /** startAt overrides the zone's default playerStart — used when walking back into a zone via
   * its entrance tile, so the player lands exactly where they left it (the exit tile they used). */
  Map: { zoneId: string; startAt?: { row: number; col: number } };
  Battle: { biome: BiomeType };
  Party: undefined;
  Codex: undefined;
  Bag: undefined;
  Shop: undefined;
  Help: undefined;
  CreatureDetail: CreatureDetailParams;
};
