# M7 — D_AI native router in the Desktop fork (developer opt-in)

Core source: [D_AI value routing PR #30](https://github.com/amroquqa99-art/D_AI/pull/30).
CI pins the green Core revision `a4837c9c9f91094cf67529f60a1cc54279da3070`.

## Enable in a development checkout

Set `DAI_DESKTOP_ROUTER_ENABLE=1` and `DAI_DESKTOP_CORE_CWD` to an absolute, trusted D_AI checkout directory BEFORE starting D_AI Desktop.
Do not point the installer at the original OpenCode config. A freshly initialized D_AI Desktop CLI profile is required.

### What gets installed

- The native V2 `dai.native-router` plugin is registered by its absolute local checkout directory.
- D_AI OS agents, skills and commands are copied to the isolated `userData/cli-profile/config/opencode` folder.
- The OpenCode V2 config selects the `dai-os` **agent**, not a forced main chat **model**.
- Task-class Auto defaults, model profiles and cost policy are copied into `userData/cli-profile/dai-router-data/config`; runtime state and worker preferences are maintained outside the source checkout.
- The backend CLI passes `DAI_OPENCODE_COMMAND_JSON` matching its actual binary or Bun launch vector, preventing accidental calls through a different OpenCode installation.
- The plugin retains user-owned native OpenCode Console OAuth, Go API key identity and independent third-party subscriptions/API keys. Auto considers free and paid worker models based on task quality and estimated cost; manual model pins override Auto.

## Security and migration

Opt-in only. Existing `opencode.json`, `opencode.jsonc`, agent/skill/command definitions, non-matching manifests or symlinked profile roots cause refusal, not overwrite. Initial writes have an ownership manifest. Source checkouts MUST be trusted because the native router is executable JavaScript. Updates to an already installed profile are deliberately not automatic.

### What remains unverified

Although native source/plugin import, setup checks, TypeScript bundling and cross-OS contract tests run in CI, **real Electron packaged GUI startup, actual authentication with a user account, live provider inference, the server's free-tier restrictions, plugin-executed agent turns, and financial spending enforcement are NOT proven by those tests**. The Python mission bridge is still read-only. No APK/native installers or release are claimed.

OpenCode original models are never silently forced free; the normal manual selector remains available.
