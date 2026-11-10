# UI 02: Human 501 match

**Track:** ui
**Agent:** ui

**What to build:** A local 501 match for two people on one board. Play on the chooser opens setup, or resumes a parked match. This ticket starts only when the opponent is a typed human name.

Leave `.scratch/match-bot/` and `src/bot/` alone. The bot row is stored here and started by UI 03.

### Setup

Remember the last setup on the device.

- 501, straight in, double out. `Bull` finishes.
- Sets off: best of 5 legs, first to 3.
- Sets on: best of 3 sets, first to 2. Each set is best of 5 legs, first to 3. A new set starts the legs at 0.
- The length choices are 1, 3, 5, 7, 9, 11, 13, and 15. Best of N is first to `(N + 1) / 2`.
- You are the saved profile, shown on the left. The opponent is a typed name, default Guest, shown on the right.
- Starter: You, Opponent, or Bull-off. Bull-off is the default.
- The opponent seat can be a bot with a level from 1 to 8, default 4. Store that choice. Start the match when the seat is a human name.

A parked match makes Play open that match. Starting a new one asks before discarding the parked match.

### Bull-off

WDF: the dart closer to the centre starts. A tie throws again, and the throwing order swaps. You throw the first dart. The screen shows the two names, who is to throw, and the board. Scores and the three stats appear when the first leg starts. One bull-off per match. Later legs alternate the starter, including the first leg of a new set.

### The leg

A bust is a score below 0, a leave of 1, or 0 on a non-double. The remaining score returns to the start of that Turn. The Turn counts as 3 darts and 0 points.

Above each score, with the name: legs won, and sets won when sets are on. Under each score: match average, First 9, and checkout percentage. An empty figure is an em dash.

- Match average is `(points scored ÷ darts thrown) × 3`, updated when the Turn is taken out.
- First 9 is that same average for the first nine darts of every leg, kept as one match figure. A bust inside those nine counts as 3 darts and 0. Before nine darts exist, show the darts so far.
- Checkout percentage is finishing darts divided by darts that had a double to hit. A dart counts when, before it, the remaining is an even number from 2 to 40, or 50 is left on the last dart of the Turn, or the dart lands in `25` or `Bull`. The finishing dart is the only hit. A setup dart is left out. A bust from a one-dart double counts as 3 misses. A bust from any other score adds no misses.

The Checkout Route for the player at the board fills the open dart slots. Tapping your own dart applies a Manual Override. The buttons are Undo, Reset board, and Home. Undo rewinds the last sealed Turn, including the Turn that won a leg. Home parks the match and returns to the chooser.

Bull-off and the match keep the practice status strip and the same Hit, Checkout, and Try again cues. Mute silences the cues and leaves the overlays up.

Portrait: the two scores side by side, stats under each, a smaller board, buttons along the bottom. Landscape: your score on the left, the opponent on the right, the board between them, buttons along the bottom. Orientation switches on its own.

Taking out a winning double starts the next leg at 501 and the other player throws. Taking out the dart that wins the match opens the results.

### Results

Name the winner. For each player show sets, legs, match average, First 9, checkout hits and attempts, highest checkout, total darts, best Turn, and Tons. Tons counts Turns from 100 to 180. Under it, 100+ is 100 to 139, 140+ is 140 to 170, and 171+ is 171 to 180. A bust scores 0 and stays out of Tons.

Rematch starts the same match, including a new bull-off when that was the choice. Close returns to setup with this match filled in, and drops the result. Home returns to the chooser. The next Play opens that same setup until someone changes it.

**Blocked by:** 01

**Status:** resolved

- [x] Play opens the remembered setup. Defaults are 501, best of 5 legs, sets off, Bull-off, and Guest. The bot level is stored and a human name is what starts the match
- [x] Bull-off picks the closer dart, retthrows a tie with the order swapped, then opens leg 1 at 501 with the three stats
- [x] Legs and sets sit with the name. Average, First 9, and checkout percentage sit under the score and follow the rules above, with an em dash until there is a figure
- [x] The route fills the open slots. Undo, Reset board, and Home behave as written. A winning takeout starts the next leg. The match-winning takeout opens results
- [x] Portrait and landscape match the layouts above and switch when the device rotates
- [x] Rematch starts the same match. Close returns to the filled-in setup. Home during a match parks it, and Play resumes it

## Answer

`src/match/` holds setup storage, bull-off, stats, reduceMatch, parked match, useMatch, setup/shell/results screens. Play opens a parked match when one exists, otherwise the remembered setup (human name starts; bot level stored for UI 03). Home parks; Rematch/Close/results follow the ticket.
