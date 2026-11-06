# 03: Training Game 101

**What to build:** Starting 101 from the shell runs the Training Game: remaining starts at 101; at most two Turns (six darts) to clear finishing on a double (Inner Bull counts); success advances to 102…170; 170 clear ends the run; failed clear retries the same target; bust restarts the attempt immediately with a fresh six darts at that target. Shell shows remaining score, Turns/darts left in the attempt, and current target. No checkout route hints. Pauses when Autodarts is disconnected. Uses live Hits and Manual Overrides from the shell.

**Blocked by:** 02 — Live Manual Override and Detection Accuracy

**Status:** ready-for-agent

- [x] Start 101 begins a run at target 101 with two Turns / six darts per attempt
- [x] Scoring, double-out (including Inner Bull), bust (= fresh six darts), and failed-clear retry match the glossary
- [x] Success climbs 102…170; clearing 170 completes the run
- [x] Remaining score, Turns/darts left, and current target are visible on the shell without extra dashboard chrome
- [x] No checkout hints; disconnect pauses the game; overrides during a Turn affect the scored attempt

## Comments

Start 101 shows the target, remaining score, and turns/darts left in the header. A double (Inner Bull included) that finishes the target advances 102…170; 170 cleared ends the run and later Hits are ignored. A bust shows a fresh six darts immediately, and a Manual Override of that Hit before takeout puts the earlier Turn back. Two Turns without a finish retry the same target. Disconnect freezes the score.

Checked in the browser against a local stand-in (port 3180 was not up), including a full climb to 170. Inner Bull is covered by the rules tests. A real Autodarts box still needs to accept the live-strip patch from ticket 2.
