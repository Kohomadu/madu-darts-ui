import { useEffect, useRef, useState } from "react";
import { parseState, parseWsMessage, type Hit } from "./parse";
import { connectingView, reducePractice, type PracticeView } from "./view";

export function useAutodarts(baseUrl: string): {
  view: PracticeView;
  error: string | null;
  applyLocalOverride: (index: number, hit: Hit) => void;
} {
  const [view, setView] = useState<PracticeView>(connectingView);
  const [error, setError] = useState<string | null>(null);
  const wsOpen = useRef(false);

  useEffect(() => {
    const ac = new AbortController();
    let stopped = false;
    let ws: WebSocket | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    wsOpen.current = false;

    const dispatch = (event: Parameters<typeof reducePractice>[1]) => {
      if (stopped) return;
      setView((current) => reducePractice(current, event));
    };

    const fail = (message: string) => {
      if (stopped || ac.signal.aborted) return;
      setError(message);
      dispatch({ type: "unreachable" });
    };

    const showSnap = (snap: NonNullable<ReturnType<typeof parseState>>, via?: "live" | "polling") => {
      if (stopped) return;
      setError(null);
      setView((current) =>
        reducePractice(current, {
          type: "snapshot",
          snapshot: snap,
          via: via ?? (wsOpen.current ? "live" : "polling"),
        }),
      );
    };

    const show = (body: unknown, via?: "live" | "polling") => {
      const snap = parseState(body);
      if (!snap) {
        fail("Autodarts state was not a Hit/Turn snapshot");
        return;
      }
      showSnap(snap, via);
    };

    const pull = async () => {
      const res = await fetch("/api/state", { signal: ac.signal, cache: "no-store" });
      if (!res.ok) {
        throw new Error(res.status >= 500 ? "Autodarts is not responding" : `Autodarts returned ${res.status}`);
      }
      return res.json() as Promise<unknown>;
    };

    const stopPoll = () => {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    };

    const openWs = () => {
      if (stopped || wsOpen.current) return;
      if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) return;
      const proto = location.protocol === "https:" ? "wss" : "ws";
      try {
        ws = new WebSocket(`${proto}://${location.host}/api/events`);
      } catch {
        return;
      }
      ws.onopen = () => {
        wsOpen.current = true;
        stopPoll();
        dispatch({ type: "socket-open" });
      };
      ws.onmessage = (ev) => {
        if (!wsOpen.current) return;
        let parsed: unknown;
        try {
          parsed = JSON.parse(String(ev.data));
        } catch {
          return;
        }
        const snap = parseWsMessage(parsed);
        if (!snap) return;
        if (stopped) return;
        setError(null);
        setView((current) =>
          reducePractice(current, { type: "snapshot", snapshot: snap, via: "live" }),
        );
      };
      ws.onclose = () => {
        const wasOpen = wsOpen.current;
        wsOpen.current = false;
        ws = null;
        if (stopped) return;
        if (wasOpen) dispatch({ type: "socket-closed" });
        startPoll();
      };
    };

    const startPoll = () => {
      if (pollTimer || stopped) return;
      pollTimer = setInterval(() => {
        void pull()
          .then((body) => {
            if (wsOpen.current || stopped) return;
            show(body, "polling");
            openWs();
          })
          .catch((err: unknown) => {
            if (ac.signal.aborted || stopped) return;
            fail(err instanceof Error && err.message !== "Failed to fetch" ? err.message : "Autodarts is not responding");
          });
      }, 1000);
    };

    dispatch({ type: "connecting" });
    setError(null);

    void (async () => {
      try {
        const target = await fetch("/__madu/target", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ baseUrl }),
          signal: ac.signal,
        });
        if (!target.ok) {
          const body = (await target.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error || "Could not set the Autodarts URL");
        }
        show(await pull(), "polling");
        openWs();
      } catch (err: unknown) {
        if (ac.signal.aborted || stopped) return;
        fail(err instanceof Error && err.message !== "Failed to fetch" ? err.message : "Autodarts is not responding");
        startPoll();
      }
    })();

    return () => {
      stopped = true;
      ac.abort();
      stopPoll();
      wsOpen.current = false;
      if (ws) {
        ws.onclose = null;
        ws.onmessage = null;
        ws.close();
      }
    };
  }, [baseUrl]);

  return {
    view,
    error,
    applyLocalOverride(index, hit) {
      setView((current) => reducePractice(current, { type: "local-override", index, hit }));
    },
  };
}
