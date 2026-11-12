import { useEffect, useRef, useState } from "react";
import type { Hit } from "../autodarts/parse";
import type { PracticeView } from "../autodarts/view";
import { emitPracticeCues, outcomeOverlay } from "../audio/emit";
import {
  beatHighScore,
  readHighScore,
  writeHighScore,
  type HighScoreRecord,
} from "./highScore";
import {
  clearParkedRun,
  cloneParkedState,
  parkPlayingRun,
  progressSnapshot,
  readPersistedProgress,
  takeParkedRun,
  writePersistedProgress,
  type ParkedRuns,
} from "./parkedRun";
import { idleGame, project, reduceGame, type GameProjection, type GameState, type TrainingGameId } from "./rules";
import { decideScoreSync } from "./scoreSync";
import { emptySession, freshSession, noteCheckout, noteUndo, type SessionStats } from "./session";
import { newThrownDarts } from "./sessionDarts";

export type OutcomeMoment = { id: number; kind: "checkout" | "try-again" };

/** Game state from before a Turn landed, plus the Hits the UI sealed with. */
export type SealedVisit = {
  baseline: GameState;
  hits: Hit[];
};

export function canUndoTurn(options: {
  connected: boolean;
  hitCount: number;
  reviewing: boolean;
  hasSealedVisit: boolean;
}): boolean {
  return options.connected && !options.reviewing && options.hitCount === 0 && options.hasSealedVisit;
}

function stripKey(view: PracticeView): string {
  const hits = view.hits.map((hit) => `${hit.segmentName}:${hit.coordsX}:${hit.coordsY}`).join("|");
  return `${view.phase}~${view.status}~${view.event}~${view.holdEmpty ? "hold" : "open"}~${hits}`;
}

function isConnected(view: PracticeView): boolean {
  return view.phase === "live" || view.phase === "polling";
}

function isTakeout(view: PracticeView): boolean {
  const event = view.event.toLowerCase().replace(/\s+/g, "");
  const status = view.status.toLowerCase().replace(/\s+/g, "");
  return event.includes("takeout") || status === "takeout" || status === "takeoutinprogress";
}

function cloneGame(state: GameState): GameState {
  return cloneParkedState(state);
}

function checkoutAchievement(
  prev: GameState,
  next: GameState,
  sessionDarts: number,
): { game: TrainingGameId; score: number; darts: number } | null {
  if (prev.phase !== "playing") return null;
  if (!(next.target > prev.target || next.phase === "complete")) return null;
  if (sessionDarts < 1) return null;
  return { game: prev.game, score: next.target, darts: sessionDarts };
}

export type StartGameOptions = {
  /** Confirmed restart of the same Training Game — discard that run's progress. */
  replaceSame?: boolean;
};

export function useGame(view: PracticeView): GameProjection & {
  start: (game?: TrainingGameId, options?: StartGameOptions) => void;
  sealedVisit: SealedVisit | null;
  restoreVisit: (visit: SealedVisit) => void;
  skip: () => void;
  abort: () => void;
  pauseScoring: () => void;
  resumeScoring: () => void;
  checkouts: number;
  highTarget: number;
  highScore: HighScoreRecord | null;
  thrownDarts: number;
  moment: OutcomeMoment | null;
} {
  const restored = useRef(readPersistedProgress(localStorage));
  const [state, setState] = useState(() =>
    restored.current.active ? cloneParkedState(restored.current.active.state) : idleGame(),
  );
  const [sealedVisit, setSealedVisit] = useState<SealedVisit | null>(null);
  const [stats, setStats] = useState<SessionStats>(() =>
    restored.current.active ? restored.current.active.stats : emptySession(),
  );
  const [highScores, setHighScores] = useState(() => ({
    "101": readHighScore(localStorage, "101"),
    "121": readHighScore(localStorage, "121"),
  }));
  const [moment, setMoment] = useState<OutcomeMoment | null>(null);
  const momentSerial = useRef(0);
  const statsRef = useRef(stats);
  const stateRef = useRef<GameState>(state);
  const parksRef = useRef<ParkedRuns>(restored.current.parks);
  const lastKey = useRef<string | null>(null);
  const prevView = useRef<PracticeView | null>(null);
  const visitBaseline = useRef<GameState | null>(null);
  const restoring = useRef(false);
  const skipping = useRef(false);
  const paused = useRef(false);
  const forceSync = useRef(false);
  /** Hits thrown since Start for this Training Game run (for High Score competition). */
  const sessionDarts = useRef(restored.current.active?.sessionDarts ?? 0);
  const [syncTick, setSyncTick] = useState(0);
  const viewRef = useRef(view);
  viewRef.current = view;

  function remember(visit: SealedVisit | null) {
    setSealedVisit(visit);
  }

  function applyStats(next: SessionStats) {
    if (next === statsRef.current) return;
    statsRef.current = next;
    setStats(next);
  }

  function persistProgress() {
    writePersistedProgress(
      localStorage,
      progressSnapshot(parksRef.current, stateRef.current, statsRef.current, sessionDarts.current),
    );
  }

  function rememberHigh(prev: GameState, next: GameState) {
    const achieved = checkoutAchievement(prev, next, sessionDarts.current);
    if (!achieved) return;
    setHighScores((current) => {
      const record = beatHighScore(current[achieved.game], achieved.score, achieved.darts, Date.now());
      if (record === current[achieved.game]) return current;
      if (!record) return current;
      writeHighScore(localStorage, achieved.game, record);
      return { ...current, [achieved.game]: record };
    });
  }

  function activateRun(nextGame: GameState, nextStats: SessionStats, prevGame: GameState, current: PracticeView) {
    const connected = isConnected(current);
    visitBaseline.current = current.hits.length > 0 && connected ? cloneGame(nextGame) : null;
    setSealedVisit(null);
    const scored = reduceGame(nextGame, {
      type: "strip",
      hits: current.hits,
      connected,
    });
    applyStats(noteCheckout(nextStats, nextGame, scored));
    rememberHigh(nextGame, scored);
    stateRef.current = scored;
    lastKey.current = stripKey(current);
    setState(scored);
    persistProgress();
    emitPracticeCues({ ...current, hits: [] }, prevGame, current, scored);
    prevView.current = current;
  }

  useEffect(() => {
    const key = stripKey(view);
    const decision = decideScoreSync(
      {
        paused: paused.current,
        skipping: skipping.current,
        force: forceSync.current,
        lastKey: lastKey.current,
      },
      key,
    );
    paused.current = decision.sync.paused;
    skipping.current = decision.sync.skipping;
    forceSync.current = decision.sync.force;
    lastKey.current = decision.sync.lastKey;
    if (!decision.apply) return;

    const skipBaseline = restoring.current;
    restoring.current = false;
    const prevGame = stateRef.current;
    // Next score already replaced the attempt. Don't narrate that as a takeout of the old visit.
    const previousView = decision.skipped ? { ...view, hits: [] } : prevView.current;
    const prevHits = previousView?.hits ?? [];
    const connected = isConnected(view);

    if (!skipBaseline && prevGame.phase === "playing") {
      sessionDarts.current += newThrownDarts(prevHits.length, view.hits.length);
    }

    if (!skipBaseline && prevHits.length === 0 && view.hits.length > 0) {
      visitBaseline.current = cloneGame(prevGame);
    }
    if (!decision.skipped && prevHits.length > 0 && view.hits.length === 0 && connected) {
      if (isTakeout(view) && visitBaseline.current) {
        remember({
          baseline: visitBaseline.current,
          hits: prevHits.map((hit) => ({ ...hit })),
        });
      } else {
        remember(null);
      }
      visitBaseline.current = null;
    }

    const nextGame = reduceGame(prevGame, { type: "strip", hits: view.hits, connected });
    stateRef.current = nextGame;
    applyStats(noteCheckout(statsRef.current, prevGame, nextGame));
    rememberHigh(prevGame, nextGame);
    const overlay = outcomeOverlay(previousView, prevGame, view, nextGame);
    if (overlay) {
      momentSerial.current += 1;
      setMoment({ id: momentSerial.current, kind: overlay });
    }
    setState(nextGame);
    persistProgress();
    emitPracticeCues(previousView, prevGame, view, nextGame);
    prevView.current = view;
  }, [view, syncTick]);

  return {
    ...project(state),
    checkouts: stats.checkouts,
    highTarget: stats.highTarget,
    highScore: state.phase === "idle" ? null : highScores[state.game],
    thrownDarts: sessionDarts.current,
    moment,
    sealedVisit,
    restoreVisit(visit) {
      const baseline = cloneGame(visit.baseline);
      visitBaseline.current = baseline;
      restoring.current = true;
      const prev = stateRef.current;
      const next = reduceGame(baseline, { type: "strip", hits: visit.hits, connected: true });
      stateRef.current = next;
      applyStats(noteUndo(statsRef.current, prev, next));
      setSealedVisit(null);
      setState(next);
      persistProgress();
    },
    skip() {
      const fresh = reduceGame(stateRef.current, { type: "skip" });
      const current = viewRef.current;
      const connected = isConnected(current);
      const scored = reduceGame(fresh, { type: "strip", hits: current.hits, connected });
      stateRef.current = scored;
      visitBaseline.current = current.hits.length > 0 && connected ? fresh : null;
      paused.current = false;
      skipping.current = true;
      forceSync.current = true;
      lastKey.current = stripKey(current);
      prevView.current = { ...current, hits: [] };
      setSealedVisit(null);
      setState(scored);
      persistProgress();
      setSyncTick((tick) => tick + 1);
    },
    abort() {
      if (stateRef.current.phase === "idle") return;
      parksRef.current = clearParkedRun(parksRef.current, stateRef.current.game);
      const next = reduceGame(stateRef.current, { type: "abort" });
      stateRef.current = next;
      visitBaseline.current = null;
      skipping.current = true;
      sessionDarts.current = 0;
      setSealedVisit(null);
      applyStats(emptySession());
      setState(next);
      persistProgress();
    },
    pauseScoring() {
      paused.current = true;
    },
    resumeScoring() {
      paused.current = false;
      forceSync.current = true;
      setSyncTick((tick) => tick + 1);
    },
    start(game: TrainingGameId = "101", options: StartGameOptions = {}) {
      const current = viewRef.current;
      const prevGame = stateRef.current;
      let parks = parksRef.current;

      if (options.replaceSame && prevGame.phase === "playing" && prevGame.game === game) {
        parks = clearParkedRun(parks, game);
      } else if (prevGame.phase === "playing" && prevGame.game !== game) {
        parks = parkPlayingRun(parks, prevGame, statsRef.current, sessionDarts.current);
      }

      const taken = takeParkedRun(parks, game);
      parksRef.current = taken.parks;

      if (taken.run && !options.replaceSame) {
        sessionDarts.current = taken.run.sessionDarts;
        activateRun(cloneParkedState(taken.run.state), taken.run.stats, prevGame, current);
        return;
      }

      const started = reduceGame(idleGame(), { type: "start", game });
      sessionDarts.current = current.hits.length > 0 && isConnected(current) ? current.hits.length : 0;
      activateRun(started, freshSession(started.target), prevGame, current);
    },
  };
}
