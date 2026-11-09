import { describe, expect, it } from "vitest";
import {
  clearParkedRun,
  parkPlayingRun,
  progressSnapshot,
  readPersistedProgress,
  restartSameGameMessage,
  takeParkedRun,
  writePersistedProgress,
  type ParkedRuns,
} from "./parkedRun";
import type { GameState } from "./rules";

function playing(game: "101" | "121", target: number): GameState {
  return {
    phase: "playing",
    game,
    target,
    homebase: game === "121" ? 121 : 101,
    turnsUsed: 0,
    sealed: [[{ segmentName: "T20", coordsX: 0, coordsY: 0 }]],
    live: [{ segmentName: "S1", coordsX: 1, coordsY: 0 }],
    bustKey: null,
  };
}

function memory(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => {
      values.delete(key);
    },
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}

describe("parked Training Game runs", () => {
  it("parks a playing 101 run and restores it after switching away", () => {
    let parks: ParkedRuns = {};
    const run101 = playing("101", 135);
    parks = parkPlayingRun(parks, run101, { checkouts: 34, highTarget: 135 }, 356);
    expect(parks["101"]?.sessionDarts).toBe(356);
    expect(parks["101"]?.state.target).toBe(135);
    expect(parks["101"]?.state.sealed).toHaveLength(1);
    parks["101"]!.state.live[0].segmentName = "MUTATED";
    expect(run101.live[0].segmentName).toBe("S1");

    parks = parkPlayingRun(parks, playing("121", 122), { checkouts: 1, highTarget: 122 }, 12);
    const taken = takeParkedRun(parks, "101");
    expect(taken.run?.state.target).toBe(135);
    expect(taken.run?.stats.checkouts).toBe(34);
    expect(taken.run?.sessionDarts).toBe(356);
    expect(taken.parks["101"]).toBeUndefined();
    expect(taken.parks["121"]?.state.target).toBe(122);
  });

  it("does not park a completed or idle run", () => {
    const parks = parkPlayingRun(
      {},
      { ...playing("101", 170), phase: "complete" },
      { checkouts: 70, highTarget: 170 },
      400,
    );
    expect(parks).toEqual({});
  });

  it("clears a parked run and names the restart confirm", () => {
    const parks = parkPlayingRun({}, playing("121", 130), { checkouts: 9, highTarget: 130 }, 80);
    expect(clearParkedRun(parks, "121")).toEqual({});
    expect(restartSameGameMessage("101")).toBe(
      "Starting a new 101 deletes the progress, are you sure you want to start again",
    );
  });

  it("persists parks and the active run across a reload", () => {
    const storage = memory();
    const parks = parkPlayingRun({}, playing("101", 135), { checkouts: 34, highTarget: 135 }, 356);
    const active = playing("121", 122);
    writePersistedProgress(
      storage,
      progressSnapshot(parks, active, { checkouts: 1, highTarget: 122 }, 12),
    );
    const loaded = readPersistedProgress(storage);
    expect(loaded.parks["101"]?.state.target).toBe(135);
    expect(loaded.parks["101"]?.sessionDarts).toBe(356);
    expect(loaded.active?.state.game).toBe("121");
    expect(loaded.active?.state.target).toBe(122);
    expect(loaded.active?.sessionDarts).toBe(12);

    writePersistedProgress(storage, { parks: {}, active: null });
    expect(readPersistedProgress(storage)).toEqual({ parks: {}, active: null });
  });
});
