## Per-Wave Emission Contract (v12.1.1+)

When the request decomposes into waves (typical under `/team` or `/run --waves N`, and any time the planner identifies natural delivery phases), the planner MUST emit BOTH the legacy monolithic file AND the new per-wave shapes:

| Artifact | Required when | Purpose |
|----------|---------------|---------|
| `workflow/work_items.yaml` | Always | Back-compat flat view of all WIs across all waves. Downstream consumers not yet updated still read this. |
| `workflow/work_meta.yaml` | Whenever waves are defined | Wave skeleton lead-loads ONCE: wave count, per-wave summary + WI IDs, dependency graph, critical path. ~50 tokens per wave. |
| `workflow/work_items_wave_{K}.yaml` | One per wave K (0-indexed) | Per-wave detail loaded on demand. Same field schema as `work_items.yaml` (`id`, `title`, `description`, `assigned_to`, `acceptance_criteria`, `dependencies`). |

**Why both shapes**: v12.1.0 documented the per-wave schema in `.claude/skills/team/reference/per-wave-decomposition.md` and made the team SKILL read from `work_items_wave_{K}.yaml`, but the planner kept emitting only the monolithic file — leaving the team lead to fall back to the legacy path. v12.1.1 closes the gap. Back-compat is preserved through v12.1.x; v12.2.0 may demote `work_items.yaml` to optional. See `.claude/skills/team/reference/per-wave-decomposition.md` for full schema details and lead-loading behavior.

### work_meta.yaml Schema

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
    summary: "Core feature build"
    work_item_ids: [WI-2, WI-3, WI-4]
    work_item_file: "workflow/work_items_wave_1.yaml"
    expected_duration_min: 20
  # ... one entry per wave
dependency_graph:
  critical_path: [WI-1, WI-2, WI-5, WI-8]
  cross_wave_dependencies:
    - from: WI-1
      to: WI-2
      type: blocks
```

### work_items_wave_{K}.yaml Schema

Same WI schema as the monolithic `work_items.yaml`, filtered to wave K only:

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

### Emission Algorithm

```
1. Decompose request into wave-tagged WIs (existing 5-step decomposition).
2. Write workflow/work_items.yaml (legacy monolithic, all WIs flat).
3. If waves were identified (total_waves >= 1):
   a. Group WIs by wave assignment.
   b. Write workflow/work_meta.yaml with wave skeleton + dependency graph.
   c. For each wave K, write workflow/work_items_wave_{K}.yaml with that
      wave's WIs only.
4. Write plan.yaml referencing both work_items.yaml and work_meta.yaml.
5. Write the completion event listing all emitted artifacts.
```

### When Waves Are Not Defined

For tier-2 single-wave work (e.g., simple `/run` with no `--waves` flag and a request that fits in one delivery phase), the planner MAY skip `work_meta.yaml` + per-wave files and emit only `work_items.yaml`. In that case the completion event omits the per-wave artifacts. The regression test at `tests/v12/planner-per-wave-emission.test.js` only asserts the per-wave shapes exist when `work_meta.yaml.total_waves >= 1`.
