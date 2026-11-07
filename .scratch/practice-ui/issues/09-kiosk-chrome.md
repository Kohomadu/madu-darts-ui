# 09: Kiosk / portrait chrome

**What to build:** Standing-at-the-board defaults: fullscreen toggle, Autodarts URL/settings behind a gear, larger tap targets for Undo / Override / Reset board, and a screen wake lock while connected so the monitor does not sleep mid-session.

**Blocked by:** 05 — Autodarts Play layout and Checkout Routes

**Status:** ready-for-agent

- [x] Fullscreen toggle works on supporting browsers
- [x] Connect/URL lives behind a settings control, not in the main throw viewport
- [x] Primary actions have large tap targets; wake lock engages while connected and releases on disconnect/unmount

## Comments

Full screen sits in the status strip and asks the browser to enter or leave fullscreen. The Autodarts URL stays behind the settings gear until that gear is opened. Undo, Reset board, and the other footer actions are 64px tall. Hit boxes stay large enough to open a Manual Override.

The screen wake lock is requested while the shell is connected and released on disconnect or unmount. A refusal from the browser is ignored.

Checked in the browser against a local stand-in (port 3180 was not up). The URL field was hidden until Settings. Footer buttons measured 64px. Connecting requested a wake lock; this browser view denied the permission, and the shell kept running. Full screen was clicked and stayed available when this view refused fullscreen. The shell is pointed back at `http://127.0.0.1:3180`.
