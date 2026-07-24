import { useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { useGameStore } from "../state/gameStore";
import { getMap, isWalkable, isEncounterTile, isExitTile, type TileType } from "../game/mapData";
import { PrimaryButton } from "./components/PrimaryButton";
import { ScreenBackground } from "./components/ScreenBackground";
import { colors } from "./theme";

type Props = NativeStackScreenProps<RootStackParamList, "Map">;

const TILE_SIZE = 44;
const ENCOUNTER_CHANCE = 0.15;

type Direction = "up" | "down" | "left" | "right";

const DIRECTION_DELTA: Record<Direction, { dRow: number; dCol: number; glyph: string }> = {
  up: { dRow: -1, dCol: 0, glyph: "▲" },
  down: { dRow: 1, dCol: 0, glyph: "▼" },
  left: { dRow: 0, dCol: -1, glyph: "◀" },
  right: { dRow: 0, dCol: 1, glyph: "▶" },
};

const TILE_COLORS: Record<TileType, string> = {
  tree: "#0b2a1a",
  path: "#4a4030",
  grass: "#1f5c3a",
  exit: "#7a5c2e",
};

export function MapScreen({ navigation, route }: Props) {
  const map = getMap(route.params.zoneId);
  const setCurrentZone = useGameStore((s) => s.setCurrentZone);

  const [position, setPosition] = useState(map.playerStart);
  const [facing, setFacing] = useState<Direction>("down");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const anim = useRef(
    new Animated.ValueXY({
      x: map.playerStart.col * TILE_SIZE,
      y: map.playerStart.row * TILE_SIZE,
    })
  ).current;

  function move(direction: Direction) {
    if (busy) return;
    setFacing(direction);
    const { dRow, dCol } = DIRECTION_DELTA[direction];
    const next = { row: position.row + dRow, col: position.col + dCol };

    if (!isWalkable(map, next.row, next.col)) {
      setMessage("Can't walk that way — trees block the path.");
      return;
    }

    setMessage(null);
    setPosition(next);
    setBusy(true);
    Animated.timing(anim, {
      toValue: { x: next.col * TILE_SIZE, y: next.row * TILE_SIZE },
      duration: 150,
      useNativeDriver: false, // animating a plain View position, not a native-driver-eligible property
    }).start(() => {
      setBusy(false);

      if (isExitTile(map, next.row, next.col) && map.exitTo) {
        setCurrentZone(map.exitTo);
        // push (not navigate): guarantees a fresh Map instance for the new
        // zone rather than reusing this one's local position state.
        navigation.push("Map", { zoneId: map.exitTo });
        return;
      }

      if (isEncounterTile(map, next.row, next.col) && Math.random() < ENCOUNTER_CHANCE) {
        navigation.navigate("Battle");
      }
    });
  }

  return (
    <ScreenBackground style={styles.container}>
      <Text style={styles.title}>{map.zoneName}</Text>
      <Text style={styles.subtitle}>
        Walk into the tall grass — wild creatures lurk there.
        {map.exitTo ? " The lit path leads onward." : " This is as far as the path goes for now."}
      </Text>

      <View style={styles.gridWrap}>
        <View style={[styles.grid, { width: map.rows[0].length * TILE_SIZE, height: map.rows.length * TILE_SIZE }]}>
          {map.rows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.row}>
              {row.map((tile, colIndex) => (
                <View key={colIndex} style={[styles.tile, { backgroundColor: TILE_COLORS[tile] }]} />
              ))}
            </View>
          ))}
          <Animated.View testID="player-avatar" style={[styles.avatar, { transform: anim.getTranslateTransform() }]}>
            <Text style={styles.avatarGlyph}>{DIRECTION_DELTA[facing].glyph}</Text>
          </Animated.View>
        </View>
      </View>

      <Text style={styles.message}>{message ?? " "}</Text>

      <View style={styles.dpad}>
        <Pressable testID="move-up" onPress={() => move("up")} style={styles.dpadButton}>
          <Text style={styles.dpadGlyph}>▲</Text>
        </Pressable>
        <View style={styles.dpadMiddleRow}>
          <Pressable testID="move-left" onPress={() => move("left")} style={styles.dpadButton}>
            <Text style={styles.dpadGlyph}>◀</Text>
          </Pressable>
          <View style={styles.dpadSpacer} />
          <Pressable testID="move-right" onPress={() => move("right")} style={styles.dpadButton}>
            <Text style={styles.dpadGlyph}>▶</Text>
          </Pressable>
        </View>
        <Pressable testID="move-down" onPress={() => move("down")} style={styles.dpadButton}>
          <Text style={styles.dpadGlyph}>▼</Text>
        </Pressable>
      </View>

      <PrimaryButton testID="back-button" label="Back to Home" variant="secondary" onPress={() => navigation.popToTop()} />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 24,
    gap: 12,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "700",
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: "center",
  },
  gridWrap: {
    marginTop: 8,
  },
  grid: {
    position: "relative",
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: colors.border,
  },
  row: {
    flexDirection: "row",
  },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderWidth: 0.5,
    borderColor: "rgba(0,0,0,0.15)",
  },
  avatar: {
    position: "absolute",
    top: 0,
    left: 0,
    width: TILE_SIZE,
    height: TILE_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarGlyph: {
    fontSize: 22,
    color: colors.accent,
    textShadowColor: "#000",
    textShadowRadius: 3,
    textShadowOffset: { width: 0, height: 1 },
  },
  message: {
    color: colors.danger,
    fontSize: 12,
    minHeight: 16,
    textAlign: "center",
  },
  dpad: {
    alignItems: "center",
    gap: 6,
  },
  dpadMiddleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dpadButton: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  dpadSpacer: {
    width: 52,
    height: 52,
  },
  dpadGlyph: {
    fontSize: 20,
    color: colors.text,
  },
});
