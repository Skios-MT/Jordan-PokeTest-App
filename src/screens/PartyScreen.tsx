import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { useGameStore } from "../state/gameStore";
import { partyMemberStats } from "../game/party";
import { HpBar } from "./components/HpBar";
import { TypeBadge } from "./components/TypeBadge";
import { CreatureAvatar } from "./components/CreatureAvatar";
import { PrimaryButton } from "./components/PrimaryButton";
import { ScreenBackground } from "./components/ScreenBackground";
import { colors } from "./theme";

type Props = NativeStackScreenProps<RootStackParamList, "Party">;

export function PartyScreen({ navigation }: Props) {
  const party = useGameStore((s) => s.party);

  return (
    <ScreenBackground style={styles.container}>
      <Text style={styles.title}>Party</Text>
      <Text style={styles.subtitle}>
        {party.length} / 6 — drag-reorder and held items aren't wired up yet, but you can inspect each member.
      </Text>

      <ScrollView contentContainerStyle={styles.list}>
        {party.map((member, index) => {
          const fainted = member.currentHp <= 0;
          return (
            <Pressable
              key={member.uid}
              testID={`party-member-${member.uid}`}
              onPress={() => navigation.navigate("CreatureDetail", { source: "party", uid: member.uid })}
              style={({ pressed }) => [styles.card, fainted && styles.cardFainted, pressed && styles.cardPressed]}
            >
              <View style={styles.cardTopRow}>
                <CreatureAvatar speciesId={member.speciesId} types={member.types} size={56} faded={fainted} />
                <View style={styles.cardInfo}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.slotIndex}>#{index + 1}</Text>
                    <Text style={styles.name}>
                      {member.displayName} <Text style={styles.level}>Lv. {member.level}</Text>
                    </Text>
                    {fainted && <Text style={styles.faintedTag}>Fainted</Text>}
                  </View>
                  <View style={styles.badgeRow}>
                    {member.types.map((t) => (
                      <TypeBadge key={t} type={t} />
                    ))}
                  </View>
                  <HpBar currentHp={member.currentHp} maxHp={partyMemberStats(member).hp} />
                </View>
              </View>
            </Pressable>
          );
        })}
        {party.length === 0 && <Text style={styles.empty}>No party members yet.</Text>}
      </ScrollView>

      <PrimaryButton testID="back-button" label="Back" variant="secondary" onPress={() => navigation.goBack()} />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 24,
    gap: 4,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 8,
  },
  list: {
    gap: 12,
    paddingVertical: 8,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 8,
  },
  cardPressed: {
    opacity: 0.8,
  },
  cardFainted: {
    opacity: 0.55,
  },
  faintedTag: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: "700",
    marginLeft: "auto",
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  cardInfo: {
    flex: 1,
    gap: 8,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  slotIndex: {
    color: colors.textMuted,
    fontSize: 12,
  },
  name: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "700",
  },
  level: {
    color: colors.textMuted,
    fontWeight: "400",
    fontSize: 13,
  },
  badgeRow: {
    flexDirection: "row",
  },
  empty: {
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 40,
  },
});
