import { Alert, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { useGameStore } from "../state/gameStore";
import { DEMO_BATTLE_LEVEL, getStarterStageOne } from "../game/creatureFactory";
import { PrimaryButton } from "./components/PrimaryButton";
import { TypeBadge } from "./components/TypeBadge";
import { colors } from "./theme";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

function comingSoon(feature: string) {
  Alert.alert(feature, "Not built yet in this vertical slice.");
}

export function HomeScreen({ navigation }: Props) {
  const currentZone = useGameStore((s) => s.currentZone);
  const selectedLine = useGameStore((s) => s.selectedLine);
  const battlesWon = useGameStore((s) => s.battlesWon);

  const starter = selectedLine ? getStarterStageOne(selectedLine) : null;

  return (
    <View style={styles.container}>
      <View style={styles.hud}>
        <Text style={styles.zoneLabel}>{currentZone}</Text>
        {starter && (
          <View style={styles.partyCard}>
            <Text style={styles.partyName}>
              {starter.name} <Text style={styles.partyLevel}>Lv. {DEMO_BATTLE_LEVEL}</Text>
            </Text>
            <View style={styles.badgeRow}>
              {starter.types.map((t) => (
                <TypeBadge key={t} type={t} />
              ))}
            </View>
          </View>
        )}
        <Text style={styles.stat}>Battles won: {battlesWon}</Text>
      </View>

      <View style={styles.actions}>
        <PrimaryButton label="Wild Encounter" onPress={() => navigation.navigate("Battle")} />
        <PrimaryButton label="Party" variant="secondary" onPress={() => comingSoon("Party Management")} />
        <PrimaryButton label="Codex" variant="secondary" onPress={() => comingSoon("Creature Codex")} />
        <PrimaryButton label="Bag" variant="secondary" onPress={() => comingSoon("Bag / Inventory")} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 64,
    paddingBottom: 32,
  },
  hud: {
    gap: 16,
  },
  zoneLabel: {
    color: colors.textMuted,
    fontSize: 13,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  partyCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  partyName: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  partyLevel: {
    color: colors.textMuted,
    fontWeight: "400",
    fontSize: 14,
  },
  badgeRow: {
    flexDirection: "row",
  },
  stat: {
    color: colors.textMuted,
    fontSize: 14,
  },
  actions: {
    gap: 12,
  },
});
