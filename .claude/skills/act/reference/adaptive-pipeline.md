# Pipeline Paths (v12.7.0)

`/act` has two named pipeline paths. They are `fast` and `standard`. An
enumerated orchestrator-skip allowlist selects the path for a run. No freeform
heuristic and no complexity score takes part in that choice. The v12.7.0 bump
collapsed the older labels into these two names. The older labels were the
pre-v12.7 names Minimal, Medium and `Full`, plus the prose names "fast-path"
and "adaptive".

## Path Catalog

| Path | States Executed | Orchestrator | When Selected |
|------|-----------------|--------------|----------------|
| `fast` | ORCHESTRATED -> PLANNED -> COORDINATED -> VALIDATED | SKIPPED | tier == 2 AND !ambiguous_domain AND mode != "debug" |
| `standard` | INIT -> ORCHESTRATED -> PLANNED -> COORDINATED -> VALIDATED | RUNS | every other case (tier 3+, ambiguous tier-2, debug mode, disabled-by-flag) |

`standard` is the default path. The `fast` path is the only case that skips
the orchestrator. There are no other paths.

**v12.7.0 collapse note**: the earlier versions documented three paths, which
were Minimal, Medium and `Full`. A complexity score of 9 signals drove the
choice between those three. This bump deleted that score-based selector. It
consolidated Minimal and Medium into `fast`, and it renamed the historical
`Full` path to `standard`. A session artifact that refers to one of the old
labels stays valid for an archived run.

## Orchestrator-Skip Allowlist (Enumerated)

The pipeline skips the orchestrator if, and only if, all three of these are true:

1. `tier == 2`
2. `ambiguous_domain == false` (router returned a single high-confidence domain)
3. `mode != "debug"`

If any one condition fails, the orchestrator runs. Tier 3 and above always
runs the orchestrator, whatever the other signals say. This rule is an
enumerated allowlist, and it is not a heuristic. The canonical statement of
the rule is in `.claude/skills/act/SKILL.md` Step 3c.

## state_history Schema Additions (v12.7.0)

Each `status.yaml` state_history entry MAY hold two new fields when the
pipeline skips a state:

```yaml
state_history:
  - state: INIT
    entered_at: "{ISO_TIMESTAMP}"
    skipped: true                       # bool, optional
    skipped_reason: tier-2-fast-path    # enum, REQUIRED when skipped == true
```

### `skipped_reason` Enum (closed set)

| Value | Meaning |
|-------|---------|
| `tier-2-clear` | The skip was driven by tier 2 + clear domain heuristics (general path label). |
| `tier-2-fast-path` | The skip was driven by the `fast` path selector (tier 2, unambiguous, non-debug). This is the canonical reason produced by the orchestrator-skip rule above. |
| `disabled-by-flag` | A CLI flag (e.g., `--no-orchestrator`) or env override disabled orchestrator execution. |

`skipped_reason` MUST be one of these three values when `skipped: true`.
Any other value is a schema violation. The freeform `note` field is
**deprecated**. That field appeared in the state_history entries before
v12.7. A writer must emit `skipped_reason` in place of it. A reader must
accept either of the two fields, and it must prefer `skipped_reason` when
both of them are present.

## Tier Classification (minimum tier 2)

| Tier | Criteria | Controllers |
|------|----------|-------------|
| 2 | Single component, clear scope | 1 primary controller |
| 3 | Multiple components, external deps | 1 primary + 1-2 supporting |
| 4 | Strategic/architectural, company-wide | Executive + HITL |

The router sets `ambiguous_domain` when the domain confidence is below 0.7.
It also sets the flag when the request matches keywords from more than one
domain catalog. When the orchestrator runs, the router writes the flag to
`enriched_context.yaml`. When the orchestrator does not run, `/act` computes
the flag inline.

## Path Display

`/act` displays the selected path to the user after routing:

```
Pipeline: {path}, Domain={domain}, Tier={tier}, Controller={controller}
```

Example output:

```
Pipeline: fast, Domain=engineering, Tier=2, Controller=tech-lead
Pipeline: standard, Domain=mixed, Tier=3, Controller=tech-lead
```

## Skip Behavior Specifics

When `path == fast`, the pipeline skips the orchestrator:

- `/act` writes a small `enriched_context.yaml` inline. That file holds the
  user request, the detected domain, the tier, and the working-directory
  context. The planner then reads it as its input.
- The state_history entry for INIT records `skipped: true,
  skipped_reason: tier-2-fast-path`.

When `path == standard`, the orchestrator runs:

- The pipeline spawns the orchestrator at level 1. The orchestrator then writes
  `enriched_context.yaml` as the standard pipeline contract asks.
- No `skipped` field and no `skipped_reason` field appear in the INIT
  state_history entry.

## Domain/Tier Confirmation Display

After you classify the domain and the tier, display the classification:

```
Detected: Domain={domain} ({super_domain}), Tier={tier}, Controller={controller_name}
  (Override with: --domain <domain> --tier <N>)
```

If the user gives `--interactive`, ask for confirmation before you apply the
orchestrator-skip rule. Show the override options with that question.
