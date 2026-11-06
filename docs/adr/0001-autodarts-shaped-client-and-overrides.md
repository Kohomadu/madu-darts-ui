# Autodarts-shaped client first; Madu later; overrides write back

Madu Darts UI is a browser client of an Autodarts 2.1–shaped local detection HTTP/WebSocket API. **v1 ships playable against Winmau Autodarts Detection only** (typical port 3180): live Hits/Turns, Manual Override on the live strip, Detection Accuracy, and Training Game **101**. Madu darts detection as a backend, a formal multi-provider adapter, and post-takeout / last sealed visit override are deferred until after that Autodarts-playable slice works.

Manual Overrides on the live Turn strip are written back to Autodarts so the box and the UI agree. We rejected a UI-only second scorebook for corrections the backend can accept. Where Autodarts cannot correct sealed history, v1 does not invent a parallel post-takeout scorebook — Detection Accuracy finalizes on takeout; later Madu work can reopen last-visit override.
