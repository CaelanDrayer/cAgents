---
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

> ## Status: LEGACY / EXPERIMENTAL — demoted in v12.62.0
>
> **This pattern belongs to the OPTIONAL experimental named-background-teammate path
> (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`) only. It is OBSOLETE under the DEFAULT
> subagent execution model.** Its founding premise — "Claude Code forbids nested
> teams, so a teammate needing help must route sideways through the lead" — is no
> longer true: since Claude Code 2.1.172 subagents spawn their own subagents up to
> 5 levels deep.
>
> **New canonical guidance under the default subagent model**: a wave subagent that
> needs another specialty simply spawns that specialist as its OWN downward
> sub-subagent (nesting to depth 5) and collects the result synchronously
> (`run_in_background: false`). There is no sideways `peer_request`, no
> lead-as-router hop, and no `SendMessage` round-trip on the default path — the
> subagent delegates downward directly. Use this downward-spawn approach for all
> default `/team` waves. The `peer_request` / `SendMessage` machinery below is
> retained ONLY for the experimental named-teammate path, where teammates are
> long-lived named background agents that genuinely cannot spawn peers and so must
> route through the fixed lead.

A teammate in a `/team` wave sometimes needs help from another teammate. Claude Code forbids nested teams (teammates cannot spawn sub-teams), forbids teammate-to-teammate direct messaging (the lead is fixed), and the cAgents aggressive-delegation rule forbids the lead from executing implementation work itself. This pattern resolves the gap: teammate A emits a structured `peer_request`, the lead routes it via a 4-branch decision tree, and the requested work happens through a peer or a fresh spawn — never through the lead's own hands.

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

Field names match `/run`'s `delegation_requests` schema (see `.claude/skills/run/reference/delegation-workaround.md`). The on-disk YAML is the audit-trail contract. Teammate A also calls `SendMessage(recipient: lead, type: peer_request, content: "REQ-{N} emitted: see outputs/wave-{K}/peer_requests/REQ-{N}.yaml")` so the lead is woken without polling.

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

If the request violates the aggressive-delegation contract OR conflicts with `plan.yaml § not_in_scope` OR cannot be safely routed: **REJECT** with rationale via SendMessage to A, set `status: rejected`.

### Decision-tree branch table

| Branch | Trigger | Lead action | REQ status |
|--------|---------|-------------|------------|
| RELAY | intra-wave, peer B alive or stoppable, scope <= 1 WI | `SendMessage(recipient: B, type: direct, ...)` (auto-resumes B) | relayed |
| SPAWN | intra-wave, new work-item-sized scope | `Agent({subagent_type: "cagents:{type}", ...})` fresh teammate | spawned |
| PROMOTE | out-of-wave scope OR violates GATE-K | Append to `workflow/work_items_wave_{K+1}.yaml`; `SendMessage` A with rationale | promoted |
| REJECT | violates aggressive-delegation, violates `not_in_scope`, unsafe | `SendMessage` A with rationale | rejected |

## Aggressive-delegation invariant

The lead's only valid actions on a peer_request are: (a) `SendMessage` to peer, (b) `Agent()` spawn, (c) PROMOTE to next wave's work_items file, (d) REJECT with rationale. The lead **NEVER** reads the requested artifact and writes it itself, **NEVER** uses Edit/Write/Bash to implement the requested work, and **NEVER** forwards to a third party that bypasses the team's controller surface. This invariant is the same one cited at `.claude/rules/core/delegation.md` § Controller-Side Corollary and `.claude/rules/core/teams.md` § Team Lead (Controller) Behavior.

## Worked example

Wave 3 of a `/team` build. Teammate A is `cagents:backend-developer` (mode=api) working on WI-12 (auth middleware). Teammate B is `cagents:backend-developer` (mode=database — the DBA role) who finished WI-8 and is idle; it is spawned under the teammate name `teammate-dba` to mark its role in the wave.

1. A discovers WI-12 needs `users.last_login_at` confirmed (wave-2 migration may have renamed it).
2. A writes `outputs/wave-3/peer_requests/REQ-1.yaml` (the schema block above).
3. A calls `SendMessage(recipient: lead, type: peer_request, content: "REQ-1 emitted")`.
4. A reports `status: NEEDS_CONTEXT` with `requested_peer: teammate-dba` and `peer_request_ref: outputs/wave-3/peer_requests/REQ-1.yaml`. A continues with non-blocked sub-tasks of WI-12.
5. Lead reads only REQ-1.yaml (lead-context discipline). Decision tree: wave 3, B is stoppable, scope = 1 WI = **RELAY**.
6. Lead calls `SendMessage(recipient: teammate-dba, type: direct, content: "REQ-1 awaiting your reply")`. SendMessage auto-resume wakes B.
7. B reads REQ-1.yaml, answers via SendMessage to A: "column is `last_login_at` at migrations/20260520_user_v3.sql:42". B updates REQ-1.yaml `status: completed`.
8. A consumes the answer, exits NEEDS_CONTEXT, completes WI-12.

Lead never touched the implementation. A's WI-12 stayed in A's scope. B's idle time produced a 90-second answer. Audit trail: REQ-1.yaml on disk plus the SendMessage log in `team/messages/`.

## Status protocol integration

Teammate A reports `NEEDS_CONTEXT` with an extended payload (see `.claude/rules/playbooks/pat-subagent-status-protocol.md` for the canonical 4-status protocol; the extension below is the WI-5 addition):

```yaml
status: NEEDS_CONTEXT
summary: "Cannot complete WI-12 without column name from dba"
missing_context:
  - "users.last_login_at column name after wave-2 migration"
requested_peer: teammate-dba                                   # OPTIONAL
peer_request_ref: outputs/wave-3/peer_requests/REQ-1.yaml      # OPTIONAL
```

When `requested_peer` is absent, NEEDS_CONTEXT retains its prior meaning (need user/external input) — fully back-compatible. The architect decision (WI-1) is to extend NEEDS_CONTEXT rather than introduce a 5th status, because the semantic is identical and a new status would double the controller-response surface across the catalog.

## When NOT to emit a peer_request

- The information is already in `plan.yaml`, `enriched_context.yaml`, or `outputs/wave-{K-1}/` — read it instead.
- The work is core to the requesting teammate's own work item — the aggressive-delegation rule still applies *to teammates*: do not delegate your assigned work to a peer to avoid doing it.
- The blocker is environmental (e.g., a tool failure) — that is `BLOCKED`, not `NEEDS_CONTEXT`. See the status protocol playbook for the escalation ladder.

## Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Lead becomes a routing bottleneck | 4-branch decision tree is mechanical; lead can batch-process pending REQs in one TaskList sweep. |
| Peer ping-pong (A → B → A → B) | REJECT branch fires when the decision tree cannot route safely; PROMOTE moves the work to a future wave. |
| Teammates over-emit peer_requests instead of doing their own work | Reviewer flags peer_request emission as a delegation-rationalization in the two-stage review. |
| Lead-context bloat from many REQ files | Lead reads ONLY the new REQ file, never full wave outputs. REQ files are size-budgeted (~50 lines). |
| Schema drift from `/run` `delegation_requests` | Field names are aligned; the WI-7 regression test asserts the playbook's YAML example parses as valid YAML. |

## See also

- `.claude/rules/core/teams.md` — § Cross-Teammate Request Pattern (links here)
- `.claude/rules/playbooks/pat-subagent-status-protocol.md` — NEEDS_CONTEXT shape and the 4-status protocol
- `.claude/rules/core/delegation.md` — Controller-Side Corollary (aggressive-delegation invariant)
- `.claude/skills/run/reference/delegation-workaround.md` — `delegation_requests` schema (source of field names)
- `.claude/skills/team/SKILL.md` — Step 5d (lead wave loop where peer_request routing happens)
