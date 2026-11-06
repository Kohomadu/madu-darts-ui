# 02: Live Manual Override and Detection Accuracy

**What to build:** From the live Hit strip, the player can Manual Override a Hit (chip → Segment picker / Board click) and the correction is written back to Autodarts on the live Turn strip. When the Turn seals (takeout), those strip Hits finalize into Detection Accuracy — unchanged ÷ total × 100 — shown always in the shell chrome, persisted locally across restarts, with an explicit reset. A Manual Override during the Turn marks that Hit wrong once.

**Blocked by:** 01 — Live practice shell (Autodarts)

**Status:** ready-for-agent

- [x] Clicking a live Hit opens Segment correction (picker and/or Board click)
- [x] Override is sent to Autodarts so the box and UI agree on that Hit
- [x] On takeout, strip Hits enter Detection Accuracy; overridden Hits count as wrong once
- [x] Detection Accuracy percentage is always visible in the shell
- [x] Counters persist across reloads and can be reset from a simple control

## Comments

Live strip: click a Hit, type a Segment (`D20`, `T5`, `S18`, `Bull`, `25`) or click the Board. The correction is `PATCH /api/state/hits/{index}` with `{segmentName}` or `{xMm,yMm}`. Detection Accuracy is in the header: unchanged ÷ finalized Hits, sealed when the Turn ends on takeout, one Override marks that Hit wrong once. Counters live in local storage; Reset clears them.

Checked in the browser against a local stand-in of that patch (port 3180 was not up): S18 → typed T20 → Board click D16, takeout sealed at 0%, reload kept 0%, Reset returned to —. A real Autodarts box still needs to accept that same live-strip patch.
