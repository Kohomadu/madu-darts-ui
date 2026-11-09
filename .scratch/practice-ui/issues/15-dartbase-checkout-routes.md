# 15: Dartbase Checkout Routes

**What to build:** Replace the algorithmic Checkout Route generator with the **primary recommended routes** from Dartbase’s out charts — start with [3 Dart out shots (170–61)](https://www.dartbase.com/outchart1.htm) and the linked **2 dart out charts** for lower remainings as needed so every remaining score the shell shows (including free-practice 501-style remainings down through common finishes) has a chart-backed suggestion. For each remaining score and open-dart count, show the chart’s **standard / first recommended** path (not bracketed “pressure / 6-dart %” bull gambles, and not `(exp)` expert variants, unless that is the only listed primary). Map Dartbase labels into our Segment language (`D25` / bull → **Bull**, bare numbers like `20` → **S20**, trebles/doubles as `T`/`D`). As Hits land, re-look up the route for the new remaining and darts left. This **supersedes** the “prefer non-Bull when possible” heuristics from ticket 13 where the chart disagrees — Dartbase is the source of truth (e.g. chart-preferred paths such as 101 → T20 · S9 · D16). Encode the chart as data in-repo (table/JSON), with a short comment citing the Dartbase URL; do not scrape live at runtime.

**Blocked by:** 05 — Autodarts Play layout and Checkout Routes

**Status:** ready-for-agent

- [x] Checkout Routes for remainings covered by Dartbase come from the encoded out chart, not the old free search
- [x] Primary (non-bracketed, non-exp) recommendations are used; Segment names match Madu/Autodarts labels (Bull, S/D/T)
- [x] Routes update after each Hit from remaining + open dart count
- [x] In-repo chart data cites https://www.dartbase.com/outchart1.htm (and 2-dart chart pages used)
- [x] Ticket 13 non-Bull heuristics no longer override the chart where they conflict

## Comments

Checkout Routes are the primary Dartbase path for the remaining score and the darts still open. Three darts use the 3-dart chart (101 is T20, S9, D16). Two darts use the 2-dart chart (101 is T17, Bull; 61 is T11, D14). Bracketed 6-dart bull lines and (exp) paths are skipped. 60 and below come from the linked “How The Pros Do It” page, since the out charts stop at 61. Above a finish, the suggestion scores on treble 20 unless that leaves a bogey. D25 is shown as Bull.

Checked in the browser with port 3180 down. Free practice on 501 showed T20, T20, T20. Start 101 showed T20, S9, D16. The two-dart lookup is covered by the route tests.
