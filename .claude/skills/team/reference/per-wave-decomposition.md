# Per-Wave Decomposition Emission

This file tells you how the planner and the `/team` skill loop emit the decomposition. The lead then reads only the WIs of the current wave. Release v12.0.0 removed the standalone `team-trigger` agent.

## The Problem (CI-2 from enriched_context)

Before v12.1, `core/team` emitted a single `workflow/work_items.yaml` file. The planner also did this. That one file held ALL of the WIs across all of the waves.

The lead read that file once at Wave 0. It then held the full contents of the file in its context for the rest of the run. The WI descriptions of Wave 5 sat in the lead context during Wave 1. That is pure waste.

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
    type: bootstrap | research | design | implementation | supporting | testing | documentation | integration | vertical-slice
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

The lead reads `work_meta.yaml` exactly ONCE at session init. Each wave costs about 50 tokens, so N waves cost about 250 to 500 tokens in total. That total replaces the earlier hold of the full `work_items.yaml` file, which cost 2000 to 5000 tokens.

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

The schema is **fully back-compat** with the legacy `work_items.yaml` file. The field names are the same. The `acceptance_criteria` schema is the same. The `verification_method` enum is the same.

A migration helper can continue to emit the monolithic file as well, and that step is transitional. As an alternative, each downstream consumer can glob both `work_items.yaml` and `work_items_wave_*.yaml`. Those consumers are the controllers, the reviewers, and `coord-log-writer`.

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

For one minor-version cycle, which is v12.1.x, the planner emits BOTH of these:
- The new `work_meta.yaml` file and the per-wave files. These are the primary artifacts.
- The legacy monolithic `work_items.yaml` file. It supports a downstream consumer that is not updated yet.

From v12.2.0, the legacy `work_items.yaml` file is optional. If the per-wave files are present, each consumer must prefer them.

The regression test for WI-7 is in `tests/v12/team-context-discipline.test.js`. It asserts that team/SKILL.md references `work_items_wave_`. That assertion makes sure that the lead path uses the new schema.

## Planner Implementation Notes

`core/team` and `cagents:planner` MUST do these steps under /team:

1. Decompose the request into wave-tagged WIs, as you do today.
2. Group the WIs by their wave assignment.
3. Write the wave skeleton to `workflow/work_meta.yaml`.
4. For each wave K, write only the WIs of that wave to `workflow/work_items_wave_{K}.yaml`.
5. Also write the legacy `workflow/work_items.yaml` file for back-compat. This step is transitional, and it applies to v12.1.x only.

Release v12.2.0 deprecates step 5. The per-wave files then become canonical.

### Vertical-slice rules

Apply the Wave-1 rule. For `/team`, always emit the vertical-slice wave as
`wave: 1`. Wave 0 stays reserved for pure bootstrap. Never retype wave 0 as
`vertical-slice`.

## Token Savings

| Run profile | Pre-v12.1 (monolithic) | v12.1 (per-wave) | Savings |
|-------------|------------------------|------------------|---------|
| 3 waves, 5 WIs each | ~2500 tokens held in lead | ~250 (meta) + ~800 (current wave) = ~1050 | ~58% |
| 5 waves, 7 WIs each | ~5000 tokens | ~400 + ~1100 = ~1500 | ~70% |
| 8 waves, 10 WIs each | ~10000 tokens | ~600 + ~1500 = ~2100 | ~79% |

The savings scale with the wave count. A longer workflow gives a bigger benefit.
