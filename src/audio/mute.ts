export const AUDIO_MUTED_KEY = "madu.audio.muted";

export function readMuted(storage: Pick<Storage, "getItem">): boolean {
  try {
    return storage.getItem(AUDIO_MUTED_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeMuted(storage: Pick<Storage, "setItem">, muted: boolean): void {
  try {
    storage.setItem(AUDIO_MUTED_KEY, muted ? "1" : "0");
  } catch {
    // Private mode can reject storage. The in-memory mute still applies.
  }
}
