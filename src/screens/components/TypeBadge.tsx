import { StyleSheet, Text, View } from "react-native";
import { typeColor, typeIcon } from "../theme";

export function TypeBadge({ type }: { type: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: typeColor(type) }]}>
      <Text style={styles.icon}>{typeIcon(type)}</Text>
      <Text style={styles.text}>{type}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    gap: 4,
  },
  icon: {
    fontSize: 12,
  },
  text: {
    color: "#0d1b2a",
    fontSize: 12,
    fontWeight: "700",
  },
});
