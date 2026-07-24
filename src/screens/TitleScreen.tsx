import { StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { PrimaryButton } from "./components/PrimaryButton";
import { ScreenBackground } from "./components/ScreenBackground";
import { colors } from "./theme";

type Props = NativeStackScreenProps<RootStackParamList, "Title">;

export function TitleScreen({ navigation }: Props) {
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
        <PrimaryButton label="New Game" onPress={() => navigation.navigate("NameEntry")} />
        <PrimaryButton label="Continue" onPress={() => {}} disabled variant="secondary" />
        <Text style={styles.hint}>No save file yet — Continue unlocks once persistence is wired up.</Text>
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
