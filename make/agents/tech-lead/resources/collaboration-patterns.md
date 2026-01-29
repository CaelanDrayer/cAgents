# Tech Lead Collaboration Patterns

Communication protocols and interaction flows for tech lead coordination.

## Communication Protocols

| Protocol | Frequency | Usage |
|----------|-----------|-------|
| **Delegation** | Always (tier 3-4) | Assign tasks to specialist team members with clear scope and acceptance criteria |
| **Consultation** | Often | Consult specialists for capacity assessment, technical approach validation, risk evaluation |
| **Review** | Sometimes | Review critical work or high-risk implementations for quality assurance |
| **Escalation** | Receives | Final escalation point before HITL for blockers, resource conflicts, strategic decisions |
| **Broadcast** | Sometimes | Announce priority changes, resource reallocations, or critical decisions to entire team |

## Typical Interaction Flows

### Flow 1: Orchestrator Delegates Tier 3-4 Task

```yaml
# Inbound: Agent_Memory/_communication/inbox/tech-lead/coordination_{timestamp}.yaml
type: delegation
from: orchestrator
to: tech-lead
instruction_id: inst_20260103_005
priority: high

message: |
  Tier 3 instruction requires team coordination.
  Objective: "Implement OAuth2 authentication with SSO support"

  The plan has been created with 8 tasks across frontend, backend, security, and QA.
  Please coordinate team execution.

delegation:
  instruction_id: inst_20260103_005
  tier: 3
  complexity: high
  plan_location: "Agent_Memory/inst_20260103_005/workflow/plan.yaml"

# Tech Lead Action: Read plan, assess team capacity, delegate tasks to specialists
```

### Flow 2: Tech Lead Delegates to Backend Developer

```yaml
# Outbound: Agent_Memory/_communication/inbox/backend-developer/delegation_{timestamp}.yaml
type: delegation
from: tech-lead
to: backend-developer
instruction_id: inst_20260103_005
priority: high

message: |
  Delegating OAuth2 backend implementation task to you.

  Task: Implement OAuth2 authorization endpoints
  Acceptance Criteria:
  - Support Google, GitHub, Microsoft OAuth providers
  - Token validation and refresh logic
  - Session management with Redis
  - Comprehensive error handling
  - Unit test coverage >90%

  Deadline: 3 days
  Dependencies: None (can start immediately)

  Please acknowledge and provide ETA.

task:
  id: T1_oauth_backend
  type: implementation
  domain: backend
  estimated_effort: 3_days
```

### Flow 3: Specialist Escalates Blocker

```yaml
# Inbound: Agent_Memory/_communication/inbox/tech-lead/escalation_{timestamp}.yaml
type: escalation
from: backend-developer
to: tech-lead
instruction_id: inst_20260103_005
priority: high

escalation:
  reason: dependency_blocker
  issue: "OAuth implementation requires Redis, but infrastructure team hasn't provisioned Redis instance yet"
  impact: "Blocks OAuth task, estimated 2-day delay"
  request: "Can you coordinate with infrastructure to provision Redis?"

# Tech Lead Action: Contact SysAdmin, expedite Redis provisioning, update timeline
```

### Flow 4: Tech Lead Consults Architect

```yaml
# Outbound: Agent_Memory/_communication/inbox/architect/consultation_{timestamp}.yaml
type: consultation
from: tech-lead
to: architect
instruction_id: inst_20260103_005
priority: medium

question: |
  Planning OAuth2 authentication implementation.

  Should we:
  1. Use Passport.js library (proven, well-maintained, 20k+ stars)
  2. Implement custom OAuth2 client (full control, no dependencies)

  System context: Node.js backend, currently no auth library in use

  What's your recommendation from an architectural perspective?

context:
  decision_type: library_selection
  alternatives: ["passport.js", "custom_implementation"]
  timeframe: "Need decision within 24h to start implementation"
```

### Flow 5: Tech Lead Broadcasts Priority Change

```yaml
# Outbound: Agent_Memory/_communication/broadcast/priority_change_{timestamp}.yaml
type: broadcast
from: tech-lead
to: all_agents
instruction_id: inst_20260103_007
priority: high

announcement: |
  PRIORITY CHANGE: Production incident takes precedence

  All agents currently working on inst_20260103_005 (OAuth feature):
  Please PAUSE work and be ready to assist with production incident.

  Backend Developer: Join incident response immediately
  Frontend Developer: Pause OAuth UI work, remain on standby
  QA Lead: Prepare smoke test suite for post-incident verification

  OAuth work will resume after incident is resolved.
  ETA: 2-4 hours for incident resolution

visibility: all
action_required: true
```

## Inbox Management

**Check frequency**: Every 15 minutes during tier 3-4 execution

**Handle**:
- **Orchestrator coordination requests** (tier 3-4 delegations)
- **Team member escalations** (blockers, resource needs, technical questions)
- **Status updates** from assigned agents
- **Consultation responses** from specialists (Architect, Security, QA)

**Priority routing**:
- **Critical**: Production incidents, security issues (immediate response)
- **High**: Blockers affecting delivery (within 30 minutes)
- **Medium**: Consultation requests, resource allocation (within 2 hours)
- **Low**: Process improvements, retrospective items (within 1 day)

## Response Templates

### Delegation Response (Acknowledging New Task)

```yaml
type: delegation_ack
from: tech-lead
to: orchestrator
instruction_id: inst_20260103_005

response: |
  Acknowledged tier 3 coordination request.

  Team Assessment:
  - Backend capacity: Available immediately
  - Frontend capacity: Available after current task (2 days)
  - Security: Available for review
  - QA: Can begin test design now, execution in 3 days

  Execution Plan:
  - Days 1-3: Backend OAuth implementation
  - Days 2-4: Frontend OAuth UI
  - Days 3-5: Integration, security review, testing

  Estimated delivery: 5 days
  Risk: Frontend delay could add 1-2 days
  Mitigation: Frontend started on API-independent UI components immediately

status: in_progress
```

### Escalation Response (Resolving Blocker)

```yaml
type: escalation_response
from: tech-lead
to: backend-developer
instruction_id: inst_20260103_005

response: |
  Blocker resolved.

  Action Taken: Coordinated with SysAdmin to provision Redis immediately
  - Redis instance: redis-oauth-prod.internal:6379
  - Connection string in 1Password: "OAuth Redis Credentials"
  - Available: Now (provisioning complete)

  Please proceed with OAuth implementation.
  Updated deadline: Original deadline maintained (no delay)

status: resolved
```

### Broadcast (Team Announcement)

```yaml
type: broadcast
from: tech-lead
to: team
priority: medium

announcement: |
  SPRINT UPDATE: Week 1 Complete

  Progress:
  - OAuth backend: 80% complete (on track)
  - OAuth frontend: 50% complete (on track)
  - Security review: Scheduled for Day 4
  - QA test cases: Designed, ready for execution

  Blockers: None
  Risks: None identified

  Focus for Week 2:
  - Complete OAuth implementation
  - Integration testing
  - Security hardening

  Keep up the great work!
```

## Cross-Functional Collaboration

### With Architect
- **Consultation**: System design validation, technology selection, architectural patterns
- **Timing**: Before major implementation decisions
- **Format**: Present options with trade-offs, ask for recommendation

### With Security Specialist
- **Consultation**: Threat modeling, security requirements, vulnerability assessment
- **Timing**: Before implementation (requirements) and after (review)
- **Format**: Describe feature, ask for security considerations

### With QA Lead
- **Coordination**: Testing strategy, coverage requirements, release readiness
- **Timing**: At planning (strategy) and execution (sign-off)
- **Format**: Define quality gates, agree on acceptance criteria

### With Product Owner
- **Collaboration**: Feature prioritization, scope negotiation, timeline alignment
- **Timing**: Continuous throughout project lifecycle
- **Format**: Present options with trade-offs, get business decision

### With DevOps/SysAdmin
- **Coordination**: Infrastructure needs, deployment strategy, monitoring
- **Timing**: Early (planning) and at deployment
- **Format**: Specify requirements, agree on timeline
