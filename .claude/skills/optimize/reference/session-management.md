# Optimize Session Management

## Session ID Format

`optimize_{slug}_{YYMMDD}_{NNN}` -- consistent with all cAgents commands (e.g., `optimize_reduce-bundle-size_260317_001`).

## Session Directory Structure

```
Agent_Memory/sessions/optimize_{slug}_{YYMMDD}_{NNN}/
+-- instruction.yaml               # User request + metadata
+-- status.yaml                    # Current phase, phase history
+-- task_plan.md                   # Three-file pattern: work items
+-- findings.md                    # Three-file pattern: discoveries
+-- progress.md                    # Three-file pattern: status/resume
+-- workflow/
|   +-- detection_report.yaml      # Phase 1 output
|   +-- baseline_metrics.yaml      # Phase 2 baseline
|   +-- opportunities.yaml         # Phase 2 opportunities
|   +-- cross_file_analysis.yaml   # Phase 2 cross-file (if enabled)
|   +-- dependency_graph.json      # Phase 2 dependency map (if enabled)
|   +-- plan.yaml                  # Phase 3 plan
|   +-- execution_summary.yaml     # Phase 4 results
|   +-- coordination_log.yaml      # Controller Q&A (if tier 2+)
+-- optimizations/                 # Per-optimization results
|   +-- {opt_id}/
|       +-- snapshot.yaml          # Pre-change snapshot
|       +-- result.yaml            # Success/failure + evidence
|       +-- validation.yaml        # Validation results
+-- waypoints/                     # Phase transition checkpoints
|   +-- wp-{phase}-{timestamp}.yaml
+-- outputs/
|   +-- optimization_report.md     # Final human-readable report
+-- validation/
    +-- validation_report.yaml     # Quality gate results
```

## Status Tracking

Write `status.yaml` at every phase transition:

```yaml
session_id: optimize_20260204_143022
session_type: optimize
phase: analysis
phase_history:
  - {phase: detection, started: "...", completed: "...", result: "20 opportunities detected"}
  - {phase: analysis, started: "...", status: in_progress}
optimization_type: code
frameworks: [nextjs, react]
total_opportunities: 20
applied: 0
failed: 0
```

## Incremental Saves

- Write detection_report.yaml as soon as detection completes
- Write baseline_metrics.yaml as soon as baseline measurement completes
- Write opportunities.yaml as opportunities are found (append mode)
- Write per-optimization results immediately after each optimization
- Write execution_summary.yaml incrementally as optimizations complete

## Context Monitoring

After 15+ optimizations processed:
- Enter context-conscious mode
- Write shorter summaries in progress.md
- Reference file paths instead of inline content
- Prioritize file writes over in-memory tracking

## Phase Checkpoints

At each phase transition, write a waypoint:

```yaml
# waypoints/wp-analysis-20260204_144500.yaml
id: wp-analysis-20260204_144500
type: phase_transition
phase: analysis
created_at: "2026-02-04T14:45:00Z"
opportunities_found: 20
baseline_measured: true
resume_hints:
  next_action: "Proceed to planning phase"
  context_needed: [detection_report.yaml, opportunities.yaml, baseline_metrics.yaml]
```

## Resume Protocol

If session is interrupted and resumed:
1. Read progress.md for current status
2. Read the last waypoint in waypoints/
3. Load the phase files that are complete
4. Continue from the next incomplete phase
