# Work Item Generation

Create actionable work items from components.

## Work Item Template

```yaml
work_item_template:
  id: string  # Unique identifier (WI-001)
  name: string  # Clear, action-oriented name
  type: understand | design | build | verify | document
  description: string  # What needs to be done
  acceptance_criteria:  # How we know it's done
    - criterion: string  # What must be true
      verification_method: string  # How to verify
      evidence_type: string  # What evidence to capture
  dependencies:  # What must come first
    - work_item_id
  estimated_effort: small | medium | large
  skills_required: [skill_1, skill_2]
```

## Work Item Examples

### Understand Work Item

```yaml
- id: WI-001
  name: "Analyze existing auth implementation"
  type: understand
  description: |
    Review codebase for any existing authentication code.
    Document what exists, what's reusable, and what's missing.
  acceptance_criteria:
    - criterion: "Existing auth code documented"
      verification_method: output_exists
      evidence_type: file_path
    - criterion: "Gap analysis completed"
      verification_method: output_exists
      evidence_type: file_path
  dependencies: []
  estimated_effort: small
  skills_required: [code_analysis]
```

### Build Work Item

```yaml
- id: WI-003
  name: "Implement user model"
  type: build
  description: |
    Add authentication fields to user model:
    - password_hash
    - email_verified
    - last_login
    Create database migration.
  acceptance_criteria:
    - criterion: "User model has password_hash field"
      verification_method: file_contains
      evidence_type: file_path
    - criterion: "Database migration created"
      verification_method: file_exists
      evidence_type: file_path
  dependencies: [WI-002]
  estimated_effort: small
  skills_required: [backend, database]
```

### Verify Work Item

```yaml
- id: WI-008
  name: "Integration test login flow"
  type: verify
  description: |
    Create integration tests covering:
    - Successful login
    - Failed login (wrong password)
    - Account lockout
    - Session management
  acceptance_criteria:
    - criterion: "Integration tests pass"
      verification_method: test_result
      evidence_type: test_output
    - criterion: "Coverage > 80%"
      verification_method: metric_check
      evidence_type: metric
  dependencies: [WI-005, WI-006]
  estimated_effort: medium
  skills_required: [testing, backend]
```

## Verification Methods

| Method | Description | Example |
|--------|-------------|---------|
| file_exists | Check file at path | `migrations/*_auth.*` |
| file_contains | Grep for pattern | `password_hash in user.ts` |
| test_result | Run test command | `pytest auth/ -v` |
| scan_result | Run scan command | `npm audit --json` |
| metric_check | Compare metrics | `coverage > 80%` |
| output_exists | Check output file | `outputs/design.md` |
| manual_review | HITL verification | Tier 4 approval |

## Quality Checklist

Before completing work item generation:
- [ ] Has unique ID
- [ ] Name is action-oriented
- [ ] Description is specific
- [ ] Acceptance criteria are measurable
- [ ] Each criterion has verification method
- [ ] Dependencies are mapped
- [ ] Effort is estimated
- [ ] Skills are identified
