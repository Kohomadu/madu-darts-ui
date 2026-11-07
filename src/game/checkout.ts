import { scoreSegment } from "./rules";

/** Free practice shows a 501 visit. It resets when the Turn leaves the Board. */
export const PRACTICE_VISIT = 501;

const FAVOURITE_FINISH = ["D20", "D16", "D18", "D12", "D10", "D8", "D4", "Bull"];

/** Big targets first, with outer bull ahead of the smaller trebles. 121 then resolves to T20, 25, D18. */
const BIG_SETUP = [
  "T20",
  "T19",
  "T18",
  "25",
  "T17",
  "T16",
  "T15",
  "T14",
  "T13",
  "T12",
  "T11",
  "T10",
  "S20",
  "S19",
  "S18",
  "S17",
  "S16",
  "S15",
];

const ANY_SETUP = setupNames();

function setupNames(): string[] {
  const names: string[] = [];
  for (let number = 20; number >= 1; number -= 1) names.push(`T${number}`);
  names.push("25");
  for (let number = 20; number >= 1; number -= 1) names.push(`S${number}`);
  return names;
}

function points(name: string): number {
  return scoreSegment(name).points;
}

function doubleFinish(left: number): string | null {
  if (left >= 2 && left <= 40 && left % 2 === 0) return `D${left / 2}`;
  return null;
}

function finishName(left: number): string | null {
  if (left === 50) return "Bull";
  return doubleFinish(left);
}

function setupFor(need: number): string | null {
  return BIG_SETUP.find((name) => points(name) === need) ?? null;
}

/** Two-dart finish on a double, never Inner Bull. Favourite doubles win, using a big setup. */
function twoDartAvoidingBull(remaining: number): string[] | null {
  for (const finish of FAVOURITE_FINISH) {
    if (finish === "Bull") continue;
    const setup = setupFor(remaining - points(finish));
    if (setup) return [setup, finish];
  }
  for (const setup of ANY_SETUP) {
    const finish = doubleFinish(remaining - points(setup));
    if (finish) return [setup, finish];
  }
  return null;
}

function oneDartAvoidingBull(remaining: number): string[] | null {
  const name = doubleFinish(remaining);
  return name ? [name] : null;
}

function threeDartAvoidingBull(remaining: number): string[] | null {
  for (const first of ANY_SETUP) {
    const left = remaining - points(first);
    if (left < 2) continue;
    const rest = oneDartAvoidingBull(left) ?? twoDartAvoidingBull(left);
    if (rest) return [first, ...rest];
  }
  return null;
}

function finishAvoidingBull(remaining: number, slots: number): string[] | null {
  if (remaining < 2) return null;
  if (slots >= 1) {
    const one = oneDartAvoidingBull(remaining);
    if (one) return one;
  }
  if (slots >= 2) {
    const two = twoDartAvoidingBull(remaining);
    if (two) return two;
  }
  if (slots >= 3) return threeDartAvoidingBull(remaining);
  return null;
}
function oneDart(remaining: number): string[] | null {
  const name = finishName(remaining);
  return name ? [name] : null;
}

function isFavourite(left: number): boolean {
  const name = finishName(left);
  return name != null && FAVOURITE_FINISH.includes(name);
}

/** Shortest finish on a double. Inner Bull counts. Fewer darts win; favourite doubles win ties. */
function twoDart(remaining: number): string[] | null {
  for (const setup of BIG_SETUP) {
    const left = remaining - points(setup);
    if (!isFavourite(left)) continue;
    const finish = finishName(left);
    if (finish) return [setup, finish];
  }
  for (const setup of ANY_SETUP) {
    const finish = finishName(remaining - points(setup));
    if (finish) return [setup, finish];
  }
  return null;
}

function threeDart(remaining: number): string[] | null {
  for (const first of ANY_SETUP) {
    const left = remaining - points(first);
    if (left < 2) continue;
    const rest = oneDart(left) ?? twoDart(left);
    if (rest) return [first, ...rest];
  }
  return null;
}

function finishWithin(remaining: number, slots: number): string[] | null {
  if (remaining < 2) return null;
  if (slots >= 1) {
    const one = oneDart(remaining);
    if (one) return one;
  }
  if (slots >= 2) {
    const two = twoDart(remaining);
    if (two) return two;
  }
  if (slots >= 3) return threeDart(remaining);
  return null;
}

function leavesFinish(remaining: number): boolean {
  return finishWithin(remaining, 3) != null;
}

function pickSetup(left: number): string | null {
  let best: string | null = null;
  let bestScore = -1;
  for (const name of ANY_SETUP) {
    const next = left - points(name);
    if (next <= 1) continue;
    let score = points(name);
    if (oneDart(next)) score += 5000;
    else if (leavesFinish(next)) score += 1000;
    if (score > bestScore) {
      bestScore = score;
      best = name;
    }
  }
  return best;
}

function greedy(remaining: number, slots: number): string[] {
  const route: string[] = [];
  let left = remaining;
  for (let index = 0; index < slots && index < 3; index += 1) {
    const dart = pickSetup(left);
    if (!dart) break;
    route.push(dart);
    left -= points(dart);
  }
  return route;
}

/**
 * Segments still to throw. A finish that fits in the open slots is preferred,
 * and a finish without Inner Bull wins when one fits. Otherwise the start of
 * a three-dart finish, or the best scoring setup.
 */
export function checkoutRoute(remaining: number, slots: number): string[] {
  if (slots <= 0 || remaining <= 1) return [];
  const open = Math.min(slots, 3);
  const exact = finishAvoidingBull(remaining, open) ?? finishWithin(remaining, open);
  if (exact) return exact;
  const full = finishAvoidingBull(remaining, 3) ?? finishWithin(remaining, 3);
  if (full) return full.slice(0, open);
  return greedy(remaining, open);
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
