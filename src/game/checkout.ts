import { THREE_DART_ROUTE, TWO_DART_ROUTE } from "./dartbaseRoutes";
import { scoreSegment } from "./rules";

/** Free practice shows a 501 visit. It resets when the Turn leaves the Board. */
export const PRACTICE_VISIT = 501;

/** Three-dart finishes that do not exist. A scoring dart must not leave one. */
const THREE_DART_BOGEYS = new Set([159, 162, 163, 165, 166, 168, 169]);

/** Two-dart finishes that do not exist below the 110 maximum. */
const TWO_DART_BOGEYS = new Set([99, 102, 103, 105, 106, 108, 109]);

const SCORING = [
  ...Array.from({ length: 20 }, (_, index) => `T${20 - index}`),
  "25",
  ...Array.from({ length: 20 }, (_, index) => `S${20 - index}`),
];

function points(name: string): number {
  return scoreSegment(name).points;
}

/** 2: the leave is on a chart. 1: still scoring. -1: a bust or a bogey. */
function leaveRank(leave: number): number {
  if (leave <= 1 || THREE_DART_BOGEYS.has(leave)) return -1;
  if (Object.hasOwn(THREE_DART_ROUTE, leave) || Object.hasOwn(TWO_DART_ROUTE, leave)) return 2;
  if (leave > 170) return 1;
  return 0;
}

/** Highest score that lands on a chart finish, otherwise keeps the visit above 170. */
function bestScoreDart(remaining: number): string | null {
  let best: string | null = null;
  let bestRank = -1;
  let bestPoints = -1;
  for (const name of SCORING) {
    const scored = points(name);
    const rank = leaveRank(remaining - scored);
    if (rank < 0) continue;
    if (rank > bestRank || (rank === bestRank && scored > bestPoints)) {
      best = name;
      bestRank = rank;
      bestPoints = scored;
    }
  }
  return best;
}

/**
 * The remaining score has no double finish in this many darts.
 * One dart must be Bull or an even 2–40. Two and three darts use the bogey lists.
 * Four or more darts can still finish a 101 remaining score.
 */
export function cannotCheckout(remaining: number, dartsLeft: number): boolean {
  if (remaining < 2 || dartsLeft < 1 || dartsLeft > 3) return false;
  if (dartsLeft === 1) return remaining !== 50 && (remaining > 40 || remaining % 2 !== 0);
  if (dartsLeft === 2) return remaining > 110 || TWO_DART_BOGEYS.has(remaining);
  return remaining > 170 || THREE_DART_BOGEYS.has(remaining);
}

/**
 * Segments still to throw. A chart finish that fits in the open darts wins.
 * Two darts left use the 2-dart chart. Above a finish, score toward the next one.
 */
export function checkoutRoute(remaining: number, slots: number): string[] {
  if (slots <= 0 || remaining <= 1) return [];
  const open = Math.min(slots, 3);
  if (open === 1 && remaining === 50) return ["Bull"];
  if (open === 2) {
    const two = TWO_DART_ROUTE[remaining];
    if (two) return [...two];
  }
  const listed = THREE_DART_ROUTE[remaining];
  if (listed) return listed.slice(0, open);
  const dart = bestScoreDart(remaining);
  if (!dart) return [];
  return [dart, ...checkoutRoute(remaining - points(dart), open - 1)];
}

export function shownRemaining(
  phase: "idle" | "playing" | "complete",
  gameRemaining: number,
  hits: { segmentName: string }[],
): number {
  if (phase !== "idle") return gameRemaining;
  const scored = hits.reduce((sum, hit) => sum + scoreSegment(hit.segmentName).points, 0);
  return Math.max(0, PRACTICE_VISIT - scored);
}

/** Empty Hit boxes keep a route. A bust or a finished visit does not. */
export function openRouteSlots(options: {
  busted: boolean;
  phase: "idle" | "playing" | "complete";
  remaining: number;
  hitCount: number;
}): number {
  if (options.busted || options.phase === "complete" || options.remaining <= 1) return 0;
  return Math.max(0, 3 - options.hitCount);
}
