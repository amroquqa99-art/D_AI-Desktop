# D_AI Desktop — initial integration

Implemented on the OpenCode Desktop fork: a GPL-licensed, opt-in,
read-only companion D_AI Core process supervised by Electron main.

## How to test

The D_AI Core Python bridge is in:
https://github.com/amroquqa99-art/D_AI/pull/28

Install that branch in a Python environment, then configure the fork's
OpenCode Desktop development process with:

- DAI_DESKTOP_BRIDGE_PYTHON: absolute path to the Python executable.
- DAI_DESKTOP_CORE_CWD: optional D_AI Core checkout directory.
- DAI_DESKTOP_CATALOG_PATH: optional full path to config/systems.json.
- PYTHONPATH: D_AI Core src directory, if the package is not installed.

Start the normal OpenCode Desktop dev application. The Electron main-process
log must say [D_AI Desktop] bridge: connected. With no Python env variable,
the original OpenCode Desktop runs unchanged.

Security contract: random per-child 96-character secret via environment;
loopback-only bind, random ephemeral port, health verification, explicit
read-only endpoints, no CORS; no secret or direct bridge client in renderer.
The Electron main process stops its child on app quit.

## Limitations

There is currently no new renderer UI, no D_AI mission execution RPC, no
bundled Python runtime, and no packaged Windows/macOS/Linux deliverable.
The D_AI MemoryStore imports Unix-only fcntl and requires a separate portability
refactor before claiming full native Windows support.

GPL-3.0-or-later applies to the combined derivative distribution while the
original MIT OpenCode attribution remains in LICENSES/OpenCode-MIT.txt.
No OpenGrokBot code is imported yet; it needs supply-chain review first.

Tests: node --test packages/desktop/src/main/dai/bridge.test.mjs
Real handshake: DAI_TEST_CORE_DIR=/path/to/D_AI node --test packages/desktop/src/main/dai/bridge.smoke.test.mjs


## M2: Typed IPC and visible status panel

- D_AI status and sanitized system catalog are now exposed through two **read-only typed Effect RPC** operations: `DaiDesktopStatus` and `DaiDesktopSystems`.
- A floating D_AI panel in the original OpenCode Desktop renderer shows the connectivity state, configured systems and their maturity/validation metadata.
- The renderer receives **no** Python token, port, process handle or arbitrary command execution ability.
- The UI is a verification panel, not a claim that D_AI missions or agent teams work yet.


### Packaging metadata

The derived Desktop **distribution package** now declares GPL-3.0-or-later. Upstream OpenCode MIT source notices remain preserved in LICENSES/OpenCode-MIT.txt. The original upstream brand and auto-update configuration still need a separate safe rebranding milestone before public binary release; this PR is not a public release.


## Fork identity isolation (M4 partial)

Electron app IDs and private Electron userData folder are now `online.amroquqa.dai.desktop[.dev|.beta]`, distinct from OpenCode. Linux app metadata/package names and Windows/macOS app identifiers are distinct; only `dai-desktop://` is registered as an external protocol. `opencode://` remains owned by OpenCode and is not registered by this fork.

D_AI Desktop auto-update publishing is disabled; no OpenCode upstream update endpoint is configured, and the inherited desktop publishing script fails closed until an independent signing/update service is audited. Upstream OpenCode CLI, source licensing notices and asset formats remain unmodified for now.

**Not release-ready:** the bundled OpenCode CLI may still use shared configuration and databases outside the isolated Electron userData directory; URL sign-in callbacks requiring `opencode://` need independent compatibility testing. Current icons and other upstream graphic assets need replacement/rights review, and the Python D_AI Core is not bundled. Never claim full separation or ship installers until these gates pass.


## Isolating the inherited OpenCode CLI (M4 follow-up)

The bundled OpenCode CLI now receives dedicated XDG config, data, cache and
state roots below D_AI Desktop's Electron \`userData/cli-profile\`. The
\`OPENCODE_CONFIG_DIR\` and \`OPENCODE_DB\` overrides are always rooted there.
The desktop's own sidecar-discovery registration is therefore independent of
an existing OpenCode installation. D_AI Desktop does not read or migrate
credentials from OpenCode; login is intentionally separate.

The profile is selected before the sidecar probe and reasserted after shell
environment imports. Upstream onboarding test modes preserve their own
ephemeral filesystem roots.

**Remaining:** Verify native production installers and external authentication
flows; test the upstream CLI's temporary directories, extension caches and
plugins; audit symlink and path traversals before claiming a full security
sandbox. Isolated configuration is **not** a replacement for OS-level agent
sandboxing or an entitlement/ACL policy.
