# 01: Live practice shell (Autodarts)

**What to build:** A Vite + React + TypeScript app that connects to Winmau Autodarts Detection (default `localhost:3180`, URL configurable), shows a virtual Board and the current Turn’s Hit strip from the Autodarts-shaped live stream, shows connection status, and when disconnected clearly pauses and never invents Hits. Include a Start 101 control that is visible but not playable yet.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [x] App boots and can be pointed at an Autodarts Detection base URL (default port 3180)
- [x] Live Board and Turn Hit strip (≤3) update from Autodarts HTTP/WS state
- [x] Connection status is visible; on disconnect the UI shows disconnected and does not fabricate Hits
- [x] Start 101 CTA is present but does not start the Training Game yet
- [ ] Free practice viewing of live Hits works end-to-end against a real Autodarts box (or equivalent local Autodarts Detection)

## Comments

Shell is in the repo (`npm run dev`, http://localhost:5173). The browser talks to this dev server; `/api/state` and `/api/events` are forwarded to the Autodarts URL (default `http://127.0.0.1:3180`, saved in the page).

Checked in the browser against a local stand-in of the 2.1 stream (nothing was listening on port 3180): Board and Turn followed S18 → S20 → S14 over the websocket, disconnect froze those Hits and added none, Start 101 only shows that the Training Game is not playable yet. The last box stays open until this is pointed at a real Autodarts Detection box.
