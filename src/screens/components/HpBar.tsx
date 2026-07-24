import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";

export function HpBar({ currentHp, maxHp }: { currentHp: number; maxHp: number }) {
  const ratio = Math.max(0, Math.min(1, currentHp / maxHp));
  const fillColor = ratio > 0.5 ? colors.success : ratio > 0.2 ? "#e0c458" : colors.danger;

  return (
    <View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${ratio * 100}%`, backgroundColor: fillColor }]} />
      </View>
      <Text style={styles.label}>
        {Math.max(0, currentHp)} / {maxHp}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 10,
    borderRadius: 6,
    backgroundColor: "#0d1b2a",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  fill: {
    height: "100%",
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
});
