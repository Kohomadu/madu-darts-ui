# Madu Darts UI

Practice app for a player standing at the board. It follows the live Hit and Turn stream from a detection box and runs solo practice on top of that stream: the Board, the current Turn, Manual Override, Detection Accuracy, and Training Game 101.

This repository is not the detection system. Calibration and operator controls stay on the detection box. v1 talks only to Winmau Autodarts Detection (default `http://127.0.0.1:3180`). Madu’s own detection backend is planned later, behind the same Autodarts-shaped API.

## What a session looks like

Connect the shell to Autodarts. Hits appear on the Board and in the Turn strip as they stick. Click a Hit to correct its Segment locally — Autodarts does not accept Manual Overrides from this UI, so the box keeps its own reading while scoring and Detection Accuracy in the app use the correction for the open Turn. When the darts are taken out, those Hits count toward Detection Accuracy (unchanged Hits ÷ all finalized Hits), which stays in the browser.

Start 101 to play. Remaining begins at 101. Clear it in at most two Turns, finishing on a double (Inner Bull counts). Success moves the target to 102, then 103, up to 170. Clearing 170 ends the run. Missing the clear retries the same target. A bust restarts that attempt with six fresh darts. The shell shows the target, the remaining score, and the Turns and darts left. Checkout Routes are ticket 05. If Autodarts disconnects, the Turn and the game pause.

Words used here are defined in [GLOSSARY.md](GLOSSARY.md). Why v1 is Autodarts-only is in [docs/adr/0001-autodarts-shaped-client-and-overrides.md](docs/adr/0001-autodarts-shaped-client-and-overrides.md).

## Run

```sh
npm install
npm run dev
```

Open http://localhost:5173 and point it at Autodarts. The page stays on the dev server; that server proxies `/api` to the detection box.

```sh
npm test
npm run build
```
