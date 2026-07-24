import type { BattleAction, Creature } from "./types";
import { stageMultiplier } from "./statStages";
import { getCruxStatMultiplier } from "./cruxAura";

const PARALYSIS_SPEED_MULTIPLIER = 0.5;

export function statusSpeedMultiplier(creature: Creature): number {
  return creature.status === "paralysis" ? PARALYSIS_SPEED_MULTIPLIER : 1;
}

export function effectiveSpeed(creature: Creature): number {
  return (
    creature.stats.speed *
    stageMultiplier(creature.statStages.speed) *
    statusSpeedMultiplier(creature) *
    getCruxStatMultiplier(creature, "speed")
  );
}

const ACTION_BASE_PRIORITY: Record<BattleAction["kind"], number> = {
  move: 0,
  switch: 6,
  item: 6,
  invoke_crux: 0,
  flee: -7,
};

export function effectivePriority(action: BattleAction, movePriority = 0): number {
  if (action.kind === "move") return movePriority;
  return ACTION_BASE_PRIORITY[action.kind];
}

export interface OrderedAction<T extends BattleAction = BattleAction> {
  action: T;
  actor: Creature;
  priority: number;
}

/**
 * Sorts actions by effective priority (desc), then effective speed (desc),
 * falling back to a caller-supplied random tiebreak so equal-speed ties don't
 * always resolve the same way (spec 1.2).
 */
export function sortByPriority<T extends BattleAction>(
  entries: OrderedAction<T>[],
  randomTiebreak: () => number = Math.random
): OrderedAction<T>[] {
  return [...entries]
    .map((entry) => ({ entry, tiebreak: randomTiebreak() }))
    .sort((a, b) => {
      if (a.entry.priority !== b.entry.priority) return b.entry.priority - a.entry.priority;
      const speedA = effectiveSpeed(a.entry.actor);
      const speedB = effectiveSpeed(b.entry.actor);
      if (speedA !== speedB) return speedB - speedA;
      return b.tiebreak - a.tiebreak;
    })
    .map(({ entry }) => entry);
}
