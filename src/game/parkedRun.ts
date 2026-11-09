import type { DartSnap, GameState, TrainingGameId } from "./rules";
import type { SessionStats } from "./session";

/** Mid-run Training Game progress parked while another game is active. */
export type ParkedRun = {
  state: GameState;
  stats: SessionStats;
  sessionDarts: number;
};

export type ParkedRuns = Partial<Record<TrainingGameId, ParkedRun>>;

/** Parks plus the run that was active when the page last closed. */
export type PersistedProgress = {
  parks: ParkedRuns;
  active: ParkedRun | null;
};

export const PARKED_PROGRESS_KEY = "madu.parkedProgress";

export function cloneParkedState(state: GameState): GameState {
  return {
    ...state,
    live: state.live.map((dart) => ({ ...dart })),
    sealed: state.sealed.map((turn) => turn.map((dart) => ({ ...dart }))),
  };
}

export function cloneParkedStats(stats: SessionStats): SessionStats {
  return { checkouts: stats.checkouts, highTarget: stats.highTarget };
}

function isDartSnap(value: unknown): value is DartSnap {
  if (!value || typeof value !== "object") return false;
  const dart = value as DartSnap;
  return (
    typeof dart.segmentName === "string" &&
    (dart.coordsX === null || typeof dart.coordsX === "number") &&
    (dart.coordsY === null || typeof dart.coordsY === "number")
  );
}

function isGameState(value: unknown): value is GameState {
  if (!value || typeof value !== "object") return false;
  const state = value as GameState;
  return (
    (state.phase === "playing" || state.phase === "complete" || state.phase === "idle") &&
    (state.game === "101" || state.game === "121") &&
    typeof state.target === "number" &&
    typeof state.homebase === "number" &&
    typeof state.turnsUsed === "number" &&
    Array.isArray(state.sealed) &&
    state.sealed.every((turn) => Array.isArray(turn) && turn.every(isDartSnap)) &&
    Array.isArray(state.live) &&
    state.live.every(isDartSnap) &&
    (state.bustKey === null || typeof state.bustKey === "string")
  );
}

function isSessionStats(value: unknown): value is SessionStats {
  if (!value || typeof value !== "object") return false;
  const stats = value as SessionStats;
  return typeof stats.checkouts === "number" && typeof stats.highTarget === "number";
}

function parseParkedRun(value: unknown): ParkedRun | null {
  if (!value || typeof value !== "object") return null;
  const run = value as Partial<ParkedRun>;
  if (!isGameState(run.state) || run.state.phase !== "playing") return null;
  if (!isSessionStats(run.stats)) return null;
  if (typeof run.sessionDarts !== "number" || run.sessionDarts < 0) return null;
  return {
    state: cloneParkedState(run.state),
    stats: cloneParkedStats(run.stats),
    sessionDarts: run.sessionDarts,
  };
}

export function readPersistedProgress(storage: Pick<Storage, "getItem">): PersistedProgress {
  try {
    const raw = storage.getItem(PARKED_PROGRESS_KEY);
    if (!raw) return { parks: {}, active: null };
    const parsed = JSON.parse(raw) as Partial<PersistedProgress>;
    const parks: ParkedRuns = {};
    if (parsed.parks && typeof parsed.parks === "object") {
      for (const game of ["101", "121"] as const) {
        const run = parseParkedRun(parsed.parks[game]);
        if (run && run.state.game === game) parks[game] = run;
      }
    }
    const active = parseParkedRun(parsed.active);
    return { parks, active };
  } catch {
    return { parks: {}, active: null };
  }
}

export function writePersistedProgress(
  storage: Pick<Storage, "setItem" | "removeItem">,
  progress: PersistedProgress,
): void {
  try {
    const empty = Object.keys(progress.parks).length === 0 && !progress.active;
    if (empty) {
      storage.removeItem(PARKED_PROGRESS_KEY);
      return;
    }
    storage.setItem(PARKED_PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // Private mode can reject storage. The in-memory parks still apply.
  }
}

/** Snapshot a playing run so switching Training Games can resume it later. */
export function parkPlayingRun(
  parks: ParkedRuns,
  state: GameState,
  stats: SessionStats,
  sessionDarts: number,
): ParkedRuns {
  if (state.phase !== "playing") return parks;
  return {
    ...parks,
    [state.game]: {
      state: cloneParkedState(state),
      stats: cloneParkedStats(stats),
      sessionDarts,
    },
  };
}

export function takeParkedRun(parks: ParkedRuns, game: TrainingGameId): {
  parks: ParkedRuns;
  run: ParkedRun | null;
} {
  const run = parks[game] ?? null;
  if (!run) return { parks, run: null };
  const next = { ...parks };
  delete next[game];
  return { parks: next, run };
}

export function clearParkedRun(parks: ParkedRuns, game: TrainingGameId): ParkedRuns {
  if (!parks[game]) return parks;
  const next = { ...parks };
  delete next[game];
  return next;
}

export function restartSameGameMessage(game: TrainingGameId): string {
  return `Starting a new ${game} deletes the progress, are you sure you want to start again`;
}

/** Build the payload written after every progress change. */
export function progressSnapshot(
  parks: ParkedRuns,
  state: GameState,
  stats: SessionStats,
  sessionDarts: number,
): PersistedProgress {
  return {
    parks,
    active:
      state.phase === "playing"
        ? {
            state: cloneParkedState(state),
            stats: cloneParkedStats(stats),
            sessionDarts,
          }
        : null,
  };
}
