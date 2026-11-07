import { useEffect, useRef, useState } from "react";
import type { Hit } from "../autodarts/parse";
import type { PracticeView } from "../autodarts/view";
import { emitPracticeCues, outcomeOverlay } from "../audio/emit";
import { idleGame, project, reduceGame, type GameProjection, type GameState } from "./rules";
import { emptySession, freshSession, noteCheckout, noteUndo, type SessionStats } from "./session";

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
  return {
    phase: state.phase,
    target: state.target,
    bustKey: state.bustKey,
    live: state.live.map((dart) => ({ ...dart })),
    sealed: state.sealed.map((turn) => turn.map((dart) => ({ ...dart }))),
  };
}

export function useGame(view: PracticeView): GameProjection & {
  start: () => void;
  sealedVisit: SealedVisit | null;
  restoreVisit: (visit: SealedVisit) => void;
  skip: () => void;
  abort: () => void;
  pauseScoring: () => void;
  resumeScoring: () => void;
  checkouts: number;
  highTarget: number;
  moment: OutcomeMoment | null;
} {
  const [state, setState] = useState(idleGame);
  const [sealedVisit, setSealedVisit] = useState<SealedVisit | null>(null);
  const [stats, setStats] = useState<SessionStats>(emptySession);
  const [moment, setMoment] = useState<OutcomeMoment | null>(null);
  const momentSerial = useRef(0);
  const statsRef = useRef(stats);
  const stateRef = useRef<GameState>(state);
  const lastKey = useRef<string | null>(null);
  const prevView = useRef<PracticeView | null>(null);
  const visitBaseline = useRef<GameState | null>(null);
  const restoring = useRef(false);
  const skipping = useRef(false);
  const paused = useRef(false);
  const forceSync = useRef(false);
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

  useEffect(() => {
    const key = stripKey(view);
    if (paused.current && !skipping.current) {
      if (lastKey.current === key) return;
      lastKey.current = key;
      prevView.current = view;
      return;
    }
    const skipBaseline = restoring.current;
    const skipped = skipping.current;
    const force = forceSync.current;
    restoring.current = false;
    skipping.current = false;
    forceSync.current = false;
    paused.current = false;
    if (!force && lastKey.current === key) return;
    lastKey.current = key;
    const prevGame = stateRef.current;
    const prevHits = prevView.current?.hits ?? [];
    const connected = isConnected(view);

    if (!skipBaseline && prevHits.length === 0 && view.hits.length > 0) {
      visitBaseline.current = cloneGame(prevGame);
    }
    if (!skipped && prevHits.length > 0 && view.hits.length === 0 && connected) {
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
    const overlay = outcomeOverlay(prevView.current, prevGame, view, nextGame);
    if (overlay) {
      momentSerial.current += 1;
      setMoment({ id: momentSerial.current, kind: overlay });
    }
    setState(nextGame);
    emitPracticeCues(prevView.current, prevGame, view, nextGame);
    prevView.current = view;
  }, [view, syncTick]);

  return {
    ...project(state),
    checkouts: stats.checkouts,
    highTarget: stats.highTarget,
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
    },
    skip() {
      const next = reduceGame(stateRef.current, { type: "skip" });
      stateRef.current = next;
      visitBaseline.current = null;
      skipping.current = true;
      setSealedVisit(null);
      setState(next);
    },
    abort() {
      if (stateRef.current.phase === "idle") return;
      const next = reduceGame(stateRef.current, { type: "abort" });
      stateRef.current = next;
      visitBaseline.current = null;
      skipping.current = true;
      setSealedVisit(null);
      applyStats(emptySession());
      setState(next);
    },
    pauseScoring() {
      paused.current = true;
    },
    resumeScoring() {
      paused.current = false;
      forceSync.current = true;
      setSyncTick((tick) => tick + 1);
    },
    start() {
      const current = viewRef.current;
      const prevGame = stateRef.current;
      const started = reduceGame(idleGame(), { type: "start" });
      const connected = isConnected(current);
      const nextGame = reduceGame(started, {
        type: "strip",
        hits: current.hits,
        connected,
      });
      visitBaseline.current = current.hits.length > 0 && connected ? started : null;
      setSealedVisit(null);
      applyStats(noteCheckout(freshSession(started.target), started, nextGame));
      stateRef.current = nextGame;
      lastKey.current = stripKey(current);
      setState(nextGame);
      emitPracticeCues(prevView.current, prevGame, current, nextGame);
      prevView.current = current;
    },
  };
}
