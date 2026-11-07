# 11: 101 session stats and abort

**What to build:** Light session chrome for Training Game 101: checkouts count and high target this run, plus an Abort control that ends the run cleanly back to free practice without inventing Hits. Keep one composition — no second dashboard.

**Blocked by:** 03 — Training Game 101

**Status:** ready-for-agent

- [x] During 101, show checkouts count and high target/score for the current run
- [x] Abort ends the run and returns to free practice
- [x] Stats reset on a new Start 101; layout stays a single throw composition

## Comments

While 101 is running, the score header shows the checkout count and the highest target reached, on the same line as the turns and darts. Abort returns to free practice and leaves the Hits that are already on the Board. Start 101 begins the counts again.

Checked in the browser against a local stand-in (port 3180 was not up). A new run showed 0 checkouts and high 101. Abort with a T20 still on the Board returned to 501 with that Hit kept and the remaining score at 441. Starting 101 again showed 0 checkouts and high 101. The shell is pointed back at `http://127.0.0.1:3180`.
