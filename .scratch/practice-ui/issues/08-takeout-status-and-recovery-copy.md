# 08: Takeout status and recovery copy

**What to build:** Large, unmistakable chrome when Autodarts is in takeout / takeout-in-progress vs waiting for a throw. When takeout looks wrong (few Hits, or a busted 101 attempt), show a one-line recovery CTA pointing at Reset board (and Undo when available).

**Blocked by:** 07 — Reset board control

**Status:** ready-for-agent

- [x] Takeout vs throw-waiting is obvious in the shell chrome
- [x] Suspicious takeout (0–1 Hits, or busted attempt) shows Reset board recovery copy
- [x] Undo is mentioned when a sealed visit can be restored

## Comments

A live board shows a large band: **Throw** while Autodarts status is throw, **Take out** while status is takeout or takeout-in-progress. A leftover takeout event does not keep the band on Take out once status is throw again. The band is hidden while the shell is disconnected.

When takeout has 0 or 1 Hits, or the 101 attempt is busted, one line says to Reset board. If the last Turn can be restored, that line also names Undo.

Checked in the browser against a local stand-in (port 3180 was not up). An empty throw showed Throw and no recovery line. Three Hits in takeout showed Take out and no recovery line. One Hit in takeout, and a busted 101 takeout, asked for Reset board. After that bust left the board, the line named Reset board and Undo. Detection Accuracy was reset. The shell is pointed back at `http://127.0.0.1:3180`.
