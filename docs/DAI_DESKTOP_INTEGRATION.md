# D_AI Desktop — initial integration

Implemented on the OpenCode Desktop fork: a GPL-licensed, opt-in,
read-only companion D_AI Core process supervised by Electron main.

## How to test

The integrated, read-only D_AI Core mission bridge is in the stacked
[Core PR #29](https://github.com/amroquqa99-art/D_AI/pull/29), on top of
the central OS [PR #27](https://github.com/amroquqa99-art/D_AI/pull/27).
The original bridge prototype remains [PR #28](https://github.com/amroquqa99-art/D_AI/pull/28).
This Desktop branch pins the integrated Core commit
`4d84f649b741369c572626bb0ee18e19fa5a7d23` for three-platform smoke tests.

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

The renderer now has a read-only D_AI status/systems/projects/missions panel.
There is **no mission execution or mutation RPC**, no approval workflow,
no bundled Python runtime, and no packaged Windows/macOS/Linux deliverable.
Windows portable memory locks and private ACL tests passed in the Core branch,
but native app and power-loss acceptance remain open.

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

## Docker / Compose developer checks

The repository includes an offline, read-only Node contract runner for the Desktop bridge:

```sh
docker compose -f desktop/compose.yaml up --build --abort-on-container-exit --exit-code-from bridge-contract
```

This container deliberately has no network access, runs as an unprivileged user
and has no file-system write access except /tmp. It validates the JavaScript
bridge lifecycle contract; it is **not** a replacement for testing real
Electron windows or the Python D_AI Core on all native operating systems.


## M5: read-only project and mission UI (experimental)

- The Core `/v1/projects` and `/v1/projects/{project_id}/missions`
  endpoints are authenticated, loopback-only and restricted to local-installation
  administrator permissions. They disclose only limited project and mission
  summaries, not evidence bodies, approvals or keys.
- Electron main fetches and sanitizes bounded summaries. Typed `DaiDesktopProjects`
  and `DaiDesktopMissions` IPC expose **only** project IDs, names, mission
  objectives, statuses, next actions and versions to the renderer.
- The user selects a project in the native D_AI panel to view its missions.
  No model can trigger writes through these RPC methods.
- Cross-platform smoke tests seed a real encrypted mission, then read it
  through the real Python bridge and assert the evidence body does not leak.
- Work on mission changes, approvals, receipts, durable scheduler and full
  agent execution has **not** started at this UI layer. The new interfaces
  remain a draft until GitHub Actions, source audits and GUI E2E pass.

## M5 verification checkpoint — 2026-10-23

GitHub Actions [Desktop smoke run 39878168485](https://github.com/amroquqa99-art/D_AI-Desktop/actions/runs/39878168485)
passed **all five project-owned jobs** at commit
`f69dac95f41048ef57a2e0c9e21807c1d28549f5`:

| Job | Observed result |
| --- | --- |
| Ubuntu bridge contract + real Python mission handshake | passed (16 JS; 1 real handshake) |
| Windows bridge contract + real Python mission handshake | passed (16 JS; 1 real handshake) |
| macOS bridge contract + real Python mission handshake | passed (16 JS; 1 real handshake) |
| Desktop TypeScript, identity/profile checks and Electron bundling | passed |
| Docker Compose offline contract suite | passed |

The OS-specific raw job logs were reviewed to ensure the handshake tests actually
ran and no failed subprocess was masked. The pinned Core tested was
`4d84f649b741369c572626bb0ee18e19fa5a7d23` (stacked Core PR #29).

**What passed:** JavaScript/client contracts, Python loopback transport,
encrypted Core mission seed/readback and evidence redaction, TypeScript
compilation, Electron JS bundle, and offline contract tests.

**What did not pass by virtue of this evidence:** opening a packaged native
GUI, operating independent installers side-by-side, authentication/deep-link
round trips, manual GUI accessibility, mission execution, approval receipts,
model routing, plugin/sandbox behavior, signed updates, power-loss durability,
or application release quality. Upstream inherited workflows on Blacksmith
runners can remain queued and are not represented as completed by this run.

## OpenCode free-model compatibility (M6 partial)

The upstream OpenCode Console provider, account login and model picker are
preserved. Inherited OpenCode has available free models, but Console may
restrict free-tier access to the original OpenCode clients; availability in
this separately branded fork is **not guaranteed**. No attempt to spoof
the official client or bypass provider-side eligibility is permitted.

D_AI Core [PR #29](https://github.com/amroquqa99-art/D_AI/pull/29)
now adds free-only **recommendation routing**, default-on for its native
MCP tool. It rejects unknown, unverified or nonzero input/output-cost
models rather than spending automatically. This does not change manual
OpenCode chat model choice, and D_AI mission execution is not wired.
See `docs/OPEN_CODE_FREE_MODELS.md` for connection steps, restrictions
and live-provider verification gates.


## M6: OpenCode account, subscription and API-key coexistence (2026-10-23)

D_AI Desktop retains the native OpenCode V2 Provider Connect dialog. For OpenCode's
free-tier models, select **OpenCode Console** and **Continue in the browser**;
the inherited `opencode` integration performs OAuth device authorization using
the original OpenCode Console endpoint, then discovers account-scoped model
availability. The fork must never fabricate a Console credential, harvest
cookies from the original OpenCode installation or claim the model is free
simply because of its name.

OpenCode Go users may sign into the Console or choose the API-key method.
The Go service-account API key is still stored against `opencode-go` and is
not incorrectly remapped to the standard `opencode` key. Any *supported*
other provider subscription OAuth and provider API keys (e.g. OpenAI,
Anthropic, Google, OpenRouter) stay with their native integration identities,
so OpenCode account sign-in does not disconnect or override them. Main-session
model selection remains fully manual; the D_AI Core cost/quality Auto
router is a separate pending Desktop integration, not a replacement for the
native OpenCode picker.

The dialog now explains these options in English and Arabic and shares a pure,
tested authentication-routing contract across sign-in and key entry.
CI adds a Bun regression for OpenCode/Go identity separation, non-Console
providers, and bilingual UI copy. The checkout runs inside a separate
`userData/cli-profile`, never reading the upstream OpenCode credential store.

**Compatibility warning:** Official OpenCode V2 documentation reserves some
free-tier chat models for the OpenCode client; other coding harnesses may be
rejected with HTTP 403 even using a legitimate Console API key. Preserving
OpenCode's genuine login and service implementation is necessary, but **not
proof that an independently branded fork qualifies for the free-tier access**.
No provider entitlement bypass or forged client identity should be added.
Only a real authenticated request to a documented free model from a packaged
D_AI Desktop build can close this acceptance gate. No actual sign-in, payment
or external inference request was made by these automated tests.


## M7: Opt-in native V2 D_AI agent/model-router registration (2026-10-23)

The Desktop fork now contains a single **opt-in** installer at
`packages/desktop/src/main/dai/router-profile.mjs`, triggered before
the background CLI service starts. It acts only on this fork's
`userData/cli-profile/config/opencode`; it never migrates native OpenCode
OAuth tokens, subscription connections or API-key credentials.

For development, explicitly authorize a **reviewed local** D_AI Core
checkout containing PR #30's native V2 router and default Auto policy:

```sh
DAI_DESKTOP_CORE_CWD=/absolute/path/to/reviewed/D_AI \
DAI_DESKTOP_ROUTER_ENABLE=1 \
bun run --cwd packages/desktop dev
```

Only the **fresh fork profile** is modified: the installer refuses any
preexisting OpenCode JSON/JSONC config, agent/skill/command definitions,
data root, suspicious target symlinks or altered managed manifest. It
copies Core's full `agent`, `skill` and `command` definitions, registers
the native plugin as a V2 absolute `plugins` path in a fresh
`opencode.jsonc`, sets `default_agent: dai-os` but does **not** set a
main-session model, and seeds free+paid Auto preferences into
`userData/cli-profile/dai-router-data/config`. The managed manifest is
checked on subsequent opt-in attempts, and changed user files are left
untouched. The plugin remains registered after the one-time
installation flag is removed; it must be uninstalled explicitly by the
owner from this fork profile.

The Electron main process always provides this fork's private
`DAI_ROUTER_DATA_ROOT` across subsequent launches; its resolved
CLI command is passed as `DAI_OPENCODE_COMMAND_JSON` so the plugin's native
form API cannot silently invoke a different installed OpenCode client.
Core PR #30 fixes the router's original data-root resolution and tests
the explicit CLI command. Source-controlled Core defaults are never
modified by the fork's running router.

**Important version boundary:** Core PR #29's draft read-only mission
bridge and Core PR #30's draft value router are not yet reconciled in
one verified Core revision. The Desktop CI therefore pins two separate
Core checkouts and tests bridge and router independently. A green
contract test does **not** imply both share one live Python/JS Core
environment, or that a packaged Electron app activated the plugin.

**Still required before a release:** reconcile the Core branches;
verify actual V2 agent/skill/command activation and delegation through
the running OpenCode CLI; authenticated Console sign-in and free-model
inference in the independently branded fork; simultaneous third-party
subscription/API use; native GUI E2E, permissions/receipts,
Windows/macOS/Linux packaging and security/supply-chain review. OpenCode
Console free-tier entitlement is provider-controlled; do not spoof an
official client or assume a branded fork has automatic access.
