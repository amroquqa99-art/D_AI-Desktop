/** SPDX-License-Identifier: GPL-3.0-or-later
 * Cross-platform contract: load the actual pinned Core plugin from a fresh
 * fork-scoped native OpenCode profile, WITHOUT calling any paid/free provider.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { installDaiRouterProfile } from "./router-profile.mjs";

test("pinned Core native router installs and imports from fork-owned profile", async (t) => {
  const coreDir = process.env.DAI_TEST_CORE_DIR;
  if (!coreDir) { t.skip("DAI_TEST_CORE_DIR missing"); return; }
  const sandbox = await fs.mkdtemp(path.join(os.tmpdir(), "dai-native-integration-"));
  const configDir = path.join(sandbox, "desktop", "cli-profile", "config", "opencode");
  const oldRoot = process.env.DAI_ROUTER_DATA_ROOT;
  try {
    const report = await installDaiRouterProfile({ enabled: true, coreDir, configDir });
    assert.equal(report.state, "installed", report.reason);
    const nativeConfig = JSON.parse(await fs.readFile(path.join(configDir, "opencode.jsonc"), "utf8"));
    assert.equal(nativeConfig.default_agent, "dai-os");
    assert.equal(nativeConfig.model, undefined, "do not take over manual chat model selection");
    assert.equal(nativeConfig.plugins.length, 1);
    const entry = path.join(nativeConfig.plugins[0], "index.js");
    assert.equal((await fs.stat(entry)).isFile(), true);
    const plugin = await import(pathToFileURL(entry).href);
    assert.equal(plugin.default.id, "dai.native-router");
    assert.equal(typeof plugin.default.setup, "function");
    const root = process.env.DAI_ROUTER_DATA_ROOT;
    assert.equal(root, path.join(sandbox, "desktop", "cli-profile", "dai-router-data"));
    const preferences = JSON.parse(await fs.readFile(path.join(root, "config", "routing-preferences.json"), "utf8"));
    for (const kind of ["retrieval", "implementation", "review"])
      assert.equal(preferences.global[kind].mode, "auto");
    const manual = await fs.readFile(path.join(configDir, "agent", "dai-os.md"), "utf8");
    assert.ok(manual.length > 100);

    // A real import alone is insufficient: instantiate the Core plugin with
    // the OpenCode V2 host registration contract (no network/provider request).
    // This proves the Core router writes to the *fork-owned* runtime directory,
    // picks up the seeded Auto preferences and registers native tool/command
    // hooks without ever opening the user's upstream OpenCode installation.
    const registered = { hooks: [], tools: [], commands: [] };
    const registration = () => ({ dispose: async () => {} });
    const ctx = {
      location: { directory: sandbox },
      session: { hook: async (name) => {
        registered.hooks.push("session." + name);
        return registration();
      }},
      tool: {
        hook: async (name) => {
          registered.hooks.push("tool." + name);
          return registration();
        },
        transform: async (fn) => {
          await fn({ add: (tool) => registered.tools.push(tool.name) });
          return registration();
        },
      },
      command: { transform: async (fn) => {
        await fn({ add: (command) => registered.commands.push(command.name) });
        return registration();
      }},
    };
    const dispose = await plugin.default.setup(ctx);
    assert.ok(registered.tools.includes("dai_route"));
    assert.ok(registered.tools.includes("dai_routing_status"));
    assert.ok(registered.commands.includes("dai-models"));
    assert.ok(registered.hooks.includes("session.prompt"));
    assert.ok(registered.hooks.includes("session.context"));
    assert.ok(registered.hooks.includes("tool.execute.before"));
    assert.equal(typeof dispose, "function");
    await dispose();
    const files = await fs.readdir(path.join(root, "runtime", "router", "loaded"));
    assert.equal(files.length, 1);
    const loaded = JSON.parse(await fs.readFile(path.join(root, "runtime", "router", "loaded", files[0]), "utf8"));
    assert.equal(loaded.plugin, "dai.native-router");
  } finally {
    if (oldRoot === undefined) delete process.env.DAI_ROUTER_DATA_ROOT;
    else process.env.DAI_ROUTER_DATA_ROOT = oldRoot;
    await fs.rm(sandbox, { recursive: true, force: true });
  }
});
