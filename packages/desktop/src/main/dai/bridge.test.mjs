import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { attachDaiDesktopBridge, launchDaiDesktopBridge } from "./bridge.mjs";
import { createDaiDesktopClient } from "./client.mjs";

test("rejects unsafe origins and weak tokens", () => {
  const token = "a".repeat(64);
  for (const baseUrl of ["http://example.com:4000/","http://localhost:4000/","http://127.0.0.1/","https://127.0.0.1:4000/"])
    assert.throws(() => createDaiDesktopClient({ baseUrl, token }));
  assert.throws(() => createDaiDesktopClient({ baseUrl: "http://127.0.0.1:4000/", token: "weak" }));
});
test("token travels only in headers", async () => {
  let seen; const token = "a".repeat(64);
  const client = createDaiDesktopClient({
    baseUrl: "http://127.0.0.1:4000/", token,
    fetchImpl: async (url, options) => {
      seen = { url: String(url), options };
      return { ok: true, json: async () => ({ status: "ok" }) };
    },
  });
  assert.equal((await client.health()).status, "ok");
  assert.equal(seen.options.method, "GET");
  assert.equal(seen.options.headers["X-DAI-Bridge-Token"], token);
  assert.ok(!seen.url.includes(token));
});
test("failed auth is not success", async () => {
  const client = createDaiDesktopClient({
    baseUrl: "http://127.0.0.1:4000/", token: "a".repeat(64),
    fetchImpl: async () => ({ ok: false, status: 401 }),
  });
  await assert.rejects(client.health(), /401/);
});
test("disabled bridge has no lifecycle listeners", async () => {
  const app = new EventEmitter();
  assert.deepEqual(await attachDaiDesktopBridge(app, { python: "" }), { status: "disabled" });
  assert.equal(app.listenerCount("before-quit"), 0);
});
test("integration validates service and shuts down", async () => {
  const app = new EventEmitter(); let stopped = 0;
  const state = await attachDaiDesktopBridge(app, {
    python: "python",
    launch: async () => ({
      client: { health: async () => ({ service: "dai-desktop-bridge", mode: "read_only" }) },
      stop: async () => { stopped++; },
    }),
  });
  assert.equal(state.status, "connected");
  app.emit("before-quit");
  assert.equal(stopped, 1);
});
test("rejects incompatible service and releases listener", async () => {
  const app = new EventEmitter(); let stopped = 0;
  const state = await attachDaiDesktopBridge(app, {
    python: "python",
    launch: async () => ({
      client: { health: async () => ({ service: "wrong", mode: "read_only" }) },
      stop: async () => { stopped++; },
    }),
  });
  assert.equal(state.status, "incompatible");
  assert.equal(stopped, 1);
  assert.equal(app.listenerCount("before-quit"), 0);
});
test("rejects missing python executable or bad timeout", () => {
  assert.throws(() => launchDaiDesktopBridge({ python: "" }));
  assert.throws(() => launchDaiDesktopBridge({ python: "python", startupTimeoutMs: 0 }));
});
