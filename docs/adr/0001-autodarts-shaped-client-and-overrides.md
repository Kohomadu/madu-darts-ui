# Autodarts-shaped client; Manual Override is local-only

Madu Darts UI is a browser client of an Autodarts 2.1–shaped local detection HTTP/WebSocket API. **v1 ships playable against Winmau Autodarts Detection only** (typical port 3180): live Hits/Turns, Detection Accuracy, and Training Game **101**.

Winmau Autodarts Detection does not accept player Manual Overrides from this UI. Corrections therefore live **only in the UI** for the open Turn: they drive the Board strip, **101** scoring, and Detection Accuracy, and they are not PATCHed back to the box. When Autodarts keeps streaming the uncorrected Segment, the UI keeps the local correction until the Turn clears. Madu darts detection (later) may reopen write-back overrides; that is a deliberate future change, not v1 behaviour.
