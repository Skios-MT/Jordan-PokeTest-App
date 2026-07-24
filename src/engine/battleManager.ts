import type { BattleAction, BattleContext, Creature, Move } from "./types";
import { calculateDamage, BASE_CRIT_CHANCE } from "./damage";
import { sortByPriority, effectivePriority, type OrderedAction } from "./priority";
import { activateCruxAura, getCruxStatMultiplier, isImmuneToFlinchViaCrux } from "./cruxAura";
import { tickStatusEffects } from "./statusEffects";

export type BattleState =
  | "IDLE"
  | "BATTLE_INIT"
  | "TURN_START"
  | "ACTION_SELECT"
  | "PRIORITY_SORT"
  | "ACTION_RESOLVE"
  | "END_OF_TURN"
  | "WIN_CHECK"
  | "BATTLE_END";

export type Winner = "player" | "enemy" | null;

export type BattleStateListener = (state: BattleState, ctx: BattleContext) => void;

export type MoveResolver = (moveId: string) => Move;

/** Placeholder DOT fraction: the spec's state diagram calls for burn/poison ticks but
 * doesn't pin an exact fraction — 1/16 max HP matches genre convention pending a balance pass. */
const STATUS_DOT_FRACTION = 1 / 16;
const PARALYSIS_FULL_STOP_CHANCE = 0.25;

function actorFor(ctx: BattleContext, actorId: string): Creature {
  return ctx.playerActive.id === actorId ? ctx.playerActive : ctx.enemyActive;
}

function opponentOf(ctx: BattleContext, actor: Creature): Creature {
  return ctx.playerActive.id === actor.id ? ctx.enemyActive : ctx.playerActive;
}

function applyStatusDot(creature: Creature): number {
  if (creature.status !== "burn" && creature.status !== "poison") return 0;
  const dmg = Math.max(1, Math.floor(creature.stats.hp * STATUS_DOT_FRACTION));
  creature.currentHp = Math.max(0, creature.currentHp - dmg);
  return dmg;
}

export function canAct(actor: Creature, randomSource: () => number = Math.random): boolean {
  if (actor.status === "sleep" || actor.status === "freeze") return false;
  if (actor.flinched) {
    actor.flinched = false; // flinch only blocks the one action it was applied for
    return false;
  }
  if (actor.status === "paralysis" && randomSource() < PARALYSIS_FULL_STOP_CHANCE) return false;
  return true;
}

export function applyFlinch(target: Creature): void {
  if (isImmuneToFlinchViaCrux(target)) return;
  target.flinched = true;
}

/**
 * Resolves a single actor's action against the current context. Mirrors the
 * spec 5.3 boilerplate's resolveTurn loop body, but as a standalone function
 * so it can be unit tested per-action rather than only via the full FSM.
 */
export function resolveAction(
  ctx: BattleContext,
  action: BattleAction,
  getMove: MoveResolver,
  randomSource: () => number = Math.random
): void {
  const actor = actorFor(ctx, action.actorId);

  if (action.kind === "invoke_crux") {
    activateCruxAura(actor);
    return;
  }

  if (!canAct(actor, randomSource)) return;

  if (action.kind === "move") {
    const target = opponentOf(ctx, actor);
    const move = getMove(action.moveId);
    const cruxAuraMultiplier = getCruxStatMultiplier(actor, move.category === "special" ? "spatk" : "atk");
    const dmg = calculateDamage(actor, target, move, {
      cruxAuraMultiplier,
      isCrit: randomSource() < BASE_CRIT_CHANCE,
      randomFactor: 0.85 + randomSource() * 0.15,
    });
    target.currentHp = Math.max(0, target.currentHp - dmg);
    if (move.statusEffect && move.statusEffect !== "none" && target.status === "none") {
      target.status = move.statusEffect;
    }
  }
  // switch / item / flee: same pattern (mutate ctx accordingly) — omitted, no battle-engine
  // math involved beyond what's already covered by tests for move resolution.
}

export function tickEndOfTurn(ctx: BattleContext): void {
  for (const creature of [ctx.playerActive, ctx.enemyActive]) {
    tickStatusEffects(creature);
    applyStatusDot(creature);
  }
  for (const key of Object.keys(ctx.fieldEffects)) {
    ctx.fieldEffects[key] = Math.max(0, ctx.fieldEffects[key] - 1);
    if (ctx.fieldEffects[key] === 0) delete ctx.fieldEffects[key];
  }
}

export function checkWin(ctx: BattleContext): Winner {
  if (ctx.enemyActive.currentHp <= 0) return "player";
  if (ctx.playerActive.currentHp <= 0) return "enemy";
  return null;
}

/**
 * One full ACTION_RESOLVE + END_OF_TURN pass for two submitted actions,
 * matching the spec 5.3 `resolveTurn` boilerplate's signature and intent.
 */
export function resolveTurn(
  ctx: BattleContext,
  playerAction: BattleAction,
  enemyAction: BattleAction,
  getMove: MoveResolver,
  randomSource: () => number = Math.random
): BattleContext {
  const ordered: OrderedAction[] = sortByPriority(
    [playerAction, enemyAction].map((action) => ({
      action,
      actor: actorFor(ctx, action.actorId),
      priority: effectivePriority(action, action.kind === "move" ? getMove(action.moveId).basePriority : 0),
    })),
    randomSource
  );

  for (const entry of ordered) {
    if (checkWin(ctx)) break;
    resolveAction(ctx, entry.action, getMove, randomSource);
  }

  tickEndOfTurn(ctx);
  ctx.turnCount += 1;
  return ctx;
}

export class BattleStateMachine {
  private state: BattleState = "IDLE";
  private listeners: BattleStateListener[] = [];

  constructor(private ctx: BattleContext, private getMove: MoveResolver, private randomSource: () => number = Math.random) {}

  getState(): BattleState {
    return this.state;
  }

  getContext(): BattleContext {
    return this.ctx;
  }

  onStateChange(listener: BattleStateListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private setState(next: BattleState): void {
    this.state = next;
    for (const listener of this.listeners) listener(next, this.ctx);
  }

  /** IDLE -> BATTLE_INIT -> TURN_START -> ACTION_SELECT */
  start(): void {
    if (this.state !== "IDLE") throw new Error(`Cannot start battle from state ${this.state}`);
    this.setState("BATTLE_INIT");
    this.setState("TURN_START");
    this.setState("ACTION_SELECT");
  }

  /** ACTION_SELECT -> PRIORITY_SORT -> ACTION_RESOLVE -> END_OF_TURN -> WIN_CHECK -> (TURN_START | BATTLE_END) */
  submitActions(playerAction: BattleAction, enemyAction: BattleAction): Winner {
    if (this.state !== "ACTION_SELECT") {
      throw new Error(`Cannot submit actions from state ${this.state}`);
    }

    this.setState("PRIORITY_SORT");
    const ordered = sortByPriority(
      [playerAction, enemyAction].map((action) => ({
        action,
        actor: actorFor(this.ctx, action.actorId),
        priority: effectivePriority(
          action,
          action.kind === "move" ? this.getMove(action.moveId).basePriority : 0
        ),
      })),
      this.randomSource
    );

    this.setState("ACTION_RESOLVE");
    for (const entry of ordered) {
      if (checkWin(this.ctx)) break;
      resolveAction(this.ctx, entry.action, this.getMove, this.randomSource);
    }

    this.setState("END_OF_TURN");
    tickEndOfTurn(this.ctx);

    this.setState("WIN_CHECK");
    this.ctx.turnCount += 1;
    const winner = checkWin(this.ctx);

    if (winner) {
      this.setState("BATTLE_END");
    } else {
      this.setState("TURN_START");
      this.setState("ACTION_SELECT");
    }
    return winner;
  }
}
