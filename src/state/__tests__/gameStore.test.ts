import { useGameStore } from "../gameStore";
import type { PartyMember } from "../../game/party";

function makeMember(uid: string): PartyMember {
  return {
    uid,
    speciesId: "test_species",
    displayName: `Test ${uid}`,
    types: ["Normal"],
    level: 5,
    xp: 0,
    baseStats: { hp: 100, atk: 100, def: 100, spatk: 100, spdef: 100, speed: 100 },
    currentHp: 20,
    moveIds: ["tackle"],
    sourceCategory: "wild",
  };
}

describe("gameStore", () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  describe("setPlayerName", () => {
    it("trims whitespace and stores the given name", () => {
      useGameStore.getState().setPlayerName("  Kalypso  ");
      expect(useGameStore.getState().playerName).toBe("Kalypso");
    });

    it("falls back to the default name when given blank input", () => {
      useGameStore.getState().setPlayerName("   ");
      expect(useGameStore.getState().playerName).toBe("Traveler");
    });
  });

  describe("releaseCreature", () => {
    it("refuses to release the last party member", () => {
      useGameStore.setState({ party: [makeMember("a")] });
      const result = useGameStore.getState().releaseCreature("a");
      expect(result).toBe(false);
      expect(useGameStore.getState().party).toHaveLength(1);
    });

    it("removes the given member when 2+ are present", () => {
      useGameStore.setState({ party: [makeMember("a"), makeMember("b")] });
      const result = useGameStore.getState().releaseCreature("b");
      expect(result).toBe(true);
      expect(useGameStore.getState().party.map((m) => m.uid)).toEqual(["a"]);
    });

    it("returns false for an unknown uid and leaves the party untouched", () => {
      useGameStore.setState({ party: [makeMember("a"), makeMember("b")] });
      const result = useGameStore.getState().releaseCreature("does-not-exist");
      expect(result).toBe(false);
      expect(useGameStore.getState().party).toHaveLength(2);
    });
  });
});
