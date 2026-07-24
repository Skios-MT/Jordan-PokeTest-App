import { StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { PrimaryButton } from "./components/PrimaryButton";
import { colors } from "./theme";

type Props = NativeStackScreenProps<RootStackParamList, "RegionSelect">;

/**
 * Melita (spec section 2) is currently the only region in the design —
 * Mainland Melita, Gaudos, and Ephrastia are all part of the same
 * archipelago, not separate regions to pick between. This screen confirms
 * the (only) region rather than offering a real choice, and is where a
 * future second region would slot in.
 */
export function RegionSelectScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>Region</Text>
      <View style={styles.card}>
        <Text style={styles.regionName}>Melita</Text>
        <Text style={styles.regionBlurb}>
          An archipelago of three islands — Mainland Melita, Gaudos, and Ephrastia — caught between
          the fortress-tech of the Knights' Chivalry and the megalithic folklore of Antiquity.
        </Text>
      </View>

      <PrimaryButton label="Begin Journey" onPress={() => navigation.navigate("StarterSelect")} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 24,
  },
  eyebrow: {
    color: colors.textMuted,
    fontSize: 13,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    maxWidth: 340,
  },
  regionName: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 10,
  },
  regionBlurb: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
});
