export type CreatureDetailParams =
  | { source: "party"; uid: string }
  | { source: "species"; speciesId: string };

export type RootStackParamList = {
  Title: undefined;
  RegionSelect: undefined;
  StarterSelect: undefined;
  Home: undefined;
  Map: { zoneId: string };
  Battle: undefined;
  Party: undefined;
  Codex: undefined;
  Bag: undefined;
  Shop: undefined;
  CreatureDetail: CreatureDetailParams;
};
