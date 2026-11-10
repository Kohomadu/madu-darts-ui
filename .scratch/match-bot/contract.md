# Bot contract

The bot module exports the names below from `src/bot/`. Segment names are the ones `scoreSegment` already scores: `T20`, `S20`, `D20`, `Bull`, `25`, `Miss`.

`random` returns a number in `[0, 1)`. Tests pass their own function. Levels are 1 through 8.

## Aims and hit chances

| Level | Aim | Hit chance |
| ----- | --- | ---------- |
| 1 | 20 | 5% |
| 2 | 30 | 10% |
| 3 | 40 | 15% |
| 4 | 50 | 20% |
| 5 | 60 | 25% |
| 6 | 70 | 30% |
| 7 | 80 | 40% |
| 8 | 90 | 50% |

The ceiling is the aim plus 10. The match average is `(pointsScored / dartsThrown) × 3` once `dartsThrown` is at least 1. Above that ceiling, later scoring totals use the lowered mean below. Finish darts stay on the Checkout Route.

## Exports

```ts
type BotLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

type BotDart = {
  segmentName: string;
  coordsX: number;
  coordsY: number;
};

type BotTurnPlan = {
  /** Darts to show, in order. A bust or checkout stops the list. */
  darts: BotDart[];
  bust: boolean;
  checkout: boolean;
};

function botAim(level: BotLevel): number;
function botHitChance(level: BotLevel): number;

function drawScoringTotal(
  aim: number,
  overCeiling: boolean,
  darts: number,
  random: () => number,
): number;

function planBotTurn(input: {
  level: BotLevel;
  remaining: number;
  pointsScored: number;
  dartsThrown: number;
  random: () => number;
}): BotTurnPlan;

function planBotBull(input: {
  level: BotLevel;
  random: () => number;
}): BotDart;

function botShowTimes(shownDarts: number): {
  showAtMs: number[];
  takeoutAtMs: number;
};
```

## Where a dart sits

Coords use the same millimetre space as `pointMmToHit` in `src/board/geometry.ts`: `coordsX` and `coordsY` are millimetres divided by `COORDS_NORM_RADIUS_MM`. Passing those millimetres back through `pointMmToHit` returns the same `segmentName`.

- `Bull` is the origin.
- `25` sits in the outer bull.
- An inner single sits between the outer bull and the treble wire, on that wedge.
- A treble sits in the treble ring. A double sits in the double ring. An outer single sits between the treble and the double.
- `Miss` sits outside the double wire.

Distance to the origin: `Bull`, then `25`, then an inner single. Wedges and their neighbors come from the order already in `src/board/geometry.ts`, wrapping from the last wedge to the first.

## Scoring total

`darts` is 1, 2, or 3. Let `mean` be the aim, or the aim minus 10 when `overCeiling` is set. Scale that mean by `darts / 3`.

1. Draw `u`. When `u < 0.02`, draw another `u` and return `floor(u × 181)` clamped to `0..60 × darts`.
2. Otherwise add twelve draws of `random`. A sum of twelve uniform draws has mean 6 and spread 1. Return `round((sum - 6) × 36 × (darts / 3) + mean)`, clamped to `0..60 × darts`.

## One Turn

Start with three darts and the given remaining score.

When `cannotCheckout(remaining, dartsLeft)` is true, draw one scoring total for the darts still left and split it into that many segments. Walk them in order.

When the leave can finish, the aimed segment is the first step of `checkoutRoute(remaining, dartsLeft)`. Roll that dart, apply it, then look again with the new remaining and the darts still left.

Split a scoring total into exactly that many segments whose `scoreSegment` points sum to the total. Prefer higher segments, trebles before the outer bull before singles. A total of 0 is that many `Miss` darts. A total of 180 across three darts is `T20 T20 T20`. When the exact total cannot be built, use the closest lower total those darts can make.

After each dart, the same test as `scoreSegment` decides the Turn: below 0, a leave of 1, or 0 on a non-double is a bust; 0 on a double, including `Bull`, is a checkout. A bust or a checkout ends the list on that dart. The plan records the shown darts only. The match counts a bust as 3 darts and 0 points.

## Hit and miss

Draw once. Below the level’s hit chance, the dart is the aimed segment. The rest are misses.

A `Bull` attempt misses into the centre only. One third of those misses are `25`. Two thirds are an inner single of a wedge drawn uniformly from 1 to 20. An aimed `25` misses into the centre only. One third of those misses are `Bull`, one third stay on `25`, and one third are an inner single of a wedge drawn uniformly from 1 to 20.

Any other aimed segment misses on this split of the miss draw:

- 50% `Miss`
- 30% the single of the aimed number
- 10% the double of either neighboring wedge
- 10% the single of either neighboring wedge

A neighboring double that lands on 0 checks out. A dart past the remaining score busts the Turn.

## Clock

A full Turn is 10 seconds, in three equal slots of `10000 / 3` milliseconds. `botShowTimes(n)` for `n` in 1, 2, or 3 returns show times at slot 1 through slot `n`, and `takeoutAtMs` equal to the last of those times. A three-dart Turn is taken out at 10000. A checkout or a bust on an earlier dart uses that dart’s slot, so the Turn is shorter. The bull dart uses `botShowTimes(1)`.

The 10 seconds start when the player’s takeout is registered. When the bot throws first in a leg, they start as the leg starts.
