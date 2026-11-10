export const PROFILE_NAME_KEY = "madu.profile.name";
export const DEFAULT_PROFILE_NAME = "Madu";

/** Last local profile name used on this device, or Madu when nothing is stored. */
export function readProfileName(storage: Pick<Storage, "getItem">): string {
  try {
    const saved = storage.getItem(PROFILE_NAME_KEY);
    if (saved == null) return DEFAULT_PROFILE_NAME;
    const name = saved.trim();
    return name || DEFAULT_PROFILE_NAME;
  } catch {
    return DEFAULT_PROFILE_NAME;
  }
}

export function writeProfileName(storage: Pick<Storage, "setItem">, name: string): void {
  try {
    storage.setItem(PROFILE_NAME_KEY, name.trim() || DEFAULT_PROFILE_NAME);
  } catch {
    // Private mode can reject storage. Callers still keep the in-memory name.
  }
}
