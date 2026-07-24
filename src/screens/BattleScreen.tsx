import { useMemo, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { useGameStore } from "../state/gameStore";
import {
  buildStarterParticipant,
  otherStarterLines,
  DEMO_BATTLE_LEVEL,
  type BattleParticipant,
  type StarterLineName,
} from "../game/creatureFactory";
import { getMove } from "../game/movesRepo";
import { BattleStateMachine, type Winner } from "../engine/battleManager";
import { isCruxOnCooldown, CRUX_AURA_STATUS_ID } from "../engine/cruxAura";
import { getActiveEffect } from "../engine/statusEffects";
import type { BattleContext } from "../engine/types";
import { HpBar } from "./components/HpBar";
import { TypeBadge } from "./components/TypeBadge";
import { PrimaryButton } from "./components/PrimaryButton";
import { colors } from "./theme";

type Props = NativeStackScreenProps<RootStackParamList, "Battle">;

const ENEMY_LEVEL = Math.max(1, DEMO_BATTLE_LEVEL - 2);
const MAX_LOG_LINES = 5;

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
  const recordBattleResult = useGameStore((s) => s.recordBattleResult);

  const player = useMemo<BattleParticipant>(
    () => buildStarterParticipant(selectedLine, DEMO_BATTLE_LEVEL, "player-1"),
    [selectedLine]
  );
  const wildLine = useMemo<StarterLineName>(() => otherStarterLines(selectedLine)[0], [selectedLine]);
  const enemy = useMemo<BattleParticipant>(
    () => buildStarterParticipant(wildLine, ENEMY_LEVEL, "enemy-1"),
    [wildLine]
  );

  const fsmRef = useRef<BattleStateMachine | null>(null);
  if (!fsmRef.current) {
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

  const [snapshot, setSnapshot] = useState<BattleSnapshot>(() => snapshotFrom(fsm.getContext()));
  const [log, setLog] = useState<string[]>([`A wild ${enemy.displayName} appeared!`]);
  const [winner, setWinner] = useState<Winner>(null);
  const [showParty, setShowParty] = useState(false);

  function pushLog(lines: string[]) {
    setLog((prev) => [...prev, ...lines].slice(-MAX_LOG_LINES));
  }

  function pickEnemyMoveId(): string {
    const ids = enemy.moveIds;
    return ids[Math.floor(Math.random() * ids.length)];
  }

  function runTurn(playerAction: Parameters<BattleStateMachine["submitActions"]>[0], logLines: string[]) {
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

    if (fsm.getState() === "BATTLE_END") {
      const result: Winner = nextSnapshot.enemyHp <= 0 ? "player" : "enemy";
      setWinner(result);
      recordBattleResult(result === "player");
    }
  }

  function handleMove(moveId: string, moveName: string) {
    if (winner || fsm.getState() !== "ACTION_SELECT") return;
    const ctx = fsm.getContext();
    runTurn({ kind: "move", actorId: ctx.playerActive.id, moveId }, [`You used ${moveName}.`]);
  }

  function handleInvokeCrux() {
    if (winner || fsm.getState() !== "ACTION_SELECT" || snapshot.playerCruxOnCooldown) return;
    const ctx = fsm.getContext();
    runTurn({ kind: "invoke_crux", actorId: ctx.playerActive.id }, [
      `${player.displayName} invokes the Crux Aura!`,
    ]);
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
            disabled={!!winner}
            style={({ pressed }) => [styles.moveButton, pressed && styles.moveButtonPressed]}
          >
            <Text style={styles.moveName}>{move.name}</Text>
            <TypeBadge type={move.type} />
          </Pressable>
        ))}
        <Pressable
          testID="invoke-crux"
          onPress={handleInvokeCrux}
          disabled={!!winner || snapshot.playerCruxOnCooldown}
          style={({ pressed }) => [
            styles.moveButton,
            styles.cruxButton,
            (snapshot.playerCruxOnCooldown || winner) && styles.moveButtonDisabled,
            pressed && styles.moveButtonPressed,
          ]}
        >
          <Text style={styles.moveName}>Invoke Crux</Text>
          <Text style={styles.cruxHint}>{snapshot.playerCruxOnCooldown ? "on cooldown" : "costs the turn"}</Text>
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
            <View style={styles.sheetRow}>
              <Text style={styles.sheetCreature}>{player.displayName}</Text>
              <Text style={styles.sheetHp}>
                {snapshot.playerHp} / {snapshot.playerMaxHp} HP
              </Text>
            </View>
            <Text style={styles.sheetNote}>No other party members yet — switching isn't wired up.</Text>
            <PrimaryButton label="Close" variant="secondary" onPress={() => setShowParty(false)} />
          </View>
        </View>
      </Modal>

      {winner && (
        <View style={styles.resultOverlay}>
          <Text style={styles.resultTitle}>{winner === "player" ? "Victory!" : "You blacked out..."}</Text>
          <Text style={styles.resultSubtitle}>
            {winner === "player"
              ? `${player.displayName} defeated the wild ${enemy.displayName}.`
              : `${player.displayName} has no energy left to battle.`}
          </Text>
          <PrimaryButton testID="return-to-home" label="Return to Home" onPress={() => navigation.goBack()} />
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
    marginVertical: 14,
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
