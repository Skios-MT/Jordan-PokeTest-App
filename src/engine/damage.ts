import type { Creature, Move } from "./types";
import { getTypeMultiplier } from "./typeChart";
import { stageMultiplier } from "./statStages";

export const BASE_CRIT_CHANCE = 0.0625;
export const CRIT_MULTIPLIER = 1.5;
export const STAB_MULTIPLIER = 1.5;

export interface DamageOptions {
  /** Defaults to a base-rate roll (BASE_CRIT_CHANCE) when omitted. */
  isCrit?: boolean;
  /** +30%/+15%/etc from an active Crux Aura; defaults to 1 (no aura active). */
  cruxAuraMultiplier?: number;
  /** e.g. "Sirocco Sands" +20% Ground/Rock, -20% Water; defaults to 1 (no weather). */
  weatherMultiplier?: number;
  /** uniform(0.85, 1.00) per spec 1.3; injectable for deterministic tests. */
  randomFactor?: number;
}

function floorMul(value: number, multiplier: number): number {
  return Math.floor(value * multiplier);
}

/**
 * Attacking-side effective stat for a move (physical uses atk, special uses spatk).
 * Move category is inferred from `move.category` if present, else physical.
 */
function attackStat(attacker: Creature, category: "physical" | "special"): number {
  const base = category === "special" ? attacker.stats.spatk : attacker.stats.atk;
  const stage = category === "special" ? attacker.statStages.spatk : attacker.statStages.atk;
  return base * stageMultiplier(stage);
}

function defenseStat(defender: Creature, category: "physical" | "special"): number {
  const base = category === "special" ? defender.stats.spdef : defender.stats.def;
  const stage = category === "special" ? defender.statStages.spdef : defender.statStages.def;
  return base * stageMultiplier(stage);
}

export function calculateDamage(
  attacker: Creature,
  defender: Creature,
  move: Move,
  options: DamageOptions = {}
): number {
  const typeEffectiveness = getTypeMultiplier(move.type, defender.types);
  if (typeEffectiveness === 0) return 0;

  const atkStat = attackStat(attacker, move.category);
  const defStat = defenseStat(defender, move.category);

  const base =
    (((2 * attacker.level) / 5 + 2) * move.power * (atkStat / defStat)) / 50 + 2;

  const stab = attacker.types.includes(move.type) ? STAB_MULTIPLIER : 1;
  const isCrit = options.isCrit ?? Math.random() < BASE_CRIT_CHANCE;
  const crit = isCrit ? CRIT_MULTIPLIER : 1;
  const cruxAura = options.cruxAuraMultiplier ?? 1;
  const weather = options.weatherMultiplier ?? 1;
  const random = options.randomFactor ?? 0.85 + Math.random() * 0.15;

  let damage = base;
  damage = floorMul(damage, stab);
  damage = floorMul(damage, typeEffectiveness);
  damage = floorMul(damage, crit);
  damage = floorMul(damage, cruxAura);
  damage = floorMul(damage, random);
  damage = floorMul(damage, weather);

  return Math.max(1, damage);
}
