# 16: Impossible checkout, then checkout sounds

**Order:** Do the failure recognition first. The sound effects key off that result, so they come after.

**Status:** ready-for-agent

## Failure recognition

**What to build:** During **101**, if the remaining score cannot be checked out with the darts still left in the attempt, show the **“Try again”** overlay on the Hit that makes it so, while that Turn is still on the Board. Do not wait for takeout. The count is the same “darts left” the shell already shows (up to six across the two Turns), not the empty boxes of the current Turn alone.

The attempt stays open: the remaining score stays put, so a Manual Override can still repair the leave. This is not a bust. Free practice is unchanged. Undo stays quiet.

- 1 dart left: impossible unless the remaining score is a double — Bull (50), or an even number from 2 through 40. An odd score, 42, 44, 46, 48, and anything above 50 has no double.
- 2 darts left: impossible at 99, 102, 103, 105, 106, 108, 109, and anything over 110. 110 itself can finish (treble 20, Bull).
- 3 darts left: impossible at 159, 162, 163, 165, 166, 168, 169, and anything over 170.
- 4 or more darts left: a remaining score from 2 through 170 can still be finished, including those bogeys. Starting 159 with six darts does not show “Try again”.

A bust, and a two-Turn attempt that ends without a checkout while the remaining score was still possible, keep today’s “Try again”. Takeout of a leave that already showed this overlay does not show it again. A Manual Override that creates the impossible remaining score shows it; one that restores a double does not.

- [x] One dart left on a score with no double shows “Try again” before the Turn ends
- [x] Two darts left on 99, 102, 103, 105, 106, 108, 109, or over 110 shows “Try again” before the Turn ends
- [x] Three darts left on 159, 162, 163, 165, 166, 168, or 169 shows “Try again” before the Turn ends
- [x] Four or more darts left on those scores does not
- [x] Bull and an even 2–40 with one dart left do not
- [x] A bust, and a missed two-Turn clear that was still possible, still show “Try again” as before
- [x] Takeout after this overlay does not show “Try again” again
- [x] A Manual Override that creates the impossible score shows it; one that repairs it does not
- [x] Free practice and Undo do not show it

## Sound effects

**What to build:** After the recognition above. Replace the single win/fail sting with these local cues. Mute still silences them; the overlays still show. No cue while disconnected, and Undo stays quiet. A Manual Override plays a cue only when it creates the outcome, same as today.

The checkout bands use the remaining score at the start of the Turn that finishes, and how many darts that Turn used:

- Over 121 (122–170) cleared with 3 darts: “orchestral win”, on the finishing dart
- 101–120 cleared with 3 darts: “fatality”, on the finishing dart
- 61–100 cleared with 3 or fewer darts: “level-win”, on the finishing dart
- Any other checkout (121, a finish under 61, or a band above cleared in fewer darts than its row requires) keeps the current checkout sting

Busts use the remaining score at the start of the Turn:

- 61 or more: “epic fail”
- Under 61: “universal failure trumpet”

A two-Turn attempt that ends without a checkout, and that was still possible, also plays “universal failure trumpet” on that takeout.

When takeout after a checkout advances the target (101 to 102, and on up through 169 to 170), play “Next level” instead of the takeout chime. Clearing 170 has no next target, so that takeout stays the chime. The **Next score** control does not play it.

When the impossible-checkout “Try again” appears, play “oni-chan-baka” once. That takeout does not also play the trumpet.

- [x] A 3-dart clear over 121 plays “orchestral win” on the finishing dart
- [x] A 3-dart clear of 101–120 plays “fatality”
- [x] A clear of 61–100 in three or fewer darts plays “level-win”
- [x] Other checkouts keep the current checkout sting
- [x] A bust from 61 or more plays “epic fail”; a bust from under 61 plays “universal failure trumpet”
- [x] A missed two-Turn clear that was still possible plays “universal failure trumpet”
- [x] Takeout that advances the target plays “Next level” instead of the chime
- [x] The impossible-checkout overlay plays “oni-chan-baka” once, and that takeout does not also play the trumpet
- [x] Mute silences the new cues; overlays still show; Undo and disconnect stay quiet

## Comments

Failure recognition is in. During 101, “Try again” shows on the Hit that leaves a remaining score the darts still left cannot finish. The score stays, so a Manual Override can repair it. Takeout of that leave does not show the overlay again.

The Downloads cues are in `public/audio`. A 3-dart 101 plays fatality on the finishing dart, and takeout to 102 plays Next level. A bust that opens on 61 or more plays epic fail; one that opens under 61 plays the failure trumpet. An impossible leave plays oni-chan-baka once. Mute still shows the overlay and plays nothing.

Checked in the browser against a local stand-in (port 3180 was not up). T20 S1 D20 on 101 requested fatality, and takeout requested Next level as the target became 102. T20 T20 on 102 requested epic fail. A later Turn that opened on 42 and bust requested the failure trumpet. S1 S2 leaving 39 with one dart left requested oni-chan-baka and showed “Try again”. With Mute on, the same kind of bust showed “Try again” and requested no file. Sound was turned back on, the run was aborted, and the shell is pointed back at `http://127.0.0.1:3180`.

Checked in the browser against a local stand-in (port 3180 was not up). On 101, S20 S20 S20 left 41 with 3 darts and no overlay. After takeout, S1 left 40 with 2 darts and no overlay. The next S1 left 39 with 1 dart and showed “Try again” while those darts were still on the Board. Takeout restarted at 101 with no second overlay. T20 T20 still showed “Try again” for the bust. T20 S1 D20 showed “Checkout!” and takeout moved to 102. Free practice on 501 with three treble 20s showed no overlay. The two-dart and three-dart bogeys are covered by the route and cue tests. The shell is pointed back at `http://127.0.0.1:3180`.
