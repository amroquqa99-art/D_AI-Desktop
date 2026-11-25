# Design proposal: persistent subagent teams in V2

Status: proposed, not approved or implemented. Target: upstream dev.
Baseline inspected: c85b83eb08c3d2666b842848215325acb282d92b.
Related: anomalyco/opencode#12711 and #12661 (closed, not planned); #64097 (direct child prompts, open when inspected); #62365 (waiting status); #53356 and #60961 (depth and permissions). This is not a port of the V1 team runtime.

## Problem
A user who repeatedly delegates research, coding and review needs to find and reuse the same named child sessions across rounds, without repeatedly rebuilding context or depending on an agent remembering a session ID. Completion of a turn should not remove the teammate from the active team's roster. Idle teammates should consume no model calls or polling work. User steering must retain the child agent identity. Nested delegation must be bounded.

## What V2 already provides
- packages/core/src/tool/plugin/subagent.ts: creates child sessions, accepts a direct child's sessionID for continuation, calls Session.prompt, starts SubagentJob and delivers background results after each idle round.
- packages/core/src/session/subagent-job.ts: Job-backed execution and recovery; cancellation distinguishes an explicit cancel from shutdown.
- packages/core/src/session/subagent-depth.ts: checks parent ancestry against experimental.subagent_depth (default 1).
- #64097 exposes child prompts in the clients. Integrate with that work only after its disposition is known; do not duplicate it.

## Proposed initial slice
Expose an opt-in, persistent roster of named reusable child sessions associated with one root session and its project. A team survives closing/reopening clients and service restart according to existing session recovery. The root identifies the team; unrelated root sessions in the same project do not implicitly share agents. Project-wide discovery of teams is optional follow-up. No separate long-lived agent process, new job scheduler, JSON mailbox, distributed relay, shared task database, new dependency, or mandatory change to ordinary subagent calls.

User creates or selects a team member by name, chooses an existing agent profile, starts a round, and later reuses that member. Stable identity is the child session ID, never the display name. Name uniqueness is scoped to the owning team; collisions are rejected atomically. Persist only the roster designation and membership metadata needed to distinguish explicitly retained members from ordinary task children; choose existing Session metadata/event support or a minimal migration after maintainer review. Derive execution state from Session/Job rather than store duplicate status. Archive/remove a member explicitly; don't delete transcript or project files. Reopening a project makes the roster discoverable again; no hidden autonomous work is scheduled by reopening alone.

## Invariants
1. A member is a normal child session. Its immutable ownership cannot be changed by changing a name, agent, or prompt.
2. Same member, same session ID and retained history after turn completion. Explicit new member starts fresh context.
3. Respect existing permissions and caller/child ownership checks; nested depth cannot confer new permissions. Never treat team messages as human authorization.
4. Use durable prompt admission and Job-owned recovery. At most one execution owner for a child; no duplicate work or completion for a single admitted round on retry/restart. Keep existing completion notifications.
5. Direct user prompting relies on the native session API and #64097; active steering vs queued prompt uses the existing admission semantics. No extra model call just to update the roster.
6. A waiting member is not assumed idle/finished if it has owned background work. Expose the current limitation in #62365; don't change global job semantics in the roster patch.
7. Project/root isolation, no arbitrary cross-session ID access, no additional MCP access, no automatic permission escalation. User-provided names are labels, not file paths or auth identities.

## Nested delegation: separate reviewable change
Keep existing experimental.subagent_depth as the authority. Proposed team opt-in preset of 3 child generations (root depth 0, child depth 1, maximum depth 3), explicit configured limit overrides it. Preserve default 1 for non-team behavior unless maintainers explicitly prefer a global change. Confirm depth validation and ownership in the server, not only the tool description; distinguish spawning from resuming existing authorized sessions. Ensure agent profiles explicitly allow delegation; never override deny. Do not implement a second recursion guard or bypass permission checks. A finite, separately configurable concurrent-work/member limit must be agreed before increasing default fan-out. No new budget semantics without design approval.

## Candidate interfaces (not a committed API)
- Enable via an opt-in experimental config setting, final spelling subject to maintainer review.
- Roster: list/select/create/archive retained children through a small integration with existing session operations.
- Prompt an existing member via existing subagent/session continuation.
- UI: roster view and durable name/status in existing subagent picker; reuse the child composer, no second chat panel.
- No sibling-to-sibling direct messaging in initial slice: existing parent-only continuation remains the authorization boundary. If later approved, design a typed sender/recipient envelope, idempotent delivery, and explicit delegation authority in a separate proposal. No impersonation or automatic broadcast.

## Acceptance matrix
| ID | Scenario | Required evidence |
| --- | --- | --- |
| A01 | Feature off | Existing subagent API/tool behavior and default depth unchanged |
| A02 | Create and finish a retained member | Stable ID, name and transcript remain accessible |
| A03 | Resume idle member | Same ID, old context visible, one completion per round |
| A04 | Prompt running member | Existing queue/steer semantics, no second concurrent execution |
| A05 | Restart with idle roster | Members still listed; zero automatic model requests |
| A06 | Restart during a round | Existing durable recovery, no duplicate completion or execution |
| A07 | Concurrent same-name creation | One member, deterministic collision result |
| A08 | Separate root/project | Cannot resolve or prompt unrelated member through team scope |
| A09 | Denied tool/profile | No privilege increase; denied remains denied |
| A10 | Team depth 3 | depth 1,2,3 accepted when permitted; depth 4 rejected before creation |
| A11 | Explicit depth override / feature off | Existing limits respected, no extra provider tool calls |
| A12 | Archive member | No future automatic work; history remains; defined behavior if busy |
| A13 | Parent/member status | Idle vs executing vs waiting derived from live session/job facts |
| A14 | Client interaction | TUI/Web/Desktop use native composer and retain agent identity |
| A15 | Regression | Existing ordinary task/subagent, interruption, restart, and permissions suites pass |
| A16 | Cost | 0 extra idle model calls; no periodic polling introduced; compare model requests and event counts with ordinary continuation |

## Staged delivery, subject to design approval
1. Core roster/retention using current child lifecycle, opt-in, service-level tests and no new UI dependencies.
2. Expose the approved roster contract through protocol/client; regenerate clients and check OpenAPI only if public contracts change.
3. TUI and Web/Desktop roster UX, coordinate with #64097; component and end-to-end tests, real before/after recordings.
4. Depth preset/config and bounded nested delegation; permission and concurrency coverage. Only split further if maintainer feedback requires it.

Each PR targets dev, is independently reviewable and has its own acceptance checks. Run fail-before/pass-after regression with a simulated provider, affected Bun tests, typecheck:tsc, lint:changed for GUI files, relevant recovery and permissions tests, and generated-contract checks if applicable. Use pinned Bun from packageManager, frozen lockfile and isolated CI in the fork; do not attach testing workflow changes to feature PRs. No production implementation or upstream implementation PR before design approval per CONTRIBUTING.md.

## Design review questions
- Would a retained named roster, anchored to the current root session rather than an independent team engine, be in scope for V2?
- Where should explicit membership metadata live in current session architecture?
- Is an opt-in depth preset of three acceptable, or should existing depth configuration alone control it?
- Which existing UI surface should own retained-member discovery?

The first question is a gate, not a claim that the closed Agent Teams proposal is now accepted.


## Storage review: V2 constraints (follow-up)
Inspected packages/schema/src/session.ts, session-metadata.ts and packages/core/src/session/sql.ts, store.ts at the pinned baseline.
- Session.Info already has projectID, parentID, metadata, time.archived, model and agent. SessionTable persists metadata as JSON and indexes project and parent.
- **Metadata inheritance is a trap:** ordinary children and forks inherit their parent's current metadata unless explicitly overridden (SessionMetadata contract). A boolean or name in metadata alone could silently turn descendants/forks into team members. Any metadata-based prototype must bind membership to the exact child ID and owning root/project, validate that binding on every roster read, and define what a fork inherits. Generic host-supplied metadata is not an authorization credential.
- The existing title is not a durable unique roster identity. Keep the member ID stable and avoid interpreting an arbitrary title as membership.
- Compare a dedicated typed membership relation with atomic uniqueness against a reserved metadata field before selecting storage. A relation adds migration/API scope but supports database-enforced uniqueness; a metadata field avoids a new table but must handle inheritance, atomic name reservation and trusted mutation. No choice committed before maintainer guidance.
- SessionStore.list supports parent, project and archived filtering. Use its native indexed lookups and explicit scope rather than scanning every project or polling all agents.
- Existing busy/idle timestamps and job state are runtime facts; avoid introducing a second independent state machine for status.
Add acceptance scenarios: normal child/fork of a retained member is not implicitly retained; generic metadata mutation cannot grant cross-root membership; archived/forked member behavior is explicit; metadata and session state are consistent under concurrent creation. 
