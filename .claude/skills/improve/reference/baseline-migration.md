# /improve Baseline Migration

The V10.26.23 migration window lets `/improve --mode review` read legacy
`/review` baselines while writes go only to the new `_projects/{hash}/improve/`
path.

## Project Hash Computation

Project hash is a stable identifier for "this working directory", computed as:

```
hash = sha256(absolute_path_of_project_root)[:16]
```

This matches the hash used by `/review`, `/optimize`, and `/context`, so
baselines written by any of those skills are readable by any other skill that
uses the same rule.

## Two-Path Lookup Rule

When `/improve --mode review` enters MEASURING:

```
primary = Agent_Memory/_projects/{hash}/improve/baseline.yaml
legacy  = Agent_Memory/_projects/{hash}/review/baseline.yaml

if exists(primary):
    baseline = read(primary)
    source = "primary"
elif exists(legacy):
    baseline = read(legacy)
    # One-shot migration: copy forward
    atomic_write(primary, baseline)
    source = "legacy_review_migrated"
else:
    baseline = {quality_score: null, last_measured: null}
    atomic_write(primary, baseline)
    source = "placeholder"
```

## Atomic Copy-Forward

Write to `{primary}.tmp`, then `rename({primary}.tmp, primary)`. Rename is
atomic on POSIX filesystems — either the new file exists fully or not at all.
Never leave a half-written baseline.

## Legacy File Preservation

The legacy `_projects/{hash}/review/baseline.yaml` is NOT deleted after
copy-forward. Any `/review` invocation that still reaches the legacy path
(during the V10.26.26 shim transition) continues to work unchanged. The
legacy file is removed entirely in V11.0 when `/review` is deleted.

## Migration Window

| Version | Legacy read | Legacy write | Primary read | Primary write |
|---------|-------------|--------------|--------------|---------------|
| V10.26.23+ | Fallback | No (untouched) | Yes | Yes |
| V10.26.26 | Still fallback (shim forwards to /improve) | No | Yes | Yes |
| V11.0 | Removed | Removed | Yes | Yes |

## Testing

The V10.26.23 regression test (`tests/skills/improve.test.mjs`) verifies:

1. Primary baseline is read when present.
2. Legacy baseline is read and copied forward when primary is absent.
3. Placeholder is written when neither is present.
4. Legacy file is not modified by the copy-forward step.

Fixtures live at `tests/fixtures/improve/baseline-migration/`.
