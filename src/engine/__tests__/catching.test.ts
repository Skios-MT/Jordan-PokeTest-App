import {
  calculateCatchValue,
  calculateShakeProbability,
  attemptCatch,
  shakeProbabilityForDisplay,
  SHAKE_CHECKS,
} from "../catching";

describe("catching engine (spec 1.6)", () => {
  it("gives a full-health common creature a low but nonzero catch value in a basic container", () => {
    const value = calculateCatchValue({
      maxHp: 100,
      currentHp: 100,
      baseCatchRate: 255,
      container: "basic",
      status: "none",
    });
    // hpFactor at full health = 1/3, so 1/3 * 255 * 1 * 1 = 85
    expect(value).toBeCloseTo(85);
  });

  it("increases catch value as current HP drops", () => {
    const full = calculateCatchValue({ maxHp: 100, currentHp: 100, baseCatchRate: 100, container: "basic", status: "none" });
    const low = calculateCatchValue({ maxHp: 100, currentHp: 1, baseCatchRate: 100, container: "basic", status: "none" });
    expect(low).toBeGreaterThan(full);
  });

  it("applies container multipliers (Melitan Ball is 4x basic)", () => {
    const base = { maxHp: 100, currentHp: 50, baseCatchRate: 100, status: "none" as const };
    const basic = calculateCatchValue({ ...base, container: "basic" });
    const melitan = calculateCatchValue({ ...base, container: "melitan_ball" });
    expect(melitan).toBeCloseTo(basic * 4);
  });

  it("applies status bonuses (sleep/freeze 2.5x, paralysis/burn/poison 1.5x)", () => {
    const base = { maxHp: 100, currentHp: 50, baseCatchRate: 100, container: "basic" as const };
    const none = calculateCatchValue({ ...base, status: "none" });
    const sleep = calculateCatchValue({ ...base, status: "sleep" });
    const paralysis = calculateCatchValue({ ...base, status: "paralysis" });
    expect(sleep).toBeCloseTo(none * 2.5);
    expect(paralysis).toBeCloseTo(none * 1.5);
  });

  it("caps shake probability at 1.0 even when catch value exceeds 255", () => {
    expect(calculateShakeProbability(1000)).toBe(1);
    expect(shakeProbabilityForDisplay(calculateShakeProbability(1000))).toBe(100);
  });

  it("requires all 4 consecutive shake checks to pass to catch", () => {
    // maxHp=100, currentHp=50, baseCatchRate=200, basic container, no status:
    // hpFactor = (300-100)/300 = 0.667; catchValue = 0.667*200 = 133.3; shakeProbability ≈ 0.523.
    const input = { maxHp: 100, currentHp: 50, baseCatchRate: 200, container: "basic" as const, status: "none" as const };
    let call = 0;
    // 3 passes (roll 0, always < probability) then a fail (roll above the ~0.523 probability).
    const randomSource = () => (call++ < 3 ? 0 : 0.9);
    const result = attemptCatch(input, randomSource);
    expect(result.shakeProbability).toBeGreaterThan(0);
    expect(result.shakeProbability).toBeLessThan(1);
    expect(result.shakesPassed).toBe(3);
    expect(result.caught).toBe(false);
  });

  it("catches when all shake checks pass", () => {
    const result = attemptCatch(
      { maxHp: 100, currentHp: 50, baseCatchRate: 200, container: "basic", status: "none" },
      () => 0
    );
    expect(result.shakesPassed).toBe(SHAKE_CHECKS);
    expect(result.caught).toBe(true);
  });

  it("blocks the catch attempt entirely when the story flag gate isn't unlocked", () => {
    const result = attemptCatch(
      {
        maxHp: 100,
        currentHp: 1,
        baseCatchRate: 3,
        container: "melitan_ball",
        status: "sleep",
        storyFlagUnlocked: false,
      },
      () => 0
    );
    expect(result.caught).toBe(false);
    expect(result.shakesPassed).toBe(0);
  });
});
