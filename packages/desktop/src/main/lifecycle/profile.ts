/** SPDX-License-Identifier: GPL-3.0-or-later
 * Keep the inherited OpenCode CLI database, tokens, config and service
 * registration inside D_AI Desktop's independent Electron userData root.
 */
import path from "node:path"

export function forkCliEnvironment(userData: string) {
  if (!path.isAbsolute(userData)) throw new Error("D_AI profile requires an absolute userData root")
  const root = path.join(path.resolve(userData), "cli-profile")
  return {
    XDG_DATA_HOME: path.join(root, "data"),
    XDG_CACHE_HOME: path.join(root, "cache"),
    XDG_CONFIG_HOME: path.join(root, "config"),
    XDG_STATE_HOME: path.join(root, "state"),
    OPENCODE_CONFIG_DIR: path.join(root, "config", "opencode"),
    OPENCODE_DB: path.join(root, "data", "opencode", "opencode.db"),
  } as const
}

/** The upstream onboarding/isolated test suite owns its test XDG directories. */
export function useForkProfile() {
  return process.env.OPENCODE_TEST_ONBOARDING !== "1" && !process.env.OPENCODE_DESKTOP_TEST_ROOT
}
