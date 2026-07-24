import { StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { PrimaryButton } from "./components/PrimaryButton";
import { colors } from "./theme";

type Props = NativeStackScreenProps<RootStackParamList, "Title">;

export function TitleScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.titleBlock}>
        <Text style={styles.title}>Project Melita</Text>
        <Text style={styles.subtitle}>Chivalry & Antiquity</Text>
      </View>

      <View style={styles.actions}>
        <PrimaryButton label="New Game" onPress={() => navigation.navigate("RegionSelect")} />
        <PrimaryButton label="Continue" onPress={() => {}} disabled variant="secondary" />
        <Text style={styles.hint}>No save file yet — Continue unlocks once persistence is wired up.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 96,
    paddingHorizontal: 24,
  },
  titleBlock: {
    alignItems: "center",
    marginTop: 48,
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: "700",
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
