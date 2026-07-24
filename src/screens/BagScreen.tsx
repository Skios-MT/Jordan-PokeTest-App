import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { useGameStore } from "../state/gameStore";
import { ITEM_CATEGORIES, itemsByCategory } from "../game/itemsRepo";
import type { ItemCategory } from "../data/schemas";
import { PrimaryButton } from "./components/PrimaryButton";
import { ScreenBackground } from "./components/ScreenBackground";
import { colors } from "./theme";

type Props = NativeStackScreenProps<RootStackParamList, "Bag">;

export function BagScreen({ navigation }: Props) {
  const inventory = useGameStore((s) => s.inventory);
  const [category, setCategory] = useState<ItemCategory>("balls");

  const items = itemsByCategory(category);

  return (
    <ScreenBackground style={styles.container}>
      <Text style={styles.title}>Bag</Text>

      <View style={styles.tabRow}>
        {ITEM_CATEGORIES.map((c) => (
          <Pressable
            key={c.key}
            testID={`bag-tab-${c.key}`}
            onPress={() => setCategory(c.key)}
            style={[styles.tab, category === c.key && styles.tabActive]}
          >
            <Text style={[styles.tabText, category === c.key && styles.tabTextActive]}>{c.label}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {items.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemQty}>x{inventory[item.id] ?? 0}</Text>
            </View>
            <Text style={styles.itemDescription}>{item.description}</Text>
            {item.catchMultiplier && (
              <Text style={styles.itemMeta}>Catch multiplier: {item.catchMultiplier.toFixed(1)}x</Text>
            )}
          </View>
        ))}
        {items.length === 0 && <Text style={styles.empty}>Nothing here yet.</Text>}
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
    gap: 12,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "700",
  },
  tabRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tab: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tabActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  tabText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#0d1b2a",
  },
  list: {
    gap: 12,
    paddingVertical: 4,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 6,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  itemName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  itemQty: {
    color: colors.textMuted,
    fontSize: 14,
  },
  itemDescription: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  itemMeta: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: "600",
  },
  empty: {
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 40,
  },
});
