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

## Controller response by status

| Status | Controller Action |
|--------|-------------------|
| **DONE** | Proceed to reviewer loop (Stage 1: spec compliance) |
| **DONE_WITH_CONCERNS** | Read concerns. If concerns affect acceptance criteria: request clarification. If concerns are informational: note in coordination_log and proceed to review. Never silently ignore concerns. |
| **NEEDS_CONTEXT** | Provide the requested context and re-dispatch the agent. If context is unavailable: escalate to user or mark as BLOCKED. Never force retry without providing the missing context. |
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
- `.claude/rules/playbooks/pat-graceful-degradation-depth1.md` — when tools are stripped, prefer DONE-via-self-validation over BLOCKED
