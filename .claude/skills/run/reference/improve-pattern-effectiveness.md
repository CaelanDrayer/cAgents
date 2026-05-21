# Pattern Effectiveness Tracking

Cross-session learning: track which optimization patterns succeed and adjust confidence on future runs. Companion to `pattern-effectiveness-migration.md` (historical migration record).

## Storage

```
cagents-memory/_projects/{hash}/improve/pattern_effectiveness.yaml
```

V11.0 made `improve/` the single source of truth. The V10.26.30–V10.26.35
read-only `optimize/` fallback was removed.

## Schema

```yaml
patterns:
  - id: lighthouse_lcp_image_optimize
    category: performance
    seen_count: 14
    success_count: 11
    rollback_count: 2
    dead_letter_count: 1
    last_seen: "2026-04-15T10:30:00Z"
    confidence_modifier: 1.15  # multiplier applied during PLANNING
```

Pattern IDs are stable strings tied to opportunity categories. New
patterns are added on first occurrence with a neutral modifier (1.0).

## Confidence Adjustment

During optimize PLANNING:

```
adjusted_confidence = base_confidence × pattern.confidence_modifier
adjusted_confidence = clamp(adjusted_confidence, 0.1, 0.99)
```

The clamp prevents new (untried) patterns from dominating the ROI
ranking and stops repeatedly-failing patterns from being silently
disabled.

## Modifier Update Rule

After each optimize REPORTING:

```
success_rate = success_count / max(seen_count, 1)
new_modifier = 0.5 + success_rate  # range: 0.5 – 1.5
exponential_smooth(old_modifier, new_modifier, alpha=0.3)
```

Exponential smoothing prevents single bad runs from over-correcting
the modifier. `alpha=0.3` weights the recent run at 30% and the
historical modifier at 70%.

## Outcome Counting

Each opportunity exits EXECUTING with one of three outcomes:

| Outcome | Counter incremented |
|---------|---------------------|
| `kept` | `success_count` |
| `rolled_back` | `rollback_count` |
| `dead_letter` | `dead_letter_count` |

`seen_count` increments on every spawn regardless of outcome.

## Cross-Project Sharing

By design, pattern effectiveness is per-project (`_projects/{hash}/`).
Cross-project sharing is intentionally not implemented: a pattern that
succeeds in one codebase may fail in another with different
constraints. A future bump may add an opt-in cross-project aggregator
under `cagents-memory/_knowledge/improve/global_patterns.yaml`.

## Inspecting Pattern Data

```bash
# View all patterns for current project
cat cagents-memory/_projects/{hash}/improve/pattern_effectiveness.yaml

# Sort by success rate
yq '.patterns | sort_by(.success_count / .seen_count)' \
  cagents-memory/_projects/{hash}/improve/pattern_effectiveness.yaml
```
