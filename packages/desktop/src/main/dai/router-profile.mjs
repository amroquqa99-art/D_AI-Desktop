/** SPDX-License-Identifier: GPL-3.0-or-later
 * Opt-in D_AI OS + native router installation into THIS fork's CLI profile.
 * Never modify the user's original OpenCode installation or an existing config.
 */
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

const sources = ["agent", "skill", "command"];
const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
const privateMode = 0o700;

export async function installDaiRouterProfile({
  enabled = process.env.DAI_DESKTOP_ROUTER_ENABLE === "1",
  coreDir = process.env.DAI_DESKTOP_CORE_CWD,
  configDir = process.env.OPENCODE_CONFIG_DIR,
} = {}) {
  if (!enabled) return { state: "disabled" };
  if (!coreDir || !path.isAbsolute(coreDir) || !configDir || !path.isAbsolute(configDir))
    return { state: "skipped", reason: "absolute Core checkout and isolated CLI config paths required" };

  const core = await fs.realpath(coreDir).catch(() => null);
  if (!core) return { state: "skipped", reason: "Core checkout unavailable" };
  const adapter = path.join(core, "adapters", "opencode");
  const router = path.join(adapter, "router");
  try {
    for (const name of ["index.js", "core.js", "value.js", "package.json"])
      if (!(await fs.stat(path.join(router, name))).isFile()) throw Error("missing router " + name);
    for (const name of sources)
      if (!(await fs.stat(path.join(adapter, name))).isDirectory()) throw Error("missing definitions " + name);
    // Do not run arbitrary source merely because a similarly named file exists.
    const entry = await fs.readFile(path.join(router, "index.js"), "utf8");
    if (!entry.includes("dai.native-router")) throw Error("unrecognized native router");
  } catch (error) {
    return { state: "skipped", reason: "incompatible D_AI checkout: " + error.message };
  }

  // Only fork-owned roots may be written. This function never discovers ~/.config/opencode.
  const root = path.resolve(configDir);
  if (path.basename(root) !== "opencode" ||
      path.basename(path.dirname(root)) !== "config" ||
      path.basename(path.dirname(path.dirname(root))) !== "cli-profile")
    return { state: "skipped", reason: "refusing non-D_AI Desktop configuration root" };

  // Do not follow a pre-existing symlink in the target path.
  for (const candidate of [path.dirname(path.dirname(root)), path.dirname(root), root]) {
    const stat = await fs.lstat(candidate).catch(error => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
    if (stat?.isSymbolicLink()) return { state: "skipped", reason: "symlinked profile directory" };
  }
  await fs.mkdir(root, { recursive: true, mode: privateMode });
  const lock = path.join(root, ".dai-router-install.lock");
  let guard;
  try { guard = await fs.open(lock, "wx", 0o600); }
  catch (error) {
    if (error.code === "EEXIST") return { state: "skipped", reason: "existing installation lock needs review" };
    throw error;
  }
  try {
    const mainConfig = path.join(root, "opencode.jsonc");
    const legacyConfig = path.join(root, "opencode.json");
    const manifestFile = path.join(root, "dai-router-install.json");
    const metadata = await fs.readFile(manifestFile, "utf8").then(JSON.parse).catch(error => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
    if (metadata) {
      const current = await fs.readFile(mainConfig).catch(() => null);
      const copied = await Promise.all(sources.map(async name =>
        (await fs.stat(path.join(root, name)).catch(() => null))?.isDirectory()));
      return current && sha256(current) === metadata.config_sha256 && copied.every(Boolean) &&
        metadata.core === core && metadata.router === router
        ? { state: "installed", detail: "verified existing installation" }
        : { state: "skipped", reason: "managed config/definitions changed; manual review required" };
    }
    // Treat ANY existing host config or definitions as user owned.
    for (const name of ["opencode.json", "opencode.jsonc", ...sources, "dai-router-install.json"]) {
      if (await fs.lstat(path.join(root, name)).then(() => true, error => {
        if (error.code === "ENOENT") return false;
        throw error;
      })) return { state: "skipped", reason: "existing OpenCode configuration/definitions; refusing overwrite" };
    }

    const created = [];
    try {
      for (const name of sources) {
        const target = path.join(root, name);
        await fs.cp(path.join(adapter, name), target, {
          recursive: true, force: false, errorOnExist: true, dereference: false,
        });
        created.push(target);
      }
      const document = {
        "$schema": "https://opencode.ai/config.json",
        plugins: [router],
        default_agent: "dai-os",
      };
      const bytes = Buffer.from(JSON.stringify(document, null, 2) + "\n");
      await fs.writeFile(mainConfig, bytes, { flag: "wx", mode: 0o600 });
      created.push(mainConfig);
      const manifest = {
        schema_version: 1, core, router, config_sha256: sha256(bytes),
        installed_at: new Date().toISOString(),
        managed_paths: [...sources, "opencode.jsonc"],
      };
      await fs.writeFile(manifestFile, JSON.stringify(manifest, null, 2) + "\n", { flag: "wx", mode: 0o600 });
      return { state: "installed", detail: "D_AI native router and agent definitions enabled" };
    } catch (error) {
      // Delete ONLY files this attempt created and only before a managed manifest exists.
      // An interrupted installation is intentionally left for human review.
      if (!(await fs.stat(manifestFile).catch(() => null)))
        for (const target of created.reverse()) await fs.rm(target, { force: true, recursive: true }).catch(() => {});
      return { state: "skipped", reason: "installation failed: " + error.message };
    }
  } finally {
    await guard.close();
    await fs.unlink(lock).catch(() => {});
  }
}
