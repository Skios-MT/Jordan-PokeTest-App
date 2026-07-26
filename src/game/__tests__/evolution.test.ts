import { buildParticipant, checkEvolution, defaultDisplayNameForSpecies } from "../creatureFactory";
import { addExperience, applyLevelUp, partyMemberFromParticipant, type PartyMember } from "../party";
import { effectiveStats } from "../progression";

const CALFLEAF_STATS = { hp: 55, atk: 68, def: 59, spatk: 40, spdef: 56, speed: 37 };
const VINEHORN_STATS = { hp: 72, atk: 90, def: 78, spatk: 53, spdef: 74, speed: 49 };
const MOSSTAUR_STATS = { hp: 88, atk: 110, def: 95, spatk: 65, spdef: 90, speed: 60 };

function makeMember(overrides: Partial<PartyMember> = {}): PartyMember {
  return {
    uid: "test-uid",
    speciesId: "calfleaf",
    displayName: "Calfleaf",
    types: ["Grass"],
    level: 15,
    xp: 0,
    baseStats: CALFLEAF_STATS,
    currentHp: effectiveStats(CALFLEAF_STATS, 15).hp,
    moveIds: ["tackle"],
    sourceCategory: "starter",
    ...overrides,
  };
}

describe("checkEvolution", () => {
  it("returns null for a non-starter species", () => {
    expect(checkEvolution("fossary", 100)).toBeNull();
  });

  it("returns null below the evolution threshold", () => {
    expect(checkEvolution("calfleaf", 15)).toBeNull();
  });

  it("returns the next stage at (and above) the threshold level", () => {
    expect(checkEvolution("calfleaf", 16)?.nextSpeciesId).toBe("vinehorn");
    expect(checkEvolution("calfleaf", 20)?.nextSpeciesId).toBe("vinehorn");
  });

  it("returns null for an already-final stage", () => {
    expect(checkEvolution("mosstaur", 100)).toBeNull();
  });
});

describe("defaultDisplayNameForSpecies", () => {
  it("returns the stage's own name for a starter species", () => {
    expect(defaultDisplayNameForSpecies("calfleaf")).toBe("Calfleaf");
    expect(defaultDisplayNameForSpecies("vinehorn")).toBe("Vinehorn");
  });

  it("returns null for a non-starter species", () => {
    expect(defaultDisplayNameForSpecies("fossary")).toBeNull();
  });
});

describe("addExperience evolution handling", () => {
  it("evolves a single stage when the XP grant crosses exactly one threshold", () => {
    const member = makeMember({ level: 15, xp: 0 });
    const result = addExperience(member, 200); // exactly xpToNextLevel(15)
    expect(result.newLevel).toBe(16);
    expect(result.member.speciesId).toBe("vinehorn");
    expect(result.member.types).toEqual(["Grass"]);
    expect(result.member.baseStats).toEqual(VINEHORN_STATS);
    expect(result.evolution).toEqual({
      oldSpeciesId: "calfleaf",
      oldDisplayName: "Calfleaf",
      oldTypes: ["Grass"],
      newSpeciesId: "vinehorn",
      newDisplayName: "Vinehorn",
      newTypes: ["Grass"],
    });
  });

  it("jumps straight to the final stage when a big XP grant crosses two thresholds, reporting true-start -> true-end", () => {
    const member = makeMember({ level: 5, xp: 0 });
    const result = addExperience(member, 100000);
    expect(result.member.speciesId).toBe("mosstaur");
    expect(result.member.baseStats).toEqual(MOSSTAUR_STATS);
    expect(result.evolution).not.toBeNull();
    expect(result.evolution?.oldSpeciesId).toBe("calfleaf");
    expect(result.evolution?.newSpeciesId).toBe("mosstaur");
  });

  it("preserves a custom nickname through evolution", () => {
    const member = makeMember({ level: 15, xp: 0, displayName: "Buddy" });
    const result = addExperience(member, 200);
    expect(result.member.speciesId).toBe("vinehorn");
    expect(result.member.displayName).toBe("Buddy");
    expect(result.evolution?.newDisplayName).toBe("Buddy");
  });

  it("updates the displayName to the new stage's default when no custom nickname was set", () => {
    const member = makeMember({ level: 15, xp: 0, displayName: "Calfleaf" });
    const result = addExperience(member, 200);
    expect(result.member.displayName).toBe("Vinehorn");
  });

  it("does not evolve when the XP grant stays below the threshold", () => {
    const member = makeMember({ level: 10, xp: 0 });
    const result = addExperience(member, 1);
    expect(result.evolution).toBeNull();
    expect(result.member.speciesId).toBe("calfleaf");
  });

  it("grows max HP (and partially tops up current HP) using the evolved form's stats", () => {
    const member = makeMember({ level: 15, xp: 0, currentHp: 1 });
    const prevMaxHp = effectiveStats(CALFLEAF_STATS, 15).hp;
    const result = addExperience(member, 200);
    const newMaxHp = effectiveStats(VINEHORN_STATS, 16).hp;
    expect(result.member.currentHp).toBe(Math.min(newMaxHp, 1 + (newMaxHp - prevMaxHp)));
  });
});

describe("applyLevelUp evolution handling (Kinnie item, direct +1 level)", () => {
  it("evolves when the +1 level crosses the threshold", () => {
    const member = makeMember({ level: 35, xp: 0, speciesId: "vinehorn", displayName: "Vinehorn", types: ["Grass"], baseStats: VINEHORN_STATS });
    const { member: leveled, evolution } = applyLevelUp(member);
    expect(leveled.level).toBe(36);
    expect(leveled.speciesId).toBe("mosstaur");
    expect(leveled.types).toEqual(["Grass", "Ground"]);
    expect(evolution?.oldSpeciesId).toBe("vinehorn");
    expect(evolution?.newSpeciesId).toBe("mosstaur");
  });

  it("does not evolve when the new level is still below the threshold", () => {
    const member = makeMember({ level: 14, xp: 0 });
    const { member: leveled, evolution } = applyLevelUp(member);
    expect(leveled.level).toBe(15);
    expect(leveled.speciesId).toBe("calfleaf");
    expect(evolution).toBeNull();
  });
});

describe("partyMemberFromParticipant silent pre-evolution", () => {
  it("silently pre-evolves a stage-1 participant already above every threshold, with no visible transition data", () => {
    const participant = buildParticipant("wild-1", "calfleaf", "Calfleaf", ["Grass"], CALFLEAF_STATS, 40, ["tackle"]);
    const member = partyMemberFromParticipant(participant, "wild");
    expect(member.speciesId).toBe("mosstaur");
    expect(member.types).toEqual(["Grass", "Ground"]);
    expect(member.baseStats).toEqual(MOSSTAUR_STATS);
  });

  it("carries partial HP forward proportionally through a silent pre-evolution", () => {
    const level = 40;
    const oldMaxHp = effectiveStats(CALFLEAF_STATS, level).hp;
    const newMaxHp = effectiveStats(MOSSTAUR_STATS, level).hp;
    const participant = buildParticipant("wild-2", "calfleaf", "Calfleaf", ["Grass"], CALFLEAF_STATS, level, ["tackle"]);
    participant.creature.currentHp = Math.floor(oldMaxHp / 2);
    const damagedHp = participant.creature.currentHp;
    const member = partyMemberFromParticipant(participant, "wild");
    expect(member.currentHp).toBe(Math.min(newMaxHp, damagedHp + (newMaxHp - oldMaxHp)));
  });

  it("does not pre-evolve a stage-1 participant below every threshold", () => {
    const participant = buildParticipant("starter-1", "calfleaf", "Calfleaf", ["Grass"], CALFLEAF_STATS, 5, ["tackle"]);
    const member = partyMemberFromParticipant(participant, "starter");
    expect(member.speciesId).toBe("calfleaf");
  });
});
