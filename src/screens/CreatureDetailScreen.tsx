import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { useGameStore } from "../state/gameStore";
import { getDexEntry } from "../game/speciesCatalog";
import { getMove } from "../game/movesRepo";
import { partyMemberStats } from "../game/party";
import { xpToNextLevel } from "../game/progression";
import type { StatBlock } from "../data/schemas";
import { HpBar } from "./components/HpBar";
import { TypeBadge } from "./components/TypeBadge";
import { CreatureAvatar } from "./components/CreatureAvatar";
import { PrimaryButton } from "./components/PrimaryButton";
import { ScreenBackground } from "./components/ScreenBackground";
import { colors } from "./theme";

type Props = NativeStackScreenProps<RootStackParamList, "CreatureDetail">;

const STAT_LABELS: { key: keyof StatBlock; label: string }[] = [
  { key: "hp", label: "HP" },
  { key: "atk", label: "Attack" },
  { key: "def", label: "Defense" },
  { key: "spatk", label: "Sp. Attack" },
  { key: "spdef", label: "Sp. Defense" },
  { key: "speed", label: "Speed" },
];

/** Reference ceiling for the stat bars — Melita's base stats top out well under this. */
const STAT_BAR_MAX = 180;

function StatBar({ label, value }: { label: string; value: number }) {
  const ratio = Math.max(0, Math.min(1, value / STAT_BAR_MAX));
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statBarTrack}>
        <View style={[styles.statBarFill, { width: `${ratio * 100}%` }]} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

export function CreatureDetailScreen({ route, navigation }: Props) {
  const params = route.params;
  const party = useGameStore((s) => s.party);
  const caughtSpeciesIds = useGameStore((s) => s.caughtSpeciesIds);
  const releaseCreature = useGameStore((s) => s.releaseCreature);
  const [confirmingRelease, setConfirmingRelease] = useState(false);

  const partyMember = params.source === "party" ? party.find((m) => m.uid === params.uid) : undefined;
  const dexEntry = params.source === "species" ? getDexEntry(params.speciesId) : undefined;

  if (params.source === "party" && !partyMember) {
    return (
      <ScreenBackground style={styles.container}>
        <Text style={styles.notFound}>That party member could no longer be found.</Text>
        <PrimaryButton testID="back-button" label="Back" onPress={() => navigation.goBack()} />
      </ScreenBackground>
    );
  }
  if (params.source === "species" && !dexEntry) {
    return (
      <ScreenBackground style={styles.container}>
        <Text style={styles.notFound}>Unknown species.</Text>
        <PrimaryButton testID="back-button" label="Back" onPress={() => navigation.goBack()} />
      </ScreenBackground>
    );
  }

  const name = partyMember?.displayName ?? dexEntry!.name;
  const speciesId = partyMember?.speciesId ?? dexEntry!.speciesId;
  const types = partyMember?.types ?? dexEntry!.types;
  const level = partyMember?.level ?? null;
  const stats = partyMember ? partyMemberStats(partyMember) : dexEntry?.stats;
  const flavor = dexEntry?.flavor;
  const signatureMove = dexEntry?.signatureMove;
  const isCaught = params.source === "species" ? caughtSpeciesIds.includes(params.speciesId) : true;

  return (
    <ScreenBackground style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerTopRow}>
          <CreatureAvatar speciesId={speciesId} types={types} size={72} />
          <View style={styles.headerInfo}>
            <View style={styles.headerRow}>
              <Text style={styles.name}>{name}</Text>
              {level !== null && <Text style={styles.level}>Lv. {level}</Text>}
            </View>
            <View style={styles.badgeRow}>
              {types.map((t) => (
                <TypeBadge key={t} type={t} />
              ))}
            </View>
          </View>
        </View>

        {partyMember && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Condition</Text>
            <HpBar currentHp={partyMember.currentHp} maxHp={partyMemberStats(partyMember).hp} />
            <Text style={styles.xpText}>
              XP {partyMember.xp} / {xpToNextLevel(partyMember.level)} to Lv. {partyMember.level + 1}
            </Text>
          </View>
        )}

        {flavor && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{dexEntry?.category === "legendary" ? "Aesthetic" : "Flavor"}</Text>
            <Text style={styles.flavorText}>{flavor}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Base Stats</Text>
          {stats ? (
            STAT_LABELS.map(({ key, label }) => <StatBar key={key} label={label} value={stats[key]} />)
          ) : (
            <Text style={styles.unrecorded}>
              Not recorded yet — this stage's stats aren't in the data file (see docs/GAME_SPEC.md).
            </Text>
          )}
        </View>

        {signatureMove && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Signature Move</Text>
            <Text style={styles.flavorText}>{signatureMove}</Text>
          </View>
        )}

        {partyMember && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Known Moves</Text>
            {partyMember.moveIds.map((moveId) => {
              const move = getMove(moveId);
              return (
                <View key={moveId} style={styles.moveRow}>
                  <Text style={styles.moveName}>{move.name}</Text>
                  <TypeBadge type={move.type} />
                  <Text style={styles.movePower}>{move.power} pwr</Text>
                </View>
              );
            })}
          </View>
        )}

        {params.source === "species" && !isCaught && (
          <Text style={styles.unrecorded}>Not yet caught — details shown are from field observation only.</Text>
        )}

        {partyMember && party.length > 1 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Release</Text>
            {confirmingRelease ? (
              <View style={styles.releaseConfirmRow}>
                <Text style={styles.flavorText}>Release {partyMember.displayName} for good? This can't be undone.</Text>
                <View style={styles.releaseConfirmButtons}>
                  <Pressable
                    testID="confirm-release"
                    onPress={() => {
                      releaseCreature(partyMember.uid);
                      navigation.goBack();
                    }}
                    style={styles.releaseConfirmBtn}
                  >
                    <Text style={styles.releaseConfirmBtnText}>Yes, release</Text>
                  </Pressable>
                  <Pressable testID="cancel-release" onPress={() => setConfirmingRelease(false)} style={styles.releaseCancelBtn}>
                    <Text style={styles.releaseCancelBtnText}>Cancel</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable testID="release-button" onPress={() => setConfirmingRelease(true)} style={styles.releaseButton}>
                <Text style={styles.releaseButtonText}>Release {partyMember.displayName}</Text>
              </Pressable>
            )}
          </View>
        )}
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
    gap: 16,
  },
  scrollContent: {
    gap: 18,
    paddingBottom: 12,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  headerInfo: {
    flex: 1,
    gap: 6,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  name: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "700",
  },
  level: {
    color: colors.textMuted,
    fontSize: 16,
  },
  badgeRow: {
    flexDirection: "row",
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 10,
  },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  flavorText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  unrecorded: {
    color: colors.textMuted,
    fontSize: 12,
    fontStyle: "italic",
  },
  xpText: {
    color: colors.textMuted,
    fontSize: 11,
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statLabel: {
    color: colors.text,
    fontSize: 12,
    width: 84,
  },
  statBarTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.background,
    overflow: "hidden",
  },
  statBarFill: {
    height: "100%",
    backgroundColor: colors.accent,
  },
  statValue: {
    color: colors.textMuted,
    fontSize: 12,
    width: 32,
    textAlign: "right",
  },
  moveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  moveName: {
    color: colors.text,
    fontSize: 14,
    flex: 1,
  },
  movePower: {
    color: colors.textMuted,
    fontSize: 12,
  },
  notFound: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: "center",
    marginTop: 100,
  },
  releaseButton: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  releaseButtonText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "700",
  },
  releaseConfirmRow: {
    gap: 10,
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
