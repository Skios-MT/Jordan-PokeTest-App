import { StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { useGameStore } from "../state/gameStore";
import { PrimaryButton } from "./components/PrimaryButton";
import { ScreenBackground } from "./components/ScreenBackground";
import { colors } from "./theme";

type Props = NativeStackScreenProps<RootStackParamList, "Title">;

export function TitleScreen({ navigation }: Props) {
  const hasHydrated = useGameStore((s) => s.hasHydrated);
  const hasSave = useGameStore((s) => s.party.length > 0);
  const currentZoneId = useGameStore((s) => s.currentZoneId);
  const resetGame = useGameStore((s) => s.resetGame);

  function handleNewGame() {
    if (hasSave) resetGame();
    navigation.navigate("NameEntry");
  }

  function handleContinue() {
    navigation.reset({ index: 0, routes: [{ name: "Map", params: { zoneId: currentZoneId } }] });
  }

  return (
    <ScreenBackground style={styles.container}>
      <View style={styles.crest}>
        <Text style={styles.crestGlyph}>✛</Text>
      </View>
      <View style={styles.titleBlock}>
        <Text style={styles.title}>Chivalry & Antiquity</Text>
        <Text style={styles.subtitle}>Project Melita</Text>
      </View>

      <View style={styles.actions}>
        <PrimaryButton testID="new-game" label="New Game" onPress={handleNewGame} />
        <PrimaryButton
          testID="continue-game"
          label="Continue"
          onPress={handleContinue}
          disabled={!hasHydrated || !hasSave}
          variant="secondary"
        />
        {hasHydrated && !hasSave && (
          <Text style={styles.hint}>No save file yet — start a New Game to create one.</Text>
        )}
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 80,
    paddingHorizontal: 24,
  },
  crest: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
  crestGlyph: {
    fontSize: 34,
    color: colors.accent,
  },
  titleBlock: {
    alignItems: "center",
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 16,
    marginTop: 8,
  },
  actions: {
    width: "100%",
    maxWidth: 320,
    gap: 12,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
  },
});
