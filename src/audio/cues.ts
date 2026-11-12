import { cannotCheckout, PRACTICE_VISIT, shownRemaining } from "../game/checkout";
import { project, scoreAttempt, scoreSegment, type GameState } from "../game/rules";
import type { Hit } from "../autodarts/parse";

/** Short cues on the practice shell. One sound each; never queued across a blocked gesture. */
export type Cue =
  | "thump"
  | "chime"
  | "win"
  | "orchestral-win"
  | "fatality"
  | "level-win"
  | "failure-trumpet"
  | "next-level";

export type OutcomeOverlay = "checkout" | "try-again";

export type Observation = {
  connected: boolean;
  status: string;
  event: string;
  hits: Hit[];
  game: GameState;
};

function isTakeout(status: string, event: string): boolean {
  const normalizedEvent = event.toLowerCase().replace(/\s+/g, "");
  const normalizedStatus = status.toLowerCase().replace(/\s+/g, "");
  return normalizedEvent.includes("takeout") || normalizedStatus === "takeout" || normalizedStatus === "takeoutinprogress";
}

function attemptRestarted(prev: GameState, next: GameState): boolean {
  return (
    prev.phase === "playing" &&
    next.phase === "playing" &&
    next.target === prev.target &&
    prev.bustKey === null &&
    next.bustKey === null &&
    next.sealed.length === 0 &&
    next.live.length === 0 &&
    (prev.sealed.length > 0 || prev.live.length > 0)
  );
}

/** Undo puts Hits back on the strip. That is not a new Turn, so it stays silent. */
export function audibleCues(prev: Observation | null, next: Observation, restoring: boolean): Cue[] {
  if (restoring) return [];
  return planCues(prev, next);
}

function visibleRemaining(game: GameState, hits: Hit[]): number {
  const projected = project(game);
  if (projected.phase === "idle") {
    return PRACTICE_VISIT - hits.reduce((sum, hit) => sum + scoreSegment(hit.segmentName).points, 0);
  }
  return shownRemaining(projected.phase, projected.remaining, hits);
}

/** 101 remaining score that cannot be finished with the darts still left. */
function hopelessLeave(game: GameState): boolean {
  if (game.phase !== "playing" || game.bustKey) return false;
  const view = project(game);
  return cannotCheckout(view.remaining, view.dartsLeft);
}

/** Remaining score when this Turn's darts were still in hand. */
function openingScore(game: GameState): number {
  if (game.phase !== "playing") return PRACTICE_VISIT;
  const prior = scoreAttempt(game.target, game.sealed.flat());
  return prior.kind === "open" ? prior.remaining : game.target;
}

/** The score this Turn cleared, and how many darts it took. */
function checkoutCue(score: number, darts: number): Cue {
  if (darts === 3 && score > 121) return "orchestral-win";
  if (darts === 3 && score >= 101 && score <= 120) return "fatality";
  if (darts <= 3 && score >= 61 && score <= 100) return "level-win";
  return "win";
}

function finishesOnDouble(prev: Observation, next: Observation): boolean {
  if (next.hits.length === 0) return false;
  const before = visibleRemaining(prev.game, prev.hits);
  const after = visibleRemaining(next.game, next.hits);
  if (!(before > 0 && after === 0)) return false;
  return scoreSegment(next.hits[next.hits.length - 1].segmentName).double;
}

export type PracticeMoment = { cues: Cue[]; overlay: OutcomeOverlay | null };

/**
 * Cues for one stream step. The first live frame is a baseline, so Hits already
 * on the Board do not thump. A same-length strip is a Manual Override, not a new Hit.
 * A checkout cue fires when remaining hits zero on a double, including an Override that creates that finish.
 * An impossible 101 leave shows Try again on the Hit that makes it so, while the Turn is still on the Board.
 */
export function planMoment(prev: Observation | null, next: Observation): PracticeMoment {
  if (!next.connected || !prev?.connected) return { cues: [], overlay: null };

  const cues: Cue[] = [];
  const added = Math.max(0, next.hits.length - prev.hits.length);
  for (let index = 0; index < added; index += 1) cues.push("thump");

  const sealed = prev.hits.length > 0 && next.hits.length === 0 && isTakeout(next.status, next.event);
  const busted = next.game.phase === "playing" && prev.game.bustKey === null && next.game.bustKey !== null;
  const hopelessBefore = hopelessLeave(prev.game);
  const failed = sealed && attemptRestarted(prev.game, next.game) && !hopelessBefore;
  const checkout = finishesOnDouble(prev, next);
  const hopeless = !checkout && !busted && hopelessLeave(next.game) && !hopelessBefore;
  const advanced =
    sealed && prev.game.phase === "playing" && next.game.phase === "playing" && next.game.target === prev.game.target + 1;

  if (checkout) cues.push(checkoutCue(openingScore(next.game), next.hits.length));
  else if (busted || failed || hopeless) cues.push("failure-trumpet");
  if (advanced) cues.push("next-level");
  else if (sealed) cues.push("chime");

  const overlay: OutcomeOverlay | null = checkout ? "checkout" : busted || failed || hopeless ? "try-again" : null;
  return { cues, overlay };
}

export function planCues(prev: Observation | null, next: Observation): Cue[] {
  return planMoment(prev, next).cues;
}
