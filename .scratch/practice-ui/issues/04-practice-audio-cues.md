# 04: Practice audio cues

**What to build:** Audio feedback on the live practice shell and during Training Game 101. A low thump when a Hit is registered on the Board; a short chime when darts are removed and the Turn seals so the next Turn can start; a win sting when the current 101 target is cleared (checkout in at most two Turns); a fail cue when a 101 attempt fails (bust that restarts the six-dart attempt, or six darts without a checkout). Manual Override alone does not play a thump. Sounds are short local assets; if the browser blocks audio until a gesture, cues no-op until then. No cues while disconnected or without a live stream.

**Blocked by:** 03 — Training Game 101

**Status:** ready-for-agent

- [x] Each new Hit on the live strip plays one low thump (not on Manual Override alone)
- [x] On takeout finished / Turn seal, one chime plays (not per dart removed)
- [x] Successful clear of the current 101 target plays the win sound once
- [x] Failed 101 attempt (bust restart or failed clear) plays the fail sound once
- [x] Assets are local; audio blocked by the browser fails quietly until a user gesture; disconnect / no stream produces no spurious cues

## Comments

Four short files in `public/audio`: a low thump per new Hit, one chime when takeout seals the Turn, a win sting when the current 101 target is cleared, and a fail cue for a bust or a missed two-Turn attempt. A Manual Override does not thump. Hits already on the Board when the stream connects do not thump. Cues stay silent until a click or key, and while Autodarts is disconnected.

Checked in the browser against a local stand-in (port 3180 was not up): a Hit already stuck made no sound, the next Hit thumped once, an Override to S5 did not, takeout chimed once, a double clear played win once and moved to 102, a bust and a missed two-Turn attempt each played fail once, and disconnect added no further cue.
