/**
 * -6..+6 stat-stage multiplier table (Spec 1.2). Index by `stage + 6`.
 * Kept as exact fractions (not 1.33^n) so repeated stage changes stay
 * balance-readable and don't drift under floating point.
 */
export const STAT_STAGE_MULTIPLIERS: number[] = [
  2 / 8,
  2 / 7,
  2 / 6,
  2 / 5,
  2 / 4,
  2 / 3,
  1,
  3 / 2,
  2,
  5 / 2,
  3,
  7 / 2,
  4,
];

export function clampStage(stage: number): number {
  return Math.max(-6, Math.min(6, stage));
}

export function stageMultiplier(stage: number): number {
  const clamped = clampStage(stage);
  return STAT_STAGE_MULTIPLIERS[clamped + 6];
}
