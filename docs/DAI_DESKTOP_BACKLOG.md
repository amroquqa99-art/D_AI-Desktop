# D_AI Desktop — executable development backlog

**Status:** GitHub draft PR #1; do not treat these engineering checks as a packaged app release.

Core: https://github.com/amroquqa99-art/D_AI/pull/28
Central D_AI OS draft: https://github.com/amroquqa99-art/D_AI/pull/27

## P0 — next engineering gates

- [x] Authenticated loopback Python bridge + Electron parent supervisor
- [x] Read-only typed RPC and visible D_AI system list
- [x] Linux/Windows/macOS bridge smoke and Desktop package TypeScript checks
- [x] Separate Electron app identity, protocol, package names and upstream update disable
- [x] Separate inherited OpenCode CLI XDG roots, database and config paths (source-level)
- [ ] Full Electron asset build and packaged GUI E2E test
- [ ] Windows-safe encrypted D_AI Core memory locks, ACLs and crash recovery (Core PR #27: lock/DACL + two hard-exit recovery boundaries passed in [run 39878700977](https://github.com/amroquqa99-art/D_AI/actions/runs/39878700977); hostile-account isolation, remaining boundaries and power-loss **not verified**)
- [x] Experimental read-only D_AI project/mission bridge + typed main-to-renderer RPC (Core PR #29)
- [ ] D_AI mission schemas reconciled for authenticated writes, approvals and durable task receipts
- [ ] Safe D_AI Python Core distribution to all three OS targets
- [ ] Restore authentication/deep-link compatibility with independent URI scheme
- [ ] Inspect upstream OpenCode icons and replace brand-specific artwork
- [ ] Audit licensing, software bill of materials, app signatures and installers

## P1 — agent capabilities

- [ ] Review exact OpenGrokBot revision, deps and past suspicious payload before porting
- [ ] Canonical D_AI OS-owned multi-agent rooms and delegated work
- [ ] Audited permissions engine with explicit approvals and effect receipts
- [ ] Durable recurring routines and offline-first checkpoint/resume
- [ ] Sandbox provider support and Docker Compose-based test environments
- [ ] Skill provenance registry with automated security scanning
- [x] D_AI Core free-only candidate selection guard (Core PR #29, 5 passing regression tests; **does not invoke or bill**)
- [ ] Configurable *live* model router with OpenCode catalog reconciliation, free-tier eligibility checks, transparent cost/usage and context preservation
- [ ] Free-model E2E with user-authorized OpenCode Console account in a packaged D_AI Desktop; respect free-tier client restrictions

## P2 — broader rollout

- [ ] Demonstrate GUI task then safely replay as a reusable skill
- [ ] Long-term memory and optional project-scoped knowledge graph
- [ ] Benchmarks for success rate, costs, latency and unintended actions
- [ ] Independent signed update service and tested rollback
- [ ] AppImage/deb/rpm, Windows NSIS and macOS dmg/zip release candidates

## Required safety properties

1. GNU GPL-3.0-or-later combined work, with original MIT/Apache notices.
2. Keep renderer unaware of child secrets, command execution and service port.
3. Never ship OpenCode upstream update domains or assume a new brand inherits its trademarks.
4. Windows bridge smoke does not verify portable encrypted memory or native installers.
5. No unreviewed imported executable source; maintain revision and license provenance.
6. Keep PRs in draft until independently verified; no automatic merge or publication.

GitHub Issues are disabled in this fork; this file is the versioned backlog.
