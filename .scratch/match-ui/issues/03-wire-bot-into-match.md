# UI 03: Wire the bot into the match

**Track:** ui
**Agent:** ui

**What to build:** Start a match against the bot seat, using the finished module from `.scratch/match-bot/contract.md`. The human match from UI 02 stays as it is for two human names.

The bot’s Turn calls `planBotTurn`. The bull dart calls `planBotBull`. Show each dart at the times from `botShowTimes`, on its segment, then register takeout at `takeoutAtMs`. A full Turn is the stretch from the human takeout being registered until the bot takeout is registered. When the bot throws first, the clock starts as the leg starts.

Board Hits while the bot is throwing stay off the score. The human Turn starts when the bot takeout is registered. Manual Override changes a dart the human threw. The bot’s darts stay as planned.

Bull-off distance is the distance of each dart’s coordinates from the origin. The closer dart starts. An equal distance retthrows with the order swapped.

The bot’s darts feed the same average, First 9, checkout percentage, Tons, and result figures as a human Turn. A bust from the plan counts as 3 darts and 0 points.

**Blocked by:** 02, .scratch/match-bot/issues/01-bot-throw-engine.md

**Status:** resolved

- [x] Choosing the bot and a level, then Start, plays a 501 match against that bot
- [x] Bot darts appear on their segments at the contract times, and takeout is registered at `takeoutAtMs`
- [x] Board Hits during the bot’s Turn stay off the score. Override changes only the human’s darts
- [x] The bot’s bull dart uses one clock slot. The closer dart starts, and a tie swaps the order
- [x] The bot’s scored Turns show up in both players’ stats and on the results page

## Answer

Setup Start accepts the bot seat and level. `useMatch` plans `planBotTurn` / `planBotBull`, reveals darts on `botShowTimes`, and seals at `takeoutAtMs`. Live board Hits are ignored during that visit, and override stays on human darts. Bot visits use the same stats and results path; a planned bust is 3 darts and 0 points.
