# 10: Audio mute

**What to build:** A mute control that silences practice cues (thump / chime / win / fail) and persists the preference locally across reloads.

**Blocked by:** 04 — Practice audio cues

**Status:** ready-for-agent

- [x] Mute toggle stops all practice cues when on
- [x] Preference persists in local storage
- [x] Unmute restores normal cue behaviour after a user gesture unlock if needed

## Comments

Mute silences thump, chime, win, and fail. The choice is stored on this device. Unmute is a click, so it also counts as the gesture that lets the browser play sound.

Checked in the browser. Mute became Unmute and stored the preference. After a reload the button was still Unmute. Turning sound back on cleared the stored preference.
