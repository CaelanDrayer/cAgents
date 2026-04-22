# Migration Guide — cAgents V11.0.0

V11.0.0 is a breaking-change release that removes four previously-
deprecated slash commands. The removal was telegraphed across a
35-patch deprecation runway (V10.26.1 → V10.26.35). This guide covers
the mechanical replacements you need to make when upgrading from any
V10.26.x release to V11.0.0.

## Summary Table

| Removed command | Replacement | First shim | Removed in |
|-----------------|-------------|-----------:|-----------:|
| `/context` | `/run context show\|init\|update\|clear` | V10.26.9 (passthrough) | V11.0.0 |
| `/debug` | `/run --mode debug` | V10.26.18 | V11.0.0 |
| `/review` | `/improve --mode review` (default mode) | V10.26.26 | V11.0.0 |
| `/optimize` | `/improve --mode optimize` | V10.26.32 | V11.0.0 |

Additionally, V10.26.33 introduced a new capability with no pre-V11
equivalent:

- **`/improve --mode full`** — unified review → optimize pipeline with
  a single shared baseline and a synthesized `improve_report.md`. Use
  this when you want to audit AND apply measurable improvements in a
  single run. Requires explicit `--scope <path>`.

## Command-by-Command Migration

### `/context` → `/run context ...`

Before (V10.26.x):

```bash
/context show
/context init "New Product Launch"
/context update vision "Ship in Q2"
/context clear
```

After (V11.0.0):

```bash
/run context show
/run context init "New Product Launch"
/run context update vision "Ship in Q2"
/run context clear
```

The underlying data file at
`Agent_Memory/_projects/{hash}/product_context.yaml` is unchanged; only
the invocation moves. `/run` detected the `context` subcommand and
passed through since V10.26.9, so no data migration is needed.

### `/debug` → `/run --mode debug`

Before:

```bash
/debug The login flow throws a 500 intermittently
/debug --phase investigate "checkout timeout"
```

After:

```bash
/run --mode debug The login flow throws a 500 intermittently
/run --mode debug --phase investigate "checkout timeout"
```

All `/debug` flags forward unchanged; the 4-phase debugging pipeline
lives inside `/run`'s state machine as of V10.26.11.

### `/review` → `/improve --mode review`

Before:

```bash
/review                           # whole repo
/review src/auth/                 # scope
/review --focus security
/review --auto-fix safe
/review --baseline                # capture baseline
/review --suppress FIND-042       # suppress a finding
```

After:

```bash
/improve --mode review                    # whole repo
/improve --mode review src/auth/          # scope
/improve --mode review --focus security
/improve --mode review --auto-fix safe
/improve --mode review --baseline
/improve --mode review --suppress FIND-042

# Or omit --mode since review is the default:
/improve src/auth/
/improve --focus security
```

`review` is the default `--mode` for `/improve`, so you can drop the
`--mode review` prefix if you like.

### `/optimize` → `/improve --mode optimize`

Before:

```bash
/optimize src/                     # detect and apply top-N
/optimize --type perf
/optimize --type size
/optimize --dry-run
/optimize --interactive
/optimize --rollback last-run
/optimize --benchmark lighthouse
```

After:

```bash
/improve --mode optimize src/
/improve --mode optimize --type perf
/improve --mode optimize --type size
/improve --mode optimize --dry-run
/improve --mode optimize --interactive
/improve --mode optimize --rollback last-run
/improve --mode optimize --benchmark lighthouse
```

Every flag forwards verbatim. The opportunity scanners, atomic
rollback helper, and pattern-effectiveness tracking are unchanged; only
the entry point moves.

## Data File Migration (Optional)

V10.26.x wrote some cross-session data under legacy paths that the
V11.0 `/improve` pipeline no longer reads. If you have existing data
you want to carry forward, move it once:

| Legacy path | V11.0 canonical path |
|-------------|----------------------|
| `Agent_Memory/_projects/{hash}/review/baseline.yaml` | `Agent_Memory/_projects/{hash}/improve/baseline.yaml` |
| `Agent_Memory/_projects/{hash}/optimize/pattern_effectiveness.yaml` | `Agent_Memory/_projects/{hash}/improve/pattern_effectiveness.yaml` |

Move command (adjust `{hash}` to your project hash, which is printed at
the top of each `/improve` run):

```bash
PROJ=Agent_Memory/_projects/{hash}
mkdir -p "$PROJ/improve"
# Move baseline if it exists:
[ -f "$PROJ/review/baseline.yaml" ] && mv "$PROJ/review/baseline.yaml" "$PROJ/improve/baseline.yaml"
# Move pattern effectiveness if it exists:
[ -f "$PROJ/optimize/pattern_effectiveness.yaml" ] && mv "$PROJ/optimize/pattern_effectiveness.yaml" "$PROJ/improve/pattern_effectiveness.yaml"
# Legacy dirs are now empty and can be removed:
rmdir --ignore-fail-on-non-empty "$PROJ/review" "$PROJ/optimize" 2>/dev/null || true
```

If you skip this step, `/improve` will start with an empty baseline and
an empty pattern-effectiveness table on the first run — functional but
you lose historical data.

## New in V11.0 — `/improve --mode full`

`/improve --mode full` is the headline capability of the consolidation.
It runs review first, captures a shared baseline once (no double-
measurement), filters review findings down to the performance /
efficiency / bundle-size subset, feeds that subset as seed
opportunities into the optimize half of the pipeline, and produces a
single `improve_report.md` with `## Review Findings` and
`## Optimizations Applied` sections.

```bash
# Requires explicit --scope to bound the blast radius:
/improve --mode full --scope src/

# Preview without applying any changes:
/improve --mode full --scope src/ --dry-run
```

## Pinning to V10.26

If you can't migrate yet, pin to `^10.26` in your plugin manifest. The
V10.26 series remains a stable release line; all four deprecated
commands still work there as shims with clear deprecation warnings.

## Reverting V11.0.0

V11.0.0 is a single commit that removed 4 skill directories. A full
revert restores everything:

```bash
git revert <V11.0.0 commit SHA>
scripts/sync-versions.sh 10.26.35
```

You will lose the `/improve --mode full` capability if you revert.

## Why V11.0?

The four removed commands accumulated parsing and deprecation-warning
duplication that made the plugin harder to maintain. The unified
`/improve` state machine (SCOPING → MEASURING → DETECTING → PLANNING →
EXECUTING → VALIDATING → REPORTING) consolidates review and optimize
into a single code path with shared baselines, shared atomic rollback,
and shared pattern-effectiveness tracking. V11.0 collapses the
10-skill menu to 6 and ends the two-version deprecation window opened
in V10.26.26.

## Help

- **Command catalog and usage**: `/helper <command>`
- **Skill docs**: `.claude/skills/improve/SKILL.md` and
  `.claude/skills/improve/reference/*`
- **Open an issue**:
  https://github.com/CaelanDrayer/cAgents/issues
