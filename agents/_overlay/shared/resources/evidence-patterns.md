# Evidence Patterns

Standard evidence patterns for task completion verification.

## Verification Methods

### file_exists

Check that a file exists at the specified path.

```yaml
- criterion: "Database migration created"
  verification_method: file_exists
  evidence: "migrations/20260122_add_user_auth.sql"
```

### file_contains

Search for a pattern within a file using grep or code inspection.

```yaml
- criterion: "User model has password_hash field"
  verification_method: file_contains
  evidence: "src/models/user.ts:15 - password_hash: string"
```

### test_result

Run a test suite and verify pass/fail status.

```yaml
- criterion: "Authentication tests pass"
  verification_method: test_result
  evidence: "pytest auth_tests/ - 45/45 passed (0.8s)"
```

### scan_result

Run a security or quality scan tool.

```yaml
- criterion: "No critical security vulnerabilities"
  verification_method: scan_result
  evidence: "npm audit - 0 critical, 2 low severity findings"
```

### metric_check

Compare a measured metric against a threshold.

```yaml
- criterion: "Test coverage above 80%"
  verification_method: metric_check
  evidence: "coverage: 85% > 80% threshold"
```

```yaml
- criterion: "Bundle size reduced"
  verification_method: metric_check
  evidence: "2.8MB -> 1.8MB (-36%)"
```

### output_exists

Check that a deliverable output file was produced.

```yaml
- criterion: "Design document generated"
  verification_method: output_exists
  evidence: "outputs/design.md exists (2.4KB)"
```

### manual_review

Human verification for tier 4 HITL gates.

```yaml
- criterion: "Architecture approved by CTO"
  verification_method: manual_review
  evidence: "Approved by CTO at 2026-01-22T14:00:00Z"
```

## Good vs Bad Evidence

### Good Evidence (Specific, Verifiable)

- `src/models/user.ts:15 - password_hash: string`
- `pytest: 45/45 passed (0.8s)`
- `2.8MB -> 1.8MB (-36%)`
- `migrations/20260122_add_user_auth.sql`

### Bad Evidence (Vague, Unverifiable)

- "Tests probably pass"
- "File mostly done"
- "Should be faster now"
- "I think it works"
