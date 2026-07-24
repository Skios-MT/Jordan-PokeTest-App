import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { useGameStore } from "../state/gameStore";
import { purchasableItems } from "../game/itemsRepo";
import { PrimaryButton } from "./components/PrimaryButton";
import { ScreenBackground } from "./components/ScreenBackground";
import { colors } from "./theme";

type Props = NativeStackScreenProps<RootStackParamList, "Shop">;

const items = purchasableItems();

export function ShopScreen({ navigation }: Props) {
  const currency = useGameStore((s) => s.currency);
  const inventory = useGameStore((s) => s.inventory);
  const spendCurrency = useGameStore((s) => s.spendCurrency);
  const addItem = useGameStore((s) => s.addItem);

  function buy(itemId: string, price: number) {
    if (!spendCurrency(price)) return;
    addItem(itemId, 1);
  }

  return (
    <ScreenBackground style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Shop</Text>
        <Text style={styles.currency}>{currency} 🪙</Text>
      </View>
      <Text style={styles.subtitle}>Earn gold by catching or defeating wild creatures.</Text>

      <ScrollView contentContainerStyle={styles.list}>
        {items.map((item) => {
          const owned = inventory[item.id] ?? 0;
          const canAfford = currency >= (item.price ?? 0);
          return (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemQty}>owned: {owned}</Text>
              </View>
              <Text style={styles.itemDescription}>{item.description}</Text>
              <View style={styles.buyRow}>
                <Text style={styles.price}>{item.price} 🪙</Text>
                <Pressable
                  testID={`buy-${item.id}`}
                  disabled={!canAfford}
                  onPress={() => buy(item.id, item.price ?? 0)}
                  style={({ pressed }) => [
                    styles.buyButton,
                    !canAfford && styles.buyButtonDisabled,
                    pressed && canAfford && styles.buyButtonPressed,
                  ]}
                >
                  <Text style={styles.buyButtonText}>Buy</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
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
    gap: 4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "700",
  },
  currency: {
    color: colors.accent,
    fontSize: 17,
    fontWeight: "700",
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 8,
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
    fontSize: 12,
  },
  itemDescription: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  buyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  price: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "700",
  },
  buyButton: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  buyButtonDisabled: {
    opacity: 0.35,
  },
  buyButtonPressed: {
    opacity: 0.75,
  },
  buyButtonText: {
    color: "#0d1b2a",
    fontWeight: "700",
    fontSize: 13,
  },
});
