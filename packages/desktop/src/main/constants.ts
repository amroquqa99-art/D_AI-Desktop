import { app } from "electron"

type Channel = "local" | "dev" | "beta" | "prod"

const raw = import.meta.env.OPENCODE_CHANNEL

export const CHANNEL: Channel = raw === "local" || raw === "dev" || raw === "beta" || raw === "prod" ? raw : "dev"

export const VERSION = app.isPackaged ? app.getVersion() : (process.env.OPENCODE_VERSION ?? app.getVersion())

const appNames: Record<string, string> = {
  dev: "D_AI Desktop Dev",
  beta: "D_AI Desktop Beta",
  prod: "D_AI Desktop",
}

const appIDs: Record<string, string> = {
  dev: "online.amroquqa.dai.desktop.dev",
  beta: "online.amroquqa.dai.desktop.beta",
  prod: "online.amroquqa.dai.desktop",
}

// Local renderer/server mode keeps the dev application identity.
export const APP_NAME = app.isPackaged ? appNames[CHANNEL] : "D_AI Desktop Dev"

export const APP_ID = app.isPackaged ? appIDs[CHANNEL] : "online.amroquqa.dai.desktop.dev"
