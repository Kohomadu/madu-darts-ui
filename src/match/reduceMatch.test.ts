import { describe, expect, it } from "vitest";
import type { DartSnap } from "../game/rules";
import { DEFAULT_MATCH_SETUP } from "./setupStorage";
import { projectMatch, reduceMatch, startMatch } from "./reduceMatch";

function darts(...names: string[]): DartSnap[] {
  return names.map((segmentName, index) => ({
    segmentName,
    coordsX: index * 0.1,
    coordsY: 0,
  }));
}

function humanSetup(overrides: Partial<typeof DEFAULT_MATCH_SETUP> = {}) {
  return { ...DEFAULT_MATCH_SETUP, opponentKind: "human" as const, opponentName: "Guest", ...overrides };
}

function seal(state: ReturnType<typeof startMatch>, names: string[]) {
  const hits = darts(...names);
  return reduceMatch(reduceMatch(state, { type: "strip", hits, connected: true }), {
    type: "seal",
    hits,
  });
}

describe("startMatch", () => {
  it("opens bull-off by default and leg 1 when starter is chosen", () => {
    const bull = startMatch(humanSetup(), "Madu");
    expect(bull.phase).toBe("bull-off");
    expect(bull.bullOff?.thrower).toBe("you");

    const leg = startMatch(humanSetup({ starter: "opponent" }), "Madu");
    expect(leg.phase).toBe("leg");
    expect(leg.leg?.thrower).toBe("opponent");
    expect(projectMatch(leg).remaining.you).toBe(501);
  });
});

describe("bull-off takeout", () => {
  it("picks the closer dart then opens leg 1 at 501", () => {
    let state = startMatch(humanSetup(), "Madu");
    state = reduceMatch(state, {
      type: "seal",
      hits: [{ segmentName: "Bull", coordsX: 0.01, coordsY: 0 }],
    });
    expect(state.bullOff?.thrower).toBe("opponent");
    state = reduceMatch(state, {
      type: "seal",
      hits: [{ segmentName: "25", coordsX: 0.2, coordsY: 0 }],
    });
    expect(state.phase).toBe("leg");
    expect(state.leg?.thrower).toBe("you");
    expect(state.leg?.remaining).toEqual({ you: 501, opponent: 501 });
  });

  it("retthrows a tie with the order swapped", () => {
    let state = startMatch(humanSetup(), "Madu");
    state = reduceMatch(state, {
      type: "seal",
      hits: [{ segmentName: "S20", coordsX: 0.4, coordsY: 0 }],
    });
    state = reduceMatch(state, {
      type: "seal",
      hits: [{ segmentName: "S3", coordsX: 0.4, coordsY: 0 }],
    });
    expect(state.phase).toBe("bull-off");
    expect(state.bullOff?.order).toEqual(["opponent", "you"]);
    expect(state.bullOff?.thrower).toBe("opponent");
  });
});

describe("leg play", () => {
  it("busts back to the start of the Turn and seals as 3 darts 0 points", () => {
    let state = startMatch(humanSetup({ starter: "you", legsBestOf: 1 }), "Madu");
    state = reduceMatch(state, {
      type: "strip",
      hits: darts("T20", "T20", "T20"),
      connected: true,
    });
    // Force a bust from 40 with a non-double.
    state = startMatch(humanSetup({ starter: "you", legsBestOf: 1 }), "Madu");
    state = {
      ...state,
      leg: state.leg
        ? {
            ...state.leg,
            remaining: { you: 40, opponent: 501 },
            turnStartRemaining: 40,
          }
        : null,
    };
    const hits = darts("T20");
    state = reduceMatch(state, { type: "strip", hits, connected: true });
    expect(projectMatch(state).busted).toBe(true);
    expect(state.leg?.remaining.you).toBe(40);
    state = reduceMatch(state, { type: "seal", hits });
    expect(state.you.pointsScored).toBe(0);
    expect(state.you.dartsThrown).toBe(3);
    expect(state.leg?.thrower).toBe("opponent");
  });

  it("starts the next leg at 501 with the other player after a winning takeout", () => {
    let state = startMatch(humanSetup({ starter: "you", legsBestOf: 5 }), "Madu");
    state = {
      ...state,
      leg: state.leg
        ? {
            ...state.leg,
            remaining: { you: 40, opponent: 501 },
            turnStartRemaining: 40,
          }
        : null,
    };
    state = seal(state, ["D20"]);
    expect(state.phase).toBe("leg");
    expect(state.scores.legs.you).toBe(1);
    expect(state.leg?.remaining).toEqual({ you: 501, opponent: 501 });
    expect(state.leg?.thrower).toBe("opponent");
  });

  it("opens results on the match-winning takeout", () => {
    let state = startMatch(humanSetup({ starter: "you", legsBestOf: 1 }), "Madu");
    state = {
      ...state,
      leg: state.leg
        ? {
            ...state.leg,
            remaining: { you: 40, opponent: 501 },
            turnStartRemaining: 40,
          }
        : null,
    };
    state = seal(state, ["D20"]);
    expect(state.phase).toBe("results");
    expect(state.results?.winner).toBe("you");
  });

  it("undoes the last sealed Turn including a leg win", () => {
    let state = startMatch(humanSetup({ starter: "you", legsBestOf: 5 }), "Madu");
    state = {
      ...state,
      leg: state.leg
        ? {
            ...state.leg,
            remaining: { you: 40, opponent: 501 },
            turnStartRemaining: 40,
          }
        : null,
    };
    state = seal(state, ["D20"]);
    expect(state.scores.legs.you).toBe(1);
    state = reduceMatch(state, { type: "undo" });
    expect(state.scores.legs.you).toBe(0);
    expect(state.leg?.thrower).toBe("you");
    expect(state.leg?.remaining.you).toBe(40);
  });
});
