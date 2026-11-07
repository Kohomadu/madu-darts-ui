export type ResetBoardResult = { ok: true } | { ok: false; message: string };

/** Ask Autodarts to clear a stuck takeout. Does not change Hits in this UI. */
export async function resetBoard(fetchImpl: typeof fetch = fetch): Promise<ResetBoardResult> {
  try {
    const response = await fetchImpl("/api/reset", { method: "POST" });
    if (response.ok) return { ok: true };
    return {
      ok: false,
      message: response.status >= 500 ? "Autodarts is not responding" : `Autodarts returned ${response.status}`,
    };
  } catch {
    return { ok: false, message: "Autodarts is not responding" };
  }
}
