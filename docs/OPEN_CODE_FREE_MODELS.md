# Free OpenCode models in D_AI Desktop (development contract)

## What is already present

D_AI Desktop is based on OpenCode Desktop and preserves its native provider
and model selection interfaces. The inherited application recognizes
`opencode` and `opencode-go` Console integrations. No separate Zen paid
subscription is required just to select a model whose current usage price is
zero, although using free models can require sign-in with OpenCode Console.

Use **Providers → Connect → OpenCode Console** in D_AI Desktop, then select
a free model through the application's existing model picker. The D_AI fork
deliberately uses a **separate credential/config/database profile** from
OpenCode, so authentication in one application is not copied into the other.

Do not set `OPENCODE_DISABLE_FREE_MODELS=1` in the D_AI Desktop server
environment, as that hides free models. If the catalogue is absent, confirm
that your D_AI Desktop installation is connected to Console (not merely the
separate stock OpenCode client).

## Provider eligibility is not guaranteed for a fork

The published OpenCode Console documentation says free-tier chat models are
restricted to OpenCode clients; custom clients should use paid or Go models.
An independently branded fork may be denied even when OpenCode's local
model picker recognizes a free model. Reported 403 responses have also
affected stock OpenCode clients. Availability and eligibility are controlled
by the hosted service, not by this repo.

D_AI Desktop must **not** impersonate the official client through
User-Agent, version, forged session IDs, headers or credential transfers.
If the provider returns 403, show the real error; do not retry through a
different identity. For genuinely independent free execution, users may
choose an eligible free tier at another provider or a local model.

Official references:
- https://opencode.ai/v2/docs/models
- https://dev.opencode.ai/v2/docs/console/models

## D_AI automatic model routing (not execution)

D_AI Core stacked PR #29 introduces an optional free-only routing mode.
The D_AI native MCP tool defaults to it. Candidates marked with measured
zero input AND output fees, available status, and an OpenCode provider ID
are allowed; unknown, estimated or paid candidates are rejected without
fallback. This is a project-scope recommendation using records, not a live
provider price check or an invocation gate.

**Important:** D_AI Desktop's bridge is read-only and cannot yet execute
missions. The existing OpenCode chat model picker remains independent.
D_AI Core does not import the live OpenCode provider catalog automatically.
Before agent execution is enabled, D_AI must reconcile its model registry
with the live authenticated provider, confirm all charge categories,
enforce permissions and explicit approval for anything billable, and
record durable receipts. Until then, free-only is **routing policy only**.

## Verification

Core [CI 39937671322](https://github.com/amroquqa99-art/D_AI/actions/runs/39937671322):
five free-model routing regressions and the full Python suite passed on
3.11 and 3.12.

D_AI Desktop GitHub Actions validates compilation, JS bridge lifecycle,
Linux/Windows/macOS Python handshake and Docker offline checks against a
pinned Core revision. Those tests do not authorize a chargeable live-model
call, or prove provider acceptance of this fork.

An end-to-end user-approved free-model API call in a real packaged
D_AI Desktop binary remains an **unverified acceptance gate**.
