# 06: Undo last Turn for Manual Override

**What to build:** After darts are removed and the Turn strip clears, the player can press **Undo** to bring the last sealed Turn’s Hits back onto the strip (same Segments the UI was using when that Turn sealed — including any Manual Overrides already applied). With those Hits restored, Manual Override works as usual (Segment pad → OK), remaining score and **101** outcome recompute, and a finishing double after fixing an earlier dart still counts as a checkout / win. Confirming (e.g. takeout again, or an explicit Done) re-seals the Turn with the corrected Hits. Autodarts is not asked to rewrite history — this is UI-local, like Manual Override. Undo is unavailable when there is no sealed Turn to restore, while a live strip already has Hits, or while disconnected if that would invent state.

**Blocked by:** 03 — Training Game 101

**Status:** ready-for-agent

- [x] An Undo control restores the last sealed Turn’s Hits onto the strip after takeout cleared it
- [x] Restored Hits can be Manual-Overridden with the Segment pad; scoring / 101 remaining and checkout update immediately
- [x] Fixing dart 1 or 2 so dart 3 is a valid finishing double still counts as a win; re-seal commits the corrected Turn
- [x] Detection Accuracy treats Overrides on a restored Turn the same as during a live Turn (wrong once per Hit)
- [x] Undo does not call Autodarts to rewrite sealed history; control is hidden/disabled when there is nothing to undo

## Comments

Undo sits in the footer after takeout, and only while the strip is empty and Autodarts is connected. It puts the sealed Turn back, including Manual Overrides already applied. Empty polls keep those Hits. Done reseals them. Autodarts is not asked to rewrite the Turn.

A restored Turn can be corrected with the Segment pad. Remaining score updates immediately, and a finishing double still counts. Changing T19, S1, D20 (remaining 3 at target 101) to T20, S1, D20 left remaining 0; Done advanced the run to target 102. Undoing that seal brought back T20, not the original T19.

Detection Accuracy unseals the Turn with Undo and counts an Override once when it is sealed again (67% for two unchanged Hits out of three). Undo stays hidden while Hits are on the strip, and while the shell is disconnected.

Checked in the browser against a local stand-in (port 3180 was not up). The stand-in log had no PATCH. The shell is pointed back at `http://127.0.0.1:3180`, and Detection Accuracy was reset.
