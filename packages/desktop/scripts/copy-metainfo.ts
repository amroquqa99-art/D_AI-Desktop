import { resolveChannel } from "./utils"

const arg = process.argv[2]

const channel = arg === "dev" || arg === "beta" || arg === "prod" ? arg : resolveChannel()

const appId = channel === "prod" ? "online.amroquqa.dai.desktop" : `online.amroquqa.dai.desktop.${channel}`

const productName = channel === "prod" ? "D_AI Desktop" : `D_AI Desktop ${channel.charAt(0).toUpperCase() + channel.slice(1)}`

const summary = `Open-source, local-first multi-agent coding workspace${channel !== "prod" ? ` (${channel})` : ""}`

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<component type="desktop-application">
  <id>${appId}</id>

  <metadata_license>CC0-1.0</metadata_license>
  <project_license>GPL-3.0-or-later</project_license>

  <name>${productName}</name>
  <summary>${summary}</summary>

  <developer id="online.amroquqa">
    <name>D_AI Desktop contributors</name>
  </developer>

  <description>
    <p>
      D_AI Desktop is a GPL-licensed desktop fork of OpenCode that integrates the D_AI control plane. Original OpenCode MIT components remain credited.
    </p>
  </description>

  <launchable type="desktop-id">${appId}.desktop</launchable>

  <content_rating type="oars-1.1" />

  <url type="bugtracker">https://github.com/amroquqa99-art/D_AI-Desktop/pulls</url>
  <url type="homepage">https://github.com/amroquqa99-art/D_AI-Desktop</url>
  <url type="vcs-browser">https://github.com/amroquqa99-art/D_AI-Desktop</url>

</component>
`

await Bun.write(`resources/${appId}.metainfo.xml`, xml)

console.log(`Generated metainfo for ${channel} at resources/${appId}.metainfo.xml`)
