import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { launchDaiDesktopBridge } from "./bridge.mjs";

test("real Python Core handshake and isolated mission readback", {
  skip: !process.env.DAI_TEST_CORE_DIR,
}, async () => {
  const root = path.resolve(process.env.DAI_TEST_CORE_DIR);
  const python = process.env.DAI_TEST_PYTHON || "python";
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "dai-desktop-core-smoke-"));
  const state = path.join(temp, "state");
  const env = { ...process.env, PYTHONPATH: path.join(root, "src"), DAI_DATA_ROOT: state };
  const seed = [
    "import os",
    "from dai.memory import MemoryStore",
    "from dai.contracts import Principal",
    "from dai.mission import MissionService",
    "store=MemoryStore(os.environ['DAI_DATA_ROOT'])",
    "owner=Principal('owner')",
    "store.create_project(owner,'Smoke project',project_id='desktop-smoke')",
    "mission=MissionService(store)",
    "item=mission.create(owner,'desktop-smoke',system='engineer',objective='Verify Electron bridge',acceptance=['Evidence checked'])",
    "mission.evidence_add(owner,'desktop-smoke',item['mission_id'],title='Test evidence',locator='local:test',content='PRIVATE_EVIDENCE_DO_NOT_RENDER')",
  ].join("\n");
  let bridge;
  try {
    const result = spawnSync(python, ["-c", seed], { cwd: root, env, encoding: "utf8", timeout: 30000 });
    assert.equal(result.status, 0, result.stderr || result.error?.message);
    bridge = await launchDaiDesktopBridge({
      python, cwd: root, env,
      catalogPath: path.join(root, "config", "systems.json"),
      startupTimeoutMs: 45000,
    });
    assert.equal((await bridge.client.health()).mode, "read_only");
    assert.ok((await bridge.client.systems()).systems.length >= 10);
    const capabilities = await bridge.client.capabilities();
    assert.equal(capabilities.execution, "not_wired");
    assert.equal(capabilities.missions, "read_only");

    const projects = await bridge.client.projects();
    assert.deepEqual(projects.projects, [{ id: "desktop-smoke", name: "Smoke project" }]);
    const missions = await bridge.client.missions("desktop-smoke");
    assert.equal(missions.missions.length, 1);
    assert.equal(missions.missions[0].objective, "Verify Electron bridge");
    assert.ok(!JSON.stringify(missions).includes("PRIVATE_EVIDENCE_DO_NOT_RENDER"));
    await assert.rejects(bridge.client.missions("../invalid"), /identifier/);
  } finally {
    if (bridge) await bridge.stop();
    fs.rmSync(temp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
  await assert.rejects(bridge.client.health());
});
