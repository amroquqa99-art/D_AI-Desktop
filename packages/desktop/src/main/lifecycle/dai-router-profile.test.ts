/** SPDX-License-Identifier: GPL-3.0-or-later */
import { expect, test } from "bun:test"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from "node:fs"
import os from "node:os"
import { createHash } from "node:crypto"
import path from "node:path"
import { daiRouterStateRoot, installDaiRouterProfile } from "./dai-router-profile"
import { forkCliEnvironment } from "./profile"

function fixture() {
  const root = mkdtempSync(path.join(os.tmpdir(), "dai-desktop-router-test-"))
  const userData = path.join(root, "desktop")
  const core = path.join(root, "core")
  const plugin = path.join(core, "adapters", "opencode", "router")
  mkdirSync(plugin, { recursive: true })
  writeFileSync(path.join(plugin, "package.json"), JSON.stringify({ name: "dai-native-router" }))
  for (const file of ["index.js", "core.js", "value.js"]) writeFileSync(path.join(plugin, file), "// fixture\n")
  for (const file of ["routing-preferences.json", "model-routing-policy.json", "model-profiles.json"]) {
    const dest = path.join(core, "config", file)
    mkdirSync(path.dirname(dest), { recursive: true })
    writeFileSync(dest, JSON.stringify(file === "routing-preferences.json" ?
      { global: { review: { mode: "auto" } }, projects: {} } : file === "model-profiles.json" ?
      { profiles: [] } : { quality_slack: 5 }))
  }
  const sources = {
    "dai-os": "dai-os.md",
    "dai/shared/explorer": "dai/shared/explorer.md",
    "dai/shared/reviewer": "dai/shared/reviewer.md",
    "dai/engineer/implementer": "dai/engineer/implementer.md",
  }
  for (const [id, location] of Object.entries(sources)) {
    const file = path.join(core, "adapters", "opencode", "agent", location)
    mkdirSync(path.dirname(file), { recursive: true })
    writeFileSync(file, [
      "---", `description: ${JSON.stringify("Agent " + id)}`,
      `mode: ${id === "dai-os" ? "primary" : "subagent"}`,
      "steps: 12",
      'permissions: [{"action":"*","resource":"*","effect":"deny"}]',
      "---", "Trusted source body\n",
    ].join("\n"))
  }
  return { root, userData, core, config: path.join(forkCliEnvironment(userData).OPENCODE_CONFIG_DIR, "opencode.json") }
}

test("opt-in V2 installer keeps the owner's provider, paid API and native model choices", () => {
  const f = fixture()
  mkdirSync(path.dirname(f.config), { recursive: true })
  const original = { plugins: ["third-party-plugin"], providers: { "test-provider": { apiKey: "KEEP" } },
    model: { providerID: "test-provider", id: "manual" }, default_agent: "build" }
  writeFileSync(f.config, JSON.stringify(original))
  const result = installDaiRouterProfile(f.userData, f.core)
  const updated = JSON.parse(readFileSync(f.config, "utf8"))
  expect(result.changed).toBe(true)
  expect(updated.plugins).toEqual(["third-party-plugin", path.join(f.core, "adapters", "opencode", "router")])
  expect(updated.providers).toEqual(original.providers)
  expect(updated.model).toEqual(original.model)
  expect(updated.default_agent).toBe("build")
  expect(Object.keys(updated.agents).sort()).toEqual([
    "dai-os", "dai/engineer/implementer", "dai/shared/explorer", "dai/shared/reviewer",
  ].sort())
  expect(updated.agents["dai-os"].mode).toBe("primary")
  expect(updated.agents["dai/shared/explorer"].mode).toBe("subagent")
  expect(updated.agents["dai/shared/explorer"].permissions[0].effect).toBe("deny")
  expect(updated.agents["dai-os"].system).toContain("Trusted source body")
  expect(existsSync(path.join(result.dataRoot, "config", "routing-preferences.json"))).toBe(true)
  expect(JSON.parse(readFileSync(path.join(result.dataRoot, "config", "routing-preferences.json"), "utf8")).global.review.mode).toBe("auto")
  expect(readFileSync(f.config + ".dai-original-" + (awaitHash(JSON.stringify(original))), "utf8")).toBe(JSON.stringify(original))
  const first = readFileSync(f.config, "utf8")
  expect(installDaiRouterProfile(f.userData, f.core).changed).toBe(false)
  expect(readFileSync(f.config, "utf8")).toBe(first)
})

test("new independent profile selects D_AI OS but never pins the main session model", () => {
  const f = fixture()
  const result = installDaiRouterProfile(f.userData, f.core)
  expect(result.changed).toBe(true)
  const config = JSON.parse(readFileSync(f.config, "utf8"))
  expect(config.default_agent).toBe("dai-os")
  expect(config.model).toBeUndefined()
  expect(config.providers).toBeUndefined()
  expect(daiRouterStateRoot(f.userData).startsWith(f.userData)).toBe(true)
})

test("malformed or JSONC-owned profile is left untouched, including preexisting credentials", () => {
  const f = fixture()
  mkdirSync(path.dirname(f.config), { recursive: true })
  const jsonc = path.join(path.dirname(f.config), "opencode.jsonc")
  writeFileSync(jsonc, '{\n // owner note\n "plugins": []\n}\n')
  expect(() => installDaiRouterProfile(f.userData, f.core)).toThrow(/JSONC/)
  expect(existsSync(f.config)).toBe(false)
  expect(readFileSync(jsonc, "utf8")).toContain("owner note")
})

test("invalid native source and existing symbolic-link config fail closed", () => {
  const f = fixture()
  expect(() => installDaiRouterProfile(f.userData, "relative")).toThrow(/absolute/)
  writeFileSync(path.join(f.core, "adapters", "opencode", "router", "package.json"), '{"name":"not-our-router"}')
  expect(() => installDaiRouterProfile(f.userData, f.core)).toThrow(/Core V2 router missing/)
  writeFileSync(path.join(f.core, "adapters", "opencode", "router", "package.json"), '{"name":"dai-native-router"}')
  mkdirSync(path.dirname(f.config), { recursive: true })
  const external = path.join(f.root, "external.json")
  writeFileSync(external, '{"plugins":[]}')
  symlinkSync(external, f.config)
  expect(() => installDaiRouterProfile(f.userData, f.core)).toThrow(/symlink/)
  expect(readFileSync(external, "utf8")).toBe('{"plugins":[]}')
})

test("owner-edited routing policies and existing worker agents are never overwritten", () => {
  const f = fixture()
  mkdirSync(path.dirname(f.config), { recursive: true })
  writeFileSync(f.config, JSON.stringify({ agents: { "dai-os": { system: "OWNER OVERRIDE", mode: "primary" } }, plugins: [] }))
  const state = path.join(daiRouterStateRoot(f.userData), "config", "model-routing-policy.json")
  mkdirSync(path.dirname(state), { recursive: true })
  writeFileSync(state, '{"quality_slack":2}')
  installDaiRouterProfile(f.userData, f.core)
  expect(JSON.parse(readFileSync(f.config, "utf8")).agents["dai-os"].system).toBe("OWNER OVERRIDE")
  expect(readFileSync(state, "utf8")).toBe('{"quality_slack":2}')
})

// The backup name is a digest of the owner's original bytes.
function awaitHash(text: string) {
  return createHash("sha256").update(text).digest("hex").slice(0, 16)
}
