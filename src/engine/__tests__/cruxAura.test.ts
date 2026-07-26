import {
  activateCruxAura,
  getCruxAlignment,
  getCruxStatMultiplier,
  getCruxEvasionStageBonus,
  isCruxOnCooldown,
  isImmuneToFlinchViaCrux,
  isImmuneToConfusionViaCrux,
  shouldAutoTriggerCrux,
  CRUX_AURA_STATUS_ID,
  CRUX_AURA_SPENT_STATUS_ID,
} from "../cruxAura";
import { tickStatusEffects } from "../statusEffects";
import { makeCreature } from "./testHelpers";

describe("Crux Aura (spec 1.5)", () => {
  it("classifies alignment from a creature's types", () => {
    expect(getCruxAlignment(makeCreature({ types: ["Steel"] }))).toBe("chivalry");
    expect(getCruxAlignment(makeCreature({ types: ["Fighting"] }))).toBe("chivalry");
    expect(getCruxAlignment(makeCreature({ types: ["Rock"] }))).toBe("antiquity");
    expect(getCruxAlignment(makeCreature({ types: ["Ghost"] }))).toBe("antiquity");
    expect(getCruxAlignment(makeCreature({ types: ["Water"] }))).toBe("off-alignment");
  });

  it("auto-triggers at <= 33% HP and not above it", () => {
    const low = makeCreature({ stats: { hp: 100, atk: 1, def: 1, spatk: 1, spdef: 1, speed: 1 }, currentHp: 33 });
    const high = makeCreature({ stats: { hp: 100, atk: 1, def: 1, spatk: 1, spdef: 1, speed: 1 }, currentHp: 34 });
    expect(shouldAutoTriggerCrux(low)).toBe(true);
    expect(shouldAutoTriggerCrux(high)).toBe(false);
  });

  it("gives Chivalry-aligned creatures +30% Attack/Speed and flinch immunity", () => {
    const creature = makeCreature({ types: ["Steel"] });
    activateCruxAura(creature);
    expect(getCruxStatMultiplier(creature, "atk")).toBeCloseTo(1.3);
    expect(getCruxStatMultiplier(creature, "speed")).toBeCloseTo(1.3);
    expect(getCruxStatMultiplier(creature, "spatk")).toBe(1);
    expect(isImmuneToFlinchViaCrux(creature)).toBe(true);
    expect(isImmuneToConfusionViaCrux(creature)).toBe(false);
  });

  it("gives Antiquity-aligned creatures +30% Sp.Atk, +2 evasion, and confusion immunity", () => {
    const creature = makeCreature({ types: ["Rock"] });
    activateCruxAura(creature);
    expect(getCruxStatMultiplier(creature, "spatk")).toBeCloseTo(1.3);
    expect(getCruxStatMultiplier(creature, "atk")).toBe(1);
    expect(getCruxEvasionStageBonus(creature)).toBe(2);
    expect(isImmuneToConfusionViaCrux(creature)).toBe(true);
    expect(isImmuneToFlinchViaCrux(creature)).toBe(false);
  });

  it("gives off-alignment types a flat +15% to all stats", () => {
    const creature = makeCreature({ types: ["Water"] });
    activateCruxAura(creature);
    for (const stat of ["atk", "spatk", "def", "spdef", "speed"] as const) {
      expect(getCruxStatMultiplier(creature, stat)).toBeCloseTo(1.15);
    }
  });

  it("expires after 3 turns into a 2-turn Aura-Spent debuff (-15% all stats)", () => {
    const creature = makeCreature({ types: ["Steel"] });
    activateCruxAura(creature);
    expect(creature.activeEffects.some((e) => e.id === CRUX_AURA_STATUS_ID)).toBe(true);

    tickStatusEffects(creature); // turn 1: 3 -> 2
    tickStatusEffects(creature); // turn 2: 2 -> 1
    expect(creature.activeEffects.some((e) => e.id === CRUX_AURA_STATUS_ID)).toBe(true);

    tickStatusEffects(creature); // turn 3: 1 -> 0 -> expires into Aura-Spent
    expect(creature.activeEffects.some((e) => e.id === CRUX_AURA_STATUS_ID)).toBe(false);
    expect(creature.activeEffects.some((e) => e.id === CRUX_AURA_SPENT_STATUS_ID)).toBe(true);
    for (const stat of ["atk", "spatk", "def", "spdef", "speed"] as const) {
      expect(getCruxStatMultiplier(creature, stat)).toBeCloseTo(0.85);
    }

    tickStatusEffects(creature); // spent turn 1: 2 -> 1
    expect(isCruxOnCooldown(creature)).toBe(true);
    tickStatusEffects(creature); // spent turn 2: 1 -> 0 -> removed
    expect(isCruxOnCooldown(creature)).toBe(false);
    expect(getCruxStatMultiplier(creature, "atk")).toBe(1);
  });

  it("cannot be re-invoked while active or on Aura-Spent cooldown", () => {
    const creature = makeCreature({ types: ["Steel"] });
    activateCruxAura(creature);
    expect(activateCruxAura(creature)).toBeUndefined();
  });
});
