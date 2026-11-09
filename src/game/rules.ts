/** One dart the Training Game can score. Coordinates keep an Override distinct from the dart it replaced. */
export type DartSnap = {
  segmentName: string;
  coordsX: number | null;
  coordsY: number | null;
};

export type GamePhase = "idle" | "playing" | "complete";

export type TrainingGameId = "101" | "121";

export type GameState = {
  phase: GamePhase;
  game: TrainingGameId;
  target: number;
  /** 121 falls back here after a missed twelve-dart clear. 101 does not use it. */
  homebase: number;
  /** Turns already spent this attempt, including a bust. 101 leaves this at 0 and restarts instead. */
  turnsUsed: number;
  sealed: DartSnap[][];
  live: DartSnap[];
  /** Strip that already busted this attempt. Ignored until it changes or leaves the Board. */
  bustKey: string | null;
};

export type GameProjection = {
  phase: GamePhase;
  game: TrainingGameId;
  target: number;
  homebase: number;
  remaining: number;
  turnsLeft: number;
  dartsLeft: number;
  busted: boolean;
};

export type GameEvent =
  | { type: "start"; game?: TrainingGameId }
  | { type: "skip" }
  | { type: "abort" }
  | { type: "strip"; hits: DartSnap[]; connected: boolean };

const DARTS_PER_TURN = 3;
const LAST_TARGET = 170;

function turnsPerAttempt(game: TrainingGameId): number {
  return game === "121" ? 4 : 2;
}

function firstTarget(game: TrainingGameId): number {
  return game === "121" ? 121 : 101;
}

export function idleGame(): GameState {
  return { phase: "idle", game: "101", target: 101, homebase: 121, turnsUsed: 0, sealed: [], live: [], bustKey: null };
}

function beginGame(game: TrainingGameId): GameState {
  const target = firstTarget(game);
  return { phase: "playing", game, target, homebase: target, turnsUsed: 0, sealed: [], live: [], bustKey: null };
}

function finishedRun(state: GameState): GameState {
  return {
    phase: "complete",
    game: "101",
    target: LAST_TARGET,
    homebase: state.homebase,
    turnsUsed: 0,
    sealed: [],
    live: [],
    bustKey: null,
  };
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
  return { ...state, turnsUsed: 0, sealed: [], live: [], bustKey: null };
}

/** A missed 121 clear falls back to Homebase and starts another twelve darts. */
function attemptAtHomebase(state: GameState): GameState {
  return {
    phase: "playing",
    game: "121",
    target: Math.max(121, state.homebase),
    homebase: state.homebase,
    turnsUsed: 0,
    sealed: [],
    live: [],
    bustKey: null,
  };
}

function turnStartRemaining(state: GameState): number {
  const scored = scoreAttempt(state.target, state.sealed.flat());
  return scored.kind === "open" ? scored.remaining : state.target;
}

function budget(state: GameState, liveCount: number): { turnsLeft: number; dartsLeft: number } {
  const turnsLeft = Math.max(0, turnsPerAttempt(state.game) - state.turnsUsed);
  return { turnsLeft, dartsLeft: Math.max(0, turnsLeft * DARTS_PER_TURN - liveCount) };
}

export function project(state: GameState): GameProjection {
  if (state.phase === "complete") {
    return {
      phase: "complete",
      game: "101",
      target: LAST_TARGET,
      homebase: state.homebase,
      remaining: 0,
      turnsLeft: 0,
      dartsLeft: 0,
      busted: false,
    };
  }
  if (state.phase === "idle") {
    return {
      phase: "idle",
      game: "101",
      target: 101,
      homebase: state.homebase,
      remaining: 101,
      turnsLeft: 2,
      dartsLeft: 6,
      busted: false,
    };
  }
  if (state.bustKey && state.game === "101") {
    return {
      phase: "playing",
      game: "101",
      target: state.target,
      homebase: state.homebase,
      remaining: state.target,
      turnsLeft: 2,
      dartsLeft: 6,
      busted: true,
    };
  }
  if (state.bustKey) {
    const { turnsLeft, dartsLeft } = budget(state, 0);
    return {
      phase: "playing",
      game: "121",
      target: state.target,
      homebase: state.homebase,
      remaining: turnStartRemaining(state),
      turnsLeft,
      dartsLeft,
      busted: true,
    };
  }
  const scored = scoreAttempt(state.target, countedDarts(state, state.live));
  const remaining = scored.kind === "checkout" ? 0 : scored.kind === "open" ? scored.remaining : state.target;
  const spent = state.game === "121" ? state.turnsUsed : state.sealed.length;
  const turnsLeft = turnsPerAttempt(state.game) - spent;
  const dartsLeft = Math.max(0, turnsLeft * DARTS_PER_TURN - state.live.length);
  return {
    phase: "playing",
    game: state.game,
    target: state.target,
    homebase: state.homebase,
    remaining,
    turnsLeft,
    dartsLeft,
    busted: false,
  };
}

function sealTurn(state: GameState): GameState {
  const result = scoreAttempt(state.target, countedDarts(state, state.live));
  if (result.kind === "checkout") {
    if (state.game === "101" && state.target >= LAST_TARGET) return finishedRun(state);
    const nextTarget = state.target + 1;
    const homebase = state.game === "121" && state.turnsUsed < 2 ? nextTarget : state.homebase;
    return {
      phase: "playing",
      game: state.game,
      target: nextTarget,
      homebase,
      turnsUsed: 0,
      sealed: [],
      live: [],
      bustKey: null,
    };
  }
  if (result.kind === "bust") return freshAttempt(state);
  const sealed = [...state.sealed, state.live];
  if (state.game === "121") {
    const turnsUsed = state.turnsUsed + 1;
    if (turnsUsed >= turnsPerAttempt("121")) return attemptAtHomebase(state);
    return { ...state, sealed, live: [], bustKey: null, turnsUsed };
  }
  if (sealed.length >= turnsPerAttempt("101")) return freshAttempt(state);
  return { ...state, sealed, live: [], bustKey: null };
}

export function reduceGame(state: GameState, event: GameEvent): GameState {
  if (event.type === "start") return beginGame(event.game ?? "101");
  if (event.type === "abort") return idleGame();
  if (event.type === "skip") {
    if (state.phase !== "playing" || state.game !== "101") return state;
    if (state.target >= LAST_TARGET) return finishedRun(state);
    return { ...freshAttempt(state), target: state.target + 1 };
  }
  if (state.phase !== "playing" || !event.connected) return state;

  const hits = event.hits.map((hit) => ({
    segmentName: hit.segmentName,
    coordsX: hit.coordsX,
    coordsY: hit.coordsY,
  }));
  const key = stripKey(hits);

  if (hits.length === 0) {
    if (state.bustKey) {
      if (state.game === "121") {
        return state.turnsUsed >= turnsPerAttempt("121") ? attemptAtHomebase(state) : { ...state, bustKey: null };
      }
      return freshAttempt(state);
    }
    if (state.live.length === 0) return state;
    return sealTurn(state);
  }

  if (state.bustKey === key) return state;
  const result = scoreAttempt(state.target, countedDarts(state, hits));
  if (result.kind === "bust") {
    const turnsUsed = state.game === "121" && state.bustKey === null ? state.turnsUsed + 1 : state.turnsUsed;
    return { ...state, live: [], bustKey: key, turnsUsed };
  }
  if (state.bustKey !== null && state.game === "121") {
    return { ...state, live: hits, bustKey: null, turnsUsed: Math.max(0, state.turnsUsed - 1) };
  }
  if (state.bustKey === null && stripKey(state.live) === key) return state;
  return { ...state, live: hits, bustKey: null };
}
