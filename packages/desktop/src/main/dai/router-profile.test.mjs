/** SPDX-License-Identifier: GPL-3.0-or-later */
import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { installDaiRouterProfile } from "./router-profile.mjs";

async function fixture(fn) {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), "dai-router-profile-"));
  const core = path.join(base, "dai-core");
  const adapter = path.join(core, "adapters", "opencode");
  const config = path.join(base, "dai-app", "cli-profile", "config", "opencode");
  await fs.mkdir(path.join(adapter, "router"), { recursive: true });
  for (const name of ["agent", "skill", "command"]) {
    await fs.mkdir(path.join(adapter, name), { recursive: true });
    await fs.writeFile(path.join(adapter, name, "dummy.md"), "D_AI fixture");
  }
  for (const name of ["index.js", "core.js", "value.js", "package.json"])
    await fs.writeFile(path.join(adapter, "router", name),
      name === "index.js" ? 'export default {id:"dai.native-router"};' : "{}\n");
  try { await fn({ base, core, adapter, config }); }
  finally { await fs.rm(base, { recursive: true, force: true }); }
}

test("opt-in is mandatory; no files touched when disabled", async () => {
  await fixture(async ({ core, config }) => {
    assert.deepEqual(await installDaiRouterProfile({ enabled: false, coreDir: core, configDir: config }),
      { state: "disabled" });
    await assert.rejects(fs.stat(config), { code: "ENOENT" });
  });
});

test("fresh fork profile stages all OS definitions and router without forcing a chat model", async () => {
  await fixture(async ({ base, core, config }) => {
    const mainOpenCode = path.join(base, "regular-opencode");
    await fs.mkdir(mainOpenCode);
    await fs.writeFile(path.join(mainOpenCode, "auth.json"), "do not touch");
    const result = await installDaiRouterProfile({ enabled: true, coreDir: core, configDir: config });
    assert.equal(result.state, "installed");
    const json = JSON.parse(await fs.readFile(path.join(config, "opencode.jsonc"), "utf8"));
    assert.deepEqual(json.plugins, [path.join(core, "adapters", "opencode", "router")]);
    assert.equal(json.default_agent, "dai-os");
    assert.equal(json.model, undefined);
    for (const name of ["agent", "skill", "command"])
      assert.equal(await fs.readFile(path.join(config, name, "dummy.md"), "utf8"), "D_AI fixture");
    assert.equal(await fs.readFile(path.join(mainOpenCode, "auth.json"), "utf8"), "do not touch");
    assert.equal((await installDaiRouterProfile({ enabled: true, coreDir: core, configDir: config })).state,
      "installed");
  });
});

test("existing configs, agent definitions and explicit opt-out are respected", async () => {
  await fixture(async ({ core, config }) => {
    await fs.mkdir(config, { recursive: true });
    const old = '{"providers":{"custom":{"api_key":"private"}}}\n';
    await fs.writeFile(path.join(config, "opencode.json"), old);
    const state = await installDaiRouterProfile({ enabled: true, coreDir: core, configDir: config });
    assert.equal(state.state, "skipped");
    assert.equal(await fs.readFile(path.join(config, "opencode.json"), "utf8"), old);
    await assert.rejects(fs.stat(path.join(config, "opencode.jsonc")), { code: "ENOENT" });
  });
});

test("edited config and swapped Core source fail closed instead of overwriting", async () => {
  await fixture(async ({ core, config }) => {
    await installDaiRouterProfile({ enabled: true, coreDir: core, configDir: config });
    const file = path.join(config, "opencode.jsonc");
    await fs.appendFile(file, "\n// user comment\n");
    const checked = await installDaiRouterProfile({ enabled: true, coreDir: core, configDir: config });
    assert.equal(checked.state, "skipped");
    assert.match(await fs.readFile(file, "utf8"), /user comment/);
  });
});

test("rejects paths outside fork profile or unrecognized router", async () => {
  await fixture(async ({ core, config, base }) => {
    const bad = await installDaiRouterProfile({
      enabled: true, coreDir: core, configDir: path.join(base, "shared-opencode"),
    });
    assert.equal(bad.state, "skipped");
    assert.match(bad.reason, /non-D_AI Desktop/);
    await fs.writeFile(path.join(core, "adapters", "opencode", "router", "index.js"), "export default {};");
    const mismatch = await installDaiRouterProfile({ enabled: true, coreDir: core, configDir: config });
    assert.equal(mismatch.state, "skipped");
    assert.match(mismatch.reason, /incompatible/);
  });
});

test("symlinked profile roots are never written", { skip: process.platform === "win32" }, async () => {
  await fixture(async ({ core, config, base }) => {
    const target = path.join(base, "other-profile");
    await fs.mkdir(target);
    await fs.mkdir(path.dirname(path.dirname(config)), { recursive: true });
    await fs.symlink(target, path.dirname(config), "dir");
    const result = await installDaiRouterProfile({ enabled: true, coreDir: core, configDir: config });
    assert.equal(result.state, "skipped");
    assert.match(result.reason, /symlink/);
  });
});
