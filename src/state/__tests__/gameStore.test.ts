import { useGameStore } from "../gameStore";
import type { PartyMember } from "../../game/party";

// Level 50 is progression.ts's REFERENCE_LEVEL, so effectiveStats(base, 50) == base + the
// flat HP floor (base.hp=100 -> maxHp=110) — a stable, easy-to-hand-verify number for tests.
function makeMember(uid: string): PartyMember {
  return {
    uid,
    speciesId: "test_species",
    displayName: `Test ${uid}`,
    types: ["Normal"],
    level: 50,
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

  describe("useItemOnPartyMember", () => {
    it("heals a flat amount (Pastizz = 15 HP), capped at max HP, and consumes one", () => {
      useGameStore.setState({ party: [makeMember("a")], inventory: { pastizz: 2 } });
      const result = useGameStore.getState().useItemOnPartyMember("a", "pastizz");
      expect(result).toEqual({ applied: true, effect: "heal", healedAmount: 15 });
      expect(useGameStore.getState().party[0].currentHp).toBe(35);
      expect(useGameStore.getState().inventory.pastizz).toBe(1);
    });

    it("does not overheal past max HP", () => {
      const nearFull = { ...makeMember("a"), currentHp: 105 }; // max hp is 100+10 floor = 110
      useGameStore.setState({ party: [nearFull], inventory: { ftira_biz_zejt: 1 } });
      const result = useGameStore.getState().useItemOnPartyMember("a", "ftira_biz_zejt");
      expect(result).toEqual({ applied: true, effect: "heal", healedAmount: 5 });
      expect(useGameStore.getState().party[0].currentHp).toBe(110);
    });

    it("Kinnie grants +1 level and consumes one, without touching other items", () => {
      useGameStore.setState({ party: [makeMember("a")], inventory: { kinnie: 1 } });
      const result = useGameStore.getState().useItemOnPartyMember("a", "kinnie");
      expect(result.applied).toBe(true);
      if (!result.applied || result.effect !== "level_up") throw new Error("expected level_up result");
      expect(result.member.level).toBe(51);
      expect(result.evolution).toBeNull();
      expect(useGameStore.getState().party[0].level).toBe(51);
      expect(useGameStore.getState().inventory.kinnie).toBe(0);
    });

    it("refuses to apply an item the player doesn't have", () => {
      useGameStore.setState({ party: [makeMember("a")], inventory: {} });
      const result = useGameStore.getState().useItemOnPartyMember("a", "pastizz");
      expect(result).toEqual({ applied: false });
      expect(useGameStore.getState().party[0].currentHp).toBe(20);
    });

    it("returns not-applied for an unknown party uid", () => {
      useGameStore.setState({ party: [makeMember("a")], inventory: { pastizz: 3 } });
      const result = useGameStore.getState().useItemOnPartyMember("does-not-exist", "pastizz");
      expect(result).toEqual({ applied: false });
      expect(useGameStore.getState().inventory.pastizz).toBe(3);
    });
  });

  describe("setMainPartyMember", () => {
    it("moves the given member to the front, preserving the relative order of the rest", () => {
      useGameStore.setState({ party: [makeMember("a"), makeMember("b"), makeMember("c")] });
      useGameStore.getState().setMainPartyMember("c");
      expect(useGameStore.getState().party.map((m) => m.uid)).toEqual(["c", "a", "b"]);
    });

    it("is a no-op when the member is already main", () => {
      const party = [makeMember("a"), makeMember("b")];
      useGameStore.setState({ party });
      useGameStore.getState().setMainPartyMember("a");
      expect(useGameStore.getState().party).toBe(party);
    });

    it("is a no-op for an unknown uid", () => {
      useGameStore.setState({ party: [makeMember("a"), makeMember("b")] });
      useGameStore.getState().setMainPartyMember("does-not-exist");
      expect(useGameStore.getState().party.map((m) => m.uid)).toEqual(["a", "b"]);
    });
  });

  describe("renamePartyMember", () => {
    it("trims whitespace and updates the given member's displayName", () => {
      useGameStore.setState({ party: [makeMember("a")] });
      useGameStore.getState().renamePartyMember("a", "  Sparky  ");
      expect(useGameStore.getState().party[0].displayName).toBe("Sparky");
    });

    it("caps the name at 16 characters", () => {
      useGameStore.setState({ party: [makeMember("a")] });
      useGameStore.getState().renamePartyMember("a", "ThisNameIsWayTooLongForTheGame");
      expect(useGameStore.getState().party[0].displayName).toBe("ThisNameIsWayToo");
    });

    it("ignores blank input, leaving the existing name untouched", () => {
      useGameStore.setState({ party: [makeMember("a")] });
      useGameStore.getState().renamePartyMember("a", "   ");
      expect(useGameStore.getState().party[0].displayName).toBe("Test a");
    });

    it("is a no-op for an unknown uid", () => {
      const party = [makeMember("a")];
      useGameStore.setState({ party });
      useGameStore.getState().renamePartyMember("does-not-exist", "Sparky");
      expect(useGameStore.getState().party[0].displayName).toBe("Test a");
    });
  });

  describe("healFaintedPartyMembers", () => {
    it("fully revives every KO'd member to max HP and leaves conscious ones untouched", () => {
      const fainted = { ...makeMember("a"), currentHp: 0 };
      const alive = { ...makeMember("b"), currentHp: 20 }; // not full (max is 110), should stay at 20
      useGameStore.setState({ party: [fainted, alive] });

      const healedCount = useGameStore.getState().healFaintedPartyMembers();

      expect(healedCount).toBe(1);
      expect(useGameStore.getState().party[0].currentHp).toBe(110);
      expect(useGameStore.getState().party[1].currentHp).toBe(20);
    });

    it("returns 0 and leaves the party untouched when nobody is fainted", () => {
      useGameStore.setState({ party: [makeMember("a"), makeMember("b")] });
      const healedCount = useGameStore.getState().healFaintedPartyMembers();
      expect(healedCount).toBe(0);
      expect(useGameStore.getState().party.every((m) => m.currentHp === 20)).toBe(true);
    });
  });
});
