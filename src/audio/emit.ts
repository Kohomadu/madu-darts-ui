import type { PracticeView } from "../autodarts/view";
import type { GameState } from "../game/rules";
import { planCues, type Observation } from "./cues";
import { installAudioUnlock, playCues } from "./play";

let lastSignature = "";

function observe(view: PracticeView, game: GameState): Observation {
  return {
    connected: view.phase === "live" || view.phase === "polling",
    status: view.status,
    event: view.event,
    hits: view.hits,
    game,
  };
}

function signature(prev: Observation | null, next: Observation): string {
  const pack = (observation: Observation | null) => {
    if (!observation) return "none";
    const hits = observation.hits.map((hit) => `${hit.segmentName}:${hit.coordsX}:${hit.coordsY}`).join("|");
    const game = observation.game;
    return [
      observation.connected,
      observation.event,
      observation.status,
      hits,
      game.phase,
      game.target,
      game.bustKey ?? "",
      game.sealed.length,
      game.live.length,
    ].join("~");
  };
  return `${pack(prev)}=>${pack(next)}`;
}

/** Play the cues for one practice transition. A repeated React pass does not play them again. */
export function emitPracticeCues(
  prevView: PracticeView | null,
  prevGame: GameState,
  nextView: PracticeView,
  nextGame: GameState,
): void {
  installAudioUnlock();
  const prev = prevView ? observe(prevView, prevGame) : null;
  const next = observe(nextView, nextGame);
  const signatureKey = signature(prev, next);
  if (signatureKey === lastSignature) return;
  lastSignature = signatureKey;
  playCues(planCues(prev, next));
}
