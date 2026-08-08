# Strategic Brief Integration (--brief flag)

How /act consumes a `strategic_brief.yaml` from `/team` strategic mode and integrates it into pipeline enrichment.

## Trigger

The `--brief <path>` flag indicates this `/act` invocation comes from `/team` strategic mode with a strategic brief. `/team` strategic mode plays the CEO role through its Wave 0/1/2 strategic prefix, producing the brief that `/act` consumes here.

## Loading the Brief

Read the `strategic_brief.yaml` at the given path. The brief provides CEO-level strategic framing produced by C-suite agent deliberation in `/team` strategic mode.

## Brief Fields Consumed

| Field | Used For |
|-------|----------|
| `mission` | Enriched context passed to orchestrator and planner |
| `success_criteria` | Augments plan.yaml success_criteria |
| `domain_assignments` | Maps work to specific domains |

The brief enriches downstream agents with richer context about the mission and constraints than they would have from the raw user request alone.

## Recording the Brief Path

Store brief path in `instruction.yaml`:

```yaml
strategic_brief_path: "{path_to_strategic_brief.yaml}"
parent_session_id: "{team_session_id}"  # if /team strategic mode invoked /act
```

## Parent Session Linkage

When `/act` is spawned by `/team` strategic mode, the `parent_session_id` field links back to the team session. The `/team` strategic-mode lead aggregates results from all child `/act` invocations into a strategic outcome.

## domain_status Updates

After `/act` completes, `/team` strategic mode reads the child session's `execution_summary.yaml` and updates `team_session_dir/workflow/domain_status.yaml` with the per-domain outcome:

```yaml
domain_status:
  engineering:
    session_id: "{act_session_id}"
    status: completed | failed
    final_state: VALIDATED | FAILED
    deliverables: [...]
  business:
    session_id: "{act_session_id}"
    status: completed
```

This lets `/team` strategic mode track multi-domain progress and synthesize the cross-domain outcome.

## Skill Chaining via --brief

`--brief` is currently the only implemented skill-chaining flag for `/act`. The
broader output_contract/input_from chaining pattern (previously paired with
two additional review- and designer-fed chaining flags) was prototyped in
V10.18.0 but never implemented; the corresponding flag advertisements were
removed in v11.2.10 — see CHANGELOG entry for context. `/act` reads the brief
file, injects its content into the orchestrator's enriched context, and stores
a `chained_from` reference in `instruction.yaml`.

## Example /team Strategic Mode -> /act Flow

```
1. /team "Launch product with marketing campaign"
   -> router detects domain_count >= 2 -> strategic mode auto-enabled
   -> Wave 0/1/2 C-suite deliberation
   -> writes strategic_brief.yaml to team_session/outputs/strategic/
   -> domain_assignments: [engineering, business, growth]
2. /team strategic mode spawns /act --brief team_session/outputs/strategic/strategic_brief.yaml --domain engineering
   -> /act reads brief, enriches engineering pipeline with mission + criteria
   -> completes engineering work
   -> updates team_session/workflow/domain_status.yaml
3. /team strategic mode spawns /act --brief ... --domain business (parallel or sequential)
4. /team strategic mode synthesizes all domain outcomes into final team-level deliverable
```
