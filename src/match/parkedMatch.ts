import type { MatchState } from "./types";

export const PARKED_MATCH_KEY = "madu.match.parked";

export function readParkedMatch(storage: Pick<Storage, "getItem">): MatchState | null {
  try {
    const raw = storage.getItem(PARKED_MATCH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MatchState;
    if (parsed.phase !== "bull-off" && parsed.phase !== "leg") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeParkedMatch(storage: Pick<Storage, "setItem" | "removeItem">, state: MatchState | null): void {
  try {
    if (!state || state.phase === "results") {
      storage.removeItem(PARKED_MATCH_KEY);
      return;
    }
    storage.setItem(PARKED_MATCH_KEY, JSON.stringify(state));
  } catch {
    // Private mode can reject storage.
  }
}

export function discardParkedMatchMessage(): string {
  return "Starting a new match deletes the parked match. Are you sure?";
}
