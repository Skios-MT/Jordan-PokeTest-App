import { useEffect, useMemo, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { useGameStore, type ExperienceGainResult } from "../state/gameStore";
import type { BattleParticipant } from "../game/creatureFactory";
import { buildBiomeEncounterTable, rollEncounter } from "../game/encounterTable";
import { getZoneEncounterSettings } from "../game/zones";
import {
  creatureFromPartyMember,
  partyMemberFromParticipant,
  partyMemberStats,
  applyLevelUp,
} from "../game/party";
import { xpRewardForLevel, currencyRewardForLevel } from "../game/progression";
import { getMove } from "../game/movesRepo";
import { pickBestAvailableBall, getItem, usableItems } from "../game/itemsRepo";
import { BattleStateMachine, type Winner, type ActionOutcome } from "../engine/battleManager";
import { attemptCatch, type ContainerType } from "../engine/catching";
import { isCruxOnCooldown, CRUX_AURA_STATUS_ID } from "../engine/cruxAura";
import { getActiveEffect } from "../engine/statusEffects";
import { getTypeMultiplier } from "../engine/typeChart";
import type { BattleAction, BattleContext, Creature } from "../engine/types";
import { TypeBadge } from "./components/TypeBadge";
import { PrimaryButton } from "./components/PrimaryButton";
import { useCombatantAnimation } from "./components/useCombatantAnimation";
import { BattleStage, PROJECTILE_TRAVEL_MS, BALL_TRAVEL_MS, type BattleStageHandle } from "./components/BattleStage";
import { HoverTip } from "./components/HoverTip";
import { useKeyboardShortcuts } from "./components/useKeyboardShortcuts";
import { LevelUpModal, type LevelUpRevealData } from "./components/LevelUpModal";
import { EvolutionModal, type EvolutionRevealData } from "./components/EvolutionModal";
import { colors } from "./theme";

/** Chance a defeated or caught wild creature drops a Kinnie — rare, never sold. */
const KINNIE_DROP_CHANCE = 0.1;

type Props = NativeStackScreenProps<RootStackParamList, "Battle">;

const WILD_BASE_CATCH_RATE = 190;
const MAX_LOG_LINES = 5;
/** Pause between the first and second actor's reveal, so each turn plays out in two beats rather than instantly. */
const TURN_BEAT_DELAY_MS = 550;
/** A hit clearing this fraction of max HP counts as a "big" hit for animation purposes. */
const BIG_HIT_FRACTION = 0.25;

type Outcome = Winner | "caught" | "fled";

/** One resolved action queued up for reveal, paired with the battle snapshot
 * exactly as it stood right after that action resolved (captured synchronously
 * inside the engine's onActionResolved callback — ctx has already moved on to
 * reflect BOTH actions by the time reveal playback starts, so this snapshot is
 * the only way to show HP dropping progressively, beat by beat). */
interface RevealBeat {
  outcome: ActionOutcome;
  snapshotAfter: BattleSnapshot;
}

interface BattleRewards {
  money: number;
  xp: number;
  leveledUp: boolean;
  newLevel?: number;
  kinnieDropped?: boolean;
}

interface BattleSnapshot {
  playerHp: number;
  playerMaxHp: number;
  enemyHp: number;
  enemyMaxHp: number;
  playerCruxActive: boolean;
  playerCruxOnCooldown: boolean;
}

function snapshotFrom(ctx: BattleContext): BattleSnapshot {
  return {
    playerHp: ctx.playerActive.currentHp,
    playerMaxHp: ctx.playerActive.stats.hp,
    enemyHp: ctx.enemyActive.currentHp,
    enemyMaxHp: ctx.enemyActive.stats.hp,
    playerCruxActive: getActiveEffect(ctx.playerActive, CRUX_AURA_STATUS_ID) !== undefined,
    playerCruxOnCooldown: isCruxOnCooldown(ctx.playerActive),
  };
}

export function BattleScreen({ navigation, route }: Props) {
  const biome = route.params.biome;
  const selectedLine = useGameStore((s) => s.selectedLine) ?? "Water";
  const currentZoneId = useGameStore((s) => s.currentZoneId);
  const inventory = useGameStore((s) => s.inventory);
  const recordBattleResult = useGameStore((s) => s.recordBattleResult);
  const updatePartyMemberHp = useGameStore((s) => s.updatePartyMemberHp);
  const consumeItem = useGameStore((s) => s.consumeItem);
  const catchCreature = useGameStore((s) => s.catchCreature);
  const markSeen = useGameStore((s) => s.markSeen);
  const earnCurrency = useGameStore((s) => s.earnCurrency);
  const grantExperience = useGameStore((s) => s.grantExperience);
  const addItem = useGameStore((s) => s.addItem);
  const bumpPartyMemberLevel = useGameStore((s) => s.bumpPartyMemberLevel);
  const party = useGameStore((s) => s.party);

  const [activeUid] = useState<string | undefined>(() => party.find((m) => m.currentHp > 0)?.uid);
  const activeUidRef = useRef(activeUid);
  const [, forceRerender] = useState(0);
  function setActiveUid(uid: string) {
    activeUidRef.current = uid;
    forceRerender((n) => n + 1);
  }
  const activeMember = party.find((m) => m.uid === activeUidRef.current);

  const encounterTable = useMemo(
    () => buildBiomeEncounterTable(biome, selectedLine, getZoneEncounterSettings(currentZoneId)),
    [biome, selectedLine, currentZoneId]
  );
  const enemy = useMemo<BattleParticipant>(
    () => rollEncounter(encounterTable, `enemy-${Math.random().toString(36).slice(2, 8)}`),
    [encounterTable]
  );

  const fsmRef = useRef<BattleStateMachine | null>(null);
  if (!fsmRef.current && activeMember) {
    const ctx: BattleContext = {
      playerActive: creatureFromPartyMember(activeMember),
      enemyActive: enemy.creature,
      turnCount: 0,
      fieldEffects: {},
    };
    fsmRef.current = new BattleStateMachine(ctx, getMove);
    fsmRef.current.start();
  }
  const fsm = fsmRef.current;

  const [snapshot, setSnapshot] = useState<BattleSnapshot | null>(() => (fsm ? snapshotFrom(fsm.getContext()) : null));
  const [log, setLog] = useState<string[]>([`A wild ${enemy.displayName} appeared!`]);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [rewards, setRewards] = useState<BattleRewards | null>(null);
  const [showParty, setShowParty] = useState(false);
  const [showItems, setShowItems] = useState(false);
  const [forcedSwitchPending, setForcedSwitchPending] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [levelUpReveal, setLevelUpReveal] = useState<LevelUpRevealData | null>(null);
  /** Takes priority over levelUpReveal — an evolution reveal always plays first, then falls
   * through to the stat-comparison screen once dismissed (see the render's priority chain). */
  const [evolutionReveal, setEvolutionReveal] = useState<EvolutionRevealData | null>(null);
  /** Set when a level-up needs to finish resolving (mutating ctx, consuming the item,
   * continuing the turn) only once the player dismisses the LevelUpModal — e.g. using a
   * Kinnie mid-battle should pause on the stat-comparison screen before the enemy's turn plays. */
  const afterLevelUpDismissRef = useRef<(() => void) | null>(null);

  const playerAnim = useCombatantAnimation();
  const enemyAnim = useCombatantAnimation();
  const stageRef = useRef<BattleStageHandle>(null);

  useEffect(() => {
    markSeen(enemy.creature.speciesId);
  }, [enemy.creature.speciesId, markSeen]);

  function pushLog(lines: string[]) {
    setLog((prev) => [...prev, ...lines].slice(-MAX_LOG_LINES));
  }

  function pickEnemyMoveId(): string {
    const ids = enemy.moveIds;
    return ids[Math.floor(Math.random() * ids.length)];
  }

  /** 10% chance, rolled once per defeated/caught wild creature — Kinnie is never sold, drop-only. */
  function rollKinnieDrop(): boolean {
    const dropped = Math.random() < KINNIE_DROP_CHANCE;
    if (dropped) {
      addItem("kinnie", 1);
      pushLog([`Wild ${enemy.displayName} dropped a Kinnie!`]);
    }
    return dropped;
  }

  function finishBattle(result: "player" | "enemy", finalCtx: BattleContext) {
    setOutcome(result);
    recordBattleResult(result === "player");
    if (result !== "player") return;

    const money = currencyRewardForLevel(enemy.creature.level);
    const xp = xpRewardForLevel(enemy.creature.level);
    earnCurrency(money);

    // Snapshot "before" stats off the current store state, ahead of grantExperience applying the level-up.
    const memberBefore = party.find((m) => m.uid === finalCtx.playerActive.id);
    const oldStats = memberBefore ? partyMemberStats(memberBefore) : null;

    const xpResult: ExperienceGainResult | null = grantExperience(finalCtx.playerActive.id, xp);
    const kinnieDropped = rollKinnieDrop();
    setRewards({
      money,
      xp,
      leveledUp: xpResult?.leveledUp ?? false,
      newLevel: xpResult?.newLevel,
      kinnieDropped,
    });

    if (xpResult?.leveledUp && memberBefore && oldStats) {
      if (xpResult.evolution) setEvolutionReveal(xpResult.evolution);
      setLevelUpReveal({
        // Post-evolution species/types/name (xpResult.member), not memberBefore's — a level-up
        // that evolves the creature should show the comparison for what it now actually is.
        speciesId: xpResult.member.speciesId,
        types: xpResult.member.types,
        displayName: xpResult.member.displayName,
        oldLevel: memberBefore.level,
        newLevel: xpResult.newLevel,
        oldStats,
        newStats: partyMemberStats(xpResult.member),
      });
    }
  }

  function handleDismissLevelUp() {
    setLevelUpReveal(null);
    const pending = afterLevelUpDismissRef.current;
    afterLevelUpDismissRef.current = null;
    pending?.();
  }

  function labelForCreature(creature: Creature, playerActiveId: string): string {
    if (creature.id === playerActiveId) {
      return party.find((m) => m.uid === creature.id)?.displayName ?? "Your creature";
    }
    return `Wild ${enemy.displayName}`;
  }

  /** Extra log lines describing what a move actually did — damage dealt, a miss,
   * crit, type effectiveness, and a faint — matching the mainline games' battle text. */
  function resultLinesFor(outcome: ActionOutcome, playerActiveId: string): string[] {
    if (outcome.action.kind !== "move" || !outcome.target) return [];
    if (!outcome.hit) return ["But it missed!"];

    const lines: string[] = [`Dealt ${outcome.damage} damage!`];
    if (outcome.crit) lines.push("A critical hit!");

    const move = getMove(outcome.action.moveId);
    const multiplier = getTypeMultiplier(move.type, outcome.target.types);
    if (multiplier > 1) lines.push("It's super effective!");
    else if (multiplier > 0 && multiplier < 1) lines.push("It's not very effective...");
    else if (multiplier === 0) lines.push("It had no effect...");

    if (outcome.target.currentHp <= 0) lines.push(`${labelForCreature(outcome.target, playerActiveId)} fainted!`);
    return lines;
  }

  /**
   * Resolves one full turn via the engine's onActionResolved callback, which
   * fires synchronously once per actor that actually got to act — in real
   * speed/priority order, and only once (not twice) if the faster actor's hit
   * ends the battle before the slower one can move. Reveal then steps through
   * those captured beats on a delay, one attacker at a time, so a turn always
   * plays out as genuinely sequential single-attacker turns rather than both
   * sides landing at once.
   */
  function runTurn(playerAction: BattleAction, playerLines: string[]) {
    if (!fsm) return;
    const activeFsm = fsm; // re-bind so TS keeps the non-null narrowing inside the nested closures below
    const ctx = activeFsm.getContext();
    const playerActiveId = ctx.playerActive.id;
    const enemyMoveId = pickEnemyMoveId();
    const enemyAction: BattleAction = { kind: "move", actorId: ctx.enemyActive.id, moveId: enemyMoveId };

    const beats: RevealBeat[] = [];
    activeFsm.submitActions(playerAction, enemyAction, (outcome) => {
      beats.push({ outcome, snapshotAfter: snapshotFrom(ctx) });
    });

    setResolving(true);

    function revealBeat(index: number) {
      if (index >= beats.length) {
        finalizeTurn();
        return;
      }
      const { outcome, snapshotAfter } = beats[index];
      const isPlayer = outcome.actor.id === playerActiveId;
      const actingAnim = isPlayer ? playerAnim : enemyAnim;
      const reactingAnim = isPlayer ? enemyAnim : playerAnim;

      const announceLines = isPlayer ? playerLines : [`Wild ${enemy.displayName} used ${getMove(enemyMoveId).name}.`];
      pushLog([...announceLines, ...resultLinesFor(outcome, playerActiveId)]);

      function applyReaction() {
        if (outcome.hit && outcome.target) {
          if (outcome.damage > 0) {
            reactingAnim.hit(outcome.damage >= outcome.target.stats.hp * BIG_HIT_FRACTION ? "big" : "small");
          }
          if (outcome.target.currentHp <= 0) reactingAnim.faint();
        }
        setSnapshot(snapshotAfter);
      }

      if (outcome.action.kind === "move") {
        actingAnim.windUp();
        actingAnim.lunge();
        const move = getMove(outcome.action.moveId);
        stageRef.current?.fireProjectile(move.type, isPlayer ? "toEnemy" : "toPlayer");
        // Wait for the projectile to visually land before the target reacts / HP drains.
        setTimeout(applyReaction, PROJECTILE_TRAVEL_MS);
      } else {
        applyReaction();
      }

      setTimeout(() => revealBeat(index + 1), TURN_BEAT_DELAY_MS);
    }

    function finalizeTurn() {
      const finalSnapshot = snapshotFrom(ctx);
      updatePartyMemberHp(playerActiveId, finalSnapshot.playerHp);
      setResolving(false);

      if (activeFsm.getState() !== "BATTLE_END") return;

      if (finalSnapshot.enemyHp <= 0) {
        finishBattle("player", ctx);
        return;
      }

      const reserves = party.filter((m) => m.uid !== playerActiveId && m.currentHp > 0);
      if (reserves.length > 0) {
        setForcedSwitchPending(true);
      } else {
        finishBattle("enemy", ctx);
      }
    }

    revealBeat(0);
  }

  function switchTo(uid: string, { forced }: { forced: boolean }) {
    if (!fsm) return;
    const member = party.find((m) => m.uid === uid);
    if (!member || member.currentHp <= 0 || uid === activeUidRef.current) return;

    const newCreature = creatureFromPartyMember(member);
    fsm.replacePlayerActive(newCreature);
    setActiveUid(uid);
    setSnapshot(snapshotFrom(fsm.getContext()));
    playerAnim.reset();

    if (forced) {
      setForcedSwitchPending(false);
      pushLog([`Go, ${member.displayName}!`]);
    } else {
      setShowParty(false);
      runTurn({ kind: "switch", actorId: newCreature.id, targetPartyIndex: 0 }, [`Go, ${member.displayName}!`]);
    }
  }

  function handleMove(moveId: string, moveName: string) {
    if (outcome || forcedSwitchPending || resolving || !fsm || fsm.getState() !== "ACTION_SELECT") return;
    const ctx = fsm.getContext();
    runTurn({ kind: "move", actorId: ctx.playerActive.id, moveId }, [`You used ${moveName}.`]);
  }

  function handleInvokeCrux() {
    if (!fsm || !snapshot || outcome || forcedSwitchPending || resolving) return;
    if (fsm.getState() !== "ACTION_SELECT" || snapshot.playerCruxOnCooldown) return;
    const ctx = fsm.getContext();
    const name = activeMember?.displayName ?? "Your creature";
    playerAnim.cruxGlow();
    runTurn({ kind: "invoke_crux", actorId: ctx.playerActive.id }, [`${name} invokes the Crux Aura!`]);
  }

  function handleFlee() {
    if (!fsm || outcome || forcedSwitchPending || resolving || fsm.getState() !== "ACTION_SELECT") return;
    playerAnim.fleeOut();
    pushLog(["You turned tail and ran!"]);
    setOutcome("fled");
  }

  const applicableItems = usableItems().filter((item) => (inventory[item.id] ?? 0) > 0);

  function handleUseItem(itemId: string) {
    if (!fsm || !activeMember || outcome || forcedSwitchPending || resolving || fsm.getState() !== "ACTION_SELECT") return;
    const item = getItem(itemId);
    const ctx = fsm.getContext();
    const name = activeMember.displayName;

    if (item.effect === "heal" && item.healAmount !== undefined) {
      const maxHp = ctx.playerActive.stats.hp;
      const before = ctx.playerActive.currentHp;
      const after = Math.min(maxHp, before + item.healAmount);
      ctx.playerActive.currentHp = after;
      const healedAmount = after - before;

      consumeItem(itemId);
      setShowItems(false);
      playerAnim.heal();

      runTurn({ kind: "item", actorId: ctx.playerActive.id, itemId }, [
        `You used the ${item.name}!`,
        `${name} recovered ${healedAmount} HP!`,
      ]);
      return;
    }

    if (item.effect === "level_up") {
      const oldStats = partyMemberStats(activeMember);
      const oldLevel = activeMember.level;
      const prevMaxHp = ctx.playerActive.stats.hp;
      // Preview via the same pure function the store will apply on dismiss (see below) — this is
      // how the evolution check (and any resulting species/type/stat change) gets surfaced here,
      // rather than duplicating the level-up math inline.
      const { member: leveledMember, evolution } = applyLevelUp(activeMember);
      const newStats = partyMemberStats(leveledMember);

      setShowItems(false);
      if (evolution) setEvolutionReveal(evolution);
      setLevelUpReveal({
        speciesId: leveledMember.speciesId,
        types: leveledMember.types,
        displayName: leveledMember.displayName,
        oldLevel,
        newLevel: leveledMember.level,
        oldStats,
        newStats,
      });

      // Defer applying the level-up (and the turn it costs) until the player dismisses
      // the stat-comparison screen — the enemy's move shouldn't play out underneath it.
      afterLevelUpDismissRef.current = () => {
        const hpGain = newStats.hp - prevMaxHp;
        ctx.playerActive.speciesId = leveledMember.speciesId;
        ctx.playerActive.types = leveledMember.types;
        ctx.playerActive.level = leveledMember.level;
        ctx.playerActive.stats = newStats;
        ctx.playerActive.currentHp = Math.min(newStats.hp, ctx.playerActive.currentHp + hpGain);

        consumeItem(itemId);
        bumpPartyMemberLevel(ctx.playerActive.id);
        playerAnim.heal();

        runTurn({ kind: "item", actorId: ctx.playerActive.id, itemId }, [
          `You used the ${item.name}!`,
          evolution
            ? `${evolution.oldDisplayName} evolved into ${evolution.newDisplayName}!`
            : `${name} grew to level ${leveledMember.level}!`,
        ]);
      };
    }
  }

  const availableBall = pickBestAvailableBall(inventory);

  function handleCatch() {
    if (!fsm || outcome || forcedSwitchPending || resolving || fsm.getState() !== "ACTION_SELECT" || !availableBall) return;
    const ctx = fsm.getContext();
    const enemyCreature = ctx.enemyActive;

    const result = attemptCatch({
      maxHp: enemyCreature.stats.hp,
      currentHp: enemyCreature.currentHp,
      baseCatchRate: WILD_BASE_CATCH_RATE,
      container: availableBall.id as ContainerType,
      status: enemyCreature.status,
    });
    consumeItem(availableBall.id);
    setResolving(true);
    stageRef.current?.throwBall();

    // Wait for the ball to visually arrive before it wobbles and the outcome plays out.
    setTimeout(() => {
      enemyAnim.wobble();
      setResolving(false);

      if (result.caught) {
        const member = partyMemberFromParticipant(enemy, "wild");
        const added = catchCreature(member);
        const money = currencyRewardForLevel(enemy.creature.level);
        earnCurrency(money);
        pushLog([
          `You threw a ${availableBall.name}!`,
          added
            ? `Gotcha! Wild ${enemy.displayName} was caught!`
            : `Gotcha! ...but your party is full (6/6), so it couldn't be kept.`,
        ]);
        const kinnieDropped = rollKinnieDrop();
        updatePartyMemberHp(ctx.playerActive.id, ctx.playerActive.currentHp);
        setRewards({ money, xp: 0, leveledUp: false, kinnieDropped });
        setOutcome("caught");
        return;
      }

      runTurn({ kind: "item", actorId: ctx.playerActive.id, itemId: availableBall.id }, [
        `You threw a ${availableBall.name}! It broke free after ${result.shakesPassed} shake${
          result.shakesPassed === 1 ? "" : "s"
        }.`,
      ]);
    }, BALL_TRAVEL_MS);
  }

  const actionsDisabled = !!outcome || forcedSwitchPending || resolving;

  useKeyboardShortcuts({
    r: handleFlee,
    b: () => {
      if (!actionsDisabled) setShowItems(true);
    },
    p: () => {
      if (!actionsDisabled) setShowParty(true);
    },
  });

  if (!activeMember || !fsm || !snapshot) {
    return (
      <View style={styles.container}>
        <Text style={styles.resultTitle}>No able-to-battle creature</Text>
        <Text style={styles.resultSubtitle}>
          Your whole party may be fainted, or you haven't picked a starter yet. Head back to Home to sort it out.
        </Text>
        <PrimaryButton label="Return to Home" onPress={() => navigation.popToTop()} />
      </View>
    );
  }

  const playerMoves = activeMember.moveIds.map(getMove);
  const reserves = party.filter((m) => m.uid !== activeMember.uid && m.currentHp > 0);

  return (
    <View style={styles.container}>
      <BattleStage
        ref={stageRef}
        enemy={{
          speciesId: enemy.creature.speciesId,
          name: `Wild ${enemy.displayName}`,
          types: enemy.creature.types,
          level: enemy.creature.level,
          hp: snapshot.enemyHp,
          maxHp: snapshot.enemyMaxHp,
          anim: enemyAnim,
        }}
        player={{
          speciesId: activeMember.speciesId,
          name: activeMember.displayName,
          types: activeMember.types,
          level: activeMember.level,
          hp: snapshot.playerHp,
          maxHp: snapshot.playerMaxHp,
          highlightCrux: snapshot.playerCruxActive,
          anim: playerAnim,
        }}
      />

      <ScrollView style={styles.log} contentContainerStyle={styles.logContent}>
        {log.map((line, i) => (
          <Text key={i} style={styles.logLine}>
            {line}
          </Text>
        ))}
      </ScrollView>

      <View style={styles.actionGrid}>
        {playerMoves.map((move) => (
          <HoverTip
            key={move.id}
            style={styles.moveButtonHoverWrap}
            text={`${move.category === "special" ? "Special" : "Physical"} ${move.type} move. Power ${move.power}, accuracy ${move.accuracy}%.`}
          >
            <Pressable
              testID={`move-${move.id}`}
              onPress={() => handleMove(move.id, move.name)}
              disabled={actionsDisabled}
              style={({ pressed }) => [styles.moveButton, pressed && styles.moveButtonPressed]}
            >
              <Text style={styles.moveName}>{move.name}</Text>
              <TypeBadge type={move.type} />
            </Pressable>
          </HoverTip>
        ))}
        <HoverTip
          style={styles.moveButtonHoverWrap}
          text="Boosts your creature's stats for a few turns, then goes on cooldown. Costs the turn to activate."
        >
          <Pressable
            testID="invoke-crux"
            onPress={handleInvokeCrux}
            disabled={actionsDisabled || snapshot.playerCruxOnCooldown}
            style={({ pressed }) => [
              styles.moveButton,
              styles.cruxButton,
              (snapshot.playerCruxOnCooldown || actionsDisabled) && styles.moveButtonDisabled,
              pressed && styles.moveButtonPressed,
            ]}
          >
            <Text style={styles.moveName}>Invoke Crux</Text>
            <Text style={styles.cruxHint}>{snapshot.playerCruxOnCooldown ? "on cooldown" : "costs the turn"}</Text>
          </Pressable>
        </HoverTip>
        <HoverTip
          style={styles.moveButtonHoverWrap}
          text="Throw a ball to try to catch the wild creature. Lower HP and status conditions improve the odds. If it breaks free, the turn is still spent."
        >
          <Pressable
            testID="catch-ball"
            onPress={handleCatch}
            disabled={actionsDisabled || !availableBall}
            style={({ pressed }) => [
              styles.moveButton,
              styles.catchButton,
              (actionsDisabled || !availableBall) && styles.moveButtonDisabled,
              pressed && styles.moveButtonPressed,
            ]}
          >
            <Text style={styles.moveName}>{availableBall ? `Throw ${availableBall.name}` : "No balls left"}</Text>
            <Text style={styles.cruxHint}>{availableBall ? "costs the turn if it fails" : "check your Bag"}</Text>
          </Pressable>
        </HoverTip>
        <HoverTip style={styles.moveButtonHoverWrap} text="Send out a different party member. Voluntary switches cost the turn; a fainted lead gets a free forced switch instead.">
          <Pressable
            testID="open-party-sheet"
            onPress={() => setShowParty(true)}
            disabled={actionsDisabled}
            style={({ pressed }) => [
              styles.moveButton,
              styles.partyButtonHalf,
              actionsDisabled && styles.moveButtonDisabled,
              pressed && styles.moveButtonPressed,
            ]}
          >
            <Text style={styles.moveName}>Party</Text>
          </Pressable>
        </HoverTip>
        <HoverTip style={styles.moveButtonHoverWrap} text="Use a medicine item to heal, or a Kinnie to instantly gain a level. Costs the turn.">
          <Pressable
            testID="open-item-sheet"
            onPress={() => setShowItems(true)}
            disabled={actionsDisabled || applicableItems.length === 0}
            style={({ pressed }) => [
              styles.moveButton,
              styles.partyButtonHalf,
              (actionsDisabled || applicableItems.length === 0) && styles.moveButtonDisabled,
              pressed && styles.moveButtonPressed,
            ]}
          >
            <Text style={styles.moveName}>Use Item</Text>
            <Text style={styles.cruxHint}>{applicableItems.length > 0 ? "heal/level up — costs the turn" : "no usable items"}</Text>
          </Pressable>
        </HoverTip>
        <HoverTip style={styles.fleeButtonHoverWrap} text="Flee the encounter immediately. No reward, but no penalty either. Keyboard: R.">
          <Pressable
            testID="flee-button"
            onPress={handleFlee}
            disabled={actionsDisabled}
            style={({ pressed }) => [
              styles.moveButton,
              styles.fleeButton,
              actionsDisabled && styles.moveButtonDisabled,
              pressed && styles.moveButtonPressed,
            ]}
          >
            <Text style={styles.moveName}>Run Away</Text>
            <Text style={styles.cruxHint}>flee the encounter</Text>
          </Pressable>
        </HoverTip>
      </View>

      <Modal visible={showItems} transparent animationType="none" onRequestClose={() => setShowItems(false)}>
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Use Item</Text>
            {applicableItems.map((item) => (
              <Pressable
                key={item.id}
                testID={`use-item-${item.id}`}
                onPress={() => handleUseItem(item.id)}
                style={styles.sheetRow}
              >
                <Text style={styles.sheetCreature}>
                  {item.name} <Text style={styles.sheetLevel}>x{inventory[item.id] ?? 0}</Text>
                </Text>
                <Text style={styles.sheetHp}>{item.effect === "heal" ? `+${item.healAmount} HP` : "+1 level"}</Text>
              </Pressable>
            ))}
            {applicableItems.length === 0 && <Text style={styles.sheetNote}>No usable items in your Bag.</Text>}
            <PrimaryButton label="Close" variant="secondary" onPress={() => setShowItems(false)} />
          </View>
        </View>
      </Modal>

      <Modal visible={showParty} transparent animationType="none" onRequestClose={() => setShowParty(false)}>
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Party</Text>
            {party.map((member) => {
              const isActive = member.uid === activeMember.uid;
              const fainted = member.currentHp <= 0;
              const hp = isActive ? snapshot.playerHp : member.currentHp;
              return (
                <Pressable
                  key={member.uid}
                  testID={`switch-${member.uid}`}
                  disabled={isActive || fainted}
                  onPress={() => switchTo(member.uid, { forced: false })}
                  style={[styles.sheetRow, (isActive || fainted) && styles.sheetRowDisabled]}
                >
                  <Text style={styles.sheetCreature}>
                    {member.displayName} <Text style={styles.sheetLevel}>Lv. {member.level}</Text>
                  </Text>
                  <Text style={fainted ? styles.sheetFainted : styles.sheetHp}>
                    {fainted ? "Fainted" : isActive ? `${hp} / ${partyMemberStats(member).hp} HP (active)` : `${hp} / ${partyMemberStats(member).hp} HP`}
                  </Text>
                </Pressable>
              );
            })}
            <Text style={styles.sheetNote}>
              {party.length > 1 ? "Tap a healthy party member to send them out instead — this costs the turn." : "No other party members yet — try catching one!"}
            </Text>
            <PrimaryButton label="Close" variant="secondary" onPress={() => setShowParty(false)} />
          </View>
        </View>
      </Modal>

      {forcedSwitchPending && (
        <View style={styles.resultOverlay}>
          <Text style={styles.resultTitle}>{activeMember.displayName} fainted!</Text>
          <Text style={styles.resultSubtitle}>Choose who battles next — this switch is free.</Text>
          <View style={styles.forcedSwitchList}>
            {reserves.map((member) => (
              <Pressable
                key={member.uid}
                testID={`forced-switch-${member.uid}`}
                onPress={() => switchTo(member.uid, { forced: true })}
                style={({ pressed }) => [styles.forcedSwitchRow, pressed && styles.moveButtonPressed]}
              >
                <Text style={styles.sheetCreature}>
                  {member.displayName} <Text style={styles.sheetLevel}>Lv. {member.level}</Text>
                </Text>
                <Text style={styles.sheetHp}>
                  {member.currentHp} / {partyMemberStats(member).hp} HP
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* Priority chain: an evolution reveal (if any) plays first, then the level-up stat
          comparison, then the battle result pop-up — each set together but shown one at a time,
          so a level-up (and any evolution it triggers) is never hidden behind the result. */}
      {evolutionReveal ? (
        <EvolutionModal data={evolutionReveal} onDismiss={() => setEvolutionReveal(null)} />
      ) : (
        levelUpReveal && <LevelUpModal data={levelUpReveal} onDismiss={handleDismissLevelUp} />
      )}

      <Modal visible={!!outcome && !levelUpReveal && !evolutionReveal} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={styles.resultOverlay}>
          <Text style={styles.resultTitle}>
            {outcome === "player"
              ? "Victory!"
              : outcome === "caught"
              ? "Gotcha!"
              : outcome === "fled"
              ? "Got away safely!"
              : "You blacked out..."}
          </Text>
          <Text style={styles.resultSubtitle}>
            {outcome === "player" && `${activeMember.displayName} defeated the wild ${enemy.displayName}.`}
            {outcome === "caught" && `Wild ${enemy.displayName} joined your party.`}
            {outcome === "fled" && `You fled from the wild ${enemy.displayName}.`}
            {outcome === "enemy" && "Your whole party has fainted."}
          </Text>
          {rewards && (
            <Text style={styles.rewardsText}>
              +{rewards.money} gold{rewards.xp > 0 ? `, +${rewards.xp} XP` : ""}
              {rewards.leveledUp ? ` — grew to level ${rewards.newLevel}!` : ""}
              {rewards.kinnieDropped ? " — and a Kinnie dropped!" : ""}
            </Text>
          )}
          <PrimaryButton testID="return-to-home" label="Return to Home" onPress={() => navigation.popToTop()} />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 20,
    gap: 12,
  },
  log: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    padding: 12,
  },
  logContent: {
    gap: 4,
  },
  logLine: {
    color: colors.text,
    fontSize: 14,
  },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  moveButton: {
    flexGrow: 1,
    flexBasis: "45%",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
  },
  moveButtonPressed: {
    opacity: 0.7,
  },
  moveButtonDisabled: {
    opacity: 0.4,
  },
  moveName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 6,
  },
  cruxButton: {
    borderColor: colors.accent,
  },
  catchButton: {
    borderColor: colors.success,
  },
  cruxHint: {
    color: colors.textMuted,
    fontSize: 11,
  },
  partyButtonHalf: {
    flexBasis: "45%",
    alignItems: "center",
  },
  fleeButton: {
    flexBasis: "100%",
    alignItems: "center",
    borderColor: colors.danger,
  },
  moveButtonHoverWrap: {
    flexGrow: 1,
    flexBasis: "45%",
  },
  fleeButtonHoverWrap: {
    flexBasis: "100%",
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    gap: 12,
  },
  sheetTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  sheetRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sheetRowDisabled: {
    opacity: 0.5,
  },
  sheetCreature: {
    color: colors.text,
    fontSize: 15,
  },
  sheetLevel: {
    color: colors.textMuted,
    fontWeight: "400",
    fontSize: 12,
  },
  sheetHp: {
    color: colors.textMuted,
    fontSize: 14,
  },
  sheetFainted: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "700",
  },
  sheetNote: {
    color: colors.textMuted,
    fontSize: 12,
  },
  forcedSwitchList: {
    width: "100%",
    gap: 10,
  },
  forcedSwitchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 12,
    padding: 14,
  },
  resultOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(13,27,42,0.95)",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 32,
  },
  resultTitle: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
  },
  resultSubtitle: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: "center",
  },
  rewardsText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
});
