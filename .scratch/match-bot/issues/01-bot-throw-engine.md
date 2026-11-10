# Bot 01: Throw engine and turn clock

**Track:** bot
**Agent:** bot

**What to build:** The pure bot module in `src/bot/`, implementing `.scratch/match-bot/contract.md`. No screen, no match flow, and no edits outside `src/bot/` and its tests.

Read `src/board/geometry.ts` and `src/game/checkout.ts`. Leave both files as they are. Call `cannotCheckout`, `checkoutRoute`, `scoreSegment`, `pointMmToHit`, `RADII`, and `COORDS_NORM_RADIUS_MM`.

**Blocked by:** none

**Status:** done

- [x] `botAim` and `botHitChance` match the contract table for levels 1 through 8
- [x] `drawScoringTotal` follows the contract draw, including the 2% open total and the lowered mean above the ceiling
- [x] A seeded sample of level-4 scoring Turns sits nearer 50 than a level-8 sample, and a level-8 sample produces more totals of 140 or more
- [x] A total of 180 across three darts is `T20 T20 T20`. A total of 0 is `Miss` darts. Every planned dart’s millimetres come back from `pointMmToHit` as that segment
- [x] `Bull` is closer to the origin than `25`, and `25` is closer than an inner single
- [x] A finishable leave follows `checkoutRoute` one dart at a time. A forced hit on 40 with three darts is `D20` and checks out. A forced miss uses the 50 / 30 / 10 / 10 mix
- [x] A bull attempt is only `Bull`, `25`, or an inner single. Forced misses land about one third on `25` and two thirds on an inner single
- [x] A bust or a checkout stops the shown list on that dart. Neighbors wrap with the wedge order in `src/board/geometry.ts`
- [x] `botShowTimes(3)` takes out at 10000. `botShowTimes(1)` takes out at `10000 / 3`. Show times fall on those slots in order

## Comments

The throw engine lives in `src/bot/` and is covered by `src/bot/index.test.ts`. `src/board/geometry.ts` and `src/game/checkout.ts` are unchanged. The match screen does not call this module yet.

Aims are 20 through 90 and hit chances are 5% through 50%, with level 7 at 40% and level 8 at 50%. A scoring total uses the 2% open draw, otherwise twelve uniform draws scaled by the darts in hand. The mean drops by 10 only when the match average is above the aim plus 10. Finish darts stay on the Checkout Route and are looked up again after each dart.

180 is T20 T20 T20. 179 cannot be built, so it becomes T20 T20 T19. 0 is three Miss darts. A non-double that lands on 0 busts, and the busting dart is the last one shown. Neighbors of 20 are 5 and 1; neighbors of 5 are 12 and 20.

A Bull miss stays in the centre: one third 25, two thirds an inner single. An aimed 25, such as the first dart of 61, misses into the centre in thirds: Bull, 25, or an inner single.
