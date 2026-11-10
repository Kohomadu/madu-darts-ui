import { describe, expect, it } from "vitest";
import { botShowTimes } from "../bot";
import { DEFAULT_MATCH_SETUP } from "./setupStorage";
import { dartsRevealed, isBotThrowing, planCurrentBotVisit } from "./botClock";
import { reduceMatch, startMatch } from "./reduceMatch";

describe("bot visit clock", () => {
  it("reveals darts on the contract slots and takes out at takeoutAtMs", () => {
    const three = botShowTimes(3);
    expect(three.takeoutAtMs).toBe(10000);
    expect(dartsRevealed(three.showAtMs, 0)).toBe(0);
    expect(dartsRevealed(three.showAtMs, three.showAtMs[0])).toBe(1);
    expect(dartsRevealed(three.showAtMs, three.showAtMs[1])).toBe(2);
    expect(dartsRevealed(three.showAtMs, three.takeoutAtMs)).toBe(3);

    const one = botShowTimes(1);
    expect(one.takeoutAtMs).toBeCloseTo(10000 / 3);
    expect(dartsRevealed(one.showAtMs, one.takeoutAtMs)).toBe(1);
  });

  it("plans one bull dart for the bot seat", () => {
    const state = startMatch(
      { ...DEFAULT_MATCH_SETUP, opponentKind: "bot", opponentName: "Bot", starter: "bull-off" },
      "Madu",
    );
    const waiting = {
      ...state,
      bullOff: state.bullOff ? { ...state.bullOff, thrower: "opponent" as const, youDart: { segmentName: "S20", coordsX: 0.4, coordsY: 0 } } : null,
    };
    const visit = planCurrentBotVisit(waiting, () => 0);
    expect(visit?.darts).toHaveLength(1);
    expect(visit?.takeoutAtMs).toBeCloseTo(10000 / 3);
    expect(isBotThrowing(state)).toBe(false);
    expect(isBotThrowing(waiting)).toBe(true);
  });

  it("scores a bot bust as 3 darts and 0, and a one-dart checkout on the results", () => {
    let state = startMatch(
      { ...DEFAULT_MATCH_SETUP, opponentKind: "bot", opponentName: "Bot", starter: "opponent", legsBestOf: 1 },
      "Madu",
    );
    state = {
      ...state,
      leg: state.leg
        ? { ...state.leg, remaining: { you: 501, opponent: 32 }, turnStartRemaining: 32 }
        : null,
    };
    const busted = reduceMatch(state, {
      type: "seal",
      hits: [{ segmentName: "T20", coordsX: 0.2, coordsY: 0 }],
    });
    expect(busted.opponent.pointsScored).toBe(0);
    expect(busted.opponent.dartsThrown).toBe(3);
    expect(busted.you.dartsThrown).toBe(0);

    state = startMatch(
      { ...DEFAULT_MATCH_SETUP, opponentKind: "bot", opponentName: "Bot", starter: "opponent", legsBestOf: 1 },
      "Madu",
    );
    state = {
      ...state,
      leg: state.leg
        ? { ...state.leg, remaining: { you: 501, opponent: 40 }, turnStartRemaining: 40 }
        : null,
    };
    const finish = planCurrentBotVisit(state, () => 0);
    expect(finish?.checkout).toBe(true);
    expect(finish?.darts[0]?.segmentName).toBe("D20");
    expect(finish?.takeoutAtMs).toBeCloseTo(10000 / 3);
    const scored = reduceMatch(state, { type: "seal", hits: finish!.darts });
    expect(scored.phase).toBe("results");
    expect(scored.results?.winner).toBe("opponent");
    expect(scored.opponent.dartsThrown).toBe(1);
    expect(scored.opponent.pointsScored).toBe(40);
    expect(scored.opponent.checkoutHits).toBe(1);
  });
});
