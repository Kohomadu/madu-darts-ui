import { describe, expect, it } from "vitest";
import { COORDS_NORM_RADIUS_MM, pointMmToHit } from "../board/geometry";
import { scoreSegment } from "../game/rules";
import {
  botAim,
  botHitChance,
  botShowTimes,
  drawScoringTotal,
  planBotBull,
  planBotTurn,
  type BotDart,
  type BotLevel,
} from "./index";

function sequence(values: number[]): () => number {
  let index = 0;
  return () => {
    const value = values[index] ?? 0;
    index += 1;
    return value;
  };
}

function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function steadyDraws(first: number, draw: number, count = 12): () => number {
  return sequence([first, ...Array(count).fill(draw)]);
}

function names(darts: BotDart[]): string[] {
  return darts.map((dart) => dart.segmentName);
}

function onSegment(dart: BotDart) {
  return pointMmToHit(dart.coordsX * COORDS_NORM_RADIUS_MM, dart.coordsY * COORDS_NORM_RADIUS_MM);
}

function turn(remaining: number, random: () => number, level: BotLevel = 8, pointsScored = 0, dartsThrown = 0) {
  return planBotTurn({ level, remaining, pointsScored, dartsThrown, random });
}

describe("bot aims", () => {
  it("matches the level table from 1 through 8", () => {
    expect(botAim(1)).toBe(20);
    expect(botHitChance(1)).toBe(0.05);
    expect(botAim(2)).toBe(30);
    expect(botHitChance(2)).toBe(0.1);
    expect(botAim(3)).toBe(40);
    expect(botHitChance(3)).toBe(0.15);
    expect(botAim(4)).toBe(50);
    expect(botHitChance(4)).toBe(0.2);
    expect(botAim(5)).toBe(60);
    expect(botHitChance(5)).toBe(0.25);
    expect(botAim(6)).toBe(70);
    expect(botHitChance(6)).toBe(0.3);
    expect(botAim(7)).toBe(80);
    expect(botHitChance(7)).toBe(0.4);
    expect(botAim(8)).toBe(90);
    expect(botHitChance(8)).toBe(0.5);
  });
});

describe("scoring total", () => {
  it("draws an open total on the 2% branch and clamps it to the darts in hand", () => {
    expect(drawScoringTotal(50, false, 3, sequence([0.01, 0.5]))).toBe(90);
    expect(drawScoringTotal(50, false, 1, sequence([0.01, 0.999]))).toBe(60);
    expect(drawScoringTotal(50, false, 3, sequence([0.01, 0]))).toBe(0);
  });

  it("centres twelve uniform draws on the aim, and drops the aim by 10 above the ceiling before scaling", () => {
    expect(drawScoringTotal(50, false, 3, steadyDraws(0.5, 0.5))).toBe(50);
    expect(drawScoringTotal(50, true, 3, steadyDraws(0.5, 0.5))).toBe(40);
    expect(drawScoringTotal(50, false, 3, steadyDraws(0.5, 0.75))).toBe(158);
    expect(drawScoringTotal(50, true, 3, steadyDraws(0.5, 0.75))).toBe(148);
    expect(drawScoringTotal(50, false, 1, steadyDraws(0.5, 0.5))).toBe(17);
    expect(drawScoringTotal(50, true, 1, steadyDraws(0.5, 0.5))).toBe(13);
    expect(drawScoringTotal(50, false, 3, steadyDraws(0.5, 0))).toBe(0);
  });

  it("uses the lowered mean only once the match average is above the aim plus 10", () => {
    const atCeiling = turn(501, steadyDraws(0.5, 0.5), 4, 60, 3);
    const above = turn(501, steadyDraws(0.5, 0.5), 4, 61, 3);
    const noDarts = turn(501, steadyDraws(0.5, 0.5), 4, 0, 0);
    expect(atCeiling.darts.reduce((sum, dart) => sum + scoreSegment(dart.segmentName).points, 0)).toBe(50);
    expect(above.darts.reduce((sum, dart) => sum + scoreSegment(dart.segmentName).points, 0)).toBe(40);
    expect(noDarts.darts.reduce((sum, dart) => sum + scoreSegment(dart.segmentName).points, 0)).toBe(50);
  });
});

describe("scoring Turns", () => {
  it("keeps a level-4 sample nearer 50 than a level-8 sample, which reaches 140 more often", () => {
    function sample(level: BotLevel): number[] {
      const random = mulberry32(20261110);
      const totals: number[] = [];
      for (let index = 0; index < 500; index += 1) {
        const plan = turn(501, random, level);
        totals.push(plan.darts.reduce((sum, dart) => sum + scoreSegment(dart.segmentName).points, 0));
      }
      return totals;
    }

    const level4 = sample(4);
    const level8 = sample(8);
    const mean = (totals: number[]) => totals.reduce((sum, total) => sum + total, 0) / totals.length;
    const mean4 = mean(level4);
    const mean8 = mean(level8);
    expect(Math.abs(mean4 - 50)).toBeLessThan(Math.abs(mean8 - 50));
    expect(mean4).toBeGreaterThan(40);
    expect(mean4).toBeLessThan(65);
    expect(mean8).toBeGreaterThan(75);
    expect(mean8).toBeLessThan(105);
    const highs = (totals: number[]) => totals.filter((total) => total >= 140).length;
    expect(highs(level8)).toBeGreaterThan(highs(level4));
  });

  it("splits 180 into treble 20s, 0 into misses, and a total that cannot be built into the closest lower total", () => {
    const oneEighty = turn(501, sequence([0.01, 0.999]), 4);
    const nothing = turn(501, sequence([0.01, 0]), 4);
    const oneSeventyNine = turn(501, sequence([0.01, 0.99]), 4);
    expect(names(oneEighty.darts)).toEqual(["T20", "T20", "T20"]);
    expect(names(nothing.darts)).toEqual(["Miss", "Miss", "Miss"]);
    expect(names(oneSeventyNine.darts)).toEqual(["T20", "T20", "T19"]);
    for (const dart of [...oneEighty.darts, ...nothing.darts, ...oneSeventyNine.darts]) {
      expect(onSegment(dart)?.segmentName).toBe(dart.segmentName);
    }
  });
});

describe("Checkout Route", () => {
  it("throws the route one dart at a time and checks out on the finishing double", () => {
    expect(names(turn(170, () => 0).darts)).toEqual(["T20", "T20", "Bull"]);
    expect(turn(170, () => 0).checkout).toBe(true);
    expect(names(turn(101, () => 0).darts)).toEqual(["T20", "S9", "D16"]);
    expect(names(turn(100, () => 0).darts)).toEqual(["T20", "D20"]);
    expect(turn(100, () => 0).checkout).toBe(true);
    expect(turn(100, () => 0).darts).toHaveLength(2);
    expect(names(turn(82, () => 0).darts)).toEqual(["Bull", "D16"]);
    expect(names(turn(61, () => 0).darts)).toEqual(["25", "D18"]);
    const forty = turn(40, () => 0, 1);
    expect(names(forty.darts)).toEqual(["D20"]);
    expect(forty.checkout).toBe(true);
    expect(forty.bust).toBe(false);
    for (const dart of forty.darts) expect(onSegment(dart)?.segmentName).toBe("D20");
  });

  it("stays on the route when the match average is above the ceiling", () => {
    const plan = turn(40, () => 0, 4, 100, 3);
    expect(names(plan.darts)).toEqual(["D20"]);
    expect(plan.checkout).toBe(true);
  });

  it("misses a numbered segment on the 50 / 30 / 10 / 10 mix, wrapping neighbors past 20", () => {
    const miss = (values: number[], remaining = 40) => names(turn(remaining, sequence(values)).darts)[0];
    expect(miss([0.99, 0.1])).toBe("Miss");
    expect(miss([0.99, 0.49])).toBe("Miss");
    expect(miss([0.99, 0.5])).toBe("S20");
    expect(miss([0.99, 0.79])).toBe("S20");
    expect(miss([0.99, 0.8, 0])).toBe("D5");
    expect(miss([0.99, 0.89, 0.5])).toBe("D1");
    expect(miss([0.99, 0.9, 0])).toBe("S5");
    expect(miss([0.99, 0.99, 0.5])).toBe("S1");
    expect(miss([0.99, 0.85, 0], 10)).toBe("D12");
    expect(miss([0.99, 0.85, 0.5], 10)).toBe("D20");
    expect(onSegment(turn(40, sequence([0.99, 0.1])).darts[0])?.segmentName).toBe("Miss");
  });

  it("keeps an outer-bull miss on Bull, 25, or an inner single", () => {
    const aimed = (values: number[]) => turn(61, sequence(values)).darts[0];
    const bull = aimed([0.99, 0]);
    const stay = aimed([0.99, 1 / 3]);
    const inner = aimed([0.99, 2 / 3, 0]);
    expect(bull.segmentName).toBe("Bull");
    expect(onSegment(bull)?.segmentName).toBe("Bull");
    expect(stay.segmentName).toBe("25");
    expect(onSegment(stay)?.segmentName).toBe("25");
    expect(inner.segmentName).toBe("S1");
    expect(onSegment(inner)?.bed).toBe("SingleInner");
  });

  it("hits on a draw below the hit chance and misses on the chance itself", () => {
    expect(names(turn(40, sequence([0.199]), 4).darts)).toEqual(["D20"]);
    expect(names(turn(40, sequence([0.2, 0]), 4).darts)[0]).toBe("Miss");
  });
});

describe("bull dart", () => {
  it("puts Bull on the origin, 25 in the outer bull, and a miss single inside the treble", () => {
    const bull = planBotBull({ level: 8, random: () => 0 });
    const outer = planBotBull({ level: 8, random: sequence([0.99, 0]) });
    const inner = planBotBull({ level: 8, random: sequence([0.99, 0.34, 0]) });
    const radius = (dart: BotDart) => Math.hypot(dart.coordsX, dart.coordsY);
    expect(onSegment(bull)?.segmentName).toBe("Bull");
    expect(onSegment(outer)?.segmentName).toBe("25");
    expect(onSegment(inner)?.bed).toBe("SingleInner");
    expect(radius(bull)).toBeLessThan(radius(outer));
    expect(radius(outer)).toBeLessThan(radius(inner));
  });

  it("lands forced misses about one third on 25 and two thirds on an inner single", () => {
    const random = mulberry32(7);
    let misses = 0;
    let outer = 0;
    const wedges = new Set<number>();
    for (let index = 0; index < 3000; index += 1) {
      const dart = planBotBull({ level: 1, random });
      const hit = onSegment(dart);
      expect(hit?.segmentName).toBe(dart.segmentName);
      if (dart.segmentName === "Bull") {
        expect(hit?.bed).toBe("DoubleBull");
        continue;
      }
      misses += 1;
      if (dart.segmentName === "25") {
        outer += 1;
        expect(hit?.bed).toBe("SingleBull");
        continue;
      }
      expect(hit?.bed).toBe("SingleInner");
      wedges.add(Number(dart.segmentName.slice(1)));
    }
    expect(outer / misses).toBeGreaterThan(0.28);
    expect(outer / misses).toBeLessThan(0.38);
    expect(wedges.size).toBe(20);
  });
});

describe("bust and checkout", () => {
  it("stops the shown list on the dart that busts or checks out", () => {
    const checkout = turn(40, () => 0, 1);
    expect(checkout.darts).toHaveLength(1);
    expect(checkout.checkout).toBe(true);

    const leaveOne = turn(2, sequence([0.99, 0.6]));
    expect(names(leaveOne.darts)).toEqual(["S1"]);
    expect(leaveOne.bust).toBe(true);
    expect(leaveOne.checkout).toBe(false);

    const past = turn(2, sequence([0.99, 0.85, 0]));
    expect(names(past.darts)).toEqual(["D20"]);
    expect(past.bust).toBe(true);

    const visit = turn(82, () => 0);
    expect(names(visit.darts)).toEqual(["Bull", "D16"]);
    expect(visit.checkout).toBe(true);
    expect(visit.darts).toHaveLength(2);

    const exact = turn(180, sequence([0.01, 0.999]), 4);
    expect(names(exact.darts)).toEqual(["T20", "T20", "T20"]);
    expect(exact.bust).toBe(true);
    expect(exact.checkout).toBe(false);
  });
});

describe("turn clock", () => {
  it("shows each dart on its slot and takes the turn out on the last one", () => {
    expect(botShowTimes(3)).toEqual({
      showAtMs: [10000 / 3, 20000 / 3, 10000],
      takeoutAtMs: 10000,
    });
    expect(botShowTimes(1)).toEqual({
      showAtMs: [10000 / 3],
      takeoutAtMs: 10000 / 3,
    });
    expect(botShowTimes(2)).toEqual({
      showAtMs: [10000 / 3, 20000 / 3],
      takeoutAtMs: 20000 / 3,
    });
  });
});
