---
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

Execution agents MUST report their completion status using one of four standardized statuses. Controllers MUST handle each status appropriately. Free-form completion messages are no longer acceptable.

## The four statuses

| Status | Meaning | When to Use |
|--------|---------|-------------|
| **DONE** | Work item fully complete, all acceptance criteria met with evidence | Clean completion, ready for review |
| **DONE_WITH_CONCERNS** | Work item complete, but agent identified potential issues | Implementation works but has caveats the controller should assess |
| **NEEDS_CONTEXT** | Cannot complete without additional information | Missing requirements, ambiguous criteria, need access to undiscovered resources |
| **BLOCKED** | Cannot proceed due to external dependency or infrastructure issue | Dependency unavailable, permission denied, environment broken |

## Reporting format

Execution agents MUST include status in their completion response:

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

In `/team` mode, NEEDS_CONTEXT can carry an optional `requested_peer` field pointing the lead to the teammate best positioned to provide the missing information. When set, the lead applies the peer_request decision tree (RELAY / SPAWN / PROMOTE / REJECT) rather than escalating to the user. When `requested_peer` is absent, NEEDS_CONTEXT retains its prior meaning — need user/external input — fully back-compatible.

```yaml
status: NEEDS_CONTEXT
summary: "Cannot complete WI-12 without column name from dba"
missing_context:
  - "users.last_login_at column name after wave-2 migration"
requested_peer: teammate-dba                                   # OPTIONAL — null = "need user input"
peer_request_ref: outputs/wave-3/peer_requests/REQ-1.yaml      # OPTIONAL — points to on-disk artifact
```

The on-disk `peer_request` artifact at `peer_request_ref` is the canonical contract (see pat-cross-teammate-request.md for the schema). The status field is a hint to the lead; the YAML on disk is the audit trail.

## Controller response by status

| Status | Controller Action |
|--------|-------------------|
| **DONE** | Proceed to reviewer loop (Stage 1: spec compliance) |
| **DONE_WITH_CONCERNS** | Read concerns. If concerns affect acceptance criteria: request clarification. If concerns are informational: note in coordination_log and proceed to review. Never silently ignore concerns. |
| **NEEDS_CONTEXT** | Provide the requested context and re-dispatch the agent. If context is unavailable: escalate to user or mark as BLOCKED. Never force retry without providing the missing context. **In `/team` mode**: if `requested_peer` is set, the lead applies the peer_request decision tree (RELAY / SPAWN / PROMOTE / REJECT) per @.claude/rules/playbooks/pat-cross-teammate-request.md. |
| **BLOCKED** | Assess the blocker. If resolvable: resolve and re-dispatch. If not resolvable: mark work item as blocked in coordination_log, document the blocker, and continue with other work items. |

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

Never ignore an escalation or force retry without changes. If an execution agent reports NEEDS_CONTEXT or BLOCKED, the controller MUST address the specific issue before re-dispatching. Sending the same prompt again without new information is a violation of the status protocol.

| Anti-Pattern | Correct Approach |
|-------------|------------------|
| Re-dispatch with same prompt after NEEDS_CONTEXT | Provide the missing context, then re-dispatch |
| Ignore DONE_WITH_CONCERNS and proceed | Read concerns, assess impact, document decision |
| Force retry after BLOCKED without resolving blocker | Attempt resolution or escalate |
| Treat BLOCKED as DONE and skip the work item silently | Document blocker in coordination_log, mark item status |

## See also

- `.claude/rules/core/resources/execution-self-validation.md` — self-validation contract that gates DONE vs DONE_WITH_CONCERNS auto-downgrades
- `.claude/rules/playbooks/pat-graceful-degradation-depth1.md` — Nesting-Ceiling Degradation fallback: in the rare case where the `Agent` tool is genuinely absent (at the depth-5 nesting ceiling, or on a regressed/older harness), prefer DONE-via-self-validation over BLOCKED. On Claude Code 2.1.172+ subagents normally retain `Agent` up to 5 levels deep, so verify the tool is actually absent before degrading.
- `.claude/rules/playbooks/pat-cross-teammate-request.md` — `/team` peer_request routing when NEEDS_CONTEXT.requested_peer is set
