import type { Creature, StatusEffect } from "./types";

export function getActiveEffect(creature: Creature, id: string): StatusEffect | undefined {
  return creature.activeEffects.find((e) => e.id === id);
}

export function removeEffect(creature: Creature, id: string): void {
  creature.activeEffects = creature.activeEffects.filter((e) => e.id !== id);
}

/**
 * Advances every active effect on a creature by one turn: fires onTurnTick,
 * decrements duration, and fires onExpire when it hits zero. Effects with
 * `turnsRemaining === null` persist until something else removes them.
 * An expiring effect with no onExpire hook is removed automatically.
 */
export function tickStatusEffects(creature: Creature): void {
  const snapshot = [...creature.activeEffects];
  for (const effect of snapshot) {
    effect.onTurnTick?.(creature);
    if (effect.turnsRemaining === null) continue;
    effect.turnsRemaining -= 1;
    if (effect.turnsRemaining <= 0) {
      if (effect.onExpire) {
        effect.onExpire(creature);
      } else {
        removeEffect(creature, effect.id);
      }
    }
  }
}
