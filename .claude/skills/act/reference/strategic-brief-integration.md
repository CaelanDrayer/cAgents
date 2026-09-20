# Strategic Brief Integration (--brief flag)

This file explains how /act consumes a `strategic_brief.yaml` from `/team` strategic mode. It also explains how /act integrates that brief into the pipeline enrichment.

## Trigger

The `--brief <path>` flag shows that this `/act` invocation comes from `/team` strategic mode, and that it carries a strategic brief. `/team` strategic mode plays the CEO role through its Wave 0/1/2 strategic prefix. That mode produces the brief that `/act` consumes here.

## Loading the Brief

Read the `strategic_brief.yaml` at the given path. The brief gives you CEO-level strategic framing. The C-suite agents produce that framing when they deliberate in `/team` strategic mode.

## Brief Fields Consumed

| Field | Used For |
|-------|----------|
| `mission` | Enriched context passed to orchestrator and planner |
| `success_criteria` | Augments plan.yaml success_criteria |
| `domain_assignments` | Maps work to specific domains |

The brief enriches the downstream agents with context about the mission, and with context about the constraints. That context is richer than the raw user request alone gives them.

## Recording the Brief Path

Store the brief path in `instruction.yaml`:

```yaml
strategic_brief_path: "{path_to_strategic_brief.yaml}"
parent_session_id: "{team_session_id}"  # if /team strategic mode invoked /act
```

## Parent Session Linkage

When `/team` strategic mode spawns `/act`, the `parent_session_id` field links back to the team session. The `/team` strategic-mode lead aggregates the results of every child `/act` invocation into one strategic outcome.

## domain_status Updates

After `/act` completes, `/team` strategic mode reads the `execution_summary.yaml` of the child session. It then updates `team_session_dir/workflow/domain_status.yaml` with the per-domain outcome:

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

This record lets `/team` strategic mode track the progress across the domains, and synthesize the cross-domain outcome.

## Skill Chaining via --brief

`--brief` is the only skill-chaining flag that `/act` implements today. The
broader output_contract/input_from chaining pattern was prototyped in V10.18.0,
and it was never implemented. Two further chaining flags were paired with that
pattern, and review fed one of them while designer fed the other. The v11.2.10
bump removed the advertisements of those two flags. See the CHANGELOG entry for
the context.

`/act` reads the brief file. It injects the content of the brief into the
enriched context of the orchestrator. It then stores a `chained_from`
reference in `instruction.yaml`.

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
