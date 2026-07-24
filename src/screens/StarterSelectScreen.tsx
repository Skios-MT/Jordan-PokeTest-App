import { StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import startersData from "../data/starters.json";
import { StartersFileSchema } from "../data/schemas";
import type { RootStackParamList } from "../navigation/types";
import { useGameStore } from "../state/gameStore";
import { PrimaryButton } from "./components/PrimaryButton";
import { TypeBadge } from "./components/TypeBadge";
import { ScreenBackground } from "./components/ScreenBackground";
import { colors } from "./theme";

type Props = NativeStackScreenProps<RootStackParamList, "StarterSelect">;

const starters = StartersFileSchema.parse(startersData).starters;

/** Reveal screen: the quiz already picked selectedLine, this just confirms it. */
export function StarterSelectScreen({ navigation }: Props) {
  const playerName = useGameStore((s) => s.playerName);
  const selectedLine = useGameStore((s) => s.selectedLine);
  const party = useGameStore((s) => s.party);

  const starterLine = starters.find((s) => s.line === selectedLine);
  const stageOne = starterLine?.stages[0];
  const partner = party[0];

  const handleConfirm = () => {
    navigation.reset({ index: 0, routes: [{ name: "Home" }] });
  };

  if (!starterLine || !stageOne) {
    return (
      <ScreenBackground style={styles.container}>
        <Text style={styles.title}>No partner chosen yet</Text>
        <PrimaryButton label="Take the Quiz" onPress={() => navigation.navigate("StarterQuiz")} />
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground style={styles.container}>
      <Text style={styles.eyebrow}>The islands have decided</Text>
      <Text style={styles.title}>
        {playerName}, your partner is {stageOne.name}!
      </Text>

      <View style={styles.card}>
        <Text style={styles.name}>{stageOne.name}</Text>
        <View style={styles.badgeRow}>
          {stageOne.types.map((t) => (
            <TypeBadge key={t} type={t} />
          ))}
        </View>
        <Text style={styles.signature}>Signature move: {starterLine.signatureMove}</Text>
        {partner && <Text style={styles.level}>Starting level {partner.level}</Text>}
      </View>

      <PrimaryButton testID="confirm-starter" label="Confirm" onPress={handleConfirm} />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    gap: 20,
  },
  eyebrow: {
    color: colors.textMuted,
    fontSize: 13,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.accent,
    padding: 20,
    maxWidth: 340,
    width: "100%",
  },
  name: {
    color: colors.text,
    fontSize: 22,
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
  level: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
});
