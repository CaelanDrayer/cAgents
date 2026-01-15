# Automatic Workflow Progression

**Version**: 7.0
**Status**: Active Policy
**Applies To**: All workflows (tier 0-4)

## Overview

cAgents workflows are designed to execute **autonomously** through all standard phases. Agents should **NEVER** ask the user for permission to proceed to the next phase unless specific conditions are met.

## Core Principle

**If requirements are clear, PROCEED automatically. Do not ask.**

Users invoke workflows to get work done, not to be asked permission at every step. The workflow system executes autonomously and only escalates when human judgment is truly needed.

## Automatic Phase Transitions

### Standard Workflow Phases

All tier 2+ workflows follow this pattern:

```
routing → planning → coordinating → executing → validating → complete
```

**Each transition is AUTOMATIC** - no user permission required.

### Transition Rules

| From Phase | To Phase | Rule |
|------------|----------|------|
| routing | planning | AUTOMATIC - proceed when tier classified |
| planning | coordinating | AUTOMATIC - proceed when plan.yaml created |
| coordinating | executing | AUTOMATIC - proceed when coordination_log.yaml complete |
| executing | validating | AUTOMATIC - proceed when outputs aggregated |
| validating | complete | AUTOMATIC - proceed when validation PASS |
| validating | correcting | AUTOMATIC - proceed when validation FIXABLE |
| validating | blocked | ESCALATE - proceed to HITL when validation BLOCKED |

### Agent-Specific Guidance

**Orchestrator**:
- Detects phase completion via file presence
- Immediately transitions to next phase
- Does NOT ask user between phases
- Only escalates for tier 4 HITL gates or blockers

**Universal-Planner**:
- Creates plan.yaml with objectives and controller selection
- Signals completion to orchestrator
- Does NOT ask user to review plan
- Orchestrator automatically invokes controller

**Controllers** (tier 2):
- Break objectives into questions
- Delegate to execution agents
- Synthesize answers
- Create implementation tasks
- Write coordination_log.yaml
- Does NOT ask user to review coordination
- Executor automatically monitors progress

**Universal-Executor**:
- Monitors controller coordination
- Aggregates outputs when controller completes
- Writes execution_summary.yaml
- Does NOT ask user to review outputs
- Orchestrator automatically invokes validator

**Universal-Validator**:
- Runs quality gates
- Classifies as PASS/FIXABLE/BLOCKED
- Reports result to orchestrator
- Does NOT ask user unless BLOCKED

## When to Ask User (ONLY)

Agents should ONLY ask user in these specific cases:

### 1. Tier 4 HITL Approval Gates

**When**: Tier 4 workflows with `hitl_approval_required: true` in plan.yaml

**Example**:
```yaml
# plan.yaml
tier: 4
hitl_approval_required: true
hitl_approval_gates:
  - "Architecture design (before implementation)"
  - "Security review (before production)"
  - "Go-live decision (before final migration)"
```

**Message**: "Architecture design complete. HITL approval required before implementation. Please review Agent_Memory/{instruction_id}/outputs/architecture_design.md"

### 2. Unrecoverable Errors or Blockers

**When**: Workflow encounters error that cannot be auto-recovered

**Examples**:
- Missing API credentials
- Required file not found and cannot be inferred
- External service unavailable
- Circular dependency detected

**Message**: "Execution blocked: Missing API credentials for payment gateway. Please provide credentials or point to credential file."

### 3. Ambiguous Requirements

**When**: User request has multiple valid interpretations and cannot be inferred from context

**Examples**:
- "Implement OAuth2" - web app or mobile app?
- "Fix authentication" - which authentication system?
- "Deploy to production" - which production environment?

**Message**: "Request clarification needed: You requested OAuth2 implementation. Please specify: (1) Web application flow, (2) Mobile application flow with PKCE, or (3) Both?"

### 4. Validation BLOCKED

**When**: Validation fails with BLOCKED status (not FIXABLE)

**Examples**:
- Security vulnerability cannot be auto-fixed
- Breaking API change detected
- Data loss risk identified

**Message**: "Validation BLOCKED: Security audit detected critical vulnerability (SQL injection). Cannot auto-fix. Please review security report at Agent_Memory/{instruction_id}/validation/security_audit.yaml"

## What NOT to Ask

### DO NOT Ask for Phase Transition Permission

**WRONG** (never do this):
- ❌ "Plan is ready. Would you like me to continue with implementation?"
- ❌ "Coordination complete. Should I proceed with execution?"
- ❌ "Implementation finished. Would you prefer to review before validation?"
- ❌ "The workflow is now ready to proceed. Would you like me to continue?"

**RIGHT** (automatic progression):
- ✅ Plan created → Automatically transition to coordinating
- ✅ Coordination complete → Automatically transition to executing
- ✅ Implementation complete → Automatically transition to validating
- ✅ Validation PASS → Automatically mark workflow complete

### DO NOT Ask to Review Standard Outputs

**WRONG**:
- ❌ "Plan created. Would you like to review it before proceeding?"
- ❌ "Coordination log ready. Should I show it to you?"
- ❌ "Implementation complete. Want to see the changes before validation?"

**RIGHT**:
- ✅ Create outputs and proceed automatically
- ✅ User can review outputs at any time via Agent_Memory
- ✅ Validation will catch any issues

## User Experience Examples

### Example 1: Bug Fix (Tier 2) - CORRECT

**User Request**: "Fix the authentication timeout bug"

**Workflow** (fully automatic):
```
✓ Routing: Classified as tier 2, engineering domain
✓ Planning: Objectives defined, engineering-manager selected as controller
✓ Coordinating: Engineering-manager asked 5 questions, synthesized solution
✓ Executing: Bug fixed, tests added, documentation updated
✓ Validating: All tests pass, no regressions detected
✓ Complete: Authentication timeout bug fixed successfully!

Outputs:
- Agent_Memory/inst_20260115_001/outputs/bug_fix_summary.md
- Agent_Memory/inst_20260115_001/outputs/test_results.yaml
```

**No permission requests** - workflow completed autonomously.

### Example 2: Feature Implementation (Tier 3) - CORRECT

**User Request**: "Implement OAuth2 authentication for the API"

**Workflow** (fully automatic):
```
✓ Routing: Classified as tier 3, engineering domain
✓ Planning: Objectives defined, controllers selected (engineering-manager + architect + security-specialist)
✓ Coordinating:
  - Engineering-manager coordinated overall work
  - Architect designed OAuth2 architecture
  - Security-specialist validated security approach
  - Synthesis: Implementation plan created
✓ Executing: OAuth2 endpoints implemented, tests added, documentation written
✓ Validating:
  - Unit tests: 85% coverage (pass)
  - Integration tests: OAuth2 flow working (pass)
  - Security audit: No critical vulnerabilities (pass)
✓ Complete: OAuth2 authentication implemented successfully!

Outputs:
- Agent_Memory/inst_20260115_002/outputs/oauth2_architecture.md
- Agent_Memory/inst_20260115_002/outputs/implementation_summary.md
- Agent_Memory/inst_20260115_002/outputs/test_results.yaml
- Agent_Memory/inst_20260115_002/outputs/security_audit.yaml
```

**No permission requests** - workflow completed autonomously.

### Example 3: Architecture Migration (Tier 4) - HITL Approval

**User Request**: "Migrate monolith to microservices"

**Workflow** (automatic with HITL gates):
```
✓ Routing: Classified as tier 4, engineering domain
✓ Planning:
  - Objectives defined
  - Controllers selected (cto + engineering-manager + architect + devops-lead + security-specialist + qa-lead)
  - HITL approval gates defined
✓ Coordinating:
  - CTO provided strategic oversight
  - Engineering-manager coordinated day-to-day work
  - Architect designed microservices architecture
  - DevOps-lead planned infrastructure
  - Security-specialist validated security
  - QA-lead defined testing strategy
  - Synthesis: Multi-phase migration plan created

⏸ HITL Approval Gate 1: Architecture Design
   "Architecture design complete. HITL approval required before implementation.
    Please review: Agent_Memory/inst_20260115_003/outputs/architecture_design.md"

   [User reviews and approves]

✓ Executing: Phase 1 implementation (decompose user service)
✓ Validating: Phase 1 validation passed

⏸ HITL Approval Gate 2: Security Review
   "Security review complete. HITL approval required before production deployment.
    Please review: Agent_Memory/inst_20260115_003/validation/security_audit.yaml"

   [User reviews and approves]

✓ Executing: Production deployment
✓ Validating: Production deployment validation passed

⏸ HITL Approval Gate 3: Go-Live Decision
   "All services deployed to staging. HITL approval required for go-live.
    Please verify: Agent_Memory/inst_20260115_003/outputs/deployment_verification.yaml"

   [User reviews and approves final go-live]

✓ Complete: Microservices migration completed successfully!
```

**HITL approval requested only at designated gates** - all other transitions automatic.

### Example 4: Error Handling - Blocker Escalation

**User Request**: "Deploy to production"

**Workflow** (automatic until blocker):
```
✓ Routing: Classified as tier 2, engineering domain
✓ Planning: Objectives defined (deploy to production), controller selected
✓ Coordinating: Deployment plan created
✓ Executing: Attempting deployment...

❌ BLOCKER: Missing production API credentials
   "Execution blocked: Missing API credentials for production payment gateway.
    Cannot proceed without credentials.

    Please provide one of:
    1. Add credentials to .env.production
    2. Provide credentials as environment variables
    3. Point to credential vault path"

   [User provides credentials]

✓ Executing: Deployment resumed with credentials
✓ Validating: Deployment successful
✓ Complete: Production deployment completed!
```

**User asked only when blocker encountered** - workflow resumed automatically after blocker resolved.

## Implementation for Agent Developers

When creating or modifying agents, follow these patterns:

### Pattern 1: Phase Completion Signal (Correct)

```markdown
## Agent: universal-planner

After creating plan.yaml:

1. Write plan.yaml to Agent_Memory/{instruction_id}/workflow/plan.yaml
2. Signal completion to orchestrator (plan.yaml exists = completion signal)
3. EXIT - do not ask user anything

Orchestrator will detect plan.yaml and automatically invoke controller.
```

### Pattern 2: Error Escalation (Correct)

```markdown
## Agent: controller

If blocker encountered during coordination:

1. Attempt auto-recovery (check fallback agents, retry logic)
2. If auto-recovery succeeds → continue coordination
3. If auto-recovery fails → write blocker details to coordination_log.yaml
4. Signal blocker to executor via status field
5. Executor escalates to orchestrator
6. Orchestrator invokes HITL with blocker details

DO NOT ask user directly - escalate through orchestrator.
```

### Pattern 3: HITL Gate (Correct)

```markdown
## Agent: orchestrator

When HITL approval gate reached (tier 4 only):

1. Check plan.yaml for hitl_approval_gates
2. If current phase matches approval gate → invoke HITL agent
3. HITL agent asks user for approval with context
4. If approved → continue to next phase
5. If rejected → mark workflow as blocked

Example HITL message:
"Architecture design complete. HITL approval required before implementation.

Review: Agent_Memory/inst_20260115_003/outputs/architecture_design.md

Approve to proceed with implementation, or reject to halt workflow."
```

## Rationale

### Why Automatic Progression?

1. **User Intent**: When users invoke a workflow, they want work DONE, not to babysit it
2. **Efficiency**: Automatic progression is 10x faster than manual approval at each step
3. **Consistency**: Automated workflows are more reliable than manual checkpoints
4. **Focus**: Users focus on real decisions (HITL gates, blockers), not routine progressions

### Why Only Ask for Specific Cases?

1. **HITL Gates**: Strategic decisions requiring human judgment (architecture, security, go-live)
2. **Blockers**: Situations where workflow cannot proceed without user input
3. **Ambiguity**: Multiple valid interpretations that cannot be automatically resolved
4. **Safety**: Validation BLOCKED indicates risk that requires human review

### What Changed?

**Before** (problematic):
- Agents asked permission at every phase transition
- Users frustrated by constant interruptions
- Workflows took 5x longer due to manual approvals
- User experience felt like "hand-holding" not automation

**After** (current):
- Agents proceed automatically through phases
- Users only involved for strategic decisions and blockers
- Workflows complete efficiently without interruptions
- User experience feels like true automation

## Troubleshooting

### Issue: Agent Still Asking Permission

**Symptoms**: Agent says "Would you like me to continue?" or "Should I proceed?"

**Root Cause**: Agent not following automatic progression policy

**Solution**:
1. Check agent file has "CRITICAL: Do Not Ask Permission" section
2. Verify agent logic proceeds automatically after phase completion
3. Update agent instructions to remove permission requests
4. Test workflow to confirm automatic progression

### Issue: Workflow Stuck at Phase Transition

**Symptoms**: Workflow doesn't progress to next phase automatically

**Root Cause**: Orchestrator not detecting phase completion

**Solution**:
1. Check completion file exists (plan.yaml, coordination_log.yaml, etc.)
2. Verify completion file has all required fields
3. Check orchestrator detection logic for that phase
4. Ensure status.yaml updated with completion signal

### Issue: User Not Asked When They Should Be

**Symptoms**: Workflow proceeds past blocker or HITL gate without asking user

**Root Cause**: Blocker not properly detected or HITL gate not defined

**Solution**:
1. For blockers: Ensure blocker detection logic is working
2. For HITL: Check plan.yaml has hitl_approval_gates defined
3. Verify escalation path (agent → executor → orchestrator → HITL)
4. Test blocker/HITL scenarios explicitly

## Summary

**Remember**:
- ✅ Workflows proceed AUTOMATICALLY through phases
- ✅ Only ask user for HITL gates, blockers, ambiguity, or BLOCKED validation
- ❌ NEVER ask permission for standard phase transitions
- ❌ NEVER ask user to review outputs before proceeding

**If requirements are clear, PROCEED. Do not ask.**

---

**Version**: 7.0
**Last Updated**: 2026-01-15
**Applies To**: All agents in cAgents V7.0
