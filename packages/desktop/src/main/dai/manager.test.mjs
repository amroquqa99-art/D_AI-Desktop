import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { createDaiDesktopManager } from "./manager.mjs";
const valid = {
  health: async () => ({ service: "dai-desktop-bridge", status: "ok", mode: "read_only", version: "0.1.0" }),
  systems: async () => ({ systems: [{ id: "research", primary: "dai-research",
    roles: ["reviewer"], maturity: "CONFIGURED", professional_validation: "NOT_COMPLETE" }] }),
};

test("does not spawn while disabled", async () => {
  let starts = 0;
  const manager = createDaiDesktopManager({ launch: async () => { starts++; return {}; } });
  assert.deepEqual(await manager.start(new EventEmitter(), { python: "" }), {
    state: "disabled", mode: "none", version: null
  });
  assert.equal(starts, 0);
});

test("connected catalog is sanitized and cloned", async () => {
  const app = new EventEmitter();
  let stopped = 0;
  const manager = createDaiDesktopManager({ launch: async () => ({
    client: valid, stop: async () => { stopped++; }
  }) });
  assert.deepEqual(await manager.start(app, { python: "python" }), {
    state: "connected", mode: "read_only", version: "0.1.0"
  });
  const a = manager.systems();
  a[0].roles.push("tamper");
  assert.deepEqual(manager.systems()[0].roles, ["reviewer"]);
  assert.equal((await manager.status()).state, "connected");
  app.emit("before-quit");
  await manager.stop();
  assert.ok(stopped >= 1);
});

test("rejects incompatible service", async () => {
  let stops = 0;
  const manager = createDaiDesktopManager({ launch: async () => ({
    client: { health: async () => ({ ...await valid.health(), service: "wrong" }), systems: valid.systems },
    stop: async () => { stops++; }
  }) });
  assert.equal((await manager.start(new EventEmitter(), { python: "python" })).state, "unavailable");
  assert.equal(stops, 1);
});

test("late startup after app quit never reports connected", async () => {
  const app = new EventEmitter();
  let release;
  const waiting = new Promise(done => { release = done; });
  let stops = 0;
  const manager = createDaiDesktopManager({ launch: async () => waiting });
  const running = manager.start(app, { python: "python" });
  app.emit("before-quit");
  release({ client: valid, stop: async () => { stops++; } });
  assert.equal((await running).state, "disabled");
  assert.equal(stops, 1);
  assert.deepEqual(manager.systems(), []);
});

test("lost child invalidates the catalog", async () => {
  let alive = true;
  const manager = createDaiDesktopManager({ launch: async () => ({
    client: { health: async () => { if (!alive) throw Error("offline"); return valid.health(); }, systems: valid.systems },
    stop: async () => undefined
  }) });
  await manager.start(new EventEmitter(), { python: "python" });
  alive = false;
  assert.equal((await manager.status()).state, "unavailable");
  assert.deepEqual(manager.systems(), []);
});

test("desktop startup gives cold macOS Python a bounded 45s budget", async () => {
  let config;
  const m = createDaiDesktopManager({ launch: async opts => {
    config = opts;
    return { client: valid, stop: async () => undefined };
  } });
  await m.start(new EventEmitter(), { python: "python" });
  assert.equal(config.startupTimeoutMs, 45000);
  await m.stop();
});


test("projects and missions are scoped, sanitized and bounded", async () => {
  const client = {
    ...valid,
    projects: async () => ({ projects: [
      { id: "local-project", name: "Local project", credential: "NEVER_RETURN" },
    ] }),
    missions: async (id) => ({ project_id: id, missions: [
      { id: "mission-01", system: "engineer", objective: "x".repeat(1200),
        status: "PLANNED", next_action: "inspect", version: 1,
        raw_evidence: "NEVER_RETURN", approval_secret: "NEVER_RETURN" },
    ] }),
  };
  const manager = createDaiDesktopManager({ launch: async () => ({
    client, stop: async () => undefined,
  }) });
  await manager.start(new EventEmitter(), { python: "python" });
  assert.deepEqual(await manager.projects(), [{ id: "local-project", name: "Local project" }]);
  const missions = await manager.missions("local-project");
  assert.equal(missions.length, 1);
  assert.equal(missions[0].objective.length, 600);
  assert.deepEqual(Object.keys(missions[0]), ["id", "system", "objective", "status",
    "next_action", "version"]);
  assert.ok(!JSON.stringify(missions).includes("NEVER_RETURN"));
  await assert.rejects(manager.missions("../escape"), /identifier/);
  await manager.stop();
  await assert.rejects(manager.projects(), /not connected/);
});

test("rejects a project id mismatch in Core responses", async () => {
  const manager = createDaiDesktopManager({ launch: async () => ({
    client: { ...valid, missions: async () => ({ project_id: "other", missions: [] }) },
    stop: async () => undefined,
  }) });
  await manager.start(new EventEmitter(), { python: "python" });
  await assert.rejects(manager.missions("expected"), /Invalid D_AI mission response/);
  await manager.stop();
});
