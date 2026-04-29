# Pattern Effectiveness Storage (V11.0)

Storage rule for the `pattern_effectiveness.yaml` data used by
`/improve --mode optimize` to adjust opportunity confidence scores based
on historical success rates. As of V11.0 the legacy `/optimize` fallback
is removed — `improve/` is the single canonical path.

## Canonical Path

`cagents-memory/_projects/{hash}/improve/pattern_effectiveness.yaml`

Project hash is computed exactly as described in
[`reference/baseline-migration.md`](baseline-migration.md).

## Read-Path Rule

1. Compute project hash.
2. If `improve/pattern_effectiveness.yaml` exists: read it.
3. If it does not exist: treat as empty pattern table (new project).

## Write-Path Rule

All writes go to `improve/pattern_effectiveness.yaml` only.

## Schema

```yaml
patterns:
  {pattern_name}:
    total_applied: {count}
    success_rate: {0.0-1.0}
    avg_impact: "{measurable impact description}"
    common_failures: ["{failure reason 1}", ...]
    confidence_adjustment: {-0.10 to +0.10}
last_updated: "{ISO8601 UTC}"
```

## Historical Migration Window

| Version | Read Paths | Write Path |
|---------|-----------|-----------|
| Pre-V10.26.30 | `_projects/{hash}/optimize/pattern_effectiveness.yaml` | same |
| V10.26.30 — V10.26.35 | Primary: `improve/`, fallback: legacy `optimize/` (read-only copy-forward) | `improve/` only |
| V11.0+ | `improve/` only (fallback removed) | `improve/` only |

Users upgrading from V10.26.x who still have data under
`_projects/{hash}/optimize/pattern_effectiveness.yaml` should move the
file once to the `improve/` path. See
[`docs/MIGRATION-V11.md`](../../../docs/MIGRATION-V11.md).

## See Also

- `reference/baseline-migration.md` — baseline.yaml storage rule
- `reference/optimize-mode.md` — where pattern_effectiveness is consumed
  during ROI ranking
