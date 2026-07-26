/** The four terrain types that can trigger a wild encounter — each zone mixes at least two of
 * these, and each biome draws from its own themed wild-creature pool (see encounterTable.ts). */
export type BiomeType = "grass" | "rock" | "water" | "sand";

export const BIOME_TYPES: BiomeType[] = ["grass", "rock", "water", "sand"];

export type TileType = "tree" | "path" | "entrance" | "exit" | "heal" | BiomeType;

export interface TileMap {
  zoneId: string;
  zoneName: string;
  rows: TileType[][];
  playerStart: { row: number; col: number };
  /** Zone id the exit tile leads to, or null if this is the current end of the line. */
  exitTo: string | null;
  /** Zone id the entrance tile leads back to, or null for the very first zone. */
  previousZoneId: string | null;
}

const LEGEND: Record<string, TileType> = {
  T: "tree",
  ".": "path",
  G: "grass",
  R: "rock",
  W: "water",
  S: "sand",
  P: "entrance", // player start tile — walking back onto it returns to the previous zone
  E: "exit",
  H: "heal", // Healing Center — walkable, fully revives KO'd party members on entry
};

function parseMap(
  raw: string[],
  zoneId: string,
  zoneName: string,
  exitTo: string | null,
  previousZoneId: string | null
): TileMap {
  const width = raw[0]?.length ?? 0;
  for (const rowStr of raw) {
    if (rowStr.length !== width) {
      throw new Error(`Map "${zoneId}": all rows must be the same length (expected ${width}, got ${rowStr.length})`);
    }
  }
  let playerStart = { row: 0, col: 0 };
  const rows: TileType[][] = raw.map((rowStr, rowIndex) =>
    rowStr.split("").map((ch, colIndex) => {
      if (ch === "P") playerStart = { row: rowIndex, col: colIndex };
      const tile = LEGEND[ch];
      if (!tile) throw new Error(`Unknown map legend character: "${ch}"`);
      return tile;
    })
  );
  return { zoneId, zoneName, rows, playerStart, exitTo, previousZoneId };
}

/**
 * Four hand-authored zones chained in a line (spec: "each map has one exit and one entrance"),
 * not the full node-graph-of-many-zones world from section 2.1 — just enough to demonstrate
 * walking from a weaker zone into progressively stronger ones. Each zone mixes at least two
 * biome tile types (see BiomeType above), each with its own themed wild-encounter pool
 * (encounterTable.ts) rather than one shared pool for the whole game.
 *
 * Each zone is a distinct irregular shape/size (not a uniform square) — trees carve the outer
 * silhouette as well as blocking movement, so the walkable footprint itself reads as an organic
 * blob, a pier, a winding cave, or a dune atoll rather than a plain rectangle. All rows in a
 * given raw array must still be equal length (a rectangular char grid), but the walkable area
 * inside it doesn't have to be. Connectivity from the entrance to every biome tile, the Healing
 * Center, and the exit (where one exists) was verified with a throwaway BFS script, not asserted
 * at runtime.
 */
const MELITA_WOODS_RAW = [
  "TTTTTTTTTTTTTTT",
  "TTTTTTT.TTTTTTT",
  "TTTTTT...TTTTTT",
  "TTTTT..R..TTTTT",
  "TTTT..RRR..TTTT",
  "TTT..RRGRR..TTT",
  "TT..RRGGGRR..TT",
  "TPHRRGGGGGRR.ET",
  "TT..RRGGGRR..TT",
  "TTT..RRGRR..TTT",
  "TTTT..RRR..TTTT",
  "TTTTT..R..TTTTT",
  "TTTTTT...TTTTTT",
  "TTTTTTT.TTTTTTT",
  "TTTTTTTTTTTTTTT",
];

const LUZZU_HARBOUR_RAW = [
  "TTTTTTTTTTTTTTTTTTTTT",
  "T..........TTTTTTTTTT",
  "T..........TTTTTTTTTT",
  "T..WWWSS...TTTTTTTTTT",
  "T..WWWSS...TTTTTTTTTT",
  "TPHWWWSS............E",
  "T..WWWSS...TTTTTTTTTT",
  "T..WWWSS...TTTTTTTTTT",
  "T..........TTTTTTTTTT",
  "T..........TTTTTTTTTT",
  "TTTTTTTTTTTTTTTTTTTTT",
];

const AZURE_CAVERNS_RAW = [
  "TTTTTTTTTTTTT",
  "THP.TTTTTTTTT",
  "TRR.TTTTTTTTT",
  "T.....W.TTTTT",
  "TTTTT...TTTTT",
  "TTTTT.R.TTTTT",
  "TTTTT.R.TTTTT",
  "TTT.....TTTTT",
  "TTT.W.TTTTTTT",
  "TTT.W.TTTTTTT",
  "TTT.W.TTTTTTT",
  "TTT...R.R.TTT",
  "TTTTTTT.W.TTT",
  "TTTTTTT.W.TTT",
  "TTTTTTT.W.TTT",
  "TTT.......TTT",
  "TTTRR.TTTTTTT",
  "TTT.E.TTTTTTT",
  "TTTTTTTTTTTTT",
];

const RAMLA_DUNES_RAW = [
  "TTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTT...S...TTTTTTT",
  "TTTT.SSSSSSGGGGG.TTTT",
  "TT.SSSSSSSSGGGGGGG.TT",
  "T.SSSSSSSSSGGGGGGGG.T",
  "T.SSSSSSSSSGGGGGGGG.T",
  "TPHSSSSSSSSGGGGGGGGGT",
  "T.SSSSSSSSSGGGGGGGG.T",
  "T.SSSSSSSSSGGGGGGGG.T",
  "TT.SSSSSSSSGGGGGGG.TT",
  "TTTT.SSSSSSGGGGG.TTTT",
  "TTTTTTT...S...TTTTTTT",
  "TTTTTTTTTTTTTTTTTTTTT",
];

export const MAPS: Record<string, TileMap> = {
  melita_woods: parseMap(MELITA_WOODS_RAW, "melita_woods", "Melita Woods", "luzzu_harbour", null),
  luzzu_harbour: parseMap(LUZZU_HARBOUR_RAW, "luzzu_harbour", "Luzzu Harbour", "azure_caverns", "melita_woods"),
  azure_caverns: parseMap(AZURE_CAVERNS_RAW, "azure_caverns", "Azure Caverns", "ramla_dunes", "luzzu_harbour"),
  ramla_dunes: parseMap(RAMLA_DUNES_RAW, "ramla_dunes", "Ramla Dunes", null, "azure_caverns"),
};

export function getMap(zoneId: string): TileMap {
  const map = MAPS[zoneId];
  if (!map) throw new Error(`Unknown zone id: "${zoneId}"`);
  return map;
}

export function tileAt(map: TileMap, row: number, col: number): TileType | undefined {
  return map.rows[row]?.[col];
}

export function isWalkable(map: TileMap, row: number, col: number): boolean {
  return tileAt(map, row, col) !== undefined && tileAt(map, row, col) !== "tree";
}

/** Which biome tile (if any) this position is — used both to trigger an encounter and to pick
 * that biome's themed wild-creature pool (see encounterTable.ts). */
export function biomeAt(map: TileMap, row: number, col: number): BiomeType | null {
  const tile = tileAt(map, row, col);
  return tile && (BIOME_TYPES as string[]).includes(tile) ? (tile as BiomeType) : null;
}

export function isEncounterTile(map: TileMap, row: number, col: number): boolean {
  return biomeAt(map, row, col) !== null;
}

export function isExitTile(map: TileMap, row: number, col: number): boolean {
  return tileAt(map, row, col) === "exit";
}

export function isEntranceTile(map: TileMap, row: number, col: number): boolean {
  return tileAt(map, row, col) === "entrance";
}

export function isHealTile(map: TileMap, row: number, col: number): boolean {
  return tileAt(map, row, col) === "heal";
}

/** Scans a map for the (first) tile of the given type — used to find a zone's exit position
 * from the outside, e.g. so returning to a previous zone lands the player exactly where they
 * left it. Assumes at most one tile of that type per map, true for "exit"/"entrance"/"heal". */
export function findTilePosition(map: TileMap, tileType: TileType): { row: number; col: number } | null {
  for (let row = 0; row < map.rows.length; row++) {
    const col = map.rows[row].indexOf(tileType);
    if (col !== -1) return { row, col };
  }
  return null;
}
