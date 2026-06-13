# Routing Patterns

## Template Matching

### Template Format
```yaml
templates:
  - name: fix_bug
    default_tier: 2
    requires_controller: true
    keywords: [fix, bug, issue, error, broken]
    required_entities: [issue]

  - name: add_feature
    default_tier: 2  # May bump to 3 based on scope
    requires_controller: true
    keywords: [add, implement, create, new, build]
    required_entities: [feature]

  - name: question
    default_tier: 2  # Not tier 0
    requires_controller: true
    keywords: [what, how, why, explain, describe]
    required_entities: []
```

### Match Confidence
- **Strong match** (keywords + entities): High confidence (0.9+)
- **Weak match** (some keywords): Medium confidence (0.6-0.8)
- **No match**: Custom classification

## Tier Examples

### Tier 2: Question (Upgraded from Tier 0)
```yaml
Input: "What is the authentication flow in our app?"

routing_decision:
  tier: 2
  requires_controller: true
  template: question

  reasoning:
    initial_tier: 0  # Would have been tier 0
    tier_upgrade: "Upgraded from tier 0 to tier 2"
    controller_logic: |
      Questions get comprehensive expert answers via controller.
      tech-lead will coordinate architect for explanation.
```

### Tier 2: Simple Edit (Upgraded from Tier 1)
```yaml
Input: "Fix typo in login.tsx line 42"

routing_decision:
  tier: 2
  requires_controller: true
  template: simple_edit

  reasoning:
    initial_tier: 1  # Would have been tier 1
    tier_upgrade: "Upgraded from tier 1 to tier 2"
    controller_logic: |
      Simple edits get specialist + editor review.
      tech-lead coordinates frontend-developer + editor.
```

### Tier 2: Bug Fix
```yaml
Input: "Fix authentication timeout bug"

routing_decision:
  tier: 2
  requires_controller: true
  template: fix_bug

  reasoning:
    initial_tier: 2
    scope_adjustment: 0
    controller_logic: |
      Bug fix requires investigation, diagnosis, fix, testing.
      tech-lead coordinates via question-based delegation.
```

### Tier 3: Feature Addition
```yaml
Input: "Add payment gateway integration with Stripe"

routing_decision:
  tier: 3
  requires_controller: true
  template: add_feature

  reasoning:
    initial_tier: 2
    scope_adjustment: +1  # External integration, security critical
    controller_logic: |
      Primary: tech-lead
      Supporting: architect (design), security-specialist (payments)
```

### Tier 4: Architecture Migration
```yaml
Input: "Migrate monolith to microservices architecture"

routing_decision:
  tier: 4
  requires_controller: true
  template: major_refactor

  reasoning:
    initial_tier: 3
    scope_adjustment: +1  # Company-wide, high risk
    controller_logic: |
      Executive: CTO (strategic decision)
      Primary: architect (migration design)
      Supporting: tech-lead, infrastructure-lead
      HITL approval required
```

## Scope Adjustment Rules

### Increase Tier (+1)
- Affects multiple components/systems
- Has external dependencies/integrations
- In critical path or high-risk area
- Requires team coordination
- Novel task type for domain
- Tight deadline with quality requirements
- Multi-domain involvement

### Maintain Tier 2
- Narrow, focused scope
- Well-known pattern with clear template
- Single component affected
- Low to moderate risk
- Standard domain task

### Increase to Tier 4
- Strategic/architectural changes
- Company-wide impact
- Mission-critical systems
- Requires executive approval

## Error Handling

| Error | Response |
|-------|----------|
| Missing config | Escalate to HITL |
| Ambiguous tier (< 0.6 confidence) | Choose higher tier |
| Invalid template | Fall back to custom (minimum tier 2) |
| User specifies tier 0/1 | Auto-upgrade to tier 2 with notification |

## Cross-Domain Routing

For multi-domain requests:
```yaml
Input: "Update privacy policy (legal) AND update UI (engineering)"

routing_decision:
  tier: 2  # Minimum, may bump based on scope
  requires_controller: true
  multi_controller: true
  controllers:
    - cagents:general-counsel (privacy policy)
    - cagents:tech-lead (UI update)
```
