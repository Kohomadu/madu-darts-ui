# Match UI

**Track:** ui
**Agent:** ui

This queue is the screens. Take the lowest-numbered issue here whose `Blocked by` tickets are all done. Leave `.scratch/match-bot/` and `src/bot/` alone.

The bot agent is building the throw engine at the same time. The seam both sides share is `.scratch/match-bot/contract.md`. The wire ticket is the first UI issue that imports it.

Own `src/home/`, `src/match/`, the shell wiring in `App.tsx`, and the styles those screens need. Leave `src/board/geometry.ts` and `src/game/checkout.ts` as they are.

Practice-shell orientation is outside this queue.
