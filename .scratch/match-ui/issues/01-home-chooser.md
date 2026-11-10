# UI 01: Home chooser

**Track:** ui
**Agent:** ui

**What to build:** The screen the app opens on. Four tiles: Play, Practice, Profile, and Stats. Portrait is one column of large tiles. Landscape is the same four tiles in a row. The layout follows the device orientation on its own.

Leave `.scratch/match-bot/` and `src/bot/` alone. This ticket stops at the chooser and the way back to practice.

### Tiles

The device keeps one local profile. The stored name is the last one used. When nothing is stored, the name is Madu.

- **Practice** opens the existing practice shell. Home from a playing Training Game parks that run and returns here. Practice opens that same run again. Home from free practice opens free practice again. A run parked by Start 101 or Start 121 stays parked until its own Start button. Abort still discards the active run.
- **Play** opens a short next screen: a local 501 match is next.
- **Profile** opens a short next screen showing the current name. Further profiles are next.
- **Stats** opens a short next screen: match and Training Game stats are next.

Every screen except this chooser has Home. Home from Play, Profile, or Stats returns here.

**Blocked by:** none

**Status:** resolved

- [x] The app opens on Play, Practice, Profile, and Stats, using the saved profile name, or Madu when none is saved
- [x] Portrait stacks the four tiles. Landscape lays the same tiles in a row. Rotating the device switches the layout
- [x] Practice opens the practice shell. Home there parks a playing Training Game and returns to the chooser. Practice reopens that run. Abort still discards it
- [x] Play, Profile, and Stats each open their short next screen, and Home on those screens returns to the chooser

## Answer

App opens on an orientation-aware home chooser (`src/home/`) with the saved profile name (default Madu). Practice mounts the extracted practice shell; Home leaves without aborting so the persisted active Training Game resumes on Practice again. Play/Profile/Stats show short next screens with Home back to the chooser.
