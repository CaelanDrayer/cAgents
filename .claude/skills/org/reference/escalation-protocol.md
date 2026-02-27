# Escalation Protocol

## Escalation Triggers

| # | Trigger | Severity | Example |
|---|---------|----------|---------|
| 1 | Cross-domain dependency conflict | High | Engineering needs API spec from Grow before building |
| 2 | Budget/scope exceeds authority (>50% scope change) | High | Feature request doubles engineering scope |
| 3 | Acceptance criteria unachievable (after 3 revision cycles) | Critical | Tests cannot pass with current architecture |
| 4 | Deadlock between agents (circular dependency) | Critical | A needs B, B needs A |
| 5 | Security/compliance concern | Critical | Legal flags a privacy violation in the design |

## Escalation Chain

```
Execution agent -> Controller (coordination_log)
Controller -> C-suite (SendMessage within /team)
C-suite -> CEO (escalation in domain_status)
CEO -> User (HITL gate or report)
```

### Level 1: Execution -> Controller

Execution agents flag issues in their coordination_log.yaml. The controller reads and decides:
- **Resolvable**: Controller adjusts task assignments or adds work items
- **Domain-level**: Escalate to C-suite via domain_status.escalations

### Level 2: Controller -> C-suite

Within a /team session, the controller writes to domain_status.escalations:
```yaml
escalations:
  - type: dependency_conflict
    description: "Need API spec from grow domain before implementation"
    blocking_wi: WI-003
    requested_action: "Prioritize API spec in grow domain"
    escalated_at: "{timestamp}"
```

### Level 3: C-suite -> CEO

CEO monitors domain_status periodically. When escalation detected:

1. **Read context**: What is blocked, what is needed, from which domain
2. **Attempt resolution**:
   - Adjust strategic_brief.yaml priorities
   - Re-order cross_domain_dependencies
   - Add mitigation work items
   - Relax acceptance criteria if appropriate
3. **Record resolution** in strategic_brief.yaml directives:
```yaml
directives:
  - source: ceo_resolution
    context: "Engineering blocked on API spec from Grow"
    resolution: "Grow domain to produce API spec stub by Wave 2"
    timestamp: "{ISO_TIMESTAMP}"
```

### Level 4: CEO -> User

If CEO cannot resolve, escalate to user:

**Format**:
```
ESCALATION: {brief description}

Context:
- {what is happening}
- {what is blocked}
- {what has been tried}

Options:
1. {option A with trade-offs}
2. {option B with trade-offs}
3. {option C with trade-offs}

Recommended: Option {N} because {rationale}
```

User decision recorded in strategic_brief.yaml:
```yaml
directives:
  - source: user_decision
    context: "{escalation description}"
    options_presented: ["{option 1}", "{option 2}", "{option 3}"]
    user_choice: "{selected option}"
    timestamp: "{ISO_TIMESTAMP}"
```

## Resolution Patterns

### Cross-Domain Dependency Conflict
1. Check if dependency can be satisfied with a stub/interface
2. Re-order domain execution waves
3. If neither works: escalate to user

### Scope Exceeds Authority
1. CEO evaluates if scope change aligns with mission
2. If aligned: approve with risk register update
3. If not aligned: reduce scope to original intent
4. If ambiguous: escalate to user

### Unachievable Acceptance Criteria
1. Review criteria for flexibility
2. Propose alternative criteria that still meet mission
3. If no alternatives: escalate with options

### Agent Deadlock
1. Identify circular dependency
2. Break cycle by providing one side with a stub/assumption
3. Plan verification step after both sides complete

### Security/Compliance Concern
1. Always escalate to CEO immediately (no self-resolution)
2. CEO evaluates with General Counsel analysis
3. If legal risk: escalate to user with legal context
4. Never proceed with known compliance violation

## Escalation Timeouts

| Level | Timeout | Action on Timeout |
|-------|---------|-------------------|
| Execution -> Controller | 3 minutes | Auto-escalate to C-suite |
| Controller -> C-suite | 5 minutes | Auto-escalate to CEO |
| C-suite -> CEO | 10 minutes | CEO auto-reviews |
| CEO -> User | No timeout | Wait for user response |
