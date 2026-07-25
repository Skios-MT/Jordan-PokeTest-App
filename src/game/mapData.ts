export type TileType = "tree" | "path" | "grass" | "exit" | "heal";

export interface TileMap {
  zoneId: string;
  zoneName: string;
  rows: TileType[][];
  playerStart: { row: number; col: number };
  /** Zone id the exit tile leads to, or null if this is the current end of the line. */
  exitTo: string | null;
}

const LEGEND: Record<string, TileType> = {
  T: "tree",
  ".": "path",
  G: "grass",
  P: "path", // player start / entrance tile, walkable
  E: "exit",
  H: "heal", // Healing Center — walkable, fully revives KO'd party members on entry
};

function parseMap(raw: string[], zoneId: string, zoneName: string, exitTo: string | null): TileMap {
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
  return { zoneId, zoneName, rows, playerStart, exitTo };
}

/**
 * Three hand-authored placeholder zones chained in a line (spec: "each map
 * has one exit and one entrance"), not the full node-graph-of-many-zones
 * world from section 2.1 — just enough to demonstrate walking from a
 * weaker zone into progressively stronger ones. Real per-species spawn
 * tables per zone still aren't built (see encounterTable.ts); only the
 * wild-level range shifts per zone (see zones.ts).
 *
 * Each zone is a distinct irregular shape/size (not a uniform 7x7 square) —
 * trees carve the outer silhouette as well as blocking movement, so the
 * walkable footprint itself reads as an organic blob, a pier, or a winding
 * cave rather than a plain rectangle. All rows in a given raw array must
 * still be equal length (a rectangular char grid), but the walkable area
 * inside it doesn't have to be.
 */
const MELITA_WOODS_RAW = [
  "TTTTTTTTTTTTTTT",
  "TTTTTTT.TTTTTTT",
  "TTTTTT...TTTTTT",
  "TTTTT..G..TTTTT",
  "TTTT..GGG..TTTT",
  "TTT..GGGGG..TTT",
  "TT..GGGGGGG..TT",
  "TPHGGGGGGGGG.ET",
  "TT..GGGGGGG..TT",
  "TTT..GGGGG..TTT",
  "TTTT..GGG..TTTT",
  "TTTTT..G..TTTTT",
  "TTTTTT...TTTTTT",
  "TTTTTTT.TTTTTTT",
  "TTTTTTTTTTTTTTT",
];

const LUZZU_HARBOUR_RAW = [
  "TTTTTTTTTTTTTTTTTTTTT",
  "T..........TTTTTTTTTT",
  "T..........TTTTTTTTTT",
  "T..GGGGG...TTTTTTTTTT",
  "T..GGGGG...TTTTTTTTTT",
  "TPHGGGGG............E",
  "T..GGGGG...TTTTTTTTTT",
  "T..GGGGG...TTTTTTTTTT",
  "T..........TTTTTTTTTT",
  "T..........TTTTTTTTTT",
  "TTTTTTTTTTTTTTTTTTTTT",
];

const AZURE_CAVERNS_RAW = [
  "TTTTTTTTTTTTT",
  "THP.TTTTTTTTT",
  "TGG.TTTTTTTTT",
  "T.....G.TTTTT",
  "TTTTT...TTTTT",
  "TTTTT.G.TTTTT",
  "TTTTT.G.TTTTT",
  "TTT.....TTTTT",
  "TTT.G.TTTTTTT",
  "TTT.G.TTTTTTT",
  "TTT.G.TTTTTTT",
  "TTT...G.G.TTT",
  "TTTTTTT.G.TTT",
  "TTTTTTT.G.TTT",
  "TTTTTTT.G.TTT",
  "TTT.......TTT",
  "TTTGG.TTTTTTT",
  "TTT...TTTTTTT",
  "TTTTTTTTTTTTT",
];

export const MAPS: Record<string, TileMap> = {
  melita_woods: parseMap(MELITA_WOODS_RAW, "melita_woods", "Melita Woods", "luzzu_harbour"),
  luzzu_harbour: parseMap(LUZZU_HARBOUR_RAW, "luzzu_harbour", "Luzzu Harbour", "azure_caverns"),
  azure_caverns: parseMap(AZURE_CAVERNS_RAW, "azure_caverns", "Azure Caverns", null),
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
  const tile = tileAt(map, row, col);
  return tile === "path" || tile === "grass" || tile === "exit" || tile === "heal";
}

export function isEncounterTile(map: TileMap, row: number, col: number): boolean {
  return tileAt(map, row, col) === "grass";
}

export function isExitTile(map: TileMap, row: number, col: number): boolean {
  return tileAt(map, row, col) === "exit";
}

export function isHealTile(map: TileMap, row: number, col: number): boolean {
  return tileAt(map, row, col) === "heal";
}
