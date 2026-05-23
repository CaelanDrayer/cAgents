# Pre-Flight Validation

4-level validation before workflow starts.

## Validation Levels

### Level 1: Context Completeness (30% weight)

Verify sufficient context for workflow:

- Domain detected with sufficient confidence
- Intent classified
- Request clarity sufficient
- Template matched (if applicable)

**Threshold**: 0.60

### Level 2: Feasibility (30% weight)

Assess whether the request is achievable:

- Scope realistic (tier <= 3 or HITL available)
- Data available
- Technical feasibility
- Risk acceptable

**Threshold**: 0.70

### Level 3: Resources (25% weight)

Verify required resources exist:

- Controllers/agents available
- Token budget sufficient
- Time reasonable
- Infrastructure ready

**Threshold**: 0.70

### Level 4: Conflicts (15% weight)

Check for blocking conflicts:

- No parallel workflow conflicts
- No dependency conflicts
- No state conflicts (uncommitted changes, etc.)

**Threshold**: 0.80

## Overall Score Calculation

```
overall_score = (
  context_completeness * 0.30 +
  feasibility * 0.30 +
  resources * 0.25 +
  conflicts * 0.15
)
```

## Classification

| Score | Result | Action |
|-------|--------|--------|
| >= 0.70 | PASS | Proceed automatically |
| 0.50-0.70 | WARN | Show warnings, ask to proceed |
| < 0.50 | FAIL | Block workflow, show issues, suggest fixes |

## Validation Report Example

```yaml
validation_id: preflight_inst_20260116_001_1642330000
overall_result: PASS
overall_score: 0.82

levels:
  context_completeness: {score: 0.88, result: PASS}
  feasibility: {score: 0.85, result: PASS}
  resources: {score: 0.78, result: PASS}
  conflicts: {score: 0.90, result: PASS}

issues: []
recommendations: []
next_action: proceed
```

## User Display

```
Pre-flight validation: PASSED (score: 0.82)
  - Context completeness: 0.88 (PASS)
  - Feasibility: 0.85 (PASS)
  - Resources: 0.78 (PASS)
  - Conflicts: 0.90 (PASS)

Ready to proceed with workflow initialization
```
