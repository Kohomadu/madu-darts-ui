# Madu Darts UI

Player-facing practice UI for Madu Darts. It consumes a local Autodarts 2.1–shaped detection stream (Hits and Turns on a Board). v1 targets Winmau Autodarts Detection; Madu darts detection comes later. Training Games and Detection Accuracy live in this UI. Calibration and Detection operator surfaces stay on the detection box, not this repo.

## Language

**Board**:
The physical steel-tip dartboard the system is calibrated to, including standard WDF scoring segments.
_Avoid_: Target, face

**Hit**:
One dart that has stuck in the Board and been assigned a Segment (and thus a score value). Emitted per dart. A bounce-out or fall is not a Hit.
_Avoid_: Throw, dart event, detection, miss

**Turn**:
The span from the first stuck dart until those darts are removed from the Board. Removal ends the Turn. A Training Game may allow a fixed number of Turns per attempt.
_Avoid_: Visit, round, leg

**Segment**:
A named scoring region on the Board (e.g. T20, S5, D16, outer bull, inner bull) that a Hit is assigned to.
_Avoid_: Slice, bed, field, zone

**Manual Override**:
A player correction of a Hit’s Segment applied in this UI for the open Turn (Board strip, Training Game scoring, Detection Accuracy). v1 does not write the correction to Winmau Autodarts Detection.
_Avoid_: Score fix, edit, patch (as product terms)

**Undo**:
Putting the last sealed Turn’s Hits back on the strip — the Segments the UI was using when that Turn sealed, including Manual Overrides — so the player can correct them and seal the Turn again. Autodarts is not asked to rewrite that Turn.
_Avoid_: Rollback, rewrite

**Reset board**:
Asking the detection box to clear a stuck takeout or a false hand. Sealed Turns in this UI stay as they are.
_Avoid_: Undo, score reset

**Detection Accuracy**:
The running percentage of finalized Hits that were left unchanged — (Hits without a Manual Override) ÷ (all finalized Hits) × 100 — persisted locally across sessions. Hits enter the denominator when the Turn seals (takeout); a Manual Override during that Turn marks the Hit wrong once.
_Avoid_: Precision, confidence, success rate

**Detection backend**:
The local process that emits the Autodarts-shaped Hit/Turn stream. v1 is Winmau Autodarts Detection; Madu darts detection is planned later behind the same shaped API.
_Avoid_: Server, API (as the product name for this role)

**Training Game**:
A ruleset layered on the live Hit/Turn stream that defines targets, busts, and progression for solo practice.
_Avoid_: Mode, match, leg (unless a future game truly is match play)

**101**:
The first Training Game: start at remaining score 101; clear it in at most two Turns (six darts) finishing on a double (Inner Bull counts); on success advance to 102, then 103, … up to 170 (170 clear ends the run). A failed clear keeps the same target. A bust restarts the attempt immediately with a fresh six darts at that same target.
_Avoid_: X01 (too generic), checkout trainer (unless referring to the drill informally)

**Checkout Route**:
The suggested sequence of up to three Segments to throw next for the current remaining score (e.g. T20 → 25 → D18). Shown in the three Hit boxes whenever a route exists; updates as Hits land and remaining score changes. A finish that does not use Inner Bull is preferred when another legal route fits in the open dart count; Inner Bull is used only when it is required.
_Avoid_: Hint, tip, obstacle path

**Next score**:
Abandoning the current 101 target for a fresh attempt at the next target, and asking the box to clear the Board. On 170 it ends the run. A failed reset does not advance the target.
_Avoid_: Skip, bust
