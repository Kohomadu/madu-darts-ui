# 06: Undo last Turn for Manual Override

**What to build:** After darts are removed and the Turn strip clears, the player can press **Undo** to bring the last sealed Turn’s Hits back onto the strip (same Segments the UI was using when that Turn sealed — including any Manual Overrides already applied). With those Hits restored, Manual Override works as usual (Segment pad → OK), remaining score and **101** outcome recompute, and a finishing double after fixing an earlier dart still counts as a checkout / win. Confirming (e.g. takeout again, or an explicit Done) re-seals the Turn with the corrected Hits. Autodarts is not asked to rewrite history — this is UI-local, like Manual Override. Undo is unavailable when there is no sealed Turn to restore, while a live strip already has Hits, or while disconnected if that would invent state.

**Blocked by:** 03 — Training Game 101

**Status:** ready-for-agent

- [ ] An Undo control restores the last sealed Turn’s Hits onto the strip after takeout cleared it
- [ ] Restored Hits can be Manual-Overridden with the Segment pad; scoring / 101 remaining and checkout update immediately
- [ ] Fixing dart 1 or 2 so dart 3 is a valid finishing double still counts as a win; re-seal commits the corrected Turn
- [ ] Detection Accuracy treats Overrides on a restored Turn the same as during a live Turn (wrong once per Hit)
- [ ] Undo does not call Autodarts to rewrite sealed history; control is hidden/disabled when there is nothing to undo
