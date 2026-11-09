import { describe, expect, it } from "vitest";
import { project, reduceGame, type DartSnap, type GameState } from "./rules";
import { decideScoreSync, type ScoreSync } from "./scoreSync";

function dart(segmentName: string, index: number): DartSnap {
  return { segmentName, coordsX: index, coordsY: 0 };
}

function atTarget(target: number): GameState {
  return {
    phase: "playing",
    game: "101",
    target,
    homebase: 121,
    turnsUsed: 0,
    sealed: [],
    live: [],
    bustKey: null,
  };
}

const idle: ScoreSync = { paused: false, skipping: false, force: false, lastKey: null };

describe("score sync", () => {
  it("does not treat a strip seen during Next score as already scored", () => {
    const paused = decideScoreSync({ ...idle, paused: true, lastKey: "before" }, "T20");
    expect(paused.apply).toBe(false);
    expect(paused.sync).toEqual({ paused: true, skipping: false, force: false, lastKey: "before" });
  });

  it("scores the current strip against the target Next score just armed", () => {
    let game = atTarget(105);
    let sync: ScoreSync = { ...idle, lastKey: "old-visit" };

    sync = { ...sync, paused: true };
    const duringReset = decideScoreSync(sync, "S20|S20|S20");
    sync = duringReset.sync;
    expect(duringReset.apply).toBe(false);

    game = reduceGame(game, { type: "skip" });
    sync = { ...sync, skipping: true, force: true };
    const armed = decideScoreSync(sync, "S20|S20|S20");
    expect(armed.apply).toBe(true);
    expect(armed.skipped).toBe(true);
    if (armed.apply) {
      game = reduceGame(game, {
        type: "strip",
        connected: true,
        hits: [dart("S20", 0), dart("S20", 1), dart("S20", 2)],
      });
    }
    sync = armed.sync;

    expect(project(game)).toMatchObject({ target: 106, remaining: 46, turnsLeft: 2, dartsLeft: 3 });

    const sameStrip = decideScoreSync(sync, "S20|S20|S20");
    expect(sameStrip.apply).toBe(false);

    const takenOut = decideScoreSync(sameStrip.sync, "empty");
    expect(takenOut.apply).toBe(true);
    game = reduceGame(game, { type: "strip", connected: true, hits: [] });
    expect(project(game)).toMatchObject({ target: 106, remaining: 46, turnsLeft: 1, dartsLeft: 3 });
  });

  it("advances twice, then scores the visit and seals it on takeout", () => {
    let game = atTarget(105);
    let sync: ScoreSync = { ...idle, lastKey: "board" };

    for (const target of [106, 107]) {
      const before = sync.lastKey;
      const held = decideScoreSync({ ...sync, paused: true }, "held");
      expect(held.apply).toBe(false);
      expect(held.sync.lastKey).toBe(before);
      game = reduceGame(game, { type: "skip" });
      const armed = decideScoreSync({ ...held.sync, skipping: true, force: true }, "held");
      expect(armed.apply).toBe(true);
      game = reduceGame(game, { type: "strip", connected: true, hits: [] });
      sync = armed.sync;
      expect(project(game).target).toBe(target);
    }

    const visit = decideScoreSync(sync, "T20|S5");
    expect(visit.apply).toBe(true);
    game = reduceGame(game, {
      type: "strip",
      connected: true,
      hits: [dart("T20", 0), dart("S5", 1)],
    });
    expect(project(game)).toMatchObject({ target: 107, remaining: 42, dartsLeft: 4 });

    const takenOut = decideScoreSync(visit.sync, "empty");
    expect(takenOut.apply).toBe(true);
    expect(takenOut.skipped).toBe(false);
    game = reduceGame(game, { type: "strip", connected: true, hits: [] });
    expect(project(game)).toMatchObject({ target: 107, remaining: 42, turnsLeft: 1, dartsLeft: 3 });
  });

  it("does not score Hits that were already handled once the pause lifts on the same strip", () => {
    const sync: ScoreSync = { ...idle, paused: true, skipping: true, lastKey: "same" };
    const decision = decideScoreSync(sync, "same");
    expect(decision.apply).toBe(false);
    expect(decision.sync.paused).toBe(false);
    expect(decision.sync.lastKey).toBe("same");
  });
});
