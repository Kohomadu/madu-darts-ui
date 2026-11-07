import { describe, expect, it } from "vitest";
import { createWakeLock, type WakeHandle } from "./wakeLock";

function fakeRequest() {
  const released: WakeHandle[] = [];
  const handles: WakeHandle[] = [];
  const request = async () => {
    const handle = {
      release: async () => {
        released.push(handle);
      },
    };
    handles.push(handle);
    return handle;
  };
  return { request, handles, released };
}

describe("screen wake lock", () => {
  it("requests a lock while connected and releases it on disconnect", async () => {
    const wake = fakeRequest();
    const lock = createWakeLock(wake.request);
    await lock.sync(true);
    expect(wake.handles).toHaveLength(1);
    await lock.sync(false);
    expect(wake.released).toEqual([wake.handles[0]]);
  });

  it("releases the lock when the shell unmounts", async () => {
    const wake = fakeRequest();
    const lock = createWakeLock(wake.request);
    await lock.sync(true);
    await lock.stop();
    expect(wake.released).toEqual([wake.handles[0]]);
    await lock.sync(true);
    expect(wake.handles).toHaveLength(1);
  });

  it("stays quiet when the browser refuses the lock", async () => {
    const lock = createWakeLock(async () => {
      throw new Error("denied");
    });
    await expect(lock.sync(true)).resolves.toBeUndefined();
  });
});
