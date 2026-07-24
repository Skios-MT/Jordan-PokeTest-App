import { StyleSheet, Text, View } from "react-native";
import { typeColor } from "../theme";

export function TypeBadge({ type }: { type: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: typeColor(type) }]}>
      <Text style={styles.text}>{type}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginRight: 6,
  },
  text: {
    color: "#0d1b2a",
    fontSize: 12,
    fontWeight: "700",
  },
});
