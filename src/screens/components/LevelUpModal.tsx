import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import type { StatBlock, TypeName } from "../../data/schemas";
import { CreatureAvatar } from "./CreatureAvatar";
import { TypeBadge } from "./TypeBadge";
import { colors } from "../theme";

export interface LevelUpRevealData {
  speciesId: string;
  types: TypeName[];
  displayName: string;
  oldLevel: number;
  newLevel: number;
  oldStats: StatBlock;
  newStats: StatBlock;
}

const STAT_LABELS: { key: keyof StatBlock; label: string }[] = [
  { key: "hp", label: "HP" },
  { key: "atk", label: "Attack" },
  { key: "def", label: "Defense" },
  { key: "spatk", label: "Sp. Attack" },
  { key: "spdef", label: "Sp. Defense" },
  { key: "speed", label: "Speed" },
];

/**
 * Full-screen "creature grew a level" reveal: old stats -> new stats, one row
 * per stat with the delta called out — tap anywhere (or the button) to
 * dismiss, matching the mainline games' level-up screen convention.
 */
export function LevelUpModal({ data, onDismiss }: { data: LevelUpRevealData; onDismiss: () => void }) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable testID="level-up-modal" style={styles.backdrop} onPress={onDismiss}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <CreatureAvatar speciesId={data.speciesId} types={data.types} size={72} />
          <Text style={styles.title}>{data.displayName} grew to Lv. {data.newLevel}!</Text>
          <View style={styles.badgeRow}>
            {data.types.map((t) => (
              <TypeBadge key={t} type={t} />
            ))}
          </View>
          <Text style={styles.levelLine}>
            Lv. {data.oldLevel} <Text style={styles.arrow}>→</Text> Lv. {data.newLevel}
          </Text>

          <View style={styles.statTable}>
            <View style={styles.statHeaderRow}>
              <Text style={[styles.statLabel, styles.statHeaderText]}>Stat</Text>
              <Text style={[styles.statValue, styles.statHeaderText]}>Before</Text>
              <Text style={[styles.statValue, styles.statHeaderText]}>After</Text>
              <Text style={[styles.statDelta, styles.statHeaderText]}>+</Text>
            </View>
            {STAT_LABELS.map(({ key, label }) => {
              const before = data.oldStats[key];
              const after = data.newStats[key];
              return (
                <View key={key} style={styles.statRow}>
                  <Text style={styles.statLabel}>{label}</Text>
                  <Text style={styles.statValue}>{before}</Text>
                  <Text style={styles.statValue}>{after}</Text>
                  <Text style={styles.statDelta}>{after > before ? `+${after - before}` : "—"}</Text>
                </View>
              );
            })}
          </View>

          <PressableTapHint />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function PressableTapHint() {
  return <Text style={styles.tapHint}>Tap anywhere to continue</Text>;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(13,27,42,0.92)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.accent,
    padding: 24,
    alignItems: "center",
    gap: 10,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  badgeRow: {
    flexDirection: "row",
    gap: 6,
  },
  levelLine: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: "700",
    marginTop: 4,
    marginBottom: 8,
  },
  arrow: {
    color: colors.textMuted,
  },
  statTable: {
    width: "100%",
    gap: 6,
  },
  statHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statHeaderText: {
    color: colors.textMuted,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontWeight: "700",
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statLabel: {
    flex: 1.3,
    color: colors.text,
    fontSize: 13,
  },
  statValue: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 13,
    textAlign: "center",
  },
  statDelta: {
    flex: 1,
    color: colors.success,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  tapHint: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 12,
    fontStyle: "italic",
  },
});
