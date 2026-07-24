import { useEffect, useRef } from "react";

type KeyHandler = (e: KeyboardEvent) => void;
export type KeyMap = Record<string, KeyHandler>;

/**
 * Web-only keyboard shortcuts (no-ops on native, where `window` doesn't exist).
 * Keys are matched case-insensitively for single characters (so "b" and "B"
 * both work) and verbatim for named keys like "ArrowUp". The map is read from
 * a ref updated every render, so callers can pass a fresh object each render
 * without the listener being torn down and re-attached each time.
 */
export function useKeyboardShortcuts(keyMap: KeyMap): void {
  const keyMapRef = useRef(keyMap);
  keyMapRef.current = keyMap;

  useEffect(() => {
    if (typeof window === "undefined") return;

    function handleKeyDown(e: KeyboardEvent) {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const handler = keyMapRef.current[key];
      if (handler) {
        e.preventDefault();
        handler(e);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
