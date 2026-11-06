import type { Hit } from "../autodarts/parse";
import type { GameState } from "../game/rules";

/** Short cues on the practice shell. One sound each; never queued across a blocked gesture. */
export type Cue = "thump" | "chime" | "win" | "fail";

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

/**
 * Cues for one stream step. The first live frame is a baseline, so Hits already
 * on the Board do not thump. A same-length strip is a Manual Override, not a new Hit.
 */
export function planCues(prev: Observation | null, next: Observation): Cue[] {
  if (!next.connected || !prev?.connected) return [];

  const cues: Cue[] = [];
  const added = Math.max(0, next.hits.length - prev.hits.length);
  for (let index = 0; index < added; index += 1) cues.push("thump");

  const sealed = prev.hits.length > 0 && next.hits.length === 0 && isTakeout(next.status, next.event);
  const busted = next.game.phase === "playing" && prev.game.bustKey === null && next.game.bustKey !== null;
  const failed = sealed && attemptRestarted(prev.game, next.game);
  const won =
    prev.game.phase === "playing" &&
    (next.game.phase === "complete" || next.game.target > prev.game.target);

  if (busted || failed) cues.push("fail");
  else if (won) cues.push("win");
  if (sealed) cues.push("chime");
  return cues;
}
