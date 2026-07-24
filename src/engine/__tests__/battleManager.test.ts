import {
  BattleStateMachine,
  resolveTurn,
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

  it("rejects submitActions when not in ACTION_SELECT", () => {
    const fsm = new BattleStateMachine(makeContext(), getMove);
    expect(() =>
      fsm.submitActions({ kind: "move", actorId: "player", moveId: "splash" }, { kind: "move", actorId: "enemy", moveId: "splash" })
    ).toThrow();
  });
});
