import type { Creature } from "../engine/types";
import { NEUTRAL_STAT_STAGES } from "../engine/types";
import type { StatBlock, TypeName } from "../data/schemas";
import type { BattleParticipant } from "./creatureFactory";

export type PartySourceCategory = "starter" | "regional";

export interface PartyMember {
  uid: string;
  speciesId: string;
  displayName: string;
  types: TypeName[];
  level: number;
  stats: StatBlock;
  currentHp: number;
  moveIds: string[];
  sourceCategory: PartySourceCategory;
}

export function partyMemberFromParticipant(
  participant: BattleParticipant,
  sourceCategory: PartySourceCategory
): PartyMember {
  return {
    uid: participant.creature.id,
    speciesId: participant.creature.speciesId,
    displayName: participant.displayName,
    types: participant.creature.types,
    level: participant.creature.level,
    stats: { ...participant.creature.stats },
    currentHp: participant.creature.currentHp,
    moveIds: participant.moveIds,
    sourceCategory,
  };
}

/** Rebuilds a battle-ready engine Creature from a persisted party member. */
export function creatureFromPartyMember(member: PartyMember): Creature {
  return {
    id: member.uid,
    speciesId: member.speciesId,
    level: member.level,
    types: member.types,
    stats: { ...member.stats },
    statStages: { ...NEUTRAL_STAT_STAGES },
    currentHp: member.currentHp,
    status: "none",
    flinched: false,
    activeEffects: [],
  };
}
