import type { BoardSnapshot, Hit } from "./parse";

export type ConnectionPhase = "connecting" | "live" | "polling" | "disconnected";

export type PracticeView = {
  phase: ConnectionPhase;
  status: string;
  event: string;
  /** Hits shown in the UI (Autodarts stream with local Manual Overrides applied). */
  hits: Hit[];
  /** Raw Hits from the last Autodarts snapshot (before local Manual Override). */
  streamHits: Hit[];
  /** Local Manual Overrides by strip index for the open Turn. */
  localOverrides: Partial<Record<number, Hit>>;
};

export type PracticeEvent =
  | { type: "connecting" }
  | { type: "snapshot"; snapshot: BoardSnapshot; via: "live" | "polling" }
  | { type: "local-override"; index: number; hit: Hit }
  | { type: "socket-open" }
  | { type: "socket-closed" }
  | { type: "unreachable" };

export function connectingView(): PracticeView {
  return {
    phase: "connecting",
    status: "",
    event: "",
    hits: [],
    streamHits: [],
    localOverrides: {},
  };
}

function mergeHits(streamHits: Hit[], localOverrides: Partial<Record<number, Hit>>): {
  hits: Hit[];
  localOverrides: Partial<Record<number, Hit>>;
} {
  const nextOverrides: Partial<Record<number, Hit>> = {};
  const hits = streamHits.map((hit, index) => {
    const override = localOverrides[index];
    if (!override) return hit;
    nextOverrides[index] = override;
    return override;
  });
  return { hits, localOverrides: nextOverrides };
}

export function applySnapshot(
  snapshot: BoardSnapshot,
  via: "live" | "polling",
  localOverrides: Partial<Record<number, Hit>> = {},
): PracticeView {
  const merged = mergeHits(snapshot.hits, localOverrides);
  return {
    phase: via,
    status: snapshot.status,
    event: snapshot.event,
    streamHits: snapshot.hits,
    hits: merged.hits,
    localOverrides: merged.localOverrides,
  };
}

/** Freeze the last real Turn. Does not add, fill, or rename Hits. */
export function pauseView(view: PracticeView): PracticeView {
  return {
    phase: "disconnected",
    status: view.status,
    event: view.event,
    hits: view.hits,
    streamHits: view.streamHits,
    localOverrides: view.localOverrides,
  };
}

export function reducePractice(view: PracticeView, event: PracticeEvent): PracticeView {
  switch (event.type) {
    case "connecting":
      return connectingView();
    case "snapshot":
      return applySnapshot(event.snapshot, event.via, view.localOverrides);
    case "local-override": {
      if (event.index < 0 || event.index >= view.streamHits.length) return view;
      const localOverrides = { ...view.localOverrides, [event.index]: event.hit };
      const merged = mergeHits(view.streamHits, localOverrides);
      return {
        ...view,
        hits: merged.hits,
        localOverrides: merged.localOverrides,
      };
    }
    case "socket-open":
      if (view.phase === "polling" || view.phase === "live") {
        return { ...view, phase: "live" };
      }
      return view;
    case "socket-closed":
      if (view.phase !== "live") return view;
      return { ...view, phase: "polling" };
    case "unreachable":
      return pauseView(view);
  }
}
