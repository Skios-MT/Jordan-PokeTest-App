import type { StatusCondition } from "./types";

export const SHAKE_CHECKS = 4;

export type ContainerType = "basic" | "greca_trap" | "festa_trap" | "melitan_ball";

export const CONTAINER_MULTIPLIERS: Record<ContainerType, number> = {
  basic: 1.0,
  greca_trap: 1.5,
  festa_trap: 2.0,
  melitan_ball: 4.0,
};

export function statusBonus(status: StatusCondition): number {
  if (status === "sleep" || status === "freeze") return 2.5;
  if (status === "paralysis" || status === "burn" || status === "poison") return 1.5;
  return 1.0;
}

export interface CatchAttemptInput {
  maxHp: number;
  currentHp: number;
  baseCatchRate: number; // 3 (legendary) .. 255 (common)
  container: ContainerType;
  status: StatusCondition;
  /** Legendary/box creatures require this to be true before a catch can even be attempted. */
  storyFlagUnlocked?: boolean;
}

export function calculateCatchValue(input: CatchAttemptInput): number {
  const hpFactor = (3 * input.maxHp - 2 * input.currentHp) / (3 * input.maxHp);
  return (
    hpFactor *
    input.baseCatchRate *
    CONTAINER_MULTIPLIERS[input.container] *
    statusBonus(input.status)
  );
}

export function calculateShakeProbability(catchValue: number): number {
  return Math.min(1.0, catchValue / 255);
}

export interface CatchResult {
  caught: boolean;
  shakeProbability: number;
  shakesPassed: number;
}

/**
 * Runs the 4 consecutive shake checks. `randomSource` is injectable for
 * deterministic tests; defaults to Math.random.
 */
export function attemptCatch(
  input: CatchAttemptInput,
  randomSource: () => number = Math.random
): CatchResult {
  if (input.storyFlagUnlocked === false) {
    return { caught: false, shakeProbability: 0, shakesPassed: 0 };
  }

  const catchValue = calculateCatchValue(input);
  const shakeProbability = calculateShakeProbability(catchValue);

  let shakesPassed = 0;
  for (let i = 0; i < SHAKE_CHECKS; i++) {
    if (randomSource() < shakeProbability) {
      shakesPassed++;
    } else {
      break;
    }
  }

  return { caught: shakesPassed === SHAKE_CHECKS, shakeProbability, shakesPassed };
}

/** Rounded percentage for UI display, per spec 1.6's "approximate percentage" guidance. */
export function shakeProbabilityForDisplay(shakeProbability: number): number {
  return Math.round(shakeProbability * 100);
}
