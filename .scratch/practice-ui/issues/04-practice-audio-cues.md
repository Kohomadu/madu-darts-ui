# 04: Practice audio cues

**What to build:** Audio feedback on the live practice shell and during Training Game 101. A low thump when a Hit is registered on the Board; a short chime when darts are removed and the Turn seals so the next Turn can start; a win sting when the current 101 target is cleared (checkout in at most two Turns); a fail cue when a 101 attempt fails (bust that restarts the six-dart attempt, or six darts without a checkout). Manual Override alone does not play a thump. Sounds are short local assets; if the browser blocks audio until a gesture, cues no-op until then. No cues while disconnected or without a live stream.

**Blocked by:** 03 — Training Game 101

**Status:** ready-for-agent

- [ ] Each new Hit on the live strip plays one low thump (not on Manual Override alone)
- [ ] On takeout finished / Turn seal, one chime plays (not per dart removed)
- [ ] Successful clear of the current 101 target plays the win sound once
- [ ] Failed 101 attempt (bust restart or failed clear) plays the fail sound once
- [ ] Assets are local; audio blocked by the browser fails quietly until a user gesture; disconnect / no stream produces no spurious cues
