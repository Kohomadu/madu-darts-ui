import { PRACTICE_VISIT, shownRemaining } from "../game/checkout";
import { project, scoreSegment, type GameState } from "../game/rules";
import type { Hit } from "../autodarts/parse";

/** Short cues on the practice shell. One sound each; never queued across a blocked gesture. */
export type Cue = "thump" | "chime" | "win" | "fail";

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
 */
export function planMoment(prev: Observation | null, next: Observation): PracticeMoment {
  if (!next.connected || !prev?.connected) return { cues: [], overlay: null };

  const cues: Cue[] = [];
  const added = Math.max(0, next.hits.length - prev.hits.length);
  for (let index = 0; index < added; index += 1) cues.push("thump");

  const sealed = prev.hits.length > 0 && next.hits.length === 0 && isTakeout(next.status, next.event);
  const busted = next.game.phase === "playing" && prev.game.bustKey === null && next.game.bustKey !== null;
  const failed = sealed && attemptRestarted(prev.game, next.game);
  const checkout = finishesOnDouble(prev, next);

  if (checkout) cues.push("win");
  else if (busted || failed) cues.push("fail");
  if (sealed) cues.push("chime");

  const overlay: OutcomeOverlay | null = checkout ? "checkout" : busted || failed ? "try-again" : null;
  return { cues, overlay };
}

export function planCues(prev: Observation | null, next: Observation): Cue[] {
  return planMoment(prev, next).cues;
}
