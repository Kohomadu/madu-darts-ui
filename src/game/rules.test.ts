import { describe, expect, it } from "vitest";
import { idleGame, project, reduceGame, scoreSegment, type DartSnap, type GameState } from "./rules";

function dart(segmentName: string, index = 0): DartSnap {
  return { segmentName, coordsX: index, coordsY: 0 };
}

function strip(state: GameState, names: string[], connected = true): GameState {
  return reduceGame(state, {
    type: "strip",
    connected,
    hits: names.map((name, index) => dart(name, index)),
  });
}

function takeout(state: GameState): GameState {
  return reduceGame(state, { type: "strip", connected: true, hits: [] });
}

function started(): GameState {
  return reduceGame(idleGame(), { type: "start" });
}

describe("101 scoring", () => {
  it("scores triples, doubles, singles, Inner Bull, outer bull, and a miss", () => {
    expect(scoreSegment("T20")).toEqual({ points: 60, double: false });
    expect(scoreSegment("D16")).toEqual({ points: 32, double: true });
    expect(scoreSegment("S5")).toEqual({ points: 5, double: false });
    expect(scoreSegment("Bull")).toEqual({ points: 50, double: true });
    expect(scoreSegment("25")).toEqual({ points: 25, double: false });
    expect(scoreSegment("M20")).toEqual({ points: 0, double: false });
  });

  it("starts a run at 101 with two Turns and six darts", () => {
    const view = project(started());
    expect(view).toMatchObject({ phase: "playing", target: 101, remaining: 101, turnsLeft: 2, dartsLeft: 6, busted: false });
  });

  it("checks out on a double and climbs to the next target", () => {
    let state = strip(started(), ["T20", "S1", "D20"]);
    expect(project(state)).toMatchObject({ target: 101, remaining: 0, busted: false });
    state = takeout(state);
    expect(project(state)).toMatchObject({ target: 102, remaining: 102, turnsLeft: 2, dartsLeft: 6 });
  });

  it("treats Inner Bull as a finishing double", () => {
    const at50: GameState = { phase: "playing", target: 50, sealed: [], live: [], bustKey: null };
    let state = strip(at50, ["Bull"]);
    expect(project(state).remaining).toBe(0);
    state = takeout(state);
    expect(project(state).target).toBe(51);
  });

  it("busts a non-double that lands on zero, and an overshoot, then restarts on six darts", () => {
    const at25: GameState = { phase: "playing", target: 25, sealed: [], live: [], bustKey: null };
    expect(project(strip(at25, ["25"])).busted).toBe(true);

    let state = strip(started(), ["T20", "T20"]);
    expect(project(state)).toMatchObject({ busted: true, remaining: 101, target: 101, turnsLeft: 2, dartsLeft: 6 });
    state = takeout(state);
    state = strip(state, ["S20"]);
    expect(project(state)).toMatchObject({ busted: false, remaining: 81, target: 101 });
  });

  it("lets a Manual Override during the Turn undo a bust", () => {
    let state = strip(started(), ["T20", "T20"]);
    expect(project(state).busted).toBe(true);
    state = strip(state, ["T20", "S1"]);
    expect(project(state)).toMatchObject({ busted: false, remaining: 40, turnsLeft: 2, dartsLeft: 4 });
  });

  it("recalculates remaining after a Manual Override and checks out on the finishing double", () => {
    let state = strip(started(), ["T20", "S1", "S20"]);
    expect(project(state)).toMatchObject({ remaining: 20, busted: false });
    state = strip(state, ["T20", "S1", "D20"]);
    expect(project(state)).toMatchObject({ remaining: 0, busted: false, target: 101 });
    state = takeout(state);
    expect(project(state)).toMatchObject({ target: 102, remaining: 102, turnsLeft: 2, dartsLeft: 6 });
  });

  it("checks out when fixing an earlier dart while the last dart was already the finishing double", () => {
    let state = strip(started(), ["T20", "S20", "D20"]);
    expect(project(state).busted).toBe(true);
    state = strip(state, ["T20", "S1", "D20"]);
    expect(project(state)).toMatchObject({ remaining: 0, busted: false, target: 101 });
    state = takeout(state);
    expect(project(state).target).toBe(102);
  });

  it("uses a short Turn and retries the same target after two Turns", () => {
    let state = takeout(strip(started(), ["T20"]));
    expect(project(state)).toMatchObject({ remaining: 41, turnsLeft: 1, dartsLeft: 3, target: 101 });
    state = takeout(strip(state, ["S1", "S1", "S1"]));
    expect(project(state)).toMatchObject({ target: 101, remaining: 101, turnsLeft: 2, dartsLeft: 6, busted: false });
  });

  it("ends the run when 170 is cleared and does not advance", () => {
    const at170: GameState = { phase: "playing", target: 170, sealed: [], live: [], bustKey: null };
    let state = takeout(strip(at170, ["T20", "T20", "Bull"]));
    expect(project(state)).toMatchObject({ phase: "complete", target: 170, remaining: 0 });
    state = strip(state, ["S1"]);
    expect(project(state).phase).toBe("complete");
  });

  it("does not change the attempt while Autodarts is disconnected", () => {
    const live = strip(started(), ["T20"]);
    const paused = reduceGame(live, {
      type: "strip",
      connected: false,
      hits: [dart("T20", 0), dart("T20", 1)],
    });
    expect(project(paused)).toMatchObject({ remaining: 41, busted: false, dartsLeft: 5 });
  });

  it("skips the current 101 target for a fresh attempt at the next one", () => {
    const skipped = reduceGame(strip(started(), ["T20", "T20"]), { type: "skip" });
    expect(project(skipped)).toMatchObject({
      phase: "playing",
      target: 102,
      remaining: 102,
      turnsLeft: 2,
      dartsLeft: 6,
      busted: false,
    });
    expect(reduceGame(idleGame(), { type: "skip" })).toEqual(idleGame());
  });

  it("ends the run when the current target is already 170", () => {
    const at170: GameState = { phase: "playing", target: 170, sealed: [], live: [], bustKey: null };
    expect(project(reduceGame(at170, { type: "skip" })).phase).toBe("complete");
  });
});
