import { useEffect, useRef, useState } from "react";
import type { PracticeView } from "../autodarts/view";
import { emitPracticeCues } from "../audio/emit";
import { idleGame, project, reduceGame, type GameProjection, type GameState } from "./rules";

function stripKey(view: PracticeView): string {
  const hits = view.hits.map((hit) => `${hit.segmentName}:${hit.coordsX}:${hit.coordsY}`).join("|");
  return `${view.phase}~${view.status}~${view.event}~${hits}`;
}

function isConnected(view: PracticeView): boolean {
  return view.phase === "live" || view.phase === "polling";
}

export function useGame(view: PracticeView): GameProjection & { start: () => void } {
  const [state, setState] = useState(idleGame);
  const stateRef = useRef<GameState>(state);
  const lastKey = useRef<string | null>(null);
  const prevView = useRef<PracticeView | null>(null);
  const viewRef = useRef(view);
  viewRef.current = view;

  useEffect(() => {
    const key = stripKey(view);
    if (lastKey.current === key) return;
    lastKey.current = key;
    const prevGame = stateRef.current;
    const nextGame = reduceGame(prevGame, { type: "strip", hits: view.hits, connected: isConnected(view) });
    stateRef.current = nextGame;
    setState(nextGame);
    emitPracticeCues(prevView.current, prevGame, view, nextGame);
    prevView.current = view;
  }, [view]);

  return {
    ...project(state),
    start() {
      const current = viewRef.current;
      const prevGame = stateRef.current;
      const started = reduceGame(idleGame(), { type: "start" });
      const nextGame = reduceGame(started, {
        type: "strip",
        hits: current.hits,
        connected: isConnected(current),
      });
      stateRef.current = nextGame;
      lastKey.current = stripKey(current);
      setState(nextGame);
      emitPracticeCues(prevView.current, prevGame, current, nextGame);
      prevView.current = current;
    },
  };
}
