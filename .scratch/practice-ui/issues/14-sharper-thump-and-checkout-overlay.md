# 14: Sharper thump, Checkout / Try again overlays

**What to build:** Tune Hit feedback and celebrate or reject attempt outcomes. Replace or re-mix the Hit **thump** so it is a bit **sharper** and more audible (current asset is too low/dull). When a Hit finishes the remaining score on a valid double (Inner Bull counts) — in **101** or free practice when remaining hits zero that way — play a distinct **checkout** cue (can reuse or refine the win sting; must fire on the finishing dart, not only later takeout) and show a full-viewport (or large centered) **“Checkout!”** overlay for a few seconds. When the **101** goal for the current target is **not** met (bust that restarts the six-dart attempt, or two Turns / six darts without a checkout), play the **fail / error** cue and show a **“Try again”** overlay for a few seconds, then dismiss. Respect mute (ticket 10) if present; overlays still show when muted. No overlay spam on Manual Override alone unless that Override creates the checkout or the failed outcome.

**Blocked by:** 04 — Practice audio cues

**Status:** ready-for-agent

- [x] Hit thump is sharper / more present than the current low dull asset
- [x] A clearing double (or Inner Bull finish) plays a checkout cue when remaining hits zero
- [x] A “Checkout!” overlay appears for a few seconds on that finish, then clears
- [x] A failed 101 attempt (bust restart or missed clear) plays a fail/error cue
- [x] A “Try again” overlay appears for a few seconds on that failure, then clears
- [x] Mute silences cues; overlays still show when muted

## Comments

The Hit thump is a low kick with a short reverb tail, trimmed where the tail falls silent (about 1.2 s). A double that lands remaining on zero plays the win sting on that dart and shows “Checkout!” for three seconds. A bust, and a takeout that ends two Turns without a checkout, play the fail cue and show “Try again” for three seconds. Takeout of a checkout that already landed is only the takeout chime. Mute silences the cues; the overlays still appear. A Manual Override only triggers an overlay when it is the dart that creates the checkout or the miss.

Checked in the browser against a local stand-in (port 3180 was not up). On 101, T20 S1 D20 showed “Checkout!” and played the win sting. T20 T20 showed “Try again”. Two Turns of S1 S1 S1, then takeout, showed “Try again” once. With Mute on, the same bust still showed “Try again” and played no cue. Sound was turned back on and Detection Accuracy reset. The shell is pointed back at `http://127.0.0.1:3180`.
