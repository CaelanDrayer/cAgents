# /improve Baseline (V11.0)

As of V11.0, `/improve --mode review` reads and writes its baseline from
a single canonical path under `_projects/{hash}/improve/`. The legacy
`/review` fallback that existed between V10.26.23 and V10.26.35 was
removed in V11.0 together with the `/review` skill.

## Project Hash Computation

Project hash is a stable identifier for "this working directory":

```
hash = sha256(absolute_path_of_project_root)[:16]
```

The hashing rule has not changed; baselines written by pre-V11 `/review`
and post-V11 `/improve --mode review` live under the same hash, so
migration users can manually move the file once if needed (see
`docs/MIGRATION-V11.md`).

## Canonical Lookup Rule

When `/improve --mode review` enters MEASURING:

```
primary = Agent_Memory/_projects/{hash}/improve/baseline.yaml

if exists(primary):
    baseline = read(primary)
    source = "primary"
else:
    baseline = {quality_score: null, last_measured: null}
    atomic_write(primary, baseline)
    source = "placeholder"
```

## Atomic Write

Write to `{primary}.tmp`, then `rename({primary}.tmp, primary)`. Rename
is atomic on POSIX filesystems — either the new file exists fully or
not at all. Never leave a half-written baseline.

## Historical Migration Window

| Version | Legacy read | Primary read | Primary write |
|---------|-------------|--------------|---------------|
| V10.26.23 — V10.26.35 | Fallback to `_projects/{hash}/review/baseline.yaml` | Yes | Yes |
| V11.0+ | Removed | Yes | Yes |

Users upgrading from V10.26.x who relied on the legacy fallback should
move their `_projects/{hash}/review/baseline.yaml` to
`_projects/{hash}/improve/baseline.yaml` once. See
[`docs/MIGRATION-V11.md`](../../../docs/MIGRATION-V11.md).

## Testing

The `tests/skills/improve.test.mjs` regression suite verifies:

1. Primary baseline is read when present.
2. Placeholder is written when primary is absent.
3. Atomic-write semantics hold (partial writes do not corrupt baseline).

Fixtures live at `tests/fixtures/improve/baseline-migration/`.
