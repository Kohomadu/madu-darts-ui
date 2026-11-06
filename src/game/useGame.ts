import { useEffect, useRef, useState } from "react";
import type { PracticeView } from "../autodarts/view";
import { idleGame, project, reduceGame, type GameProjection } from "./rules";

function stripKey(view: PracticeView): string {
  const hits = view.hits.map((hit) => `${hit.segmentName}:${hit.coordsX}:${hit.coordsY}`).join("|");
  return `${view.phase}~${hits}`;
}

export function useGame(view: PracticeView): GameProjection & { start: () => void } {
  const [state, setState] = useState(idleGame);
  const lastKey = useRef<string | null>(null);
  const viewRef = useRef(view);
  viewRef.current = view;

  useEffect(() => {
    const key = stripKey(view);
    if (lastKey.current === key) return;
    lastKey.current = key;
    const connected = view.phase === "live" || view.phase === "polling";
    setState((current) => reduceGame(current, { type: "strip", hits: view.hits, connected }));
  }, [view]);

  return {
    ...project(state),
    start() {
      const current = viewRef.current;
      const connected = current.phase === "live" || current.phase === "polling";
      lastKey.current = stripKey(current);
      setState(() => {
        const started = reduceGame(idleGame(), { type: "start" });
        return reduceGame(started, { type: "strip", hits: current.hits, connected });
      });
    },
  };
}
