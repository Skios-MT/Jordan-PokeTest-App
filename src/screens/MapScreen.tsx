import { useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { useGameStore } from "../state/gameStore";
import { getMap, isWalkable, isEncounterTile, isExitTile, isHealTile, type TileType } from "../game/mapData";
import { PrimaryButton } from "./components/PrimaryButton";
import { ScreenBackground } from "./components/ScreenBackground";
import { HoverTip } from "./components/HoverTip";
import { useKeyboardShortcuts } from "./components/useKeyboardShortcuts";
import { colors } from "./theme";

type Props = NativeStackScreenProps<RootStackParamList, "Map">;

const TILE_SIZE = 44;
/** How many tiles are visible at once — bigger zones now scroll a camera around the player
 * rather than rendering the whole map (which stopped fitting on a phone screen). Odd, so the
 * avatar can sit dead-center. */
const VIEWPORT_TILES = 7;
/** Base 0.15, bumped 30% per request. */
const ENCOUNTER_CHANCE = 0.195;
/** Screen-flash transition before cutting to Battle — a burst of quick flashes,
 * matching the classic "surprise encounter" screen-flash from the mainline games. */
const ENCOUNTER_FLASH_SEQUENCE = [1, 0, 1, 0, 1, 0, 1];
const ENCOUNTER_FLASH_STEP_MS = 90;

type Direction = "up" | "down" | "left" | "right";

const DIRECTION_DELTA: Record<Direction, { dRow: number; dCol: number; glyph: string }> = {
  up: { dRow: -1, dCol: 0, glyph: "▲" },
  down: { dRow: 1, dCol: 0, glyph: "▼" },
  left: { dRow: 0, dCol: -1, glyph: "◀" },
  right: { dRow: 0, dCol: 1, glyph: "▶" },
};

/** Dark Grass is deliberately a world apart from Path in both hue and value —
 * a near-black, saturated green vs. a warm, light sandy tan — so the one tile
 * type that can trigger an encounter never reads as "maybe just more path." */
const TILE_COLORS: Record<TileType, string> = {
  tree: "#0b2a1a",
  path: "#9c8a6b",
  grass: "#0c2e1a",
  exit: "#7a5c2e",
  heal: "#2e5c8a",
};

/**
 * Camera offset for one axis: follows the player's animated pixel position, centering them in
 * the viewport, but clamps at the map's edges so the camera never shows past the map bounds.
 * Returns a plain 0 (no scrolling needed) when the whole axis already fits inside the viewport.
 */
function cameraOffset(playerAnim: Animated.Value, mapPx: number, viewportPx: number) {
  if (mapPx <= viewportPx) return 0;
  const half = (viewportPx - TILE_SIZE) / 2;
  const rightBound = mapPx - viewportPx;
  const maxPlayer = mapPx - TILE_SIZE;
  return playerAnim.interpolate({
    inputRange: [0, half, half + rightBound, maxPlayer],
    outputRange: [0, 0, rightBound, rightBound],
    extrapolate: "clamp",
  });
}

export function MapScreen({ navigation, route }: Props) {
  const map = getMap(route.params.zoneId);
  const setCurrentZone = useGameStore((s) => s.setCurrentZone);
  const healFaintedPartyMembers = useGameStore((s) => s.healFaintedPartyMembers);

  const mapPixelWidth = map.rows[0].length * TILE_SIZE;
  const mapPixelHeight = map.rows.length * TILE_SIZE;
  const viewportWidth = Math.min(VIEWPORT_TILES * TILE_SIZE, mapPixelWidth);
  const viewportHeight = Math.min(VIEWPORT_TILES * TILE_SIZE, mapPixelHeight);

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
  const encounterFlash = useRef(new Animated.Value(0)).current;

  const cameraX = cameraOffset(anim.x, mapPixelWidth, viewportWidth);
  const cameraY = cameraOffset(anim.y, mapPixelHeight, viewportHeight);
  const cameraTranslateX = typeof cameraX === "number" ? cameraX : Animated.multiply(cameraX, -1);
  const cameraTranslateY = typeof cameraY === "number" ? cameraY : Animated.multiply(cameraY, -1);

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
      if (isExitTile(map, next.row, next.col) && map.exitTo) {
        setCurrentZone(map.exitTo);
        // reset (not push): Map is the app's default/root screen, so moving
        // to a new zone replaces the stack's root with a fresh Map instance
        // for that zone rather than growing an ever-longer push chain.
        navigation.reset({ index: 0, routes: [{ name: "Map", params: { zoneId: map.exitTo } }] });
        return;
      }

      if (isHealTile(map, next.row, next.col)) {
        const healedCount = healFaintedPartyMembers();
        setMessage(
          healedCount > 0
            ? `The Healing Center revived ${healedCount} fainted creature${healedCount === 1 ? "" : "s"}!`
            : "Nobody in your party needs reviving right now."
        );
        setBusy(false);
        return;
      }

      if (isEncounterTile(map, next.row, next.col) && Math.random() < ENCOUNTER_CHANCE) {
        // Screen-flash transition before cutting to Battle — busy stays true
        // for the whole sequence so the player can't walk away mid-flash.
        const flashAnimations = ENCOUNTER_FLASH_SEQUENCE.map((toValue) =>
          Animated.timing(encounterFlash, { toValue, duration: ENCOUNTER_FLASH_STEP_MS, useNativeDriver: false })
        );
        Animated.sequence(flashAnimations).start(() => {
          encounterFlash.setValue(0);
          setBusy(false);
          navigation.navigate("Battle");
        });
        return;
      }

      setBusy(false);
    });
  }

  useKeyboardShortcuts({
    ArrowUp: () => move("up"),
    ArrowDown: () => move("down"),
    ArrowLeft: () => move("left"),
    ArrowRight: () => move("right"),
    b: () => navigation.navigate("Bag"),
    p: () => navigation.navigate("Party"),
    m: () => navigation.navigate("Home"),
  });

  return (
    <ScreenBackground style={styles.container}>
      <Text style={styles.title}>{map.zoneName}</Text>
      <Text style={styles.subtitle}>
        Walk into the dark grass — wild creatures lurk there, nowhere else. The Healing Center (✚)
        revives any fainted party members.
        {map.exitTo ? " The lit path leads onward." : " This is as far as the path goes for now."}
      </Text>

      <View style={[styles.gridWrap, { width: viewportWidth, height: viewportHeight }]}>
        <Animated.View
          style={[
            styles.grid,
            {
              width: mapPixelWidth,
              height: mapPixelHeight,
              transform: [{ translateX: cameraTranslateX }, { translateY: cameraTranslateY }],
            },
          ]}
        >
          {map.rows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.row}>
              {row.map((tile, colIndex) => (
                <View key={colIndex} style={[styles.tile, { backgroundColor: TILE_COLORS[tile] }]}>
                  {tile === "grass" && <Text style={styles.grassGlyph}>🌿</Text>}
                  {tile === "heal" && <Text style={styles.healGlyph}>✚</Text>}
                </View>
              ))}
            </View>
          ))}
          <Animated.View testID="player-avatar" style={[styles.avatar, { transform: anim.getTranslateTransform() }]}>
            <Text style={styles.avatarGlyph}>{DIRECTION_DELTA[facing].glyph}</Text>
          </Animated.View>
        </Animated.View>
        <Animated.View
          testID="encounter-flash"
          pointerEvents="none"
          style={[styles.encounterFlash, { opacity: encounterFlash }]}
        />
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

      <HoverTip text="Open the Home menu for Party, Codex, Bag, and Shop. Keyboard: arrows to move, B for Bag, P for Party, M for this menu.">
        <PrimaryButton testID="menu-button" label="Menu" variant="secondary" onPress={() => navigation.navigate("Home")} />
      </HoverTip>
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
    position: "relative",
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: colors.border,
  },
  grid: {
    position: "relative",
  },
  row: {
    flexDirection: "row",
  },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderWidth: 0.5,
    borderColor: "rgba(0,0,0,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  grassGlyph: {
    fontSize: 16,
    opacity: 0.75,
  },
  healGlyph: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "700",
  },
  encounterFlash: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#ffffff",
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
