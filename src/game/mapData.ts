export type TileType = "tree" | "path" | "grass" | "exit";

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
};

function parseMap(raw: string[], zoneId: string, zoneName: string, exitTo: string | null): TileMap {
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
 */
const MELITA_WOODS_RAW = [
  "TTTTTTT",
  "T.GGG.T",
  "T.G.G.T",
  "T..P..E",
  "T.G.G.T",
  "T.GGG.T",
  "TTTTTTT",
];

const LUZZU_HARBOUR_RAW = [
  "TTTTTTT",
  "T.....T",
  "T.GGG.T",
  "P.G.G.E",
  "T.GGG.T",
  "T.....T",
  "TTTTTTT",
];

const AZURE_CAVERNS_RAW = [
  "TTTTTTT",
  "T.GGG.T",
  "T.GGG.T",
  "P.GGG.T",
  "T.GGG.T",
  "T.GGG.T",
  "TTTTTTT",
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
  return tile === "path" || tile === "grass" || tile === "exit";
}

export function isEncounterTile(map: TileMap, row: number, col: number): boolean {
  return tileAt(map, row, col) === "grass";
}

export function isExitTile(map: TileMap, row: number, col: number): boolean {
  return tileAt(map, row, col) === "exit";
}
