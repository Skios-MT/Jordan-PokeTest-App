import { stageMultiplier, clampStage } from "../statStages";

describe("stat stages", () => {
  it("returns 1 at stage 0", () => {
    expect(stageMultiplier(0)).toBe(1);
  });

  it("returns 2 at +6 and 2/8 at -6 per the spec's multiplier table", () => {
    expect(stageMultiplier(6)).toBe(4);
    expect(stageMultiplier(-6)).toBeCloseTo(2 / 8);
  });

  it("clamps beyond +-6", () => {
    expect(clampStage(10)).toBe(6);
    expect(clampStage(-10)).toBe(-6);
    expect(stageMultiplier(20)).toBe(stageMultiplier(6));
  });

  it("is monotonically increasing across the table", () => {
    for (let s = -6; s < 6; s++) {
      expect(stageMultiplier(s + 1)).toBeGreaterThan(stageMultiplier(s));
    }
  });
});
