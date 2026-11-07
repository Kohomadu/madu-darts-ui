import type { Cue } from "./cues";

const sources: Record<Cue, string> = {
  thump: "/audio/thump.wav",
  chime: "/audio/chime.wav",
  win: "/audio/win.wav",
  fail: "/audio/fail.wav",
};

let armed = false;
let listening = false;
let muted = false;

function arm(): void {
  armed = true;
}

/** The unmute click is the gesture that satisfies autoplay, when one is still required. */
export function unlockAudio(): void {
  arm();
}

export function setCuesMuted(next: boolean): void {
  muted = next;
}

/** Browser autoplay policy: stay silent until a click or key, then remember it. */
export function installAudioUnlock(): void {
  if (listening || typeof window === "undefined") return;
  listening = true;
  window.addEventListener("pointerdown", unlockAudio);
  window.addEventListener("keydown", arm);
}

export function playCue(cue: Cue): void {
  if (muted || !armed || typeof Audio === "undefined") return;
  const audio = new Audio(sources[cue]);
  void audio.play().catch(() => {});
}

export function playCues(cues: Cue[]): void {
  cues.forEach((cue, index) => {
    if (index === 0) {
      playCue(cue);
      return;
    }
    window.setTimeout(() => playCue(cue), index * 90);
  });
}
