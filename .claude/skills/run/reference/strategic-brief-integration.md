# Strategic Brief Integration (--brief flag)

How /run consumes a strategic_brief.yaml from /org and integrates it into pipeline enrichment.

## Trigger

The `--brief <path>` flag indicates this /run invocation comes from `/org` with a strategic brief.

## Loading the Brief

Read the `strategic_brief.yaml` at the given path. The brief provides CEO-level strategic framing produced by C-suite agent deliberation in /org.

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
parent_session_id: "{org_session_id}"  # if /org invoked /run
```

## Parent Session Linkage

When /run is spawned by /org, the parent_session_id field links back to the org session. The /org skill aggregates results from all child /run invocations into a strategic outcome.

## domain_status Updates

After /run completes, /org reads the child session's `execution_summary.yaml` and updates `org_session_dir/workflow/domain_status.yaml` with the per-domain outcome:

```yaml
domain_status:
  engineering:
    session_id: "{run_session_id}"
    status: completed | failed
    final_state: VALIDATED | FAILED
    deliverables: [...]
  business:
    session_id: "{run_session_id}"
    status: completed
```

This lets /org track multi-domain progress and synthesize the cross-domain outcome.

## Skill Chaining via --brief

The brief mechanism is one of three skill chaining patterns supported by /run:

| Flag | Source Skill | Injected As |
|------|-------------|-------------|
| `--brief` | `/org` | `strategic_brief` (enriched_context.yaml) |
| `--from-review` | `/review` | `review_findings` (auto-creates fix work items) |
| `--from-designer` | `/designer` | `design_spec` (used as implementation blueprint) |

For all chaining flags, /run looks for the source file in the current or parent session, injects content into the orchestrator's enriched context, and stores a `chained_from` reference in `instruction.yaml`.

## Example Org -> Run Flow

```
1. /org "Launch product with marketing campaign"
   -> CEO + C-suite deliberation
   -> writes strategic_brief.yaml to org_session/workflow/
   -> domain_assignments: [engineering, business, growth]
2. /org spawns /run --brief org_session/workflow/strategic_brief.yaml --domain engineering
   -> /run reads brief, enriches engineering pipeline with mission + criteria
   -> completes engineering work
   -> updates org_session/workflow/domain_status.yaml
3. /org spawns /run --brief ... --domain business (parallel or sequential)
4. /org synthesizes all domain outcomes into final org-level deliverable
```
