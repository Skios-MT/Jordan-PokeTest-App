import { calculateDamage, STAB_MULTIPLIER, CRIT_MULTIPLIER } from "../damage";
import { makeCreature, makeMove } from "./testHelpers";

describe("damage formula (spec 1.3)", () => {
  it("returns 0 against an immune defender regardless of other multipliers", () => {
    const attacker = makeCreature({ types: ["Poison"] });
    const defender = makeCreature({ types: ["Steel"] });
    const move = makeMove({ type: "Poison" });
    expect(calculateDamage(attacker, defender, move, { randomFactor: 1, isCrit: true })).toBe(0);
  });

  it("never deals less than 1 damage when not immune", () => {
    const attacker = makeCreature({ level: 1, stats: { hp: 1, atk: 1, def: 1, spatk: 1, spdef: 1, speed: 1 } });
    const defender = makeCreature({ stats: { hp: 999, atk: 999, def: 999, spatk: 999, spdef: 999, speed: 999 } });
    const move = makeMove({ power: 1, type: "Normal" });
    const dmg = calculateDamage(attacker, defender, move, { randomFactor: 0.85 });
    expect(dmg).toBeGreaterThanOrEqual(1);
  });

  it("applies STAB when the attacker's type matches the move's type", () => {
    const attacker = makeCreature({ types: ["Water"] });
    const defender = makeCreature({ types: ["Fighting"] }); // neutral vs Water
    const move = makeMove({ type: "Water", power: 80 });

    const withStab = calculateDamage(attacker, defender, move, { randomFactor: 1 });
    const noStabAttacker = makeCreature({ types: ["Fighting"] });
    const withoutStab = calculateDamage(noStabAttacker, defender, move, { randomFactor: 1 });

    expect(withStab).toBeGreaterThan(withoutStab);
    expect(withStab).toBe(Math.floor(withoutStab * STAB_MULTIPLIER));
  });

  it("applies the crit multiplier", () => {
    const attacker = makeCreature({ types: ["Normal"] });
    const defender = makeCreature({ types: ["Normal"] });
    const move = makeMove({ type: "Normal" });

    const normal = calculateDamage(attacker, defender, move, { randomFactor: 1, isCrit: false });
    const crit = calculateDamage(attacker, defender, move, { randomFactor: 1, isCrit: true });
    expect(crit).toBe(Math.floor(normal * CRIT_MULTIPLIER));
  });

  it("doubles damage against a defender the chart lists as weak to this type", () => {
    const attacker = makeCreature({ types: ["Water"] });
    const move = makeMove({ type: "Water" });
    const neutralDefender = makeCreature({ types: ["Steel"] });
    const weakDefender = makeCreature({ types: ["Fire"] }); // Water is strong vs Fire (spec 1.4)

    const neutral = calculateDamage(attacker, neutralDefender, move, { randomFactor: 1 });
    const superEffective = calculateDamage(attacker, weakDefender, move, { randomFactor: 1 });

    expect(superEffective).toBe(neutral * 2);
  });

  it("zeroes damage against a defender immune to this type", () => {
    const attacker = makeCreature({ types: ["Poison"] });
    const move = makeMove({ type: "Poison" });
    const immuneDefender = makeCreature({ types: ["Steel"] }); // Steel is immune to Poison (spec 1.4)
    expect(calculateDamage(attacker, immuneDefender, move, { randomFactor: 1 })).toBe(0);
  });

  it("applies the Crux Aura multiplier as its own stage without touching STAB/crit", () => {
    const attacker = makeCreature({ types: ["Water"] });
    const defender = makeCreature({ types: ["Fighting"] });
    const move = makeMove({ type: "Water" });

    const base = calculateDamage(attacker, defender, move, { randomFactor: 1 });
    const withAura = calculateDamage(attacker, defender, move, { randomFactor: 1, cruxAuraMultiplier: 1.3 });
    expect(withAura).toBe(Math.floor(base * 1.3));
  });

  it("rounds down at each multiplication stage", () => {
    // Craft numbers that would produce a fractional intermediate result.
    const attacker = makeCreature({ level: 7, stats: { hp: 50, atk: 13, def: 50, spatk: 50, spdef: 50, speed: 50 } });
    const defender = makeCreature({ types: ["Fighting"], stats: { hp: 50, atk: 50, def: 17, spatk: 50, spdef: 50, speed: 50 } });
    const move = makeMove({ type: "Water", power: 33 });
    const dmg = calculateDamage(attacker, defender, move, { randomFactor: 0.91 });
    expect(Number.isInteger(dmg)).toBe(true);
  });
});
