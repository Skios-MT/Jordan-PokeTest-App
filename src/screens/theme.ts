export const colors = {
  background: "#0d1b2a",
  surface: "#1b263b",
  surfaceAlt: "#243b55",
  border: "#415a77",
  text: "#e0e1dd",
  textMuted: "#778da9",
  accent: "#e0a458",
  danger: "#c94f4f",
  success: "#4fa87c",
};

export const TYPE_COLORS: Record<string, string> = {
  Steel: "#8d99ae",
  Ghost: "#6b5b95",
  Psychic: "#d1495b",
  Rock: "#a68a64",
  Water: "#3a86ff",
  Fire: "#e0a458",
  Grass: "#4fa87c",
  Electric: "#f4d35e",
  Ground: "#b08968",
  Flying: "#8ecae6",
  Fighting: "#bc4749",
  Fairy: "#f2a6d0",
  Ice: "#a2d2ff",
  Bug: "#9caf50",
  Poison: "#8e5572",
  Normal: "#b8b8a8",
  Dark: "#3d348b",
  Dragon: "#5f0f40",
};

export function typeColor(type: string): string {
  return TYPE_COLORS[type] ?? colors.surfaceAlt;
}
