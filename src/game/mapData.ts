export type TileType = "tree" | "path" | "grass";

export interface TileMap {
  zoneName: string;
  rows: TileType[][];
  playerStart: { row: number; col: number };
}

const LEGEND: Record<string, TileType> = {
  T: "tree",
  ".": "path",
  G: "grass",
  P: "path", // player start tile, walkable (rendered as a path underfoot)
};

/**
 * Hand-authored placeholder layout for Melita Woods (spec 2.2's "early-game
 * route, first wild variety" zone) — a small clearing ringed by trees, not
 * the full 16x16 Tiled-editor grid the spec describes. One zone only; the
 * node-graph overworld linking multiple zones isn't built yet.
 */
const RAW_MELITA_WOODS = [
  "TTTTTTT",
  "T.GGG.T",
  "T.G.G.T",
  "T..P..T",
  "T.G.G.T",
  "T.GGG.T",
  "TTTTTTT",
];

function parseMap(raw: string[], zoneName: string): TileMap {
  let playerStart = { row: 0, col: 0 };
  const rows: TileType[][] = raw.map((rowStr, rowIndex) =>
    rowStr.split("").map((ch, colIndex) => {
      if (ch === "P") playerStart = { row: rowIndex, col: colIndex };
      const tile = LEGEND[ch];
      if (!tile) throw new Error(`Unknown map legend character: "${ch}"`);
      return tile;
    })
  );
  return { zoneName, rows, playerStart };
}

export const MELITA_WOODS_MAP = parseMap(RAW_MELITA_WOODS, "Melita Woods");

export function tileAt(map: TileMap, row: number, col: number): TileType | undefined {
  return map.rows[row]?.[col];
}

export function isWalkable(map: TileMap, row: number, col: number): boolean {
  const tile = tileAt(map, row, col);
  return tile === "path" || tile === "grass";
}

export function isEncounterTile(map: TileMap, row: number, col: number): boolean {
  return tileAt(map, row, col) === "grass";
}
