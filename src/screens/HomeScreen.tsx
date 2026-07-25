import { StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { useGameStore } from "../state/gameStore";
import { partyMemberStats } from "../game/party";
import { getZoneName } from "../game/zones";
import { HpBar } from "./components/HpBar";
import { PrimaryButton } from "./components/PrimaryButton";
import { TypeBadge } from "./components/TypeBadge";
import { ScreenBackground } from "./components/ScreenBackground";
import { HoverTip } from "./components/HoverTip";
import { useKeyboardShortcuts } from "./components/useKeyboardShortcuts";
import { colors } from "./theme";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

export function HomeScreen({ navigation }: Props) {
  const currentZoneId = useGameStore((s) => s.currentZoneId);
  const party = useGameStore((s) => s.party);
  const battlesWon = useGameStore((s) => s.battlesWon);
  const currency = useGameStore((s) => s.currency);

  const leadMember = party[0];
  const zoneName = getZoneName(currentZoneId);

  useKeyboardShortcuts({
    b: () => navigation.navigate("Bag"),
    p: () => navigation.navigate("Party"),
    m: () => navigation.popToTop(),
  });

  return (
    <ScreenBackground style={styles.container}>
      <View style={styles.hud}>
        <View style={styles.hudTopRow}>
          <Text style={styles.zoneLabel}>{zoneName}</Text>
          <Text style={styles.currency}>{currency} 🪙</Text>
        </View>
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
            <HpBar currentHp={leadMember.currentHp} maxHp={partyMemberStats(leadMember).hp} />
          </View>
        )}
        <Text style={styles.stat}>Battles won: {battlesWon}</Text>
      </View>

      <View style={styles.actions}>
        <HoverTip text="Return to the map and keep exploring. Keyboard: M does this from anywhere.">
          <PrimaryButton testID="nav-explore" label={`Explore ${zoneName}`} onPress={() => navigation.popToTop()} />
        </HoverTip>
        <HoverTip text="Manage your party: check stats, use items, switch order, or release a creature. Keyboard: P.">
          <PrimaryButton
            testID="nav-party"
            label="Party"
            variant="secondary"
            onPress={() => navigation.navigate("Party")}
          />
        </HoverTip>
        <HoverTip text="Browse every species you've seen or caught so far.">
          <PrimaryButton
            testID="nav-codex"
            label="Codex"
            variant="secondary"
            onPress={() => navigation.navigate("Codex")}
          />
        </HoverTip>
        <HoverTip text="Check your balls, medicine, and key items. Keyboard: B.">
          <PrimaryButton
            testID="nav-bag"
            label="Bag"
            variant="secondary"
            onPress={() => navigation.navigate("Bag")}
          />
        </HoverTip>
        <HoverTip text="Spend gold on balls and medicine — earned by catching or defeating wild creatures.">
          <PrimaryButton
            testID="nav-shop"
            label="Shop"
            variant="secondary"
            onPress={() => navigation.navigate("Shop")}
          />
        </HoverTip>
        <HoverTip text="Explains the goal, battling, catching, and what Crux Aura is.">
          <PrimaryButton
            testID="nav-help"
            label="Help"
            variant="secondary"
            onPress={() => navigation.navigate("Help")}
          />
        </HoverTip>
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
  hudTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  zoneLabel: {
    color: colors.textMuted,
    fontSize: 13,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  currency: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: "700",
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
