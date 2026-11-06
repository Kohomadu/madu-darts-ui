# 02: Live Manual Override and Detection Accuracy

**What to build:** From the live Hit strip, the player can Manual Override a Hit (chip → Segment picker / Board click). The correction is applied **only in this UI** for the open Turn — Autodarts Detection does not accept overrides, so nothing is PATCHed to the box. Local corrections still drive the strip, Board markers, and Training Game scoring, and survive later Autodarts snapshots for that Turn until takeout clears the strip. When the Turn seals (takeout), those strip Hits finalize into Detection Accuracy — unchanged ÷ total × 100 — shown always in the shell chrome, persisted locally across restarts, with an explicit reset. A Manual Override during the Turn marks that Hit wrong once.

**Blocked by:** 01 — Live practice shell (Autodarts)

**Status:** ready-for-agent

- [x] Clicking a live Hit opens Segment correction (picker and/or Board click)
- [x] Override updates the UI strip/Board/game locally and is not sent to Autodarts
- [x] Local Override survives further Autodarts snapshots for that Turn until the strip clears
- [x] On takeout, strip Hits enter Detection Accuracy; overridden Hits count as wrong once
- [x] Detection Accuracy percentage is always visible in the shell
- [x] Counters persist across reloads and can be reset from a simple control

## Comments

Earlier build used `PATCH /api/state/hits/{index}`; Autodarts does not approve that. Override is local-only (ADR 0001). Detection Accuracy remains in the header: unchanged ÷ finalized Hits, sealed on takeout.
