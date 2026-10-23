/** SPDX-License-Identifier: GPL-3.0-or-later
 * Read-only D_AI state owned exclusively by Electron main, never its renderer.
 */
import { launchDaiDesktopBridge } from "./bridge.mjs";

export function createDaiDesktopManager({ launch = launchDaiDesktopBridge } = {}) {
  let state = "disabled", version = null, child = null, systems = [], pending = null;
  let quitting = false, appRef = null, quitListener = null;
  const snapshot = () => ({ state, mode: state === "connected" ? "read_only" : "none", version });
  const drop = async (newState) => {
    const old = child;
    child = null; systems = []; version = null; state = newState;
    if (old) { try { await old.stop(); } catch { /* shutdown best effort */ } }
  };
  const start = (app, {
    python = process.env.DAI_DESKTOP_BRIDGE_PYTHON,
    cwd = process.env.DAI_DESKTOP_CORE_CWD || process.cwd(),
    catalogPath = process.env.DAI_DESKTOP_CATALOG_PATH,
  } = {}) => {
    if (!python) return Promise.resolve(snapshot());
    if (pending) return pending;
    if (state === "connected") return Promise.resolve(snapshot());
    if (!app || typeof app.once !== "function" || typeof app.off !== "function")
      throw new TypeError("Electron app lifecycle required");
    quitting = false; state = "starting"; appRef = app;
    quitListener = () => { quitting = true; void drop("disabled"); };
    app.once("before-quit", quitListener);
    pending = (async () => {
      try {
        const handle = await launch({ python, cwd, catalogPath, startupTimeoutMs: 45000 });
        child = handle;
        if (quitting) { await drop("disabled"); return snapshot(); }
        const health = await handle.client.health();
        if (health?.service !== "dai-desktop-bridge" || health.mode !== "read_only" ||
            health.status !== "ok" || typeof health.version !== "string")
          throw new Error("Unrecognized D_AI service");
        const data = await handle.client.systems();
        if (!Array.isArray(data?.systems) || data.systems.length > 100)
          throw new Error("Invalid D_AI systems response");
        const clean = data.systems.map(item => {
          if (!item || typeof item.id !== "string" || item.id.length > 128 ||
              !Array.isArray(item.roles) || item.roles.length > 50 ||
              item.roles.some(role => typeof role !== "string" || role.length > 120))
            throw new Error("Malformed system metadata");
          return {
            id: item.id, primary: typeof item.primary === "string" ? item.primary.slice(0, 128) : null,
            roles: [...item.roles], maturity: String(item.maturity || "UNKNOWN").slice(0, 80),
            professional_validation: String(item.professional_validation || "UNKNOWN").slice(0, 80),
          };
        });
        if (quitting) { await drop("disabled"); return snapshot(); }
        systems = clean; version = health.version.slice(0, 80); state = "connected";
      } catch {
        await drop(quitting ? "disabled" : "unavailable");
      } finally {
        if (state !== "connected" && appRef && quitListener) {
          appRef.off("before-quit", quitListener); appRef = null; quitListener = null;
        }
        pending = null;
      }
      return snapshot();
    })();
    return pending;
  };
  const status = async () => {
    if (state === "connected" && child) {
      try {
        const health = await child.client.health();
        if (health?.service !== "dai-desktop-bridge" || health.status !== "ok" || health.mode !== "read_only")
          throw new Error("D_AI bridge unhealthy");
      } catch { await drop("unavailable"); }
    }
    return snapshot();
  };
  const list = () => state === "connected" ? systems.map(s => ({ ...s, roles: [...s.roles] })) : [];
  const projectPattern = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/;
  const projects = async () => {
    if (state !== "connected" || !child) throw new Error("D_AI Core is not connected");
    const data = await child.client.projects();
    if (!Array.isArray(data?.projects) || data.projects.length > 100) {
      throw new Error("Invalid D_AI projects response");
    }
    return data.projects.map((item) => {
      if (!item || typeof item.id !== "string" || !projectPattern.test(item.id) ||
          typeof item.name !== "string" || item.name.length > 300) {
        throw new Error("Malformed D_AI project metadata");
      }
      return { id: item.id, name: item.name };
    });
  };
  const missions = async (projectId) => {
    if (typeof projectId !== "string" || !projectPattern.test(projectId)) {
      throw new Error("Invalid D_AI project identifier");
    }
    if (state !== "connected" || !child) throw new Error("D_AI Core is not connected");
    const data = await child.client.missions(projectId);
    if (data?.project_id !== projectId || !Array.isArray(data.missions) ||
        data.missions.length > 50) {
      throw new Error("Invalid D_AI mission response");
    }
    return data.missions.map((item) => {
      if (!item || typeof item.id !== "string" || !projectPattern.test(item.id) ||
          typeof item.system !== "string" || item.system.length > 128 ||
          typeof item.status !== "string" || item.status.length > 80 ||
          typeof item.objective !== "string" || item.objective.length > 12000 ||
          typeof item.next_action !== "string" || item.next_action.length > 12000 ||
          !Number.isSafeInteger(item.version) || item.version < 1) {
        throw new Error("Malformed D_AI mission metadata");
      }
      return {
        id: item.id, system: item.system, objective: item.objective.slice(0, 600),
        status: item.status, next_action: item.next_action.slice(0, 600),
        version: item.version,
      };
    });
  };
  const stop = async () => {
    quitting = true;
    if (appRef && quitListener) appRef.off("before-quit", quitListener);
    appRef = null; quitListener = null;
    await drop("disabled");
  };
  return Object.freeze({ start, status, systems: list, projects, missions, stop });
}

export const daiDesktopManager = createDaiDesktopManager();
