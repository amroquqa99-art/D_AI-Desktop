import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { launchDaiDesktopBridge } from "./bridge.mjs";

test("real Python core handshake", { skip: !process.env.DAI_TEST_CORE_DIR }, async () => {
  const root = path.resolve(process.env.DAI_TEST_CORE_DIR);
  const bridge = await launchDaiDesktopBridge({
    python: process.env.DAI_TEST_PYTHON || "python",
    cwd: root,
    env: { ...process.env, PYTHONPATH: path.join(root, "src") },
    catalogPath: path.join(root, "config", "systems.json"),
    startupTimeoutMs: 45000,
  });
  try {
    assert.equal((await bridge.client.health()).mode, "read_only");
    assert.ok((await bridge.client.systems()).systems.length >= 10);
    assert.equal((await bridge.client.capabilities()).execution, "not_wired");
  } finally { await bridge.stop(); }
  await assert.rejects(bridge.client.health());
});
