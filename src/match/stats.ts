import { scoreSegment, type DartSnap } from "../game/rules";
import type { PlayerTotals } from "./types";

export function emptyTotals(): PlayerTotals {
  return {
    pointsScored: 0,
    dartsThrown: 0,
    first9Points: 0,
    first9Darts: 0,
    checkoutHits: 0,
    checkoutAttempts: 0,
    highestCheckout: 0,
    bestTurn: 0,
    tons: 0,
    tons100: 0,
    tons140: 0,
    tons171: 0,
  };
}

export function matchAverage(totals: PlayerTotals): number | null {
  if (totals.dartsThrown < 1) return null;
  return (totals.pointsScored / totals.dartsThrown) * 3;
}

export function first9Average(totals: PlayerTotals): number | null {
  if (totals.first9Darts < 1) return null;
  if (totals.first9Darts < 9) return null;
  return (totals.first9Points / totals.first9Darts) * 3;
}

/** Before nine First 9 darts exist, the UI shows the dart count so far. */
export function first9Display(totals: PlayerTotals): { kind: "average"; value: number } | { kind: "darts"; value: number } | null {
  if (totals.first9Darts < 1) return null;
  if (totals.first9Darts < 9) return { kind: "darts", value: totals.first9Darts };
  return { kind: "average", value: (totals.first9Points / totals.first9Darts) * 3 };
}

export function checkoutPercent(totals: PlayerTotals): number | null {
  if (totals.checkoutAttempts < 1) return null;
  return (totals.checkoutHits / totals.checkoutAttempts) * 100;
}

function isDoubleLeave(remaining: number): boolean {
  return remaining === 50 || (remaining >= 2 && remaining <= 40 && remaining % 2 === 0);
}

/**
 * Count checkout attempts for one Turn.
 * A dart counts when, before it, remaining is even 2–40, or 50 is left on the last dart,
 * or the dart lands in 25 or Bull. The finishing dart is the only hit. Setup darts that
 * never meet those rules are left out. A bust from a one-dart double is 3 misses; other
 * busts add no misses.
 */
export function checkoutAttemptDelta(
  turnStartRemaining: number,
  darts: DartSnap[],
  outcome: "open" | "bust" | "checkout",
): { attempts: number; hits: number } {
  if (outcome === "bust" && isDoubleLeave(turnStartRemaining) && darts.length === 1) {
    return { attempts: 3, hits: 0 };
  }
  if (outcome === "bust") {
    return { attempts: 0, hits: 0 };
  }

  let remaining = turnStartRemaining;
  let attempts = 0;
  let hits = 0;
  for (let index = 0; index < darts.length; index += 1) {
    const dart = scoreSegment(darts[index].segmentName);
    const lastDart = index === darts.length - 1;
    const wasDoubleLeave = isDoubleLeave(remaining);
    const fiftyOnLast = remaining === 50 && lastDart;
    const bullish = dart.points === 25 || dart.points === 50;
    const counts = wasDoubleLeave || fiftyOnLast || bullish;
    if (counts) attempts += 1;
    remaining -= dart.points;
    if (outcome === "checkout" && lastDart && remaining === 0 && dart.double) {
      hits = 1;
    }
  }
  return { attempts, hits };
}

function tonBucket(points: number): keyof Pick<PlayerTotals, "tons100" | "tons140" | "tons171"> | null {
  if (points >= 171) return "tons171";
  if (points >= 140) return "tons140";
  if (points >= 100) return "tons100";
  return null;
}

export function applySealedTurn(
  totals: PlayerTotals,
  input: {
    turnStartRemaining: number;
    darts: DartSnap[];
    outcome: "open" | "bust" | "checkout";
    points: number;
    dartsThrown: number;
    first9DartsLeft: number;
  },
): PlayerTotals {
  const next = { ...totals };
  next.dartsThrown += input.dartsThrown;
  next.pointsScored += input.points;

  const first9Take = Math.min(input.first9DartsLeft, input.dartsThrown);
  if (first9Take > 0) {
    next.first9Darts += first9Take;
    // Bust inside the first nine counts as 3 darts and 0 points toward First 9.
    next.first9Points += input.outcome === "bust" ? 0 : input.points;
  }

  const checkout = checkoutAttemptDelta(input.turnStartRemaining, input.darts, input.outcome);
  next.checkoutAttempts += checkout.attempts;
  next.checkoutHits += checkout.hits;

  if (input.outcome === "checkout" && input.points > next.highestCheckout) {
    next.highestCheckout = input.points;
  }

  if (input.outcome !== "bust" && input.points > next.bestTurn) {
    next.bestTurn = input.points;
  }

  if (input.outcome !== "bust" && input.points >= 100) {
    next.tons += 1;
    const bucket = tonBucket(input.points);
    if (bucket) next[bucket] += 1;
  }

  return next;
}
