import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { useGameStore } from "../state/gameStore";
import { DEX_ENTRIES } from "../game/speciesCatalog";
import type { TypeName } from "../data/schemas";
import { TypeBadge } from "./components/TypeBadge";
import { CreatureAvatar } from "./components/CreatureAvatar";
import { PrimaryButton } from "./components/PrimaryButton";
import { ScreenBackground } from "./components/ScreenBackground";
import { useKeyboardShortcuts } from "./components/useKeyboardShortcuts";
import { colors, typeColor } from "./theme";

type Props = NativeStackScreenProps<RootStackParamList, "Codex">;

const ALL_TYPES: TypeName[] = Array.from(new Set(DEX_ENTRIES.flatMap((e) => e.types))).sort();

export function CodexScreen({ navigation }: Props) {
  const seenSpeciesIds = useGameStore((s) => s.seenSpeciesIds);
  const caughtSpeciesIds = useGameStore((s) => s.caughtSpeciesIds);
  const [typeFilter, setTypeFilter] = useState<TypeName | null>(null);

  useKeyboardShortcuts({ m: () => navigation.popToTop() });

  const entries = useMemo(
    () => (typeFilter ? DEX_ENTRIES.filter((e) => e.types.includes(typeFilter)) : DEX_ENTRIES),
    [typeFilter]
  );

  const seenCount = DEX_ENTRIES.filter((e) => seenSpeciesIds.includes(e.speciesId)).length;

  return (
    <ScreenBackground style={styles.container}>
      <Text style={styles.title}>Codex</Text>
      <Text style={styles.subtitle}>
        {seenCount} / {DEX_ENTRIES.length} seen · {caughtSpeciesIds.length} / {DEX_ENTRIES.length} caught
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        <Pressable
          onPress={() => setTypeFilter(null)}
          style={[styles.filterChip, typeFilter === null && styles.filterChipActive]}
        >
          <Text style={styles.filterChipText}>All</Text>
        </Pressable>
        {ALL_TYPES.map((t) => (
          <Pressable
            key={t}
            onPress={() => setTypeFilter(t)}
            style={[
              styles.filterChip,
              { borderColor: typeColor(t) },
              typeFilter === t && { backgroundColor: typeColor(t) },
            ]}
          >
            <Text style={styles.filterChipText}>{t}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.grid}>
        {entries.map((entry) => {
          const seen = seenSpeciesIds.includes(entry.speciesId);
          const caught = caughtSpeciesIds.includes(entry.speciesId);
          const revealed = seen || caught;

          return (
            <Pressable
              key={entry.speciesId}
              testID={`dex-entry-${entry.speciesId}`}
              disabled={!revealed}
              onPress={() =>
                navigation.navigate("CreatureDetail", { source: "species", speciesId: entry.speciesId })
              }
              style={({ pressed }) => [styles.cell, pressed && revealed && styles.cellPressed]}
            >
              {revealed && (
                <View style={styles.avatarRow}>
                  <CreatureAvatar speciesId={entry.speciesId} types={entry.types} size={40} />
                </View>
              )}
              <Text style={styles.cellName}>{revealed ? entry.name : "???"}</Text>
              {revealed ? (
                <View style={styles.badgeRow}>
                  {entry.types.map((t) => (
                    <TypeBadge key={t} type={t} />
                  ))}
                </View>
              ) : (
                <Text style={styles.unseen}>Not yet encountered</Text>
              )}
              {caught && <Text style={styles.caughtLabel}>Caught</Text>}
              {seen && !caught && <Text style={styles.seenLabel}>Seen</Text>}
            </Pressable>
          );
        })}
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
    marginBottom: 10,
  },
  filterRow: {
    gap: 8,
    paddingBottom: 12,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  filterChipActive: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.accent,
  },
  filterChipText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "600",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingBottom: 8,
  },
  cell: {
    flexBasis: "47%",
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 6,
    minHeight: 92,
  },
  cellPressed: {
    opacity: 0.8,
  },
  cellName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  avatarRow: {
    alignItems: "flex-start",
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  unseen: {
    color: colors.textMuted,
    fontSize: 11,
    fontStyle: "italic",
  },
  caughtLabel: {
    color: colors.success,
    fontSize: 11,
    fontWeight: "700",
  },
  seenLabel: {
    color: colors.textMuted,
    fontSize: 11,
  },
});
