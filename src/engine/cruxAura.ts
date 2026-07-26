import type { Creature, StatusEffect } from "./types";
import type { TypeName } from "../data/schemas";
import { getActiveEffect, removeEffect } from "./statusEffects";

export type CruxAlignment = "chivalry" | "antiquity" | "off-alignment";

const CHIVALRY_TYPES: TypeName[] = ["Steel", "Fighting"];
const ANTIQUITY_TYPES: TypeName[] = ["Rock", "Psychic", "Ghost"];

export const CRUX_AURA_STATUS_ID = "crux_aura";
export const CRUX_AURA_SPENT_STATUS_ID = "crux_aura_spent";
export const CRUX_AURA_DURATION = 3;
export const CRUX_AURA_SPENT_DURATION = 2;
export const CRUX_AUTO_TRIGGER_HP_THRESHOLD = 0.33;

export interface CruxAuraEffect extends StatusEffect {
  id: typeof CRUX_AURA_STATUS_ID;
  alignment: CruxAlignment;
}

export function getCruxAlignment(creature: Creature): CruxAlignment {
  if (creature.types.some((t) => CHIVALRY_TYPES.includes(t))) return "chivalry";
  if (creature.types.some((t) => ANTIQUITY_TYPES.includes(t))) return "antiquity";
  return "off-alignment";
}

/** True while a Crux Aura is already active or its post-expiry cooldown (Aura-Spent) is running. */
export function isCruxOnCooldown(creature: Creature): boolean {
  return (
    getActiveEffect(creature, CRUX_AURA_STATUS_ID) !== undefined ||
    getActiveEffect(creature, CRUX_AURA_SPENT_STATUS_ID) !== undefined
  );
}

export function shouldAutoTriggerCrux(creature: Creature): boolean {
  if (isCruxOnCooldown(creature)) return false;
  return creature.currentHp / creature.stats.hp <= CRUX_AUTO_TRIGGER_HP_THRESHOLD;
}

/**
 * Activates Crux Aura as a StatusEffect (spec 1.5 implementation note) rather than
 * a damage-formula special case, so future abilities can hook onApply/onTurnTick/onExpire.
 */
export function activateCruxAura(creature: Creature): CruxAuraEffect | undefined {
  if (isCruxOnCooldown(creature)) return undefined;

  const alignment = getCruxAlignment(creature);
  const effect: CruxAuraEffect = {
    id: CRUX_AURA_STATUS_ID,
    alignment,
    turnsRemaining: CRUX_AURA_DURATION,
    onExpire: (target) => {
      removeEffect(target, CRUX_AURA_STATUS_ID);
      target.activeEffects.push({
        id: CRUX_AURA_SPENT_STATUS_ID,
        turnsRemaining: CRUX_AURA_SPENT_DURATION,
        onExpire: (t) => removeEffect(t, CRUX_AURA_SPENT_STATUS_ID),
      });
    },
  };
  creature.activeEffects.push(effect);
  effect.onApply?.(creature);
  return effect;
}

export type CruxRelevantStat = "atk" | "spatk" | "def" | "spdef" | "speed";

/** Flat stat multiplier contributed by an active Crux Aura or its Aura-Spent decay. */
export function getCruxStatMultiplier(creature: Creature, stat: CruxRelevantStat): number {
  const active = getActiveEffect(creature, CRUX_AURA_STATUS_ID) as CruxAuraEffect | undefined;
  if (active) {
    if (active.alignment === "chivalry") {
      return stat === "atk" || stat === "speed" ? 1.3 : 1;
    }
    if (active.alignment === "antiquity") {
      return stat === "spatk" ? 1.3 : 1;
    }
    return 1.15; // off-alignment: flat +15% all stats
  }
  if (getActiveEffect(creature, CRUX_AURA_SPENT_STATUS_ID)) {
    return 0.85; // Aura-Spent decay: flat -15% all stats
  }
  return 1;
}

/** Antiquity-aligned Crux Aura grants +2 evasion stages while active. */
export function getCruxEvasionStageBonus(creature: Creature): number {
  const active = getActiveEffect(creature, CRUX_AURA_STATUS_ID) as CruxAuraEffect | undefined;
  return active?.alignment === "antiquity" ? 2 : 0;
}

export function isImmuneToFlinchViaCrux(creature: Creature): boolean {
  const active = getActiveEffect(creature, CRUX_AURA_STATUS_ID) as CruxAuraEffect | undefined;
  return active?.alignment === "chivalry";
}

export function isImmuneToConfusionViaCrux(creature: Creature): boolean {
  const active = getActiveEffect(creature, CRUX_AURA_STATUS_ID) as CruxAuraEffect | undefined;
  return active?.alignment === "antiquity";
}
