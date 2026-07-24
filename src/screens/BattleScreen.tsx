import { useEffect, useMemo, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { useGameStore } from "../state/gameStore";
import type { BattleParticipant } from "../game/creatureFactory";
import { buildMelitaWoodsEncounterTable, rollEncounter } from "../game/encounterTable";
import { creatureFromPartyMember, partyMemberFromParticipant, type PartyMember } from "../game/party";
import { getMove } from "../game/movesRepo";
import { pickBestAvailableBall } from "../game/itemsRepo";
import { BattleStateMachine, type Winner } from "../engine/battleManager";
import { attemptCatch, type ContainerType } from "../engine/catching";
import { isCruxOnCooldown, CRUX_AURA_STATUS_ID } from "../engine/cruxAura";
import { getActiveEffect } from "../engine/statusEffects";
import type { BattleAction, BattleContext } from "../engine/types";
import { HpBar } from "./components/HpBar";
import { TypeBadge } from "./components/TypeBadge";
import { PrimaryButton } from "./components/PrimaryButton";
import { colors } from "./theme";

type Props = NativeStackScreenProps<RootStackParamList, "Battle">;

const WILD_BASE_CATCH_RATE = 190;
const MAX_LOG_LINES = 5;

type Outcome = Winner | "caught";

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

export function BattleScreen({ navigation }: Props) {
  const selectedLine = useGameStore((s) => s.selectedLine) ?? "Water";
  const inventory = useGameStore((s) => s.inventory);
  const recordBattleResult = useGameStore((s) => s.recordBattleResult);
  const updatePartyMemberHp = useGameStore((s) => s.updatePartyMemberHp);
  const consumeItem = useGameStore((s) => s.consumeItem);
  const catchCreature = useGameStore((s) => s.catchCreature);
  const markSeen = useGameStore((s) => s.markSeen);
  const party = useGameStore((s) => s.party);

  const playerMemberRef = useRef<PartyMember | undefined>(party[0]);
  const playerMember = playerMemberRef.current;

  const player = useMemo<BattleParticipant | null>(() => {
    if (!playerMember) return null;
    return {
      creature: creatureFromPartyMember(playerMember),
      moveIds: playerMember.moveIds,
      displayName: playerMember.displayName,
    };
  }, [playerMember]);

  const encounterTable = useMemo(() => buildMelitaWoodsEncounterTable(selectedLine), [selectedLine]);
  const enemy = useMemo<BattleParticipant>(
    () => rollEncounter(encounterTable, `enemy-${Math.random().toString(36).slice(2, 8)}`),
    [encounterTable]
  );

  const fsmRef = useRef<BattleStateMachine | null>(null);
  if (!fsmRef.current && player) {
    const ctx: BattleContext = {
      playerActive: player.creature,
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
  const [showParty, setShowParty] = useState(false);

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

  function runTurn(playerAction: BattleAction, logLines: string[]) {
    if (!fsm || !player || !playerMember) return;
    const ctx = fsm.getContext();
    const enemyMoveId = pickEnemyMoveId();
    const enemyMoveName = getMove(enemyMoveId).name;

    fsm.submitActions(playerAction, { kind: "move", actorId: ctx.enemyActive.id, moveId: enemyMoveId });

    const nextSnapshot = snapshotFrom(ctx);
    const lines = [...logLines, `Wild ${enemy.displayName} used ${enemyMoveName}.`];
    if (nextSnapshot.enemyHp <= 0) lines.push(`Wild ${enemy.displayName} fainted!`);
    if (nextSnapshot.playerHp <= 0) lines.push(`${player.displayName} fainted!`);

    setSnapshot(nextSnapshot);
    pushLog(lines);
    updatePartyMemberHp(playerMember.uid, nextSnapshot.playerHp);

    if (fsm.getState() === "BATTLE_END") {
      const result: Winner = nextSnapshot.enemyHp <= 0 ? "player" : "enemy";
      setOutcome(result);
      recordBattleResult(result === "player");
    }
  }

  function handleMove(moveId: string, moveName: string) {
    if (outcome || !fsm || fsm.getState() !== "ACTION_SELECT") return;
    const ctx = fsm.getContext();
    runTurn({ kind: "move", actorId: ctx.playerActive.id, moveId }, [`You used ${moveName}.`]);
  }

  function handleInvokeCrux() {
    if (!fsm || !player || !snapshot || outcome) return;
    if (fsm.getState() !== "ACTION_SELECT" || snapshot.playerCruxOnCooldown) return;
    const ctx = fsm.getContext();
    runTurn({ kind: "invoke_crux", actorId: ctx.playerActive.id }, [
      `${player.displayName} invokes the Crux Aura!`,
    ]);
  }

  const availableBall = pickBestAvailableBall(inventory);

  function handleCatch() {
    if (!fsm || !player || !playerMember || outcome || fsm.getState() !== "ACTION_SELECT" || !availableBall) return;
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

    if (result.caught) {
      const member = partyMemberFromParticipant(enemy, "starter");
      const added = catchCreature(member);
      pushLog([
        `You threw a ${availableBall.name}!`,
        added
          ? `Gotcha! Wild ${enemy.displayName} was caught!`
          : `Gotcha! ...but your party is full (6/6), so it couldn't be kept.`,
      ]);
      updatePartyMemberHp(playerMember.uid, ctx.playerActive.currentHp);
      setOutcome("caught");
      return;
    }

    runTurn({ kind: "item", actorId: ctx.playerActive.id, itemId: availableBall.id }, [
      `You threw a ${availableBall.name}! It broke free after ${result.shakesPassed} shake${
        result.shakesPassed === 1 ? "" : "s"
      }.`,
    ]);
  }

  if (!player || !fsm || !snapshot) {
    return (
      <View style={styles.container}>
        <Text style={styles.resultTitle}>No active party member</Text>
        <Text style={styles.resultSubtitle}>Head back to Home and pick a starter first.</Text>
        <PrimaryButton label="Return to Home" onPress={() => navigation.popToTop()} />
      </View>
    );
  }

  const playerMoves = player.moveIds.map(getMove);

  return (
    <View style={styles.container}>
      <View style={styles.combatants}>
        <CombatantPanel
          name={`Wild ${enemy.displayName}`}
          types={enemy.creature.types}
          level={enemy.creature.level}
          hp={snapshot.enemyHp}
          maxHp={snapshot.enemyMaxHp}
        />
        <CombatantPanel
          name={player.displayName}
          types={player.creature.types}
          level={player.creature.level}
          hp={snapshot.playerHp}
          maxHp={snapshot.playerMaxHp}
          highlightCrux={snapshot.playerCruxActive}
        />
      </View>

      <ScrollView style={styles.log} contentContainerStyle={styles.logContent}>
        {log.map((line, i) => (
          <Text key={i} style={styles.logLine}>
            {line}
          </Text>
        ))}
      </ScrollView>

      <View style={styles.actionGrid}>
        {playerMoves.map((move) => (
          <Pressable
            key={move.id}
            testID={`move-${move.id}`}
            onPress={() => handleMove(move.id, move.name)}
            disabled={!!outcome}
            style={({ pressed }) => [styles.moveButton, pressed && styles.moveButtonPressed]}
          >
            <Text style={styles.moveName}>{move.name}</Text>
            <TypeBadge type={move.type} />
          </Pressable>
        ))}
        <Pressable
          testID="invoke-crux"
          onPress={handleInvokeCrux}
          disabled={!!outcome || snapshot.playerCruxOnCooldown}
          style={({ pressed }) => [
            styles.moveButton,
            styles.cruxButton,
            (snapshot.playerCruxOnCooldown || outcome) && styles.moveButtonDisabled,
            pressed && styles.moveButtonPressed,
          ]}
        >
          <Text style={styles.moveName}>Invoke Crux</Text>
          <Text style={styles.cruxHint}>{snapshot.playerCruxOnCooldown ? "on cooldown" : "costs the turn"}</Text>
        </Pressable>
        <Pressable
          testID="catch-ball"
          onPress={handleCatch}
          disabled={!!outcome || !availableBall}
          style={({ pressed }) => [
            styles.moveButton,
            styles.catchButton,
            (!!outcome || !availableBall) && styles.moveButtonDisabled,
            pressed && styles.moveButtonPressed,
          ]}
        >
          <Text style={styles.moveName}>{availableBall ? `Throw ${availableBall.name}` : "No balls left"}</Text>
          <Text style={styles.cruxHint}>{availableBall ? "costs the turn if it fails" : "check your Bag"}</Text>
        </Pressable>
        <Pressable
          testID="open-party-sheet"
          onPress={() => setShowParty(true)}
          style={({ pressed }) => [styles.moveButton, styles.partyButton, pressed && styles.moveButtonPressed]}
        >
          <Text style={styles.moveName}>Party</Text>
        </Pressable>
      </View>

      <Modal visible={showParty} transparent animationType="none" onRequestClose={() => setShowParty(false)}>
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Party</Text>
            {party.map((member) => (
              <View key={member.uid} style={styles.sheetRow}>
                <Text style={styles.sheetCreature}>
                  {member.displayName} <Text style={styles.sheetLevel}>Lv. {member.level}</Text>
                </Text>
                <Text style={styles.sheetHp}>
                  {member.uid === playerMember?.uid ? snapshot.playerHp : member.currentHp} / {member.stats.hp} HP
                </Text>
              </View>
            ))}
            <Text style={styles.sheetNote}>
              {party.length > 1
                ? "Switching mid-battle isn't wired up yet — your first party member always leads."
                : "No other party members yet — try catching one!"}
            </Text>
            <PrimaryButton label="Close" variant="secondary" onPress={() => setShowParty(false)} />
          </View>
        </View>
      </Modal>

      {outcome && (
        <View style={styles.resultOverlay}>
          <Text style={styles.resultTitle}>
            {outcome === "player" ? "Victory!" : outcome === "caught" ? "Gotcha!" : "You blacked out..."}
          </Text>
          <Text style={styles.resultSubtitle}>
            {outcome === "player" && `${player.displayName} defeated the wild ${enemy.displayName}.`}
            {outcome === "caught" && `Wild ${enemy.displayName} joined your party.`}
            {outcome === "enemy" && `${player.displayName} has no energy left to battle.`}
          </Text>
          <PrimaryButton testID="return-to-home" label="Return to Home" onPress={() => navigation.popToTop()} />
        </View>
      )}
    </View>
  );
}

function CombatantPanel({
  name,
  types,
  level,
  hp,
  maxHp,
  highlightCrux,
}: {
  name: string;
  types: string[];
  level: number;
  hp: number;
  maxHp: number;
  highlightCrux?: boolean;
}) {
  return (
    <View style={[styles.panel, highlightCrux && styles.panelCruxActive]}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelName}>{name}</Text>
        <Text style={styles.panelLevel}>Lv. {level}</Text>
      </View>
      <View style={styles.badgeRow}>
        {types.map((t) => (
          <TypeBadge key={t} type={t} />
        ))}
      </View>
      <HpBar currentHp={hp} maxHp={maxHp} />
      {highlightCrux && <Text style={styles.cruxActiveLabel}>Crux Aura active</Text>}
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
  combatants: {
    gap: 12,
  },
  panel: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  panelCruxActive: {
    borderColor: colors.accent,
  },
  panelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  panelName: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "700",
  },
  panelLevel: {
    color: colors.textMuted,
    fontSize: 14,
  },
  badgeRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  cruxActiveLabel: {
    color: colors.accent,
    fontSize: 12,
    marginTop: 6,
    fontWeight: "600",
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
  partyButton: {
    flexBasis: "100%",
    alignItems: "center",
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
  sheetNote: {
    color: colors.textMuted,
    fontSize: 12,
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
  },
  resultSubtitle: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: "center",
  },
});
