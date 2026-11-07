import { describe, expect, it } from "vitest";
import { resetBoard } from "./resetBoard";

function responder(status: number): typeof fetch {
  return async () => new Response("", { status });
}

describe("Reset board", () => {
  it("sends POST /api/reset and reports success", async () => {
    const calls: Array<{ url: string; method: string }> = [];
    const result = await resetBoard(async (url, init) => {
      calls.push({ url: String(url), method: init?.method ?? "GET" });
      return new Response("{}", { status: 200 });
    });
    expect(calls).toEqual([{ url: "/api/reset", method: "POST" }]);
    expect(result).toEqual({ ok: true });
  });

  it("reports a failure without throwing", async () => {
    expect(await resetBoard(responder(500))).toEqual({ ok: false, message: "Autodarts is not responding" });
    expect(await resetBoard(responder(404))).toEqual({ ok: false, message: "Autodarts returned 404" });
    const thrown = await resetBoard(async () => {
      throw new Error("Failed to fetch");
    });
    expect(thrown).toEqual({ ok: false, message: "Autodarts is not responding" });
  });
});
