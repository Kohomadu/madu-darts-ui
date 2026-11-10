import type { DartSnap } from "../game/rules";
import type { SeatId } from "./types";

/** Distance from the board origin in the same normalised space as Hit coordinates. */
export function dartDistance(dart: DartSnap): number {
  const x = dart.coordsX ?? Number.POSITIVE_INFINITY;
  const y = dart.coordsY ?? Number.POSITIVE_INFINITY;
  return Math.hypot(x, y);
}

export type BullOffDecision =
  | { kind: "winner"; starter: SeatId }
  | { kind: "tie"; nextOrder: [SeatId, SeatId] };

/** Closer dart starts. A tie swaps the throwing order for the retthrow. */
export function decideBullOff(
  you: DartSnap,
  opponent: DartSnap,
  order: [SeatId, SeatId],
): BullOffDecision {
  const youDist = dartDistance(you);
  const oppDist = dartDistance(opponent);
  if (youDist < oppDist) return { kind: "winner", starter: "you" };
  if (oppDist < youDist) return { kind: "winner", starter: "opponent" };
  return { kind: "tie", nextOrder: [order[1], order[0]] };
}
