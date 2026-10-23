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

const agents = {
  "dai-os": "dai-os.md",
  "dai/shared/explorer": "dai/shared/explorer.md",
  "dai/shared/reviewer": "dai/shared/reviewer.md",
  "dai/engineer/implementer": "dai/engineer/implementer.md",
} as const

/** Parse the four required Core agents without evaluating arbitrary YAML. */
function readAgent(file: string) {
  if (!regularFile(file)) throw new Error(`Missing required Core agent: ${file}`)
  const raw = readFileSync(file, "utf8")
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/u.exec(raw)
  if (!match) throw new Error(`Invalid Core agent frontmatter: ${file}`)
  const properties = new Map(match[1].split(/\r?\n/u).map(line => {
    const index = line.indexOf(":")
    if (index < 1) throw new Error(`Invalid Core agent metadata: ${file}`)
    return [line.slice(0, index).trim(), line.slice(index + 1).trim()] as const
  }))
  const mode = properties.get("mode")
  if (mode !== "primary" && mode !== "subagent") throw new Error(`Unknown Core agent mode: ${file}`)
  const desc = JSON.parse(properties.get("description") ?? "null")
  const steps = Number(properties.get("steps"))
  const permissions: unknown = JSON.parse(properties.get("permissions") ?? "null")
  if (typeof desc !== "string" || !Number.isSafeInteger(steps) || steps < 1 ||
      !Array.isArray(permissions) || !permissions.every(rule =>
        object(rule) && typeof rule.action === "string" && typeof rule.resource === "string" &&
        ["allow", "ask", "deny"].includes(String(rule.effect)))) {
    throw new Error(`Invalid native V2 agent metadata: ${file}`)
  }
  return { mode, description: desc, steps, permissions, system: match[2].trim() }
}

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
  const nativeAgents = Object.fromEntries(Object.entries(agents).map(([id, relative]) => [
    id, readAgent(path.join(core, "adapters", "opencode", "agent", relative)),
  ]))
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
  if (document.agents !== undefined && !object(document.agents))
    throw new Error("Existing native agents configuration must be a mapping")
  const existingAgents = (document.agents ?? {}) as Record<string, unknown>
  const newAgents = Object.fromEntries(Object.entries(nativeAgents).filter(([id]) => !(id in existingAgents)))
  const changed = !plugins.some(value => value === plugin || (object(value) && value.package === plugin)) ||
    Object.keys(newAgents).length > 0
  const updated = changed ? {
    ...document,
    plugins: plugins.some(value => value === plugin || (object(value) && value.package === plugin)) ? plugins : [...plugins, plugin],
    agents: { ...existingAgents, ...newAgents },
    // Opting in installs the actual D_AI primary; never replace an explicit owner choice.
    default_agent: document.default_agent ?? "dai-os",
  } : document
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
