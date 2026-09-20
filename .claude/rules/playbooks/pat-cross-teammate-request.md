---
paths:
  - ".claude/rules/playbooks/pat-cross-teammate-request.md"
  - ".claude/rules/core/teams.md"
  - ".claude/rules/playbooks/pat-subagent-status-protocol.md"
  - ".claude/skills/team/**"
  - "agents/team-lead/**"
  - "agents/team-bootstrap/**"
  - "agents/wave-reviewer/**"
  - "cagents-memory/sessions/team_*/**"
  - "tests/v12/peer-request-pattern.test.js"
  - "tests/v12/teammate-to-subagent-reframe.test.js"
name: pat-cross-teammate-request
description: "Pattern: a /team teammate asks the lead to ask another teammate to do work via a named peer_request schema on disk + SendMessage; the lead applies a 4-branch routing decision tree (RELAY, SPAWN, PROMOTE, REJECT) and never executes the requested work itself."
license: MIT
compatibility: "Claude Code 2.x, cAgents 12.14.0+"
metadata:
  version: "1.0.0"
  author: cagents
  audience: "/team teammates and leads, controllers"
  applies_to:
    - all-team-leads
    - all-team-teammates
allowed-tools: Read Write Edit Bash
---

# Pattern: Cross-Teammate Request (v12.14.0)

> ## Status: LEGACY and EXPERIMENTAL, demoted in v12.62.0
>
> **This pattern belongs only to the OPTIONAL experimental
> named-background-teammate path, which is
> `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`. It is OBSOLETE under the DEFAULT
> subagent execution model.** Its founding premise was this: "Claude Code forbids
> nested teams, so a teammate needing help must route sideways through the lead".
> That premise is no longer true. Since Claude Code 2.1.172, a subagent spawns its
> own subagents up to 5 levels deep.
>
> **New canonical guidance under the default subagent model**: a wave subagent
> that needs another specialty spawns that specialist itself. The specialist
> becomes its OWN downward sub-subagent, and it nests to depth 5. It then
> collects the result synchronously, with `run_in_background: false`. On the
> default path there is no sideways `peer_request`, no lead-as-router hop, and
> no `SendMessage` round-trip. The subagent delegates downward directly. Use this downward-spawn
> approach for every default `/team` wave.
>
> The `peer_request` machinery and the `SendMessage` machinery below stay ONLY
> for the experimental named-teammate path. On that path a teammate is a
> long-lived named background agent. It genuinely cannot spawn a peer, so it must
> route through the fixed lead.

A teammate in a `/team` wave sometimes needs help from another teammate. Three
rules close every direct route. Claude Code forbids nested teams, so a teammate
cannot spawn a sub-team. Claude Code forbids direct messaging between teammates,
because the lead is fixed. The cAgents aggressive-delegation rule forbids the lead
from doing implementation work itself.

This pattern resolves the gap. Teammate A emits a structured `peer_request`. The
lead routes that request through a 4-branch decision tree. The requested work then
happens through a peer or through a fresh spawn. It never happens through the
hands of the lead.

## The peer_request schema

Teammate A writes `outputs/wave-{K}/peer_requests/REQ-{N}.yaml`:

```yaml
schema_version: "1"
req_id: REQ-1                          # monotonic per wave
requested_by: teammate-backend-developer
requested_peer: teammate-dba           # OPTIONAL — null = "lead picks the right peer"
description: |
  Confirm column name for users.last_login_at after the wave-2 migration.
acceptance_criteria:
  - "Single-line answer naming the column"
  - "Cite migration file:line where the column is declared"
priority: P0                            # P0 blocks requester, P1 useful soon, P2 nice-to-have
depends_on: []                          # work-item IDs or other REQ-Ns
emitted_at: "2026-06-01T22:50:00Z"
status: pending                         # pending | relayed | spawned | promoted | rejected | completed
```

The field names match the `delegation_requests` schema of `/act`. See
`.claude/skills/act/reference/delegation-workaround.md`. The on-disk YAML is the
audit-trail contract. Teammate A also calls
`SendMessage(recipient: lead, type: peer_request, content: "REQ-{N} emitted: see outputs/wave-{K}/peer_requests/REQ-{N}.yaml")`.
That call wakes the lead, so the lead does not have to poll.

## Lead routing decision tree

```
            +-------------------------+
            | Lead reads REQ-{N}.yaml |
            +------------+------------+
                         |
              In current wave (K)?
                /                 \
             yes                   no
              |                     |
       Peer B alive or              |
       stoppable (SendMessage)?     |
         /            \              v
       yes            no    Out-of-wave scope OR
        |              |    violates GATE-K?     -> PROMOTE
        |     scope <= 1 WI?
        |        /        \
       RELAY   yes         no   -> SPAWN
        |      |
        |    RELAY
        v
     SendMessage to B; B answers via SendMessage to A;
     B updates REQ-N.status: completed
```

Three conditions trigger a **REJECT**. The request breaks the
aggressive-delegation contract. The request conflicts with
`plan.yaml § not_in_scope`. The request cannot be routed safely. On a REJECT, send
the rationale to A with SendMessage, and set `status: rejected`.

### Decision-tree branch table

| Branch | Trigger | Lead action | REQ status |
|--------|---------|-------------|------------|
| RELAY | intra-wave, peer B alive or stoppable, scope <= 1 WI | `SendMessage(recipient: B, type: direct, ...)` (auto-resumes B) | relayed |
| SPAWN | intra-wave, new work-item-sized scope | `Agent({subagent_type: "cagents:{type}", ...})` fresh teammate | spawned |
| PROMOTE | out-of-wave scope OR violates GATE-K | Append to `workflow/work_items_wave_{K+1}.yaml`; `SendMessage` A with rationale | promoted |
| REJECT | violates aggressive-delegation, violates `not_in_scope`, unsafe | `SendMessage` A with rationale | rejected |

## Aggressive-delegation invariant

The lead has four valid actions on a peer_request:

- (a) a `SendMessage` to a peer;
- (b) an `Agent()` spawn;
- (c) a PROMOTE to the work_items file of the next wave;
- (d) a REJECT with a rationale.

The lead **NEVER** reads the requested artifact and writes it itself. The lead
**NEVER** uses Edit, Write, or Bash to implement the requested work. The lead
**NEVER** forwards the request to a third party that bypasses the controller
surface of the team.

This invariant is the same one cited at `.claude/rules/core/delegation.md`
§ Controller-Side Corollary. It is also cited at `.claude/rules/core/teams.md`
§ Team Lead (Controller) Behavior.

## Worked example

This is wave 3 of a `/team` build. Teammate A is `cagents:backend-developer` with
`mode=api`, and it works on WI-12, the auth middleware. Teammate B is
`cagents:backend-developer` with `mode=database`, which is the DBA role. B
finished WI-8 and is idle. B was spawned under the teammate name `teammate-dba`,
which marks its role in the wave.

1. A discovers that WI-12 needs `users.last_login_at` confirmed, because the
   wave-2 migration can have renamed it.
2. A writes `outputs/wave-3/peer_requests/REQ-1.yaml`, in the schema shown
   above.
3. A calls `SendMessage(recipient: lead, type: peer_request, content: "REQ-1 emitted")`.
4. A reports `status: NEEDS_CONTEXT` with `requested_peer: teammate-dba` and `peer_request_ref: outputs/wave-3/peer_requests/REQ-1.yaml`. A continues with non-blocked sub-tasks of WI-12.
5. The lead reads only REQ-1.yaml, which is lead-context discipline. The
   decision tree gives wave 3, B is stoppable, and scope = 1 WI, so the branch
   is **RELAY**.
6. The lead calls `SendMessage(recipient: teammate-dba, type: direct, content: "REQ-1 awaiting your reply")`. The auto-resume of SendMessage wakes B.
7. B reads REQ-1.yaml, answers via SendMessage to A: "column is `last_login_at` at migrations/20260520_user_v3.sql:42". B updates REQ-1.yaml `status: completed`.
8. A consumes the answer, exits NEEDS_CONTEXT, completes WI-12.

The lead never touched the implementation. WI-12 stayed inside the scope of A.
The idle time of B produced a 90-second answer. The audit trail is REQ-1.yaml on
disk, plus the SendMessage log in `team/messages/`.

## Status protocol integration

Teammate A reports `NEEDS_CONTEXT` with an extended payload. See
`.claude/rules/playbooks/pat-subagent-status-protocol.md` for the canonical
4-status protocol. The extension below is the WI-5 addition:

```yaml
status: NEEDS_CONTEXT
summary: "Cannot complete WI-12 without column name from dba"
missing_context:
  - "users.last_login_at column name after wave-2 migration"
requested_peer: teammate-dba                                   # OPTIONAL
peer_request_ref: outputs/wave-3/peer_requests/REQ-1.yaml      # OPTIONAL
```

When `requested_peer` is absent, NEEDS_CONTEXT keeps its earlier meaning, which
is a need for user input or for external input. That behavior is fully
back-compatible.

The architect decision in WI-1 was to extend NEEDS_CONTEXT, and not to introduce
a 5th status. The semantics are identical. A new status would double the
controller-response surface across the catalog.

## When NOT to emit a peer_request

- The information is already in `plan.yaml`, in `enriched_context.yaml`, or in
  `outputs/wave-{K-1}/`. Read it instead.
- The work is core to the work item of the requesting teammate. The
  aggressive-delegation rule still applies *to teammates*. Do not delegate your
  assigned work to a peer to avoid doing it.
- The blocker is environmental, such as a tool failure. That is `BLOCKED`, and it
  is not `NEEDS_CONTEXT`. See the status protocol playbook for the escalation
  ladder.

## Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Lead becomes a routing bottleneck | 4-branch decision tree is mechanical; lead can batch-process pending REQs in one TaskList sweep. |
| Peer ping-pong (A → B → A → B) | REJECT branch fires when the decision tree cannot route safely; PROMOTE moves the work to a future wave. |
| Teammates over-emit peer_requests instead of doing their own work | Reviewer flags peer_request emission as a delegation-rationalization in the two-stage review. |
| Lead-context bloat from many REQ files | Lead reads ONLY the new REQ file, never full wave outputs. REQ files are size-budgeted (~50 lines). |
| Schema drift from `/act` `delegation_requests` | Field names are aligned; the WI-7 regression test asserts the playbook's YAML example parses as valid YAML. |

## See also

- `.claude/rules/core/teams.md`: § Cross-Teammate Request Pattern, which links
  here.
- `.claude/rules/playbooks/pat-subagent-status-protocol.md`: the NEEDS_CONTEXT
  shape and the 4-status protocol.
- `.claude/rules/core/delegation.md`: the Controller-Side Corollary, which holds
  the aggressive-delegation invariant.
- `.claude/skills/act/reference/delegation-workaround.md`: the
  `delegation_requests` schema, which is the source of the field names.
- `.claude/skills/team/SKILL.md`: Step 5d, the lead wave loop where peer_request
  routing happens.
