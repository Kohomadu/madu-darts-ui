import { useEffect } from "react";

export type WakeHandle = { release(): Promise<void> };

/** Keep the portrait monitor awake while Autodarts is connected. */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    const lock = createWakeLock(() => navigator.wakeLock.request("screen"));
    void lock.sync(true);
    const onVisible = () => {
      if (document.visibilityState === "visible") void lock.sync(true);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      void lock.stop();
    };
  }, [active]);
}

/** Holds a screen wake lock while the session is connected, and releases it otherwise. */
export function createWakeLock(request: () => Promise<WakeHandle>) {
  let current: WakeHandle | null = null;
  let stopped = false;

  return {
    async sync(active: boolean) {
      if (!active || stopped) {
        const held = current;
        current = null;
        if (held) await held.release();
        return;
      }
      if (current) return;
      try {
        const handle = await request();
        if (stopped || current) {
          await handle.release();
          return;
        }
        current = handle;
      } catch {
        current = null;
      }
    },
    async stop() {
      stopped = true;
      const held = current;
      current = null;
      if (held) await held.release();
    },
  };
}
