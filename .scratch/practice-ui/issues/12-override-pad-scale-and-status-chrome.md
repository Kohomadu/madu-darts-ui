# 12: Override pad order, larger scale, status chrome

**What to build:** Three shell UX fixes. (1) Manual Override Segment pad numbers run **1–20 in numeric order** (1, 2, 3, … 19, 20), not Board wedge order. (2) Scale up the standing UI — Board, remaining score, Hit boxes, pad, and primary controls — so everything is larger and easier to hit/read on a portrait monitor. (3) Move **Connected**, **Detection Accuracy**, and accuracy **Reset** out of the game score header into a **top-left status strip** that is not part of the Training Game composition.

**Blocked by:** 05 — Autodarts Play layout and Checkout Routes

**Status:** ready-for-agent

- [x] Segment pad numbers are 1…20 in ascending order (not Board order)
- [x] Board, remaining score, Hit boxes, pad, and primary controls are noticeably larger for portrait use
- [x] Connected, Detection Accuracy, and accuracy Reset sit top-left, separate from the game score header

## Comments

The Segment pad lists 1 through 20 in numeric order. The Board graphic is unchanged. The standing column is wider, and the remaining score, Hit boxes, pad buttons, and footer controls are larger. Accuracy Reset stays the small text button.

Connected, Detection Accuracy, and accuracy Reset sit in a top-left strip. 101 turns and darts stay in the score header.

Checked in the browser against a local stand-in (port 3180 was not up). On a 1080-wide portrait the column is 860px, the remaining score is 176px, and Hit labels are 56px. On a 390-wide phone the column fits without sideways scrolling. The shell is pointed back at `http://127.0.0.1:3180`.
