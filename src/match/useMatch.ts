import { useEffect, useRef, useState } from "react";
import type { Hit } from "../autodarts/parse";
import type { PracticeView } from "../autodarts/view";
import { installAudioUnlock, playCues } from "../audio/play";
import { canUndoTurn } from "../game/useGame";
import { decideScoreSync } from "../game/scoreSync";
import { addProfileDartsThrown, observeThrownDarts, type DartWatch } from "../home/profileDarts";
import { readProfileName } from "../home/profile";
import type { DartSnap } from "../game/rules";
import { botTurnKey, isBotThrowing, planCurrentBotVisit } from "./botClock";
import { emitMatchCues, type MatchOutcome } from "./cues";
import { writeParkedMatch } from "./parkedMatch";
import { projectMatch, reduceMatch, rematchFrom, startMatch } from "./reduceMatch";
import type { MatchSetup, MatchState, SeatId } from "./types";

export type MatchSealedVisit = {
  hits: Hit[];
};

function stripKey(view: PracticeView): string {
  const hits = view.hits.map((hit) => `${hit.segmentName}:${hit.coordsX}:${hit.coordsY}`).join("|");
  return `${view.phase}~${view.status}~${view.event}~${view.holdEmpty ? "hold" : "open"}~${hits}`;
}

function isConnected(view: PracticeView): boolean {
  return view.phase === "live" || view.phase === "polling";
}

function youAreThrowing(state: MatchState): boolean {
  if (state.phase === "leg") return state.leg?.thrower === "you";
  if (state.phase === "bull-off") return state.bullOff?.thrower === "you";
  return false;
}

function isTakeout(view: PracticeView): boolean {
  const event = view.event.toLowerCase().replace(/\s+/g, "");
  const status = view.status.toLowerCase().replace(/\s+/g, "");
  return event.includes("takeout") || status === "takeout" || status === "takeoutinprogress";
}

export function useMatch(
  view: PracticeView,
  initial: MatchState,
): ReturnType<typeof projectMatch> & {
  state: MatchState;
  sealedVisit: MatchSealedVisit | null;
  canUndo: boolean;
  moment: { id: number; kind: MatchOutcome } | null;
  throwerName: string;
  botThrowing: boolean;
  botShown: DartSnap[];
  restoreVisit: (visit: MatchSealedVisit) => void;
  park: () => void;
  rematch: () => void;
  clearPark: () => void;
} {
  const [state, setState] = useState(initial);
  const [sealedVisit, setSealedVisit] = useState<MatchSealedVisit | null>(null);
  const [moment, setMoment] = useState<{ id: number; kind: MatchOutcome } | null>(null);
  const [botShown, setBotShown] = useState<DartSnap[]>([]);
  const momentSerial = useRef(0);
  const stateRef = useRef(state);
  const lastKey = useRef<string | null>(null);
  const prevView = useRef<PracticeView | null>(null);
  const visitHits = useRef<Hit[] | null>(null);
  const restoring = useRef(false);
  const paused = useRef(false);
  const skipping = useRef(false);
  const forceSync = useRef(false);
  const frozenStrip = useRef<string | null>(null);
  const dartWatch = useRef<DartWatch>({ seen: null });
  const [syncTick, setSyncTick] = useState(0);
  const botKey = botTurnKey(state);

  function persist(next: MatchState) {
    writeParkedMatch(localStorage, next.phase === "results" ? null : next);
  }

  function recordProfileDarts(hits: number, replay: boolean, yours: boolean) {
    const added = observeThrownDarts(dartWatch.current, { hits, replay, yours });
    if (added > 0) addProfileDartsThrown(localStorage, readProfileName(localStorage), added);
  }

  function apply(next: MatchState) {
    stateRef.current = next;
    setState(next);
    persist(next);
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
    if (isBotThrowing(prevGame)) {
      recordProfileDarts(view.hits.length, false, false);
      frozenStrip.current = stripKey(view);
      prevView.current = view;
      return;
    }
    if (frozenStrip.current && stripKey(view) === frozenStrip.current) {
      recordProfileDarts(view.hits.length, true, false);
      prevView.current = view;
      return;
    }
    frozenStrip.current = null;

    recordProfileDarts(view.hits.length, skipBaseline || decision.skipped, youAreThrowing(prevGame));

    const previousView = decision.skipped ? { ...view, hits: [] } : prevView.current;
    const prevHits = previousView?.hits ?? [];
    const connected = isConnected(view);

    if (!skipBaseline && prevHits.length === 0 && view.hits.length > 0) {
      visitHits.current = [];
    }
    if (!skipBaseline && view.hits.length > 0) {
      visitHits.current = view.hits.map((hit) => ({ ...hit }));
    }

    let next = reduceMatch(prevGame, {
      type: "strip",
      hits: view.hits,
      connected,
    });

    if (
      !skipBaseline &&
      prevHits.length > 0 &&
      view.hits.length === 0 &&
      connected &&
      isTakeout(view) &&
      (prevGame.phase === "leg" || prevGame.phase === "bull-off")
    ) {
      next = reduceMatch(next, { type: "seal", hits: prevHits });
      if (prevGame.phase === "leg") {
        setSealedVisit({ hits: prevHits.map((hit) => ({ ...hit })) });
      }
      visitHits.current = null;
    } else if (!skipBaseline && prevHits.length > 0 && view.hits.length === 0) {
      setSealedVisit(null);
      visitHits.current = null;
    }

    const overlay = emitMatchCues(previousView, prevGame, view, next);
    if (overlay) {
      momentSerial.current += 1;
      setMoment({ id: momentSerial.current, kind: overlay });
    }

    apply(next);
    prevView.current = view;
  }, [view, syncTick]);

  useEffect(() => {
    const current = stateRef.current;
    if (!isBotThrowing(current)) {
      setBotShown([]);
      return;
    }
    const planned = planCurrentBotVisit(current, Math.random);
    if (!planned) return;
    installAudioUnlock();
    setBotShown([]);
    const frames: number[] = [];
    const reveals = planned.showAtMs.map((ms, index) =>
      window.setTimeout(() => {
        setBotShown(planned.darts.slice(0, index + 1));
        playCues(["thump"]);
        if (index !== planned.showAtMs.length - 1) return;
        // Last slot is also takeout. Let that dart paint, then seal.
        const first = requestAnimationFrame(() => {
          const second = requestAnimationFrame(() => {
            const latest = stateRef.current;
            if (botTurnKey(latest) !== botKey) return;
            const sealed = reduceMatch(latest, { type: "seal", hits: planned.darts });
            if (latest.phase === "leg") {
              setSealedVisit({ hits: planned.darts.map(asHit) });
            }
            if (planned.checkout) {
              momentSerial.current += 1;
              setMoment({ id: momentSerial.current, kind: "checkout" });
              playCues(["win"]);
            } else if (planned.bust) {
              momentSerial.current += 1;
              setMoment({ id: momentSerial.current, kind: "try-again" });
              playCues(["failure-trumpet"]);
            }
            setBotShown([]);
            apply(sealed);
          });
          frames.push(second);
        });
        frames.push(first);
      }, ms),
    );
    return () => {
      reveals.forEach((id) => window.clearTimeout(id));
      frames.forEach((id) => cancelAnimationFrame(id));
    };
  }, [botKey]);

  const projected = projectMatch(state);
  const live = isConnected(view);
  const reviewing = view.reviewHits != null;
  const botThrowing = isBotThrowing(state);
  const canUndo =
    !botThrowing &&
    canUndoTurn({
      connected: live,
      hitCount: view.hits.length,
      reviewing,
      hasSealedVisit: sealedVisit != null && state.sealed != null,
    });

  const thrower: SeatId | null = projected.thrower;
  const throwerName =
    thrower === "you" ? state.youName : thrower === "opponent" ? state.setup.opponentName : "";

  return {
    ...projected,
    state,
    sealedVisit,
    canUndo,
    moment,
    throwerName,
    botThrowing,
    botShown,
    restoreVisit(visit) {
      restoring.current = true;
      const undone = reduceMatch(stateRef.current, { type: "undo" });
      apply(undone);
      setSealedVisit(null);
      void visit;
      setSyncTick((tick) => tick + 1);
    },
    park() {
      persist(stateRef.current);
    },
    rematch() {
      const next = rematchFrom(stateRef.current);
      apply(next);
      setSealedVisit(null);
    },
    clearPark() {
      writeParkedMatch(localStorage, null);
    },
  };
}

export function beginMatch(setup: MatchSetup, youName: string): MatchState {
  return startMatch(setup, youName);
}

function asHit(dart: DartSnap): Hit {
  return {
    segmentName: dart.segmentName,
    segmentNumber: null,
    multiplier: null,
    bed: null,
    coordsX: dart.coordsX,
    coordsY: dart.coordsY,
  };
}
