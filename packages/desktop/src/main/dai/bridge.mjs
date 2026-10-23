/** SPDX-License-Identifier: GPL-3.0-or-later
 * Authenticated read-only D_AI Core child lifecycle, Electron main process only.
 */
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createDaiDesktopClient } from "./client.mjs";

export function launchDaiDesktopBridge({
  python, cwd = process.cwd(), env = process.env, catalogPath,
  startupTimeoutMs = 12000
} = {}) {
  if (typeof python !== "string" || !python.trim()) throw new Error("Explicit Python executable required");
  if (!Number.isSafeInteger(startupTimeoutMs) || startupTimeoutMs < 100 || startupTimeoutMs > 60000) {
    throw new RangeError("Invalid bridge startup timeout");
  }
  const token = randomBytes(48).toString("hex");
  const args = ["-m", "dai.desktop_bridge", "--port", "0"];
  if (catalogPath) args.push("--catalog", catalogPath);
  const child = spawn(python, args, {
    cwd, env: { ...env, DAI_DESKTOP_BRIDGE_TOKEN: token },
    stdio: ["ignore", "pipe", "pipe"], windowsHide: true
  });
  return new Promise((resolve, reject) => {
    let settled = false;
    let buffer = "";
    const timer = setTimeout(() => fail(new Error("D_AI bridge startup timed out")), startupTimeoutMs);
    const cleanup = () => {
      clearTimeout(timer);
      child.stdout?.off("data", receive);
      child.off("error", onError);
      child.off("exit", onExit);
    };
    const fail = (error) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (child.exitCode === null && child.signalCode === null) child.kill();
      reject(error);
    };
    const onError = () => fail(new Error("D_AI bridge spawn failed"));
    const onExit = () => fail(new Error("D_AI bridge exited before READY"));
    const receive = (chunk) => {
      if (settled) return;
      buffer += chunk.toString("utf8");
      if (buffer.length > 4096) return fail(new Error("D_AI bridge startup output exceeded limit"));
      const newline = buffer.indexOf("\n");
      if (newline === -1) return;
      let ready;
      try { ready = JSON.parse(buffer.slice(0, newline)); }
      catch { return fail(new Error("Invalid D_AI bridge READY JSON")); }
      if (ready?.event !== "READY" || ready.address !== "127.0.0.1" ||
          !Number.isInteger(ready.port) || ready.port < 1 || ready.port > 65535) {
        return fail(new Error("Invalid D_AI bridge READY values"));
      }
      settled = true;
      cleanup();
      const client = createDaiDesktopClient({
        baseUrl: "http://127.0.0.1:" + ready.port + "/", token
      });
      let stopped = false;
      const stop = async () => {
        if (stopped) return;
        stopped = true;
        if (child.exitCode !== null || child.signalCode !== null) return;
        await new Promise(done => {
          let doneCalled = false;
          const finish = () => {
            if (doneCalled) return;
            doneCalled = true;
            clearTimeout(timeout);
            child.off("exit", finish);
            done();
          };
          const timeout = setTimeout(() => { child.kill(); finish(); }, 3000);
          child.once("exit", finish);
          if (!child.kill()) finish();
        });
      };
      resolve(Object.freeze({ client, stop, processId: child.pid }));
    };
    child.stdout?.on("data", receive);
    child.once("error", onError);
    child.once("exit", onExit);
  });
}

export async function attachDaiDesktopBridge(app, {
  python = process.env.DAI_DESKTOP_BRIDGE_PYTHON,
  cwd = process.env.DAI_DESKTOP_CORE_CWD || process.cwd(),
  catalogPath = process.env.DAI_DESKTOP_CATALOG_PATH,
  launch = launchDaiDesktopBridge,
  onState = () => {}
} = {}) {
  if (!python) return { status: "disabled" };
  let closing = false;
  let bridge;
  const stop = () => {
    closing = true;
    if (bridge) void bridge.stop();
  };
  app.once("before-quit", stop);
  let result;
  try {
    bridge = await launch({ python, cwd, catalogPath });
    if (closing) {
      await bridge.stop();
      result = { status: "stopped" };
    } else {
      const health = await bridge.client.health();
      if (health?.service !== "dai-desktop-bridge" || health.mode !== "read_only") {
        await bridge.stop();
        result = { status: "incompatible" };
      } else if (closing) {
        await bridge.stop();
        result = { status: "stopped" };
      } else {
        result = { status: "connected" };
      }
    }
  } catch {
    if (bridge) await bridge.stop();
    result = { status: "unavailable" };
  }
  if (result.status !== "connected") app.off("before-quit", stop);
  onState(result);
  return result;
}
