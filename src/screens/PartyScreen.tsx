import { useState } from "react";
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
  const releaseCreature = useGameStore((s) => s.releaseCreature);
  const [confirmUid, setConfirmUid] = useState<string | null>(null);

  return (
    <ScreenBackground style={styles.container}>
      <Text style={styles.title}>Party</Text>
      <Text style={styles.subtitle}>
        {party.length} / 6 — drag-reorder and held items aren't wired up yet, but you can inspect each member.
      </Text>

      <ScrollView contentContainerStyle={styles.list}>
        {party.map((member, index) => {
          const fainted = member.currentHp <= 0;
          const confirming = confirmUid === member.uid;
          return (
            <View key={member.uid} style={[styles.card, fainted && styles.cardFainted]}>
              <Pressable
                testID={`party-member-${member.uid}`}
                onPress={() => navigation.navigate("CreatureDetail", { source: "party", uid: member.uid })}
                style={({ pressed }) => [pressed && styles.cardPressed]}
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

              {party.length > 1 &&
                (confirming ? (
                  <View style={styles.releaseConfirmRow}>
                    <Text style={styles.releaseConfirmText}>Release {member.displayName} for good?</Text>
                    <View style={styles.releaseConfirmButtons}>
                      <Pressable
                        testID={`confirm-release-${member.uid}`}
                        onPress={() => {
                          releaseCreature(member.uid);
                          setConfirmUid(null);
                        }}
                        style={styles.releaseConfirmBtn}
                      >
                        <Text style={styles.releaseConfirmBtnText}>Yes, release</Text>
                      </Pressable>
                      <Pressable
                        testID={`cancel-release-${member.uid}`}
                        onPress={() => setConfirmUid(null)}
                        style={styles.releaseCancelBtn}
                      >
                        <Text style={styles.releaseCancelBtnText}>Cancel</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Pressable
                    testID={`release-${member.uid}`}
                    onPress={() => setConfirmUid(member.uid)}
                    style={styles.releaseButton}
                  >
                    <Text style={styles.releaseButtonText}>Release</Text>
                  </Pressable>
                ))}
            </View>
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
  releaseButton: {
    alignSelf: "flex-end",
    marginTop: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  releaseButtonText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: "700",
  },
  releaseConfirmRow: {
    marginTop: 8,
    gap: 8,
  },
  releaseConfirmText: {
    color: colors.text,
    fontSize: 13,
  },
  releaseConfirmButtons: {
    flexDirection: "row",
    gap: 10,
  },
  releaseConfirmBtn: {
    backgroundColor: colors.danger,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  releaseConfirmBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  releaseCancelBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  releaseCancelBtnText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },
});
