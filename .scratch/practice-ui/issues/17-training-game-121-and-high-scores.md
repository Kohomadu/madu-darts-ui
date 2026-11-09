# 17: Training Game 121 and practice High Scores

**What to build:** Add Training Game **121** and a shared **High Score** record for every Training Game.

### 121 rules

1. Start remaining at **121**. The player has **four Turns** of three darts (**12 darts** total) to check out.
2. Score down normally across Turns; finish on a **double** or **Inner Bull**.
3. On a **bust** (leave 1, go below zero, or hit zero without a double): that Turn does **not** count — remaining returns to the score at the **start of that Turn** (darts spent on the busted Turn are still used up in the 12-dart budget).
4. **Checkout within 6 darts** (Turns 1–2): remaining target rises by **1**, and that new value becomes the **Homebase**. **Checkout on darts 7–12** (Turns 3–4): remaining target rises by **1**, but **Homebase does not change**. Show **current target/remaining** and **Homebase** separately on screen at all times during the run.
5. **Miss the checkout** (use all 12 darts without finishing): the target drops back to **Homebase**, never below **121**. Then a new 12-dart attempt starts at that target.

### High Score (every Training Game)

For **each** Training Game (**101**, **121**, and any future games), persist a **High Score** record: the highest meaningful score reached in that game, **when** it was reached (timestamp), and **with how many darts** that high was achieved. For **121**, the meaningful score is the highest target/remaining-start reached during climb (the “high number” in rule 5). For **101**, use the highest target cleared or reached consistently with existing 101 session stats. Show the High Score on the shell when that game is active (and/or on start). Update the record only when beaten.

**Blocked by:** 03 — Training Game 101 (shared shell, scoring, overlays)

**Status:** ready-for-agent

- [x] Start 121 begins at remaining 121 with four Turns / 12 darts; Homebase starts at 121
- [x] Bust restores remaining to the start of that Turn; Turn still consumes darts from the 12-dart budget
- [x] Checkout in ≤6 darts: target +1 and Homebase rises to that target; checkout in 7–12 darts: target +1 only
- [x] Missed 12-dart clear: target returns to Homebase (floor 121); new attempt begins
- [x] Current target/remaining and Homebase are shown separately
- [x] Each Training Game has a persisted High Score (value, when, darts); 121 and 101 both update and display it

## Comments

121 starts at remaining 121 with Homebase 121 and four Turns. A bust puts the remaining score back to the start of that Turn and still spends the Turn’s three darts. Checkout in the first two Turns raises the target and Homebase; checkout on Turn 3 or 4 raises only the target. Twelve darts without a finish returns the target to Homebase, never below 121. Next score stays a 101 control.

Each Training Game keeps its own High Score on this device: the score, when it was reached, and how many darts that checkout took. It updates only when the score is higher. 101 records the target reached after a checkout, the same number the run already calls its high.

Checked in the browser with port 3180 down. Start 121 showed Target 121, Remaining 121, Homebase 121, 4 turns, 12 darts, and High Score —. Start 101 showed the usual two Turns and six darts, plus High Score —. Busts, Homebase, and the saved record are covered by the scoring tests.
