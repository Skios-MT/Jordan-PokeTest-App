import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import startersData from "../data/starters.json";
import { StartersFileSchema } from "../data/schemas";
import type { RootStackParamList } from "../navigation/types";
import type { StarterLineName } from "../game/creatureFactory";
import { useGameStore } from "../state/gameStore";
import { PrimaryButton } from "./components/PrimaryButton";
import { TypeBadge } from "./components/TypeBadge";
import { colors } from "./theme";

type Props = NativeStackScreenProps<RootStackParamList, "StarterSelect">;

const starters = StartersFileSchema.parse(startersData).starters;

export function StarterSelectScreen({ navigation }: Props) {
  const selectedLine = useGameStore((s) => s.selectedLine);
  const selectStarter = useGameStore((s) => s.selectStarter);

  const handleConfirm = () => {
    if (!selectedLine) return;
    navigation.reset({ index: 0, routes: [{ name: "Home" }] });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose your first partner</Text>
      <ScrollView contentContainerStyle={styles.list}>
        {starters.map((starter) => {
          const stageOne = starter.stages[0];
          const isSelected = selectedLine === starter.line;
          return (
            <Pressable
              key={starter.line}
              onPress={() => selectStarter(starter.line as StarterLineName)}
              style={[styles.card, isSelected && styles.cardSelected]}
            >
              <Text style={styles.name}>{stageOne.name}</Text>
              <View style={styles.badgeRow}>
                {stageOne.types.map((t) => (
                  <TypeBadge key={t} type={t} />
                ))}
              </View>
              <Text style={styles.signature}>Signature move: {starter.signatureMove}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <PrimaryButton label="Confirm" onPress={handleConfirm} disabled={!selectedLine} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 20,
    paddingTop: 64,
    paddingBottom: 24,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 20,
  },
  list: {
    gap: 14,
    paddingBottom: 12,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border,
    padding: 18,
  },
  cardSelected: {
    borderColor: colors.accent,
  },
  name: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  signature: {
    color: colors.textMuted,
    fontSize: 13,
  },
});
