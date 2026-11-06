import type { BoardSnapshot, Hit } from "./parse";

export type ConnectionPhase = "connecting" | "live" | "polling" | "disconnected";

export type PracticeView = {
  phase: ConnectionPhase;
  status: string;
  event: string;
  hits: Hit[];
};

export type PracticeEvent =
  | { type: "connecting" }
  | { type: "snapshot"; snapshot: BoardSnapshot; via: "live" | "polling" }
  | { type: "socket-open" }
  | { type: "socket-closed" }
  | { type: "unreachable" };

export function connectingView(): PracticeView {
  return { phase: "connecting", status: "", event: "", hits: [] };
}

export function applySnapshot(snapshot: BoardSnapshot, via: "live" | "polling"): PracticeView {
  return {
    phase: via,
    status: snapshot.status,
    event: snapshot.event,
    hits: snapshot.hits,
  };
}

/** Freeze the last real Turn. Does not add, fill, or rename Hits. */
export function pauseView(view: PracticeView): PracticeView {
  return {
    phase: "disconnected",
    status: view.status,
    event: view.event,
    hits: view.hits,
  };
}

export function reducePractice(view: PracticeView, event: PracticeEvent): PracticeView {
  switch (event.type) {
    case "connecting":
      return connectingView();
    case "snapshot":
      return applySnapshot(event.snapshot, event.via);
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
