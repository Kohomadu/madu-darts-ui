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

function playing(target: number, game: GameState["game"] = "101"): GameState {
  return { phase: "playing", game, target, homebase: game === "121" ? 121 : target, turnsUsed: 0, sealed: [], live: [], bustKey: null };
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
    const at50 = playing(50);
    let state = strip(at50, ["Bull"]);
    expect(project(state).remaining).toBe(0);
    state = takeout(state);
    expect(project(state).target).toBe(51);
  });

  it("busts a non-double that lands on zero, and an overshoot, then restarts on six darts", () => {
    const at25 = playing(25);
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
    const at170 = playing(170);
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
    const at170 = playing(170);
    expect(project(reduceGame(at170, { type: "skip" })).phase).toBe("complete");
  });

  it("aborts the run back to free practice without adding Hits", () => {
    const live = strip(started(), ["T20", "T19"]);
    expect(reduceGame(live, { type: "abort" })).toEqual(idleGame());
    expect(reduceGame({ ...playing(170), phase: "complete" }, { type: "abort" })).toEqual(idleGame());
  });
});

function started121(): GameState {
  return reduceGame(idleGame(), { type: "start", game: "121" });
}

describe("121 scoring", () => {
  it("starts at 121 with Homebase 121 and twelve darts", () => {
    expect(project(started121())).toMatchObject({
      game: "121",
      target: 121,
      homebase: 121,
      remaining: 121,
      turnsLeft: 4,
      dartsLeft: 12,
      busted: false,
    });
  });

  it("restores the Turn's starting score on a bust and still spends that Turn", () => {
    let state = takeout(strip(started121(), ["T20"]));
    expect(project(state)).toMatchObject({ remaining: 61, turnsLeft: 3, dartsLeft: 9 });
    state = strip(state, ["T20", "T20"]);
    expect(project(state)).toMatchObject({ busted: true, remaining: 61, target: 121, turnsLeft: 2, dartsLeft: 6 });
    state = takeout(state);
    expect(project(state)).toMatchObject({ busted: false, remaining: 61, turnsLeft: 2, dartsLeft: 6 });
  });

  it("gives the busted Turn back when a Manual Override repairs it", () => {
    let state = strip(started121(), ["T20", "T20"]);
    expect(project(state)).toMatchObject({ busted: true, turnsLeft: 3, dartsLeft: 9 });
    state = strip(state, ["T20", "S1"]);
    expect(project(state)).toMatchObject({ busted: false, remaining: 60, turnsLeft: 4, dartsLeft: 10 });
  });

  it("raises Homebase when the checkout lands in the first two Turns", () => {
    const state = takeout(strip(started121(), ["T20", "T11", "D14"]));
    expect(project(state)).toMatchObject({ target: 122, homebase: 122, remaining: 122, turnsLeft: 4, dartsLeft: 12 });
  });

  it("raises the target without Homebase on Turn 3 or 4", () => {
    const late: GameState = { ...playing(40, "121"), turnsUsed: 2 };
    const state = takeout(strip(late, ["D20"]));
    expect(project(state)).toMatchObject({ target: 41, homebase: 121, remaining: 41, turnsLeft: 4, dartsLeft: 12 });
  });

  it("returns to Homebase after twelve darts without a checkout", () => {
    let state = started121();
    for (let turn = 0; turn < 4; turn += 1) state = takeout(strip(state, ["S1"]));
    expect(project(state)).toMatchObject({ target: 121, homebase: 121, remaining: 121, turnsLeft: 4, dartsLeft: 12 });
  });

  it("falls back to a raised Homebase after a miss", () => {
    let state = takeout(strip(started121(), ["T20", "T11", "D14"]));
    for (let turn = 0; turn < 4; turn += 1) state = takeout(strip(state, ["S1"]));
    expect(project(state)).toMatchObject({ target: 122, homebase: 122, remaining: 122, dartsLeft: 12 });
  });

  it("spends the fourth Turn on a bust, then starts again at Homebase", () => {
    let state = started121();
    for (let turn = 0; turn < 3; turn += 1) state = takeout(strip(state, ["S1"]));
    state = strip(state, ["T20", "T20"]);
    expect(project(state)).toMatchObject({ busted: true, turnsLeft: 0, dartsLeft: 0, target: 121 });
    state = takeout(state);
    expect(project(state)).toMatchObject({ target: 121, homebase: 121, remaining: 121, busted: false, dartsLeft: 12 });
  });

  it("does not advance on Next score", () => {
    expect(reduceGame(started121(), { type: "skip" })).toEqual(started121());
  });
});
