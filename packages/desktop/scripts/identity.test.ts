/** SPDX-License-Identifier: GPL-3.0-or-later
 * Guard against inherited OpenCode identity, updates or branding reappearing.
 */
import { expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const dir = join(import.meta.dirname, "..")
const text = (file: string) => readFileSync(join(dir, file), "utf8")
const ids = [
  { channel: "dev", id: "online.amroquqa.dai.desktop.dev" },
  { channel: "beta", id: "online.amroquqa.dai.desktop.beta" },
  { channel: "prod", id: "online.amroquqa.dai.desktop" },
]

test("fork application identifiers never reuse OpenCode IDs", () => {
  const constants = text("src/main/constants.ts")
  for (const entry of ids) expect(constants).toContain(entry.id)
  expect(constants).not.toContain('"ai.opencode.desktop"')
  expect(constants).not.toContain('"ai.opencode.desktop.dev"')
})

test("no inherited OpenCode update publisher and no upstream protocol takeover", () => {
  const config = text("electron-builder.config.ts")
  const publisher = text("scripts/publish.ts")
  const environment = text("src/main/lifecycle/environment.ts")
  const lifecycle = text("src/main/lifecycle/index.ts")
  expect(config).not.toContain("opencode.ai/update/api")
  expect(config).toContain("publish: []")
  expect(publisher).toContain("public publishing is disabled")
  expect(environment).toContain('app.setAsDefaultProtocolClient("dai-desktop")')
  expect(environment).not.toContain('app.setAsDefaultProtocolClient("opencode")')
  expect(lifecycle).toContain('arg.startsWith("dai-desktop://")')
})

test.each(ids)("AppStream is generated with GPL and independent identity ($channel)", async ({ channel, id }) => {
  const result = Bun.spawnSync(["bun", "./scripts/copy-metainfo.ts", channel], {
    cwd: dir, stdout: "pipe", stderr: "pipe",
  })
  expect(result.exitCode).toBe(0)
  const file = await Bun.file(join(dir, "resources", id + ".metainfo.xml")).text()
  expect(file).toContain("<id>" + id + "</id>")
  expect(file).toContain("<project_license>GPL-3.0-or-later</project_license>")
  expect(file).toContain("D_AI Desktop")
  expect(file).not.toContain("https://opencode.ai")
  expect(file).not.toContain("<name>OpenCode</name>")
})
