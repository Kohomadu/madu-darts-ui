import type { PracticeView } from "../autodarts/view";
import type { Cue } from "../audio/cues";
import { installAudioUnlock, playCues } from "../audio/play";
import type { MatchState } from "./types";

export type MatchOutcome = "checkout" | "try-again";

let lastSignature = "";

function isTakeout(view: PracticeView): boolean {
  const event = view.event.toLowerCase().replace(/\s+/g, "");
  const status = view.status.toLowerCase().replace(/\s+/g, "");
  return event.includes("takeout") || status === "takeout" || status === "takeoutinprogress";
}

function pack(view: PracticeView | null, state: MatchState | null): string {
  if (!view || !state) return "none";
  const hits = view.hits.map((hit) => `${hit.segmentName}:${hit.coordsX}:${hit.coordsY}`).join("|");
  return [
    view.phase,
    view.status,
    view.event,
    hits,
    state.phase,
    state.leg?.bustKey ?? "",
    state.scores.legs.you,
    state.scores.legs.opponent,
    state.you.dartsThrown,
    state.opponent.dartsThrown,
  ].join("~");
}

export function emitMatchCues(
  prevView: PracticeView | null,
  prevState: MatchState,
  nextView: PracticeView,
  nextState: MatchState,
): MatchOutcome | null {
  installAudioUnlock();
  const signature = `${pack(prevView, prevState)}=>${pack(nextView, nextState)}`;
  if (signature === lastSignature) return null;
  lastSignature = signature;

  const cues: Cue[] = [];
  let overlay: MatchOutcome | null = null;

  if (prevView && nextView.hits.length > prevView.hits.length) {
    cues.push("thump");
  }

  const bustedNow = Boolean(nextState.leg?.bustKey) && !prevState.leg?.bustKey;
  if (bustedNow) {
    cues.push("failure-trumpet");
    overlay = "try-again";
  }

  const legWon =
    nextState.scores.legs.you + nextState.scores.legs.opponent >
    prevState.scores.legs.you + prevState.scores.legs.opponent;
  const matchWon = nextState.phase === "results" && prevState.phase !== "results";
  if ((legWon || matchWon) && prevView && isTakeout(nextView)) {
    cues.push("win");
    overlay = "checkout";
  }

  playCues(cues);
  return overlay;
}
