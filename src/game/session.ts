import type { GameState } from "./rules";

/** Checkouts landed in the current 101 run, and the highest target reached. */
export type SessionStats = {
  checkouts: number;
  highTarget: number;
};

export function emptySession(): SessionStats {
  return { checkouts: 0, highTarget: 0 };
}

export function freshSession(target = 101): SessionStats {
  return { checkouts: 0, highTarget: target };
}

/**
 * Count a checkout when a scored Turn advances the target or clears 170.
 * Next score is not a checkout; do not pass that transition here.
 */
export function noteCheckout(stats: SessionStats, prev: GameState, next: GameState): SessionStats {
  if (prev.phase !== "playing") return stats;
  const checkedOut = next.target > prev.target || next.phase === "complete";
  if (!checkedOut) return stats;
  return {
    checkouts: stats.checkouts + 1,
    highTarget: Math.max(stats.highTarget, next.target),
  };
}

/** Undo of a checkout Turn gives that checkout back. */
export function noteUndo(stats: SessionStats, prev: GameState, next: GameState): SessionStats {
  const undid =
    (prev.phase === "playing" && next.phase === "playing" && next.target < prev.target) ||
    (prev.phase === "complete" && next.phase === "playing");
  if (!undid) return stats;
  return {
    checkouts: Math.max(0, stats.checkouts - 1),
    highTarget: next.target,
  };
}
