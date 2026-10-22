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
