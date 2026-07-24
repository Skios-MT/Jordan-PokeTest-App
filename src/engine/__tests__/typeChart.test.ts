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
});
