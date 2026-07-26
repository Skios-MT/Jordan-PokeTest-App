import type { StatBlock } from "../data/schemas";

/** Species base stats (starters.json's baseStatsFinal, etc.) are treated as
 * roughly "level-50 reference" values, scaled down/up from there — there's
 * no separately-authored per-level stat curve in the data files. */
const REFERENCE_LEVEL = 50;
/** Flat HP floor so low-level creatures aren't reduced to single-digit HP pools. */
const HP_FLOOR = 10;

export function effectiveStats(base: StatBlock, level: number): StatBlock {
  const scale = (v: number) => Math.max(1, Math.round((v * level) / REFERENCE_LEVEL));
  return {
    hp: scale(base.hp) + HP_FLOOR,
    atk: scale(base.atk),
    def: scale(base.def),
    spatk: scale(base.spatk),
    spdef: scale(base.spdef),
    speed: scale(base.speed),
  };
}

/** XP required to advance from `level` to `level + 1`. A modest linear curve —
 * no cubic from-level-1 curve, since starters begin at level 5, not 1. */
export function xpToNextLevel(level: number): number {
  return 20 + level * 12;
}

/** XP awarded for defeating (or catching) a creature at the given level. */
export function xpRewardForLevel(level: number): number {
  return Math.max(5, level * 8);
}

/** Currency awarded for defeating or catching a creature at the given level. */
export function currencyRewardForLevel(level: number): number {
  return Math.max(3, level * 5);
}
