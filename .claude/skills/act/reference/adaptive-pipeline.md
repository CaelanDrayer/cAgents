# Pipeline Paths (v12.7.0)

Two named pipeline paths drive `/act`: `fast` and `standard`. Path selection
is governed by an enumerated orchestrator-skip allowlist, not freeform
heuristics or complexity scoring. The pre-v12.7 names (Minimal, Medium,
`Full`) and the prose "fast-path" / "adaptive" naming were collapsed in
v12.7.0 to two unambiguous labels.

## Path Catalog

| Path | States Executed | Orchestrator | When Selected |
|------|-----------------|--------------|----------------|
| `fast` | ORCHESTRATED -> PLANNED -> COORDINATED -> VALIDATED | SKIPPED | tier == 2 AND !ambiguous_domain AND mode != "debug" |
| `standard` | INIT -> ORCHESTRATED -> PLANNED -> COORDINATED -> VALIDATED | RUNS | every other case (tier 3+, ambiguous tier-2, debug mode, disabled-by-flag) |

`standard` is the default. `fast` is the only condition under which the
orchestrator is skipped. There are no other paths.

**v12.7.0 collapse note**: prior versions documented three paths
(Minimal, Medium, `Full`) driven by a 9-signal complexity score. The
score-based selector was deleted and Minimal+Medium consolidated into
`fast`; the historical `Full` path is now `standard`. Existing session
artifacts that reference the old labels remain valid for archived runs.

## Orchestrator-Skip Allowlist (Enumerated)

The orchestrator is skipped iff ALL of:

1. `tier == 2`
2. `ambiguous_domain == false` (router returned a single high-confidence domain)
3. `mode != "debug"`

If any condition fails, the orchestrator runs. Tier 3+ ALWAYS runs the
orchestrator regardless of other signals. The rule is an enumerated
allowlist, not a heuristic; the canonical statement lives in
`.claude/skills/act/SKILL.md` Step 3c.

## state_history Schema Additions (v12.7.0)

Each `status.yaml` state_history entry MAY include two new fields when a
state is skipped:

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
Any other value is a schema violation. The freeform `note` field that
appeared in pre-v12.7 state_history entries is **deprecated**: writers
should emit `skipped_reason` instead, and readers should accept either
field but prefer `skipped_reason` when both are present.

## Tier Classification (minimum tier 2)

| Tier | Criteria | Controllers |
|------|----------|-------------|
| 2 | Single component, clear scope | 1 primary controller |
| 3 | Multiple components, external deps | 1 primary + 1-2 supporting |
| 4 | Strategic/architectural, company-wide | Executive + HITL |

`ambiguous_domain` is set by the router when domain confidence < 0.7 or
when the request matches keywords from multiple domain catalogs. The
router writes the flag to `enriched_context.yaml` (when the orchestrator
runs) or `/act` computes it inline (when it does not).

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

When `path == fast` (orchestrator skipped):

- `/act` writes a minimal `enriched_context.yaml` inline with the user
  request, detected domain, tier, and working-directory context. This
  becomes the planner's input.
- The state_history entry for INIT records `skipped: true,
  skipped_reason: tier-2-fast-path`.

When `path == standard` (orchestrator runs):

- The orchestrator is spawned at level 1 and writes `enriched_context.yaml`
  per the standard pipeline contract.
- No `skipped` or `skipped_reason` fields appear in the INIT state_history
  entry.

## Domain/Tier Confirmation Display

After classifying domain and tier, display the classification:

```
Detected: Domain={domain} ({super_domain}), Tier={tier}, Controller={controller_name}
  (Override with: --domain <domain> --tier <N>)
```

If `--interactive`, ask for confirmation with override options before
applying the orchestrator-skip rule.
