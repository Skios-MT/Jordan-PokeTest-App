import { getSingleTypeMultiplier, getTypeMultiplier } from "../typeChart";

describe("type chart", () => {
  it("matches the spec's Water row (strong vs Fire/Rock/Ground)", () => {
    expect(getSingleTypeMultiplier("Water", "Fire")).toBe(2);
    expect(getSingleTypeMultiplier("Water", "Rock")).toBe(2);
    expect(getSingleTypeMultiplier("Water", "Ground")).toBe(2);
  });

  it("matches the spec's Water weakness column (Grass/Electric deal 2x to Water)", () => {
    expect(getSingleTypeMultiplier("Grass", "Water")).toBe(2);
    expect(getSingleTypeMultiplier("Electric", "Water")).toBe(2);
  });

  it("applies immunities from the spec (Poison deals 0 to Steel)", () => {
    expect(getSingleTypeMultiplier("Poison", "Steel")).toBe(0);
    expect(getSingleTypeMultiplier("Normal", "Ghost")).toBe(0);
    expect(getSingleTypeMultiplier("Fighting", "Ghost")).toBe(0);
    expect(getSingleTypeMultiplier("Electric", "Ground")).toBe(0);
    expect(getSingleTypeMultiplier("Ground", "Flying")).toBe(0);
    expect(getSingleTypeMultiplier("Dragon", "Fairy")).toBe(0);
  });

  it("defaults to neutral for unlisted pairs", () => {
    expect(getSingleTypeMultiplier("Water", "Steel")).toBe(1);
  });

  it("combines multipliers across a dual-type defender (double-weak = 4x)", () => {
    // Fire is strong vs Grass (2x) and vs Rock's weakness column doesn't apply here directly;
    // use Water vs a Fire/Rock dual-type defender: Water is strong vs both -> 2 * 2 = 4.
    expect(getTypeMultiplier("Water", ["Fire", "Rock"])).toBe(4);
  });

  it("returns 0 for a dual-type defender if either type is immune", () => {
    expect(getTypeMultiplier("Poison", ["Steel", "Water"])).toBe(0);
  });

  it("multiplies super-effective * neutral for a mixed dual-type defender", () => {
    // Fire is strong vs Steel (2x, spec 1.4) and neutral vs Ground (not listed either way).
    expect(getSingleTypeMultiplier("Fire", "Ground")).toBe(1);
    expect(getTypeMultiplier("Fire", ["Steel", "Ground"])).toBe(2);
  });

  // Regression coverage for a reported bug: the chart originally had no "resists"
  // (0.5x) column at all, so a Water-type never actually resisted Fire moves.
  it("applies resist (0.5x) relationships — Fire is resisted by Water, Grass is resisted by Fire", () => {
    expect(getSingleTypeMultiplier("Fire", "Water")).toBe(0.5);
    expect(getSingleTypeMultiplier("Grass", "Fire")).toBe(0.5);
  });

  it("Water resists Water/Grass/Dragon; Grass resists Fire/Grass/Poison/Flying/Bug/Dragon/Steel", () => {
    expect(getSingleTypeMultiplier("Water", "Water")).toBe(0.5);
    expect(getSingleTypeMultiplier("Water", "Grass")).toBe(0.5);
    expect(getSingleTypeMultiplier("Water", "Dragon")).toBe(0.5);
    expect(getSingleTypeMultiplier("Grass", "Grass")).toBe(0.5);
    expect(getSingleTypeMultiplier("Grass", "Poison")).toBe(0.5);
    expect(getSingleTypeMultiplier("Grass", "Flying")).toBe(0.5);
    expect(getSingleTypeMultiplier("Grass", "Bug")).toBe(0.5);
    expect(getSingleTypeMultiplier("Grass", "Steel")).toBe(0.5);
  });

  it("a Fire attacker vs a Water defender nets out below neutral in the full damage formula's type stage", () => {
    // Fire vs Water dual-type-free case: no weakness anywhere to cancel the resist out.
    expect(getTypeMultiplier("Fire", ["Water"])).toBeLessThan(1);
  });
});
