import { describe, expect, it } from "vitest";
import { canUndoTurn } from "../game/useGame";
import { idleGame, project, reduceGame, type DartSnap, type GameState } from "../game/rules";

function dart(segmentName: string, index = 0): DartSnap {
  return { segmentName, coordsX: index, coordsY: 0 };
}

function strip(state: GameState, names: string[]): GameState {
  return reduceGame(state, {
    type: "strip",
    connected: true,
    hits: names.map((name, index) => dart(name, index)),
  });
}

function takeout(state: GameState): GameState {
  return reduceGame(state, { type: "strip", connected: true, hits: [] });
}

function started(): GameState {
  return reduceGame(idleGame(), { type: "start" });
}

describe("Undo last Turn", () => {
  it("is offered only when a sealed Turn can be restored onto an empty strip", () => {
    expect(
      canUndoTurn({ connected: true, hitCount: 0, reviewing: false, hasSealedVisit: true }),
    ).toBe(true);
    expect(
      canUndoTurn({ connected: true, hitCount: 2, reviewing: false, hasSealedVisit: true }),
    ).toBe(false);
    expect(
      canUndoTurn({ connected: false, hitCount: 0, reviewing: false, hasSealedVisit: true }),
    ).toBe(false);
    expect(
      canUndoTurn({ connected: true, hitCount: 0, reviewing: true, hasSealedVisit: true }),
    ).toBe(false);
    expect(
      canUndoTurn({ connected: true, hitCount: 0, reviewing: false, hasSealedVisit: false }),
    ).toBe(false);
  });

  it("lets a corrected first dart finish on the double and advance the target", () => {
    const baseline = started();
    const missed = takeout(strip(baseline, ["T19", "S1", "D20"]));
    expect(project(missed)).toMatchObject({ target: 101, remaining: 3, busted: false });

    const corrected = strip(baseline, ["T20", "S1", "D20"]);
    expect(project(corrected).remaining).toBe(0);
    expect(project(corrected).busted).toBe(false);

    const sealed = takeout(corrected);
    expect(project(sealed)).toMatchObject({ phase: "playing", target: 102, remaining: 102, busted: false });
  });

  it("clears a bust when the restored strip is corrected before it is sealed again", () => {
    const baseline = started();
    const busted = strip(baseline, ["T20", "T20", "T20"]);
    expect(project(busted).busted).toBe(true);
    expect(project(takeout(busted)).remaining).toBe(101);

    const corrected = strip(baseline, ["T20", "S1", "D20"]);
    expect(project(corrected)).toMatchObject({ remaining: 0, busted: false });
    expect(project(takeout(corrected)).target).toBe(102);
  });
});
