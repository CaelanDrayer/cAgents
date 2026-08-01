# Per-Wave Decomposition Emission

How the planner / `/team` skill loop emits decomposition so the lead reads only the current wave's WIs (the standalone `team-trigger` agent was removed in v12.0.0).

## The Problem (CI-2 from enriched_context)

Pre-v12.1, `core/team` (or the planner) emitted a single `workflow/work_items.yaml` with ALL WIs across all waves. The lead read that file once at Wave 0 and held its full contents in context for the rest of the run. Wave 5's WI descriptions sat in lead context during Wave 1 — pure waste.

## The Schema

The planner emits **two artifact types** instead of one monolithic file:

### 1. `workflow/work_meta.yaml` — Wave Skeleton (lead-loaded ONCE)

```yaml
schema_version: "1"
session_id: "{session_id}"
total_waves: N
total_work_items: M
emitted_by: cagents:planner
emitted_at: "{ISO_TIMESTAMP}"
waves:
  - wave: 0
    type: bootstrap | research | design | implementation | supporting | testing | documentation | integration
    summary: "1-line description of what this wave delivers"
    work_item_ids: [WI-1]
    work_item_file: "workflow/work_items_wave_0.yaml"
    expected_duration_min: 5
  - wave: 1
    type: implementation
    summary: "Core /team refactor — per-wave decomposer, wave-reviewer, spawn briefs"
    work_item_ids: [WI-2, WI-3, WI-5, WI-6]
    work_item_file: "workflow/work_items_wave_1.yaml"
    expected_duration_min: 20
  # ... one entry per wave
dependency_graph:
  critical_path: [WI-1, WI-2, WI-4, WI-7, WI-8]
  cross_wave_dependencies:
    - from: WI-1
      to: WI-2
      type: blocks
```

Lead reads `work_meta.yaml` exactly ONCE at session init. ~50 tokens per wave × N waves ≈ 250-500 tokens total — replaces the prior 2000-5000-token full work_items.yaml hold.

### 2. `workflow/work_items_wave_{K}.yaml` — Per-Wave Detail (loaded on demand)

```yaml
schema_version: "1"
session_id: "{session_id}"
wave: K
work_items:
  - id: WI-N
    title: "..."
    description: "..."
    assigned_to: cagents:{agent}
    acceptance_criteria:
      - criterion: "..."
        verification_method: file_exists | file_contains | test_result | metric_check
    dependencies: [WI-M, ...]  # intra-wave + cross-wave by ID
    task_id: "{populated after TaskCreate}"
```

Schema is **fully back-compat** with the legacy `work_items.yaml` — same field names, same acceptance_criteria schema, same verification_method enum. A migration helper can either keep emitting the monolithic file too (transitional), or downstream consumers (controllers, reviewers, coord-log-writer) can glob both `work_items.yaml` and `work_items_wave_*.yaml`.

## Lead Loading Behavior

```
Wave 0 init:
  Read work_meta.yaml → know N waves, per-wave summaries, dependency graph

Entering Wave K:
  Read work_items_wave_{K}.yaml → know this wave's WIs
  Write spawn_brief.md (see spawn-brief-schema.md)
  Spawn subagents with ~80-token pointer prompts

Exiting Wave K:
  Spawn cagents:wave-reviewer → 1-line verdict
  Mark GATE-K complete
  DROP work_items_wave_{K}.yaml from lead's active reads — its content is no longer needed (gate validation already done by wave-reviewer; coord-log-writer will re-read at finalization from disk)

Final wave:
  Spawn cagents:coord-log-writer → 1-line confirmation
  Lead never re-reads any wave's WI file
```

## Back-Compat Strategy

For one minor-version cycle (v12.1.x), the planner emits BOTH:
- The new `work_meta.yaml` + per-wave files (primary)
- The legacy monolithic `work_items.yaml` (for downstream consumers not yet updated)

Starting v12.2.0, the legacy `work_items.yaml` becomes optional and consumers should prefer the per-wave files when present.

The regression test in `tests/v12/team-context-discipline.test.js` (WI-7) asserts that team/SKILL.md references `work_items_wave_` to ensure the lead path uses the new schema.

## Planner Implementation Notes

`core/team` and `cagents:planner` (when invoked under /team) MUST:

1. Decompose the request into wave-tagged WIs (as today).
2. Group WIs by wave assignment.
3. Write `workflow/work_meta.yaml` with the wave skeleton.
4. For each wave K, write `workflow/work_items_wave_{K}.yaml` with that wave's WIs only.
5. (Transitional, v12.1.x only) Also write the legacy `workflow/work_items.yaml` for back-compat.

Step 5 will be deprecated in v12.2.0; per-wave files become canonical.

## Token Savings

| Run profile | Pre-v12.1 (monolithic) | v12.1 (per-wave) | Savings |
|-------------|------------------------|------------------|---------|
| 3 waves, 5 WIs each | ~2500 tokens held in lead | ~250 (meta) + ~800 (current wave) = ~1050 | ~58% |
| 5 waves, 7 WIs each | ~5000 tokens | ~400 + ~1100 = ~1500 | ~70% |
| 8 waves, 10 WIs each | ~10000 tokens | ~600 + ~1500 = ~2100 | ~79% |

Savings scale with wave count — the longer the workflow, the bigger the benefit.
