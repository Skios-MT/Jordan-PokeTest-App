import { useRef } from "react";
import { Animated } from "react-native";

/**
 * Small placeholder "battle juice" for a combatant panel: a forward lunge
 * when it acts, a shake when it takes damage, and a fade+shrink on faint.
 * No sprite art to animate — just motion on the existing panel/avatar.
 */
export function useCombatantAnimation() {
  const shakeX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;

  function lunge() {
    Animated.sequence([
      Animated.timing(shakeX, { toValue: 10, duration: 90, useNativeDriver: false }),
      Animated.timing(shakeX, { toValue: 0, duration: 120, useNativeDriver: false }),
    ]).start();
  }

  function hit() {
    Animated.sequence([
      Animated.timing(shakeX, { toValue: -8, duration: 55, useNativeDriver: false }),
      Animated.timing(shakeX, { toValue: 8, duration: 55, useNativeDriver: false }),
      Animated.timing(shakeX, { toValue: -5, duration: 55, useNativeDriver: false }),
      Animated.timing(shakeX, { toValue: 0, duration: 55, useNativeDriver: false }),
    ]).start();
  }

  function faint() {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0.25, duration: 350, useNativeDriver: false }),
      Animated.timing(scale, { toValue: 0.85, duration: 350, useNativeDriver: false }),
    ]).start();
  }

  function reset() {
    shakeX.setValue(0);
    opacity.setValue(1);
    scale.setValue(1);
  }

  return { shakeX, opacity, scale, lunge, hit, faint, reset };
}
