import { buildZoneEncounterTable, rollEncounter } from "../encounterTable";

describe("buildZoneEncounterTable — legendary tier", () => {
  it("includes exactly the 3 legendaries, each far rarer than a common wild creature", () => {
    const table = buildZoneEncounterTable("Water", { baseLevel: 4, levelSpread: 2, legendaryMinLevel: 25 });
    const legendaryWeights = table.filter((o) => o.weight === 0.3);
    expect(legendaryWeights).toHaveLength(3);
    const commonWeight = Math.max(...table.map((o) => o.weight));
    expect(commonWeight).toBeGreaterThan(0.3);
  });

  it("never builds a legendary below the configured minimum level, and honors a higher floor for later zones", () => {
    const table = buildZoneEncounterTable("Water", { baseLevel: 4, levelSpread: 2, legendaryMinLevel: 25 });
    const legendaryOptions = table.filter((o) => o.weight === 0.3);
    for (const option of legendaryOptions) {
      for (let i = 0; i < 20; i++) {
        const participant = option.build(`test-${i}`);
        expect(participant.creature.level).toBeGreaterThanOrEqual(25);
      }
    }

    const laterZoneTable = buildZoneEncounterTable("Water", { baseLevel: 17, levelSpread: 3, legendaryMinLevel: 40 });
    const laterLegendaryOptions = laterZoneTable.filter((o) => o.weight === 0.3);
    for (const option of laterLegendaryOptions) {
      const participant = option.build("test-later");
      expect(participant.creature.level).toBeGreaterThanOrEqual(40);
    }
  });

  it("rollEncounter can still select a legendary when it's the only weighted option", () => {
    const table = buildZoneEncounterTable("Water", { baseLevel: 4, levelSpread: 2, legendaryMinLevel: 25 });
    const legendaryOnly = table.filter((o) => o.weight === 0.3);
    const participant = rollEncounter(legendaryOnly, "solo-roll");
    expect(participant.creature.level).toBeGreaterThanOrEqual(25);
    expect(["aegilord", "megalithos", "siroccus"]).toContain(participant.creature.speciesId);
  });
});
