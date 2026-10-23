/** SPDX-License-Identifier: GPL-3.0-or-later
 * Explicit, additive registration of the reviewed D_AI Core V2 plugin inside
 * D_AI Desktop's *own* OpenCode CLI profile. No credentials are imported.
 * This is an opt-in development integration, not a packaged Core runtime.
 */
import { createHash, randomUUID } from "node:crypto"
import { closeSync, existsSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, realpathSync, renameSync, unlinkSync, writeSync } from "node:fs"
import path from "node:path"
import { forkCliEnvironment } from "./profile"

const defaults = ["routing-preferences.json", "model-routing-policy.json", "model-profiles.json"] as const

export function daiRouterStateRoot(userData: string) {
  if (!path.isAbsolute(userData)) throw new Error("D_AI userData root must be absolute")
  return path.join(path.resolve(userData), "cli-profile", "dai-router")
}

function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

function readObject(file: string) {
  const parsed: unknown = JSON.parse(readFileSync(file, "utf8"))
  if (!object(parsed)) throw new Error(`Expected JSON object: ${file}`)
  return parsed
}

function regularFile(file: string) {
  return existsSync(file) && lstatSync(file).isFile() && !lstatSync(file).isSymbolicLink()
}

function writeAtomic(file: string, content: string) {
  if (existsSync(file) && !regularFile(file)) throw new Error(`Refusing non-regular profile file: ${file}`)
  mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 })
  const temp = file + "." + randomUUID() + ".tmp"
  let handle: number | undefined
  try {
    handle = openSync(temp, "wx", 0o600)
    writeSync(handle, content)
    fsyncSync(handle)
    closeSync(handle)
    handle = undefined
    renameSync(temp, file)
  } finally {
    if (handle !== undefined) closeSync(handle)
    if (existsSync(temp)) unlinkSync(temp)
  }
}

export interface DaiRouterInstallation {
  readonly plugin: string
  readonly config: string
  readonly dataRoot: string
  readonly changed: boolean
}

/** Opt-in only. Refuse JSONC rewriting, unmanaged symlinks and invalid Core.
 * Never change model/provider selection, subscription, OAuth or API-key data.
 */
export function installDaiRouterProfile(userData: string, coreDirectory: string): DaiRouterInstallation {
  if (!path.isAbsolute(coreDirectory)) throw new Error("DAI_DESKTOP_CORE_CWD must be an absolute path")
  const core = realpathSync(coreDirectory)
  const plugin = path.join(core, "adapters", "opencode", "router")
  const metadata = path.join(plugin, "package.json")
  if (!["index.js", "core.js", "value.js", "package.json"].every(name => regularFile(path.join(plugin, name))) ||
      readObject(metadata).name !== "dai-native-router") {
    throw new Error("D_AI Core V2 router missing; use a reviewed Core revision with native value routing")
  }
  const seed = defaults.map(name => {
    const source = path.join(core, "config", name)
    if (!regularFile(source)) throw new Error(`D_AI Core config missing: ${name}`)
    return { name, content: JSON.stringify(readObject(source), null, 2) + "\n" }
  })
  const configDir = forkCliEnvironment(userData).OPENCODE_CONFIG_DIR
  const config = path.join(configDir, "opencode.json")
  if (existsSync(path.join(configDir, "opencode.jsonc"))) {
    throw new Error("Existing JSONC configuration requires explicit manual plugin installation; no rewrite attempted")
  }
  if (existsSync(config) && !regularFile(config)) throw new Error("Refusing symlink/non-regular OpenCode configuration")
  const original = existsSync(config) ? readFileSync(config) : undefined
  const document = original ? readObject(config) : {}
  const plugins = document.plugins ?? []
  if (!Array.isArray(plugins) || plugins.some(value => typeof value !== "string" && !object(value))) {
    throw new Error("Existing plugins configuration is not a valid array")
  }
  const changed = !plugins.some(value => value === plugin || (object(value) && value.package === plugin))
  const updated = changed ? { ...document, plugins: [...plugins, plugin] } : document
  const dataRoot = daiRouterStateRoot(userData)
  // Preflight existing state: a user-edited file is never replaced.
  for (const { name } of seed) {
    const destination = path.join(dataRoot, "config", name)
    if (existsSync(destination) && !regularFile(destination)) throw new Error(`Refusing non-regular data file: ${name}`)
  }
  if (changed && original) {
    const hash = createHash("sha256").update(original).digest("hex").slice(0, 16)
    const backup = config + ".dai-original-" + hash
    if (existsSync(backup)) {
      if (!regularFile(backup) || createHash("sha256").update(readFileSync(backup)).digest("hex").slice(0, 16) !== hash)
        throw new Error("Original config backup conflict; refusing modification")
    } else writeAtomic(backup, original.toString("utf8"))
  }
  for (const item of seed) {
    const destination = path.join(dataRoot, "config", item.name)
    if (!existsSync(destination)) writeAtomic(destination, item.content)
  }
  if (changed) writeAtomic(config, JSON.stringify(updated, null, 2) + "\n")
  return { plugin, config, dataRoot, changed }
}
