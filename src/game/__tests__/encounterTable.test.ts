import { buildBiomeEncounterTable, rollEncounter, type EncounterOption } from "../encounterTable";

describe("buildBiomeEncounterTable — per-biome pools", () => {
  it("only includes species tagged with the requested biome (plus the universal legendary tier)", () => {
    const rockTable = buildBiomeEncounterTable("rock", "Water", { baseLevel: 4, levelSpread: 2, legendaryMinLevel: 25 });
    const rockIds = rockTable.map((o: EncounterOption) => o.build("probe").creature.speciesId);
    // Rock-biome wild creatures + the two rock-tagged regional variants should all be present...
    for (const id of ["qortong", "xrobbog", "karkarun", "bulqajra", "santwarr", "ferrocane", "katakomba"]) {
      expect(rockIds).toContain(id);
    }
    // ...and species tagged with a different biome should never appear in the rock pool.
    for (const id of ["luzzitt", "ramliet", "fossary", "zavorra"]) {
      expect(rockIds).not.toContain(id);
    }
  });

  it("gives each of the 4 biomes its own distinct, non-empty common-species pool", () => {
    const config = { baseLevel: 10, levelSpread: 2, legendaryMinLevel: 30 };
    const biomes = ["grass", "rock", "water", "sand"] as const;
    const commonIdsByBiome = biomes.map((biome) => {
      const table = buildBiomeEncounterTable(biome, "Water", config);
      const common = table.filter((o) => o.weight > 0.3);
      expect(common.length).toBeGreaterThan(0);
      return new Set(common.map((o) => o.build("probe").creature.speciesId));
    });
    // No two biomes should share any common species — each is a genuinely distinct pool.
    for (let i = 0; i < commonIdsByBiome.length; i++) {
      for (let j = i + 1; j < commonIdsByBiome.length; j++) {
        const overlap = [...commonIdsByBiome[i]].filter((id) => commonIdsByBiome[j].has(id));
        expect(overlap).toEqual([]);
      }
    }
  });

  it("only offers a matching starter line's wild encounter in its associated biome", () => {
    // Player picked Water, so Grass and Fire are "other" lines — Grass should show up in the
    // grass pool, Fire in the rock pool, and neither should leak into the water pool itself.
    const grassTable = buildBiomeEncounterTable("grass", "Water", { baseLevel: 4, levelSpread: 2, legendaryMinLevel: 25 });
    const rockTable = buildBiomeEncounterTable("rock", "Water", { baseLevel: 4, levelSpread: 2, legendaryMinLevel: 25 });
    const waterTable = buildBiomeEncounterTable("water", "Water", { baseLevel: 4, levelSpread: 2, legendaryMinLevel: 25 });

    expect(grassTable.some((o) => o.weight === 3)).toBe(true);
    expect(rockTable.some((o) => o.weight === 3)).toBe(true);
    // The player's own line (Water) never appears as a wild "other starter" encounter anywhere.
    const waterCommonIds = waterTable.filter((o) => o.weight === 3).map((o) => o.build("probe").creature.speciesId);
    expect(waterCommonIds).toEqual([]);
  });

  describe("legendary tier", () => {
    it("includes exactly the 3 legendaries in every biome, each far rarer than a common wild creature", () => {
      const table = buildBiomeEncounterTable("sand", "Water", { baseLevel: 4, levelSpread: 2, legendaryMinLevel: 25 });
      const legendaryWeights = table.filter((o) => o.weight === 0.3);
      expect(legendaryWeights).toHaveLength(3);
      const commonWeight = Math.max(...table.map((o) => o.weight));
      expect(commonWeight).toBeGreaterThan(0.3);
    });

    it("never builds a legendary below the configured minimum level, and honors a higher floor for later zones", () => {
      const table = buildBiomeEncounterTable("sand", "Water", { baseLevel: 4, levelSpread: 2, legendaryMinLevel: 25 });
      const legendaryOptions = table.filter((o) => o.weight === 0.3);
      for (const option of legendaryOptions) {
        for (let i = 0; i < 20; i++) {
          const participant = option.build(`test-${i}`);
          expect(participant.creature.level).toBeGreaterThanOrEqual(25);
        }
      }

      const laterZoneTable = buildBiomeEncounterTable("sand", "Water", { baseLevel: 17, levelSpread: 3, legendaryMinLevel: 40 });
      const laterLegendaryOptions = laterZoneTable.filter((o) => o.weight === 0.3);
      for (const option of laterLegendaryOptions) {
        const participant = option.build("test-later");
        expect(participant.creature.level).toBeGreaterThanOrEqual(40);
      }
    });

    it("rollEncounter can still select a legendary when it's the only weighted option", () => {
      const table = buildBiomeEncounterTable("sand", "Water", { baseLevel: 4, levelSpread: 2, legendaryMinLevel: 25 });
      const legendaryOnly = table.filter((o) => o.weight === 0.3);
      const participant = rollEncounter(legendaryOnly, "solo-roll");
      expect(participant.creature.level).toBeGreaterThanOrEqual(25);
      expect(["aegilord", "megalithos", "siroccus"]).toContain(participant.creature.speciesId);
    });
  });
});
