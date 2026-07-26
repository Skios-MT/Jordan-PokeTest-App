import type { ReactNode } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../theme";

interface Props {
  children: ReactNode;
  style?: ViewStyle;
}

/** Shared full-bleed gradient backdrop so every screen reads as one coherent app. */
export function ScreenBackground({ children, style }: Props) {
  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[colors.background, colors.surfaceAlt, colors.background]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.content, style]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
