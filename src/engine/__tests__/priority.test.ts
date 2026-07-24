import { sortByPriority, effectiveSpeed, effectivePriority, type OrderedAction } from "../priority";
import { activateCruxAura } from "../cruxAura";
import { makeCreature } from "./testHelpers";
import type { BattleAction } from "../types";

describe("turn priority & speed (spec 1.2)", () => {
  it("orders higher base_priority actions before moves", () => {
    const fast = makeCreature({ id: "fast", stats: { hp: 1, atk: 1, def: 1, spatk: 1, spdef: 1, speed: 200 } });
    const slow = makeCreature({ id: "slow", stats: { hp: 1, atk: 1, def: 1, spatk: 1, spdef: 1, speed: 1 } });

    const moveAction: BattleAction = { kind: "move", actorId: "fast", moveId: "m" };
    const switchAction: BattleAction = { kind: "switch", actorId: "slow", targetPartyIndex: 1 };

    const entries: OrderedAction[] = [
      { action: moveAction, actor: fast, priority: effectivePriority(moveAction, 0) },
      { action: switchAction, actor: slow, priority: effectivePriority(switchAction) },
    ];

    const [first] = sortByPriority(entries, () => 0.5);
    expect(first.action).toBe(switchAction); // switch outranks a same-tier move despite lower speed
  });

  it("orders by effective speed when priority ties", () => {
    const fast = makeCreature({ id: "fast", stats: { hp: 1, atk: 1, def: 1, spatk: 1, spdef: 1, speed: 200 } });
    const slow = makeCreature({ id: "slow", stats: { hp: 1, atk: 1, def: 1, spatk: 1, spdef: 1, speed: 1 } });
    const fastAction: BattleAction = { kind: "move", actorId: "fast", moveId: "m" };
    const slowAction: BattleAction = { kind: "move", actorId: "slow", moveId: "m" };

    const entries: OrderedAction[] = [
      { action: slowAction, actor: slow, priority: 0 },
      { action: fastAction, actor: fast, priority: 0 },
    ];

    const [first] = sortByPriority(entries, () => 0.5);
    expect(first.action).toBe(fastAction);
  });

  it("applies +30% speed for a Chivalry-aligned Crux Aura", () => {
    const creature = makeCreature({ types: ["Steel"], stats: { hp: 1, atk: 1, def: 1, spatk: 1, spdef: 1, speed: 100 } });
    const before = effectiveSpeed(creature);
    activateCruxAura(creature);
    expect(effectiveSpeed(creature)).toBeCloseTo(before * 1.3);
  });

  it("halves speed under paralysis", () => {
    const creature = makeCreature({ stats: { hp: 1, atk: 1, def: 1, spatk: 1, spdef: 1, speed: 100 } });
    const before = effectiveSpeed(creature);
    creature.status = "paralysis";
    expect(effectiveSpeed(creature)).toBeCloseTo(before * 0.5);
  });

  it("falls back to the injected random tiebreak when priority and speed both tie", () => {
    const a = makeCreature({ id: "a", stats: { hp: 1, atk: 1, def: 1, spatk: 1, spdef: 1, speed: 50 } });
    const b = makeCreature({ id: "b", stats: { hp: 1, atk: 1, def: 1, spatk: 1, spdef: 1, speed: 50 } });
    const actionA: BattleAction = { kind: "move", actorId: "a", moveId: "m" };
    const actionB: BattleAction = { kind: "move", actorId: "b", moveId: "m" };
    const entries: OrderedAction[] = [
      { action: actionA, actor: a, priority: 0 },
      { action: actionB, actor: b, priority: 0 },
    ];

    let calls = 0;
    const tiebreak = () => (calls++ === 0 ? 0.9 : 0.1); // a gets the higher roll
    const [first] = sortByPriority(entries, tiebreak);
    expect(first.action).toBe(actionA);
  });
});
