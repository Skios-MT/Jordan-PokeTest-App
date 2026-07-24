import { useRef } from "react";
import { Animated } from "react-native";

/**
 * Placeholder "battle juice" for a combatant panel — no sprite art to
 * animate, just motion + a tint flash layered on the existing panel/avatar.
 */
export function useCombatantAnimation() {
  const shakeX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const hitFlash = useRef(new Animated.Value(0)).current;
  const healFlash = useRef(new Animated.Value(0)).current;

  /** Brief anticipation pull-back before an attack lands. */
  function windUp() {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.94, duration: 80, useNativeDriver: false }),
      Animated.timing(scale, { toValue: 1, duration: 80, useNativeDriver: false }),
    ]).start();
  }

  function lunge() {
    Animated.sequence([
      Animated.timing(shakeX, { toValue: 10, duration: 90, useNativeDriver: false }),
      Animated.timing(shakeX, { toValue: 0, duration: 120, useNativeDriver: false }),
    ]).start();
  }

  /** "big" hits (>=25% max HP) shake harder and flash a red tint. */
  function hit(magnitude: "small" | "big" = "small") {
    const amplitude = magnitude === "big" ? 14 : 8;
    if (magnitude === "big") {
      Animated.sequence([
        Animated.timing(hitFlash, { toValue: 0.45, duration: 60, useNativeDriver: false }),
        Animated.timing(hitFlash, { toValue: 0, duration: 200, useNativeDriver: false }),
      ]).start();
    }
    Animated.sequence([
      Animated.timing(shakeX, { toValue: -amplitude, duration: 55, useNativeDriver: false }),
      Animated.timing(shakeX, { toValue: amplitude, duration: 55, useNativeDriver: false }),
      Animated.timing(shakeX, { toValue: -amplitude * 0.6, duration: 55, useNativeDriver: false }),
      Animated.timing(shakeX, { toValue: 0, duration: 55, useNativeDriver: false }),
    ]).start();
  }

  function faint() {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0.25, duration: 350, useNativeDriver: false }),
      Animated.timing(scale, { toValue: 0.85, duration: 350, useNativeDriver: false }),
    ]).start();
  }

  /** Soft green-tinted pulse for a heal/item use. */
  function heal() {
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.08, duration: 150, useNativeDriver: false }),
      Animated.timing(scale, { toValue: 1, duration: 150, useNativeDriver: false }),
    ]).start();
    Animated.sequence([
      Animated.timing(healFlash, { toValue: 0.35, duration: 150, useNativeDriver: false }),
      Animated.timing(healFlash, { toValue: 0, duration: 250, useNativeDriver: false }),
    ]).start();
  }

  /** Pulsing glow loop-in for invoking the Crux Aura. */
  function cruxGlow() {
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.12, duration: 180, useNativeDriver: false }),
      Animated.timing(scale, { toValue: 0.98, duration: 140, useNativeDriver: false }),
      Animated.timing(scale, { toValue: 1, duration: 120, useNativeDriver: false }),
    ]).start();
  }

  /** Side-to-side wobble for a ball throw / catch attempt. */
  function wobble() {
    Animated.sequence([
      Animated.timing(shakeX, { toValue: -6, duration: 100, useNativeDriver: false }),
      Animated.timing(shakeX, { toValue: 6, duration: 100, useNativeDriver: false }),
      Animated.timing(shakeX, { toValue: -6, duration: 100, useNativeDriver: false }),
      Animated.timing(shakeX, { toValue: 0, duration: 100, useNativeDriver: false }),
    ]).start();
  }

  /** Fade-and-slide-out for fleeing the battle. */
  function fleeOut() {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: false }),
      Animated.timing(shakeX, { toValue: -40, duration: 300, useNativeDriver: false }),
    ]).start();
  }

  function reset() {
    shakeX.setValue(0);
    opacity.setValue(1);
    scale.setValue(1);
    hitFlash.setValue(0);
    healFlash.setValue(0);
  }

  return { shakeX, opacity, scale, hitFlash, healFlash, windUp, lunge, hit, faint, heal, cruxGlow, wobble, fleeOut, reset };
}
