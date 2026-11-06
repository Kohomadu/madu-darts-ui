# 05: Autodarts Play layout and Checkout Routes

**What to build:** Recompose the practice UI to match the Autodarts Play portrait layout used as the visual north star (reference photo in chat): top score header (large remaining score, level/target, Turn dart pips, light secondary stats), a middle row of **three Hit boxes**, and a large Board below with minimal bottom chrome (settings / connect). In those three Hit boxes, **always show a Checkout Route** for the current remaining score whenever one exists (e.g. T20 · 25 · D18 for 121) — not an empty strip waiting for Hits. As Hits land, filled boxes show the actual Segment; remaining empty boxes keep suggesting the updated route for darts still to throw. During **101**, remaining and target drive the route; in free practice, route from live remaining if the shell tracks a practice remaining, otherwise from a sensible default remaining display tied to the open Turn. Manual Override still works on landed Hit boxes. Detection Accuracy and connection status stay visible without breaking the one-composition layout.

**Blocked by:** 03 — Training Game 101

**Status:** ready-for-agent

- [x] Portrait layout matches the Autodarts Play structure: score header → three Hit boxes → large Board (not a desktop dashboard)
- [x] The three Hit boxes always show a Checkout Route when the remaining score has a finish within three darts (or the best next-three suggestion when it does not)
- [x] After each Hit, boxes update: scored Segments in filled slots; Checkout Route continues in slots still open this Turn
- [x] During 101, routes follow the Training Game remaining score and reset correctly on bust / new target / new attempt
- [x] Manual Override on a landed Hit still works; layout keeps Detection Accuracy and connection status without extra promo chrome

## Comments

Portrait column: large remaining score, target, three Turn pips, then three Hit boxes, then the Board, with Connect and Start 101 in a slim footer. Detection Accuracy and connection stay in the score header.

Empty boxes show a Checkout Route in orange. A landed Hit replaces its box; the open boxes recompute. 121 is T20, 25, D18. Free practice uses a 501 visit that resets when the Turn leaves the Board. During 101 the route follows that remaining score. A bust clears the route and puts the remaining score back on the target. A clear moves the route to the next target.

Checked in the browser against a local stand-in (port 3180 was not up), on a phone-sized viewport and a wide window: 501 showed T20 T20 T20, a Hit dropped the visit to 441 and left the route in the open boxes, a Manual Override to S20 updated the remaining score, 101 opened on T17 Bull, clearing it advanced to target 102 with a new route, and a bust returned remaining to 102 with no route in the empty box.
