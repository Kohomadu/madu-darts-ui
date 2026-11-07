import { describe, expect, it } from "vitest";
import { presenceLabel, recoveryCopy, shellPresence } from "./presence";

describe("takeout chrome", () => {
  it("tells takeout apart from waiting for a throw", () => {
    expect(shellPresence("throw")).toBe("throw");
    expect(shellPresence("Takeout")).toBe("takeout");
    expect(shellPresence("takeoutInProgress")).toBe("takeout");
    expect(shellPresence("stopped")).toBeNull();
    expect(presenceLabel("throw")).toBe("Throw");
    expect(presenceLabel("takeout")).toBe("Take out");
  });

  it("asks for Reset board when takeout has 0 or 1 Hits", () => {
    expect(recoveryCopy({ presence: "takeout", hitCount: 0, busted: false, canUndo: false })).toBe(
      "Takeout looks wrong. Reset board to clear it.",
    );
    expect(recoveryCopy({ presence: "takeout", hitCount: 1, busted: false, canUndo: false })).toBe(
      "Takeout looks wrong. Reset board to clear it.",
    );
    expect(recoveryCopy({ presence: "takeout", hitCount: 3, busted: false, canUndo: false })).toBeNull();
  });

  it("asks for Reset board when a busted attempt is in takeout", () => {
    expect(recoveryCopy({ presence: "takeout", hitCount: 3, busted: true, canUndo: false })).toBe(
      "Takeout looks wrong. Reset board to clear it.",
    );
  });

  it("mentions Undo when the last Turn can be restored", () => {
    expect(recoveryCopy({ presence: "takeout", hitCount: 0, busted: false, canUndo: true })).toBe(
      "Takeout looks wrong. Reset board, or Undo the last Turn.",
    );
    expect(recoveryCopy({ presence: "throw", hitCount: 0, busted: false, canUndo: true })).toBeNull();
  });
});
