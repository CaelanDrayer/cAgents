# Pattern Effectiveness Migration

Migration rule for the `pattern_effectiveness.yaml` data used by
`/improve --mode optimize` to adjust opportunity confidence scores based
on historical success rates.

## Migration Window

| Version | Read Paths | Write Path |
|---------|-----------|-----------|
| Pre-V10.26.30 | `_projects/{hash}/optimize/pattern_effectiveness.yaml` | `_projects/{hash}/optimize/pattern_effectiveness.yaml` |
| V10.26.30 — V10.26.35 | Primary: `_projects/{hash}/improve/pattern_effectiveness.yaml`, fallback: legacy optimize path | `_projects/{hash}/improve/pattern_effectiveness.yaml` only |
| V11.0.0+ | `_projects/{hash}/improve/pattern_effectiveness.yaml` only (fallback removed) | same |

## Read-Path Rule

1. Compute project hash (same rule as baseline migration; see
   `reference/baseline-migration.md`).
2. Look up pattern effectiveness in this order:
   - **Primary**: `Agent_Memory/_projects/{hash}/improve/pattern_effectiveness.yaml`
   - **Legacy fallback**: `Agent_Memory/_projects/{hash}/optimize/pattern_effectiveness.yaml`
3. If primary exists: read it, ignore legacy.
4. If primary does NOT exist but legacy does: read legacy AND copy forward
   to primary using atomic write (`{path}.tmp` then `rename`). Legacy is
   NOT deleted — it remains untouched so a still-running `/optimize`
   invocation can read it during the shim window.
5. If neither exists: treat as empty pattern table (new project).

## Write-Path Rule

All writes go to
`_projects/{hash}/improve/pattern_effectiveness.yaml` only. Legacy
`optimize/` path is never written after V10.26.30. This ensures the
migration monotonically moves data forward without divergence.

## Copy-Forward Semantics

The copy-forward is byte-exact. No schema transformation. If the primary
file does not exist at read time, the legacy file is copied verbatim to
the primary path. A subsequent session reads the primary and does not
touch legacy.

Post-condition: `diff legacy primary` returns 0 immediately after the
first copy-forward read.

## Schema (unchanged from legacy)

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

## V11.0 Removal

V11.0.0 removes the legacy-fallback read branch. Code becomes:

```python
# V11.0+
primary = Agent_Memory/_projects/{hash}/improve/pattern_effectiveness.yaml
if exists(primary):
  read(primary)
else:
  return empty_patterns
```

After V11.0 lands, this migration doc should be converted to a
"migration complete" historical note or removed if no referrers remain.

## See Also

- `reference/baseline-migration.md` — baseline.yaml migration rule (same
  pattern, different file)
- `reference/optimize-mode.md` — where pattern_effectiveness is consumed
  during ROI ranking
- `.claude/skills/optimize/SKILL.md` — legacy `/optimize` skill (still
  live until V11.0)
