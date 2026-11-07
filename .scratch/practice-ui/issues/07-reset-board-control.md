# 07: Reset board control

**What to build:** A Reset board control that calls Autodarts `POST /api/reset` so a stuck takeout / false hand on the box can be cleared without leaving the practice UI. Complements Undo (UI scorebook) — Reset fixes the detection box. Show success/failure briefly; do not invent Hits.

**Blocked by:** 01 — Live practice shell (Autodarts)

**Status:** ready-for-agent

- [x] Reset board sends `POST /api/reset` through the existing Autodarts proxy
- [x] Control is available while connected; errors surface without crashing the shell
- [x] Complements Undo: Reset does not rewrite UI sealed Turns by itself

## Comments

Reset board is a footer control, separate from the Detection Accuracy Reset in the header. It is enabled only while Autodarts is connected. It sends `POST /api/reset` and shows "Board reset" or the failure for a moment. The click does not clear Hits, remaining score, or sealed Turns; the next stream snapshot is what changes the strip.

Checked in the browser against a local stand-in (port 3180 was not up). A successful reset left the T20 and remaining 441 in place. A failed reset showed "Autodarts is not responding" and left the same Turn. While disconnected the control is disabled and the paused Turn stays put. The shell is pointed back at `http://127.0.0.1:3180`.
