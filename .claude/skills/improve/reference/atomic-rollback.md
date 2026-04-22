# Atomic Rollback Primitive (Shared Helper)

> **Shared between `/improve --mode review` (auto-fix) and
> `/improve --mode optimize` (EXECUTING).** Extracted in V10.26.29 so both
> modes use the same snapshot / apply / test / keep-or-rollback logic.
> Consumers cite this file by path instead of inlining the git-snapshot
> logic.

## Contract

`apply_atomic(change)` accepts a single planned change (one auto-fix or
one optimization opportunity) and returns one of three outcomes:

| Outcome | Meaning | Side Effect |
|---------|---------|------------|
| `kept` | Change applied AND guard chain passed | Commit stands, snapshot dropped |
| `rolled_back` | Change applied but guard chain failed | Working tree restored to pre-change state |
| `dead_letter` | Rolled back 3+ times (retry cap exhausted) | Working tree restored, change skipped |

## Algorithm

```
function apply_atomic(change):
  # 1. Snapshot BEFORE any modification
  snapshot_ref = git_stash_push("improve-atomic-{change.id}")
  # Alternative: file-level backup when git unavailable:
  #   cp {file} {file}.improve-backup-{change.id}

  # 2. Apply the change
  try:
    apply(change)  # Write/Edit file(s), or run tool
  except Exception as e:
    restore(snapshot_ref)
    return { outcome: "rolled_back", reason: "apply_failed: " + str(e) }

  # 3. Run guard chain (short-circuits on first failure)
  guard_result = run_guards(change)
  #   review mode:   npm test, tsc --noEmit, lint
  #   optimize mode: npm test + benchmark delta check

  # 4. Decide keep or rollback
  if guard_result.passed:
    git_stash_drop(snapshot_ref)
    return { outcome: "kept", guard_result: guard_result }
  else:
    restore(snapshot_ref)
    return { outcome: "rolled_back", reason: guard_result.failure }
```

Restore is byte-exact:

```
function restore(snapshot_ref):
  git stash pop {snapshot_ref}  # or: mv {file}.improve-backup-{id} {file}
  # Post-condition: git diff --exit-code  (zero diff vs pre-change)
```

## Retry Cap

The atomic primitive itself does NOT loop. Retry is the caller's concern.

- **Review mode auto-fix**: retry up to 3 rounds with feedback loop
  (see `reference/directives.md` EXECUTING section)
- **Optimize mode EXECUTING**: single attempt per opportunity; roll back
  and move on (the ROI ranker re-selects on next session)

If the caller has looped `retry_count >= 3`, it SHOULD mark the change
as `dead_letter` rather than attempting a 4th apply.

## Exit Code Contract

The caller interprets outcomes as:

| Outcome | Exit Code (for shell-invoked callers) |
|---------|---------------------------------------|
| `kept` | 0 |
| `rolled_back` | 1 |
| `dead_letter` | 2 |
| `apply_failed` (internal error) | 3 |

## Guard Chain

The guard chain is mode-specific:

### Review Mode (auto-fix)

```
1. npm test (or pytest, cargo test)          — severity: CRITICAL
2. tsc --noEmit (if TypeScript)              — severity: CRITICAL
3. npm run lint (if lint config exists)      — severity: HIGH
```

Any CRITICAL failure → `rolled_back`. Any HIGH failure alone → `rolled_back`.

### Optimize Mode (EXECUTING)

```
1. npm test (regression guard)               — severity: CRITICAL
2. Benchmark re-run (per-metric delta check) — severity: HIGH
```

Regression in tests → `rolled_back`. Benchmark regression > 2% on any
baseline metric → `rolled_back`. Target metric improvement < 5% → the
outcome is still `rolled_back` (not worth the change).

## Byte-Parity Invariant

After `rolled_back` or `dead_letter`, the working tree MUST satisfy
`git diff --exit-code` against the pre-change state. This is the
regression test in `tests/skills/atomic-rollback.test.mjs` (contract
test, V10.26.29).

## Historical Note

This primitive originally lived inline across legacy `/review` and
`/optimize` skills. V10.26.29 extracted it here; V10.26.31 wired
`/improve --mode optimize` EXECUTING through the helper. V11.0 removed
the legacy skills; this helper remains the single canonical source.

## See Also

- `reference/optimize-mode.md` — per-opportunity atomic apply
- `reference/directives.md` — 12 directives including D9 (rolled-back
  fixes documented with reason)
- `reference/risk-classification.md` — risk classification for
  optimization candidates (ported from legacy `/optimize`)
