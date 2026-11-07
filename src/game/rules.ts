/** One dart the Training Game can score. Coordinates keep an Override distinct from the dart it replaced. */
export type DartSnap = {
  segmentName: string;
  coordsX: number | null;
  coordsY: number | null;
};

export type GamePhase = "idle" | "playing" | "complete";

export type GameState = {
  phase: GamePhase;
  target: number;
  sealed: DartSnap[][];
  live: DartSnap[];
  /** Strip that already busted this attempt. Ignored until it changes or leaves the Board. */
  bustKey: string | null;
};

export type GameProjection = {
  phase: GamePhase;
  target: number;
  remaining: number;
  turnsLeft: number;
  dartsLeft: number;
  busted: boolean;
};

export type GameEvent =
  | { type: "start" }
  | { type: "skip" }
  | { type: "abort" }
  | { type: "strip"; hits: DartSnap[]; connected: boolean };

const TURNS_PER_ATTEMPT = 2;
const DARTS_PER_TURN = 3;
const LAST_TARGET = 170;
const FIRST_TARGET = 101;

export function idleGame(): GameState {
  return { phase: "idle", target: FIRST_TARGET, sealed: [], live: [], bustKey: null };
}

export function scoreSegment(segmentName: string): { points: number; double: boolean } {
  const name = segmentName.trim().toUpperCase();
  if (name === "BULL" || name === "IB" || name === "50") return { points: 50, double: true };
  if (name === "25" || name === "OB") return { points: 25, double: false };
  const match = /^([SDTM])(\d{1,2})$/.exec(name);
  if (!match) return { points: 0, double: false };
  const number = Number(match[2]);
  if (number < 1 || number > 20) return { points: 0, double: false };
  if (match[1] === "T") return { points: number * 3, double: false };
  if (match[1] === "D") return { points: number * 2, double: true };
  if (match[1] === "S") return { points: number, double: false };
  return { points: 0, double: false };
}

export type ScoreResult = { kind: "open"; remaining: number } | { kind: "bust" } | { kind: "checkout" };

/** Walk the attempt in throw order. Inner Bull is a double. A non-double that lands on 0 is a bust. */
export function scoreAttempt(target: number, darts: DartSnap[]): ScoreResult {
  let remaining = target;
  for (let index = 0; index < darts.length; index += 1) {
    const dart = scoreSegment(darts[index].segmentName);
    remaining -= dart.points;
    const finished = remaining === 0;
    if (remaining < 0 || remaining === 1 || (finished && !dart.double)) return { kind: "bust" };
    if (finished && dart.double) {
      return index === darts.length - 1 ? { kind: "checkout" } : { kind: "bust" };
    }
  }
  return { kind: "open", remaining };
}

function stripKey(hits: DartSnap[]): string {
  return hits.map((hit) => `${hit.segmentName}:${hit.coordsX}:${hit.coordsY}`).join("|");
}

function countedDarts(state: GameState, live: DartSnap[]): DartSnap[] {
  return state.sealed.flat().concat(live);
}

function freshAttempt(state: GameState): GameState {
  return { ...state, sealed: [], live: [], bustKey: null };
}

export function project(state: GameState): GameProjection {
  if (state.phase === "complete") {
    return { phase: "complete", target: LAST_TARGET, remaining: 0, turnsLeft: 0, dartsLeft: 0, busted: false };
  }
  if (state.phase === "idle") {
    return {
      phase: "idle",
      target: FIRST_TARGET,
      remaining: FIRST_TARGET,
      turnsLeft: TURNS_PER_ATTEMPT,
      dartsLeft: TURNS_PER_ATTEMPT * DARTS_PER_TURN,
      busted: false,
    };
  }
  if (state.bustKey) {
    return {
      phase: "playing",
      target: state.target,
      remaining: state.target,
      turnsLeft: TURNS_PER_ATTEMPT,
      dartsLeft: TURNS_PER_ATTEMPT * DARTS_PER_TURN,
      busted: true,
    };
  }
  const scored = scoreAttempt(state.target, countedDarts(state, state.live));
  const remaining = scored.kind === "checkout" ? 0 : scored.kind === "open" ? scored.remaining : state.target;
  const turnsLeft = TURNS_PER_ATTEMPT - state.sealed.length;
  const dartsLeft = Math.max(0, turnsLeft * DARTS_PER_TURN - state.live.length);
  return { phase: "playing", target: state.target, remaining, turnsLeft, dartsLeft, busted: false };
}

function sealTurn(state: GameState): GameState {
  const result = scoreAttempt(state.target, countedDarts(state, state.live));
  if (result.kind === "checkout") {
    if (state.target >= LAST_TARGET) {
      return { phase: "complete", target: LAST_TARGET, sealed: [], live: [], bustKey: null };
    }
    return { phase: "playing", target: state.target + 1, sealed: [], live: [], bustKey: null };
  }
  if (result.kind === "bust") return freshAttempt(state);
  const sealed = [...state.sealed, state.live];
  if (sealed.length >= TURNS_PER_ATTEMPT) return freshAttempt(state);
  return { ...state, sealed, live: [], bustKey: null };
}

export function reduceGame(state: GameState, event: GameEvent): GameState {
  if (event.type === "start") return { phase: "playing", target: FIRST_TARGET, sealed: [], live: [], bustKey: null };
  if (event.type === "abort") return idleGame();
  if (event.type === "skip") {
    if (state.phase !== "playing") return state;
    if (state.target >= LAST_TARGET) {
      return { phase: "complete", target: LAST_TARGET, sealed: [], live: [], bustKey: null };
    }
    return { phase: "playing", target: state.target + 1, sealed: [], live: [], bustKey: null };
  }
  if (state.phase !== "playing" || !event.connected) return state;

  const hits = event.hits.map((hit) => ({
    segmentName: hit.segmentName,
    coordsX: hit.coordsX,
    coordsY: hit.coordsY,
  }));
  const key = stripKey(hits);

  if (hits.length === 0) {
    if (state.bustKey) return freshAttempt(state);
    if (state.live.length === 0) return state;
    return sealTurn(state);
  }

  if (state.bustKey === key) return state;
  const result = scoreAttempt(state.target, countedDarts(state, hits));
  if (result.kind === "bust") return { ...state, live: [], bustKey: key };
  if (state.bustKey === null && stripKey(state.live) === key) return state;
  return { ...state, live: hits, bustKey: null };
}
