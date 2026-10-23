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


test("project paths are validated before network access and no secret is placed in URLs", async () => {
  let called = 0;
  let seen;
  const client = createDaiDesktopClient({
    baseUrl: "http://127.0.0.1:4000/", token: "q".repeat(64),
    fetchImpl: async (url, opts) => {
      called++;
      seen = { url: String(url), opts };
      return { ok: true, json: async () => ({ project_id: "client:project", missions: [] }) };
    },
  });
  assert.deepEqual(await client.missions("client:project"),
                   { project_id: "client:project", missions: [] });
  assert.equal(called, 1);
  assert.ok(seen.url.endsWith("/v1/projects/client:project/missions"));
  assert.equal(seen.opts.method, "GET");
  for (const id of ["../private", "", "bad/project", "%2F", "a".repeat(129)]) {
    assert.throws(() => client.missions(id), /identifier/);
  }
  assert.equal(called, 1);
});
