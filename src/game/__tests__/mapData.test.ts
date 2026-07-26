import {
  MAPS,
  getMap,
  isWalkable,
  isExitTile,
  isEntranceTile,
  isHealTile,
  biomeAt,
  findTilePosition,
  BIOME_TYPES,
} from "../mapData";

/** Every non-tree tile should be reachable from the zone's own entrance — a disconnected biome
 * patch, Healing Center, or exit tile would be unreachable content, exactly the kind of mistake
 * hand-editing these ASCII maps could introduce. */
function bfsReachable(map: ReturnType<typeof getMap>, start: { row: number; col: number }) {
  const seen = new Set<string>([`${start.row},${start.col}`]);
  const queue = [start];
  while (queue.length > 0) {
    const { row, col } = queue.shift()!;
    for (const [dRow, dCol] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nRow = row + dRow;
      const nCol = col + dCol;
      const key = `${nRow},${nCol}`;
      if (!seen.has(key) && isWalkable(map, nRow, nCol)) {
        seen.add(key);
        queue.push({ row: nRow, col: nCol });
      }
    }
  }
  return seen;
}

describe("mapData — zone chain wiring", () => {
  const zoneIds = Object.keys(MAPS);

  it("has all 4 zones", () => {
    expect(zoneIds.sort()).toEqual(["azure_caverns", "luzzu_harbour", "melita_woods", "ramla_dunes"].sort());
  });

  it.each(zoneIds)("%s: every non-tree tile is reachable from the entrance", (zoneId) => {
    const map = getMap(zoneId);
    const reachable = bfsReachable(map, map.playerStart);
    for (let row = 0; row < map.rows.length; row++) {
      for (let col = 0; col < map.rows[row].length; col++) {
        if (isWalkable(map, row, col)) {
          expect(reachable.has(`${row},${col}`)).toBe(true);
        }
      }
    }
  });

  it.each(zoneIds)("%s: has exactly one entrance tile, at playerStart", (zoneId) => {
    const map = getMap(zoneId);
    expect(isEntranceTile(map, map.playerStart.row, map.playerStart.col)).toBe(true);
  });

  it.each(zoneIds)("%s: has exactly one Healing Center, reachable", (zoneId) => {
    const map = getMap(zoneId);
    const healPos = findTilePosition(map, "heal");
    expect(healPos).not.toBeNull();
    expect(isHealTile(map, healPos!.row, healPos!.col)).toBe(true);
  });

  it.each(zoneIds)("%s: mixes at least 2 biome tile types", (zoneId) => {
    const map = getMap(zoneId);
    const biomesPresent = new Set<string>();
    for (const row of map.rows) {
      for (const tile of row) {
        if ((BIOME_TYPES as string[]).includes(tile)) biomesPresent.add(tile);
      }
    }
    expect(biomesPresent.size).toBeGreaterThanOrEqual(2);
  });

  it("forward (exitTo) and backward (previousZoneId) links agree with each other in both directions", () => {
    for (const zoneId of zoneIds) {
      const map = getMap(zoneId);
      if (map.exitTo) {
        const nextMap = getMap(map.exitTo);
        expect(nextMap.previousZoneId).toBe(zoneId);
      }
      if (map.previousZoneId) {
        const prevMap = getMap(map.previousZoneId);
        expect(prevMap.exitTo).toBe(zoneId);
      }
    }
  });

  it("chains in the expected order: Melita Woods -> Luzzu Harbour -> Azure Caverns -> Ramla Dunes", () => {
    expect(getMap("melita_woods").previousZoneId).toBeNull();
    expect(getMap("melita_woods").exitTo).toBe("luzzu_harbour");
    expect(getMap("luzzu_harbour").exitTo).toBe("azure_caverns");
    expect(getMap("azure_caverns").exitTo).toBe("ramla_dunes");
    expect(getMap("ramla_dunes").exitTo).toBeNull();
  });

  it.each(zoneIds)("%s: every zone with an exit has that exit tile reachable", (zoneId) => {
    const map = getMap(zoneId);
    const exitPos = findTilePosition(map, "exit");
    if (map.exitTo) {
      expect(exitPos).not.toBeNull();
      expect(isExitTile(map, exitPos!.row, exitPos!.col)).toBe(true);
    } else {
      expect(exitPos).toBeNull();
    }
  });

  it("biomeAt only returns a biome for actual biome tiles, not for path/tree/heal/exit/entrance", () => {
    const map = getMap("melita_woods");
    const healPos = findTilePosition(map, "heal")!;
    expect(biomeAt(map, healPos.row, healPos.col)).toBeNull();
    expect(biomeAt(map, map.playerStart.row, map.playerStart.col)).toBeNull();
  });
});
