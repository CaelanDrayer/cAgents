---
paths:
  - ".claude/rules/playbooks/pat-subagent-status-protocol.md"
  - ".claude/rules/core/execution.md"
  - ".claude/rules/core/controllers.md"
  - ".claude/rules/core/resources/execution-self-validation.md"
  - "agents/**"
  - ".claude/skills/**"
  - "cagents-memory/sessions/**/workflow/coordination_log.yaml"
  - "cagents-memory/sessions/**/outputs/**"
  - "tests/v12/peer-request-pattern.test.js"
  - "tests/v12/playbook-extraction-cohesion.test.js"
name: pat-subagent-status-protocol
description: "Pattern: execution agents report completion via one of four standardized statuses (DONE, DONE_WITH_CONCERNS, NEEDS_CONTEXT, BLOCKED) and controllers route per the status; free-form completion messages are not acceptable."
license: MIT
compatibility: "Claude Code 2.x, cAgents 10.22.0+"
metadata:
  version: "1.0.0"
  author: cagents
  audience: "execution agents, controllers"
  applies_to:
    - all-execution-agents
    - all-controllers
---

# Pattern: Subagent Status Protocol (V10.22.0)

Execution agents MUST report their completion status with one of four standard
statuses. Controllers MUST handle each status in the correct way. A free-form
completion message is no longer acceptable.

## The four statuses

| Status | Meaning | When to Use |
|--------|---------|-------------|
| **DONE** | Work item fully complete, all acceptance criteria met with evidence | Clean completion, ready for review |
| **DONE_WITH_CONCERNS** | Work item complete, but agent identified potential issues | Implementation works but has caveats the controller should assess |
| **NEEDS_CONTEXT** | Cannot complete without more information | Missing needs, ambiguous criteria, or a need for access to an undiscovered resource |
| **BLOCKED** | Cannot proceed because of an external dependency or an infrastructure fault | Dependency unavailable, permission denied, or environment broken |

## Reporting format

Execution agents MUST include the status in their completion response:

```yaml
status: DONE                    # One of: DONE, DONE_WITH_CONCERNS, NEEDS_CONTEXT, BLOCKED
summary: "Implemented JWT auth middleware with bcrypt hashing"
evidence:
  - criterion: "Auth middleware validates tokens"
    result: "src/middleware/auth.ts:15 - validateToken() checks expiry, signature, and issuer"
  - criterion: "Tests pass"
    result: "npm test: 23/23 passed"
concerns: []                    # For DONE_WITH_CONCERNS: list specific concerns
missing_context: []             # For NEEDS_CONTEXT: list what is needed
blocker: null                   # For BLOCKED: describe the blocking factor
```

### NEEDS_CONTEXT extension: requested_peer (v12.14.0+)

> **LEGACY, for the experimental named-teammate path only.** The `requested_peer`
> extension and the `peer_request` extension belong to the demoted experimental
> named-background-teammate path, which is
> `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`. Under the DEFAULT subagent model the
> extension is obsolete. A wave subagent that needs another specialty spawns that
> specialist as its OWN downward sub-subagent, and it nests to depth 5. It does
> not route a `requested_peer` sideways through the lead. The extension stays for
> the experimental path. See `pat-cross-teammate-request.md`.

In `/team` mode, on the experimental named-teammate path, NEEDS_CONTEXT can carry
an optional `requested_peer` field. That field points the lead to the named
teammate best placed to give the missing information. When the field is set, the
lead applies the peer_request decision tree of RELAY, SPAWN, PROMOTE, and REJECT.
The lead does not escalate to the user.

When `requested_peer` is absent, NEEDS_CONTEXT keeps its earlier meaning, which is
a need for user input or for external input. That behavior is fully
back-compatible. On the default subagent path this extension does not apply. The
subagent spawns its own helper subagent downward.

```yaml
status: NEEDS_CONTEXT
summary: "Cannot complete WI-12 without column name from dba"
missing_context:
  - "users.last_login_at column name after wave-2 migration"
requested_peer: teammate-dba                                   # OPTIONAL — null = "need user input"
peer_request_ref: outputs/wave-3/peer_requests/REQ-1.yaml      # OPTIONAL — points to on-disk artifact
```

The on-disk `peer_request` artifact at `peer_request_ref` is the canonical
contract. See pat-cross-teammate-request.md for its schema. The status field is a
hint to the lead, and the YAML on disk is the audit trail.

## Controller response by status

| Status | Controller Action |
|--------|-------------------|
| **DONE** | Go on to the reviewer loop, which starts at Stage 1 for spec compliance. |
| **DONE_WITH_CONCERNS** | Read the concerns. If a concern affects the acceptance criteria, ask for clarification. If a concern is informational, note it in coordination_log and go on to review. Never ignore a concern in silence. |
| **NEEDS_CONTEXT** | Give the agent the context it asked for, then re-dispatch it. If that context is unavailable, escalate to the user or mark the item BLOCKED. Never force a retry without the missing context. **In `/team` mode, on the experimental named-teammate path only**: if `requested_peer` is set, the lead applies the peer_request decision tree of RELAY, SPAWN, PROMOTE, and REJECT, as in @.claude/rules/playbooks/pat-cross-teammate-request.md. On the default subagent path there is no `requested_peer`. The subagent spawns its own helper subagent downward. |
| **BLOCKED** | Assess the blocker. If you can resolve it, resolve it and re-dispatch the agent. If you cannot resolve it, mark the work item as blocked in coordination_log, write down the blocker, and continue with the other work items. |

## Escalation ladder for BLOCKED

```
1. Controller attempts to resolve the blocker (5 min max)
2. If unresolvable: check if another execution agent can work around it
3. If no workaround: escalate to lead/user with:
   - What is blocked
   - Why it is blocked
   - What was tried to unblock it
   - Impact on remaining work items
4. If user provides resolution: re-dispatch agent
5. If user cannot resolve: mark work item as blocked, continue with others
```

## CRITICAL: never ignore an escalation

Never ignore an escalation. Never force a retry with no change. If an execution
agent reports NEEDS_CONTEXT or BLOCKED, the controller MUST address the specific
issue before it re-dispatches the agent. If you send the same prompt again with
no new information, you break the status protocol.

| Anti-Pattern | Correct Approach |
|-------------|------------------|
| Re-dispatch with same prompt after NEEDS_CONTEXT | Provide the missing context, then re-dispatch |
| Ignore DONE_WITH_CONCERNS and proceed | Read concerns, assess impact, document decision |
| Force retry after BLOCKED without resolving blocker | Attempt resolution or escalate |
| Treat BLOCKED as DONE and skip the work item silently | Document blocker in coordination_log, mark item status |

## See also

- `.claude/rules/core/resources/execution-self-validation.md`: the
  self-validation contract. It gates the auto-downgrade from DONE to
  DONE_WITH_CONCERNS.
- `.claude/rules/playbooks/pat-graceful-degradation-depth1.md`: the
  Nesting-Ceiling Degradation fallback. When the `Agent` tool is genuinely
  absent, prefer DONE through self-validation over BLOCKED. That case is rare.
  It arises at the depth-5 nesting ceiling, or on a regressed or older harness.
  On Claude Code 2.1.172+ a subagent normally keeps `Agent` up to 5 levels
  deep. Make sure the tool is absent before you degrade.
- `.claude/rules/playbooks/pat-cross-teammate-request.md`: `/team` peer_request
  routing, used when `NEEDS_CONTEXT.requested_peer` is set.
