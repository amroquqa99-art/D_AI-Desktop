/** SPDX-License-Identifier: GPL-3.0-or-later */
import { expect, test } from "bun:test"
import os from "node:os"
import path from "node:path"
import { forkCliEnvironment } from "./profile"

test("D_AI Core OpenCode profile cannot coincide with original XDG roots", () => {
  const userData = path.join(os.tmpdir(), "dai-profile-identity-test")
  const env = forkCliEnvironment(userData)
  expect(Object.keys(env).sort()).toEqual([
    "OPENCODE_CONFIG_DIR", "OPENCODE_DB", "XDG_CACHE_HOME", "XDG_CONFIG_HOME",
    "XDG_DATA_HOME", "XDG_STATE_HOME",
  ].sort())
  for (const item of Object.values(env)) {
    expect(path.isAbsolute(item)).toBe(true)
    expect(path.relative(userData, item).startsWith("..")).toBe(false)
    expect(item).toContain("cli-profile")
  }
  expect(env.OPENCODE_CONFIG_DIR).toBe(path.join(env.XDG_CONFIG_HOME, "opencode"))
  expect(env.OPENCODE_DB).toBe(path.join(env.XDG_DATA_HOME, "opencode", "opencode.db"))
  expect(path.dirname(path.dirname(env.OPENCODE_DB))).toBe(env.XDG_DATA_HOME)
  expect(env.XDG_STATE_HOME).not.toBe(path.join(os.homedir(), ".local", "state"))
})

test("profile requires absolute path; no relative cwd leakage", () => {
  expect(() => forkCliEnvironment("relative/path")).toThrow()
  expect(() => forkCliEnvironment("")).toThrow()
})

test("channel-specific Electron identities generate different CLI profiles", () => {
  const dev = forkCliEnvironment(path.resolve("data/online.amroquqa.dai.desktop.dev"))
  const stable = forkCliEnvironment(path.resolve("data/online.amroquqa.dai.desktop"))
  expect(dev.OPENCODE_DB).not.toBe(stable.OPENCODE_DB)
  expect(dev.XDG_STATE_HOME).not.toBe(stable.XDG_STATE_HOME)
})
