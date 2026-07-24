import {
  BattleStateMachine,
  resolveTurn,
  resolveAction,
  rollHit,
  canAct,
  applyFlinch,
  tickEndOfTurn,
  checkWin,
} from "../battleManager";
import { activateCruxAura } from "../cruxAura";
import { makeCreature, makeMove } from "./testHelpers";
import type { BattleContext, Move } from "../types";

function makeContext(overrides: Partial<BattleContext> = {}): BattleContext {
  return {
    playerActive: makeCreature({ id: "player", types: ["Water"] }),
    enemyActive: makeCreature({ id: "enemy", types: ["Fire"] }),
    turnCount: 0,
    fieldEffects: {},
    ...overrides,
  };
}

const moves: Record<string, Move> = {
  splash: makeMove({ id: "splash", type: "Water", power: 60 }),
};
const getMove = (id: string) => moves[id];

describe("canAct (spec 1.1 PRE_ACTION_CHECK)", () => {
  it("blocks sleeping and frozen creatures", () => {
    expect(canAct(makeCreature({ status: "sleep" }))).toBe(false);
    expect(canAct(makeCreature({ status: "freeze" }))).toBe(false);
  });

  it("blocks and consumes a flinch for exactly one action", () => {
    const creature = makeCreature({ flinched: true });
    expect(canAct(creature)).toBe(false);
    expect(creature.flinched).toBe(false);
    expect(canAct(creature)).toBe(true);
  });

  it("can fully paralyze based on the injected random source", () => {
    const creature = makeCreature({ status: "paralysis" });
    expect(canAct(creature, () => 0)).toBe(false); // 0 < 0.25 threshold
    expect(canAct(creature, () => 0.99)).toBe(true);
  });
});

describe("applyFlinch + Crux flinch immunity", () => {
  it("sets flinched normally", () => {
    const creature = makeCreature();
    applyFlinch(creature);
    expect(creature.flinched).toBe(true);
  });

  it("is blocked by an active Chivalry-aligned Crux Aura", () => {
    const creature = makeCreature({ types: ["Steel"] });
    activateCruxAura(creature);
    applyFlinch(creature);
    expect(creature.flinched).toBe(false);
  });
});

describe("tickEndOfTurn", () => {
  it("applies burn/poison DOT and decrements field effect counters", () => {
    const ctx = makeContext({ fieldEffects: { weather_sirocco: 2 } });
    ctx.playerActive.status = "burn";
    const hpBefore = ctx.playerActive.currentHp;
    tickEndOfTurn(ctx);
    expect(ctx.playerActive.currentHp).toBeLessThan(hpBefore);
    expect(ctx.fieldEffects.weather_sirocco).toBe(1);
  });

  it("removes a field effect once it reaches 0 turns remaining", () => {
    const ctx = makeContext({ fieldEffects: { weather_sirocco: 1 } });
    tickEndOfTurn(ctx);
    expect(ctx.fieldEffects.weather_sirocco).toBeUndefined();
  });
});

describe("checkWin", () => {
  it("declares the player winner when the enemy faints", () => {
    const ctx = makeContext();
    ctx.enemyActive.currentHp = 0;
    expect(checkWin(ctx)).toBe("player");
  });

  it("declares the enemy winner when the player faints", () => {
    const ctx = makeContext();
    ctx.playerActive.currentHp = 0;
    expect(checkWin(ctx)).toBe("enemy");
  });

  it("returns null while both combatants are still standing", () => {
    expect(checkWin(makeContext())).toBeNull();
  });
});

describe("rollHit (accuracy/miss)", () => {
  it("never misses a >=100 accuracy move regardless of the random roll", () => {
    const actor = makeCreature();
    const target = makeCreature();
    const move = makeMove({ accuracy: 100 });
    expect(rollHit(actor, target, move, () => 1)).toBe(true); // even a boundary roll of 1
    expect(rollHit(actor, target, move, () => 0.9999)).toBe(true);
  });

  it("misses a <100 accuracy move when the roll is above the hit chance", () => {
    const actor = makeCreature();
    const target = makeCreature();
    const move = makeMove({ accuracy: 80 });
    expect(rollHit(actor, target, move, () => 0.9)).toBe(false); // 0.9 >= 0.8 -> miss
    expect(rollHit(actor, target, move, () => 0.1)).toBe(true); // 0.1 < 0.8 -> hit
  });
});

describe("resolveAction outcome (hit/miss/damage/crit surfaced to callers)", () => {
  it("reports a miss with zero damage when the move fails its accuracy check", () => {
    const ctx = makeContext();
    const move = makeMove({ id: "risky", accuracy: 50 });
    const outcome = resolveAction(
      ctx,
      { kind: "move", actorId: "player", moveId: "risky" },
      () => move,
      () => 0.9 // 0.9 >= 0.5 -> miss
    );
    expect(outcome.hit).toBe(false);
    expect(outcome.damage).toBe(0);
    expect(ctx.enemyActive.currentHp).toBe(ctx.enemyActive.stats.hp); // untouched
  });

  it("reports damage dealt and crit flag on a hit", () => {
    const ctx = makeContext();
    const move = makeMove({ id: "splash", accuracy: 100, power: 60 });
    const outcome = resolveAction(
      ctx,
      { kind: "move", actorId: "player", moveId: "splash" },
      () => move,
      () => 1 // no crit (1 is not < BASE_CRIT_CHANCE), top of damage-roll range
    );
    expect(outcome.hit).toBe(true);
    expect(outcome.damage).toBeGreaterThan(0);
    expect(outcome.crit).toBe(false);
  });
});

describe("resolveTurn", () => {
  it("applies damage from both actions and advances the turn count", () => {
    const ctx = makeContext();
    const enemyHpBefore = ctx.enemyActive.currentHp;
    const playerHpBefore = ctx.playerActive.currentHp;

    resolveTurn(
      ctx,
      { kind: "move", actorId: "player", moveId: "splash" },
      { kind: "move", actorId: "enemy", moveId: "splash" },
      getMove,
      () => 1 // no crits, top of random-factor range
    );

    expect(ctx.enemyActive.currentHp).toBeLessThan(enemyHpBefore);
    expect(ctx.playerActive.currentHp).toBeLessThan(playerHpBefore);
    expect(ctx.turnCount).toBe(1);
  });

  it("stops resolving further actions once one side has fainted", () => {
    const ctx = makeContext({
      enemyActive: makeCreature({ id: "enemy", types: ["Fire"], currentHp: 1, stats: { hp: 1, atk: 1, def: 1, spatk: 1, spdef: 1, speed: 1 } }),
      playerActive: makeCreature({ id: "player", types: ["Water"], stats: { hp: 100, atk: 999, def: 1, spatk: 1, spdef: 1, speed: 999 } }),
    });

    resolveTurn(
      ctx,
      { kind: "move", actorId: "player", moveId: "splash" },
      { kind: "move", actorId: "enemy", moveId: "splash" },
      getMove,
      () => 1
    );

    expect(ctx.enemyActive.currentHp).toBe(0);
    // the faster player one-shots the enemy, so the enemy's action never resolves
    expect(ctx.playerActive.currentHp).toBe(100);
  });
});

describe("BattleStateMachine", () => {
  it("walks through the documented state sequence for a normal turn", () => {
    const ctx = makeContext();
    const seen: string[] = [];
    const fsm = new BattleStateMachine(ctx, getMove, () => 1);
    fsm.onStateChange((state) => seen.push(state));

    fsm.start();
    expect(seen).toEqual(["BATTLE_INIT", "TURN_START", "ACTION_SELECT"]);
    expect(fsm.getState()).toBe("ACTION_SELECT");

    seen.length = 0;
    const winner = fsm.submitActions(
      { kind: "move", actorId: "player", moveId: "splash" },
      { kind: "move", actorId: "enemy", moveId: "splash" }
    );

    expect(winner).toBeNull();
    expect(seen).toEqual([
      "PRIORITY_SORT",
      "ACTION_RESOLVE",
      "END_OF_TURN",
      "WIN_CHECK",
      "TURN_START",
      "ACTION_SELECT",
    ]);
  });

  it("transitions to BATTLE_END when a combatant faints", () => {
    const ctx = makeContext({
      enemyActive: makeCreature({ id: "enemy", types: ["Fire"], currentHp: 1, stats: { hp: 1, atk: 1, def: 1, spatk: 1, spdef: 1, speed: 1 } }),
      playerActive: makeCreature({ id: "player", types: ["Water"], stats: { hp: 100, atk: 999, def: 1, spatk: 1, spdef: 1, speed: 999 } }),
    });
    const fsm = new BattleStateMachine(ctx, getMove, () => 1);
    fsm.start();

    const winner = fsm.submitActions(
      { kind: "move", actorId: "player", moveId: "splash" },
      { kind: "move", actorId: "enemy", moveId: "splash" }
    );

    expect(winner).toBe("player");
    expect(fsm.getState()).toBe("BATTLE_END");
  });

  describe("submitActions onActionResolved callback", () => {
    it("fires once per actor, in real speed order, for a normal turn", () => {
      const ctx = makeContext({
        playerActive: makeCreature({ id: "player", types: ["Water"], stats: { hp: 100, atk: 80, def: 80, spatk: 80, spdef: 80, speed: 100 } }),
        enemyActive: makeCreature({ id: "enemy", types: ["Fire"], stats: { hp: 100, atk: 80, def: 80, spatk: 80, spdef: 80, speed: 50 } }),
      });
      const fsm = new BattleStateMachine(ctx, getMove, () => 1);
      fsm.start();

      const actorIds: string[] = [];
      fsm.submitActions(
        { kind: "move", actorId: "player", moveId: "splash" },
        { kind: "move", actorId: "enemy", moveId: "splash" },
        (outcome) => actorIds.push(outcome.actor.id)
      );

      // Player is faster, so it should always be reported as acting first.
      expect(actorIds).toEqual(["player", "enemy"]);
    });

    it("fires exactly once when the faster actor's hit ends the battle", () => {
      const ctx = makeContext({
        enemyActive: makeCreature({ id: "enemy", types: ["Fire"], currentHp: 1, stats: { hp: 1, atk: 1, def: 1, spatk: 1, spdef: 1, speed: 1 } }),
        playerActive: makeCreature({ id: "player", types: ["Water"], stats: { hp: 100, atk: 999, def: 1, spatk: 1, spdef: 1, speed: 999 } }),
      });
      const fsm = new BattleStateMachine(ctx, getMove, () => 1);
      fsm.start();

      const outcomes: string[] = [];
      fsm.submitActions(
        { kind: "move", actorId: "player", moveId: "splash" },
        { kind: "move", actorId: "enemy", moveId: "splash" },
        (outcome) => outcomes.push(outcome.actor.id)
      );

      // The enemy's action never actually resolves, so the callback never fires for it —
      // the UI reveal is driven off exactly this callback, so it can't show a beat that didn't happen.
      expect(outcomes).toEqual(["player"]);
    });
  });

  it("rejects submitActions when not in ACTION_SELECT", () => {
    const fsm = new BattleStateMachine(makeContext(), getMove);
    expect(() =>
      fsm.submitActions({ kind: "move", actorId: "player", moveId: "splash" }, { kind: "move", actorId: "enemy", moveId: "splash" })
    ).toThrow();
  });

  describe("replacePlayerActive (forced/voluntary switch)", () => {
    it("un-ends a BATTLE_END caused by the player's own faint when a healthy replacement comes in", () => {
      const ctx = makeContext({
        playerActive: makeCreature({ id: "player", types: ["Water"], currentHp: 1, stats: { hp: 1, atk: 1, def: 1, spatk: 1, spdef: 1, speed: 1 } }),
        enemyActive: makeCreature({ id: "enemy", types: ["Fire"], stats: { hp: 100, atk: 999, def: 1, spatk: 1, spdef: 1, speed: 999 } }),
      });
      const fsm = new BattleStateMachine(ctx, getMove, () => 1);
      fsm.start();

      const winner = fsm.submitActions(
        { kind: "move", actorId: "player", moveId: "splash" },
        { kind: "move", actorId: "enemy", moveId: "splash" }
      );
      expect(winner).toBe("enemy");
      expect(fsm.getState()).toBe("BATTLE_END");

      const reserve = makeCreature({ id: "reserve", types: ["Water"] });
      fsm.replacePlayerActive(reserve);

      expect(fsm.getState()).toBe("ACTION_SELECT");
      expect(fsm.getContext().playerActive.id).toBe("reserve");
    });

    it("does not un-end the battle if the replacement itself has no HP", () => {
      const ctx = makeContext({
        playerActive: makeCreature({ id: "player", currentHp: 1, stats: { hp: 1, atk: 1, def: 1, spatk: 1, spdef: 1, speed: 1 } }),
        enemyActive: makeCreature({ id: "enemy", stats: { hp: 100, atk: 999, def: 1, spatk: 1, spdef: 1, speed: 999 } }),
      });
      const fsm = new BattleStateMachine(ctx, getMove, () => 1);
      fsm.start();
      fsm.submitActions({ kind: "move", actorId: "player", moveId: "splash" }, { kind: "move", actorId: "enemy", moveId: "splash" });
      expect(fsm.getState()).toBe("BATTLE_END");

      fsm.replacePlayerActive(makeCreature({ id: "fainted-reserve", currentHp: 0 }));
      expect(fsm.getState()).toBe("BATTLE_END");
    });

    it("supports a voluntary switch mid-battle via a switch action that costs the turn", () => {
      const ctx = makeContext();
      const fsm = new BattleStateMachine(ctx, getMove, () => 1);
      fsm.start();

      const reserve = makeCreature({ id: "reserve", types: ["Water"] });
      fsm.replacePlayerActive(reserve);
      expect(fsm.getState()).toBe("ACTION_SELECT"); // no faint occurred, nothing to un-end

      const enemyHpBefore = fsm.getContext().enemyActive.currentHp;
      fsm.submitActions(
        { kind: "switch", actorId: "reserve", targetPartyIndex: 0 },
        { kind: "move", actorId: "enemy", moveId: "splash" }
      );

      // The switch itself is a no-op in resolveAction; the enemy's move still lands on the new creature.
      expect(fsm.getContext().enemyActive.currentHp).toBe(enemyHpBefore);
      expect(fsm.getContext().playerActive.currentHp).toBeLessThan(reserve.stats.hp);
    });
  });
});
