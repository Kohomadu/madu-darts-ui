# 13: Next score and smarter Checkout Routes

**What to build:** Two practice QoL behaviours. (1) A **Next score** button that resets the Autodarts board (`POST /api/reset`) and advances **101** to the next target (skip/abandon the current score and start a fresh attempt on target+1, or end the run if already on 170). Clears the live strip in the UI as the board reset does. (2) Checkout Route selection prefers finishes that **do not use Inner Bull** when another legal route fits in the remaining darts — e.g. remaining **50** with more than one dart left suggests **S18 · D16** (or equivalent), not **Bull**; only suggest Bull when it is the only / necessary finish (e.g. one dart left on 50, or no non-Bull route exists).

**Blocked by:** 07 — Reset board control; 05 — Autodarts Play layout and Checkout Routes

**Status:** ready-for-agent

- [x] Next score resets Autodarts and advances 101 to the next target (fresh attempt); unavailable or completes cleanly at 170
- [x] Checkout Routes avoid Inner Bull when a non-Bull finish fits in the open dart count
- [x] Remaining 50 with ≥2 darts open suggests a non-Bull two-dart route (e.g. S18 D16), not Bull alone
- [x] Bull still appears when it is the only sensible finish (one dart on 50, or no alternative)

## Comments

Next score is enabled while 101 is in progress and the shell is connected. It asks the box to reset, then starts a fresh attempt at the next target. On 170 that ends the run. A failed reset leaves the target and the Hits where they were and shows the failure. The strip stays empty until the stream itself is empty, so the old Hits are not scored against the new target.

Checkout Routes use a finish without Inner Bull when one fits in the open darts. Remaining 50 with two or three darts is S18, D16. One dart on 50 is still Bull. 170 stays T20, T20, Bull. 101 with three darts is T20, S17, D12. 121 stays T20, 25, D18.

Checked in the browser against a local stand-in (port 3180 was not up). Next score moved 101 to 102 with a fresh six darts, and a later Hit scored on 102. A refused reset kept target 102 and put the Hit back. The 101 route showed T20, S17, D12. The shell is pointed back at `http://127.0.0.1:3180`.
