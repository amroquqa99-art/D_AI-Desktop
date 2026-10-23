// Imported first so its evaluation stamps the moment Electron handed control to this module.
import { marks } from "./lifecycle/marks"
import { app } from "electron"
import { acquireApplicationLock, configureApplication } from "./lifecycle/configure"
import { startSidecarProbe } from "./service/sidecar-probe"
import { registerStorageSnapshotHandler } from "./storage/snapshot"
import { createEarlyWindow } from "./windows/early"
import { rendererAssetsServed } from "./windows/protocol"
import { registerRendererScheme } from "./windows/scheme"
import { useForkProfile } from "./lifecycle/profile"

// This module stays small on purpose. Electron holds the ready event until the entry module has
// finished, and the first window should be on screen before the rest of the main process — a few
// hundred milliseconds of module evaluation and layers — loads. Configuration and the scheme must
// precede ready; the window is created the moment ready fires; everything else is imported after.
configureApplication()

if (acquireApplicationLock()) {
  registerRendererScheme()
  // Window first, then the bundle: starting the import before ready delays ready itself, because the
  // module graph evaluates on the same thread Chromium needs to finish initialising.
  void app.whenReady().then(async () => {
    marks.ready = Date.now()
    registerStorageSnapshotHandler()
    createEarlyWindow()
    marks.window = Date.now()
    // Provision the one reviewed, opt-in native router in this fork's profile
    // before service discovery. Never touch original OpenCode credentials.
    if (useForkProfile() && process.env.DAI_DESKTOP_ROUTER_ENABLE === "1") {
      try {
        const { installDaiRouterProfile } = await import("./dai/router-profile.mjs")
        const result = await installDaiRouterProfile()
        console.info("[D_AI Desktop] native router profile:", result.state, result.detail ?? result.reason ?? "")
      } catch (error) {
        console.warn("[D_AI Desktop] native router install unavailable:", String(error))
      }
    }
    startSidecarProbe()

    // The window's renderer is already loading. Its HTML and preloaded chunks are served from this
    // thread, so the bundle waits for that burst to be answered (or a cap) before it evaluates.
    if (!process.env.ELECTRON_RENDERER_URL) await rendererAssetsServed({ quietMs: 40, capMs: 400 })
    marks.served = Date.now()

    return import("./desktop")
  })
}
