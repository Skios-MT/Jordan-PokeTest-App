import { StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { useGameStore } from "../state/gameStore";
import { HpBar } from "./components/HpBar";
import { PrimaryButton } from "./components/PrimaryButton";
import { TypeBadge } from "./components/TypeBadge";
import { ScreenBackground } from "./components/ScreenBackground";
import { colors } from "./theme";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

export function HomeScreen({ navigation }: Props) {
  const currentZone = useGameStore((s) => s.currentZone);
  const party = useGameStore((s) => s.party);
  const battlesWon = useGameStore((s) => s.battlesWon);

  const leadMember = party[0];

  return (
    <ScreenBackground style={styles.container}>
      <View style={styles.hud}>
        <Text style={styles.zoneLabel}>{currentZone}</Text>
        {leadMember && (
          <View style={styles.partyCard}>
            <Text style={styles.partyName}>
              {leadMember.displayName} <Text style={styles.partyLevel}>Lv. {leadMember.level}</Text>
            </Text>
            <View style={styles.badgeRow}>
              {leadMember.types.map((t) => (
                <TypeBadge key={t} type={t} />
              ))}
            </View>
            <HpBar currentHp={leadMember.currentHp} maxHp={leadMember.stats.hp} />
          </View>
        )}
        <Text style={styles.stat}>Battles won: {battlesWon}</Text>
      </View>

      <View style={styles.actions}>
        <PrimaryButton testID="nav-wild-encounter" label="Wild Encounter" onPress={() => navigation.navigate("Battle")} />
        <PrimaryButton
          testID="nav-party"
          label="Party"
          variant="secondary"
          onPress={() => navigation.navigate("Party")}
        />
        <PrimaryButton
          testID="nav-codex"
          label="Codex"
          variant="secondary"
          onPress={() => navigation.navigate("Codex")}
        />
        <PrimaryButton testID="nav-bag" label="Bag" variant="secondary" onPress={() => navigation.navigate("Bag")} />
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
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
    gap: 8,
  },
  partyName: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
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
