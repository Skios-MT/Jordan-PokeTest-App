import itemsData from "../data/items.json";
import { ItemsFileSchema, type ItemCategory, type ItemData } from "../data/schemas";

const parsed = ItemsFileSchema.parse(itemsData);

export const ITEMS: ItemData[] = parsed.items;

const itemsById: Record<string, ItemData> = Object.fromEntries(ITEMS.map((item) => [item.id, item]));

export function getItem(id: string): ItemData {
  const item = itemsById[id];
  if (!item) throw new Error(`Unknown item id: ${id}`);
  return item;
}

export function itemsByCategory(category: ItemCategory): ItemData[] {
  return ITEMS.filter((item) => item.category === category);
}

export const ITEM_CATEGORIES: { key: ItemCategory; label: string }[] = [
  { key: "balls", label: "Balls" },
  { key: "medicine", label: "Medicine" },
  { key: "key_items", label: "Key Items" },
  { key: "battle_items", label: "Battle Items" },
];

export function defaultStartingInventory(): Record<string, number> {
  return Object.fromEntries(ITEMS.map((item) => [item.id, item.startingQuantity]));
}

export function purchasableItems(): ItemData[] {
  return ITEMS.filter((item) => item.price !== undefined);
}

/** Medicine items with a battle heal effect, i.e. usable via the Battle "Use Item" button. */
export function healingItems(): ItemData[] {
  return ITEMS.filter((item) => item.healPercent !== undefined);
}

/** Highest catch-multiplier ball the player currently has at least one of. */
const BALL_PRIORITY = ["melitan_ball", "festa_trap", "greca_trap"];

export function pickBestAvailableBall(inventory: Record<string, number>): ItemData | undefined {
  for (const id of BALL_PRIORITY) {
    if ((inventory[id] ?? 0) > 0) return getItem(id);
  }
  return undefined;
}
