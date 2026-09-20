# Strategic Brief Format

This file gives the full schema for `strategic_brief.yaml`. It also gives the validation protocol. That protocol makes sure that the brief is complete, that it is measurable, and that it is acyclic.

`/team` uses this schema in strategic mode, which v12.2.0 introduced. The prefix waves of strategic mode play the CEO role. Wave 0 holds the C-suite analysis. Wave 1 holds the objection phase. Wave 2 holds the brief synthesis. The waves after them dispatch the per-domain work, as the `domain_assignments` of the brief direct.

## Step 6: Finalize Strategic Brief (DELIBERATED -> BRIEFED)

Write the final `strategic_brief.yaml` file. Include all of the resolutions.

```yaml
strategic_brief:
  version: 1
  session_id: {SESSION_ID}
  mission: "{user instruction as strategic mission}"
  success_criteria:
    - "{measurable criterion 1}"
    - "{measurable criterion 2}"
  domain_assignments:
    {domain_key}:
      name: "{domain_key}"               # e.g., engineering, creative, growth
      csuite: cagents:{agent}
      scope: "{what this domain handles}"
      work_items: [TASK-xx, ...]
      priority: high|medium|low
      work_required: ["{summary work item 1}", "{summary work item 2}"]
      estimated_complexity: simple|moderate|complex
      dependency_type: independent | dependent_on    # NEW (v12.2.0)
      dependent_on: ["{upstream_domain_key_1}", ...] # NEW (v12.2.0) — present ONLY when dependency_type == dependent_on
  cross_domain_dependencies:
    - from: {domain}.{WI}
      to: {domain}.{WI}
      type: blocks|informs
      description: "{why}"
  risk_register:
    - risk: "{description}"
      impact: high|medium|low
      mitigation: "{strategy}"
      owner: cagents:{agent}
  escalation_contacts:
    {domain}: cagents:{csuite}
    ceo: /team (strategic mode)
  domain_status:
    {domain}:
      progress: 0
      blockers: []
      escalations: []
      completed_wis: []
```

Update the status to BRIEFED. Release v12.6.0 removed the `workflow/events/EVT-{N}.yaml` emission. Two artifacts are now the canonical signal of the state transition. They are the `pipeline_state` update in `status.yaml`, and the `strategic_brief.yaml` output.

## domain_assignments Schema Extensions (v12.2.0)

Two new fields sit at the **top level of each `domain_assignments` entry**. They are peers of `name`, of `priority`, and of `work_required`. These fields drive the dispatch logic that follows the brief in `/team` strategic mode. An independent domain dispatches in parallel through the Agent tool. A dependent domain dispatches in sequence through the Skill tool, and that call passes `--brief`.

### dependency_type (required)

Allowed values: `independent` | `dependent_on`

- **`independent`**: the work items of the domain can start as soon as the strategic brief is final. The domain needs no output from an upstream domain. The lead dispatches each independent domain **in parallel** during the per-domain wave. That wave is Wave 3 or later in /team strategic mode. The lead uses the Agent tool to spawn the domain controller.
- **`dependent_on`**: the work items of the domain need output from one upstream domain or more. That output must arrive before the work items start. The lead dispatches each dependent domain **in sequence**, after its upstream dependencies complete. The call is `Skill(/act --brief {strategic_brief.yaml} --domain {key})`. The upstream outputs are then available as context.

If an entry has no `dependency_type` field, the planner SHOULD treat that entry as `independent`. The planner SHOULD also emit a warning about the missing field. The field becomes required in v12.3.0.

### dependent_on (optional; required when dependency_type == dependent_on)

Allowed value: an array of `domain_key` strings. Each string names an upstream domain. The dependent domain needs the outputs of that upstream domain.

- When `dependency_type` is `dependent_on`, the array must hold one entry or more.
- Each `domain_key` in the list MUST exist as another entry in `domain_assignments`. That entry MUST be `independent`, or it MUST be upstream of this entry in the dependency graph. The graph must hold no cycle.
- The `dependent_on` arrays form a dependency graph. That graph MUST be acyclic. Validation Point 3 does the cycle detection with the `dependency_graph_acyclic` check below.

Example:
```yaml
domain_assignments:
  engineering:
    name: engineering
    csuite: cagents:cto
    scope: "Backend API and database schema"
    work_items: [TASK-01, TASK-02]
    priority: high
    dependency_type: independent
  growth:
    name: growth
    csuite: cagents:cro
    scope: "Launch campaign and SEO"
    work_items: [TASK-05, TASK-06]
    priority: high
    dependency_type: dependent_on
    dependent_on: [engineering, creative]
  creative:
    name: creative
    csuite: cagents:cco
    scope: "Brand visuals and copy"
    work_items: [TASK-03, TASK-04]
    priority: medium
    dependency_type: independent
```

In this example, `engineering` and `creative` dispatch in parallel during the first per-domain wave. `growth` waits, and it dispatches after both of them complete. The `dependent_on` list of `growth` names both of them.

## Cross-Domain Validation Protocol (V10.23.0)

Every state transition in the `/team` strategic-mode pipeline MUST include a structured validation. The strategic-mode lead validates the outputs at 5 checkpoints. That role was the CEO role before. The checkpoints make sure that the work is consistent across the domains, and that the work is complete.

### Validation Point 1: Pre-Deliberation (after ANALYZED)

Before you draft the strategic brief, make sure that each C-suite analysis is complete. Also make sure that no analysis is empty.

```yaml
pre_deliberation_validation:
  checkpoint: "after_analyzed"
  checks:
    all_analyses_present:
      expected: [{domain_key_1}, {domain_key_2}, ...]
      found: [{domain_key_1}, {domain_key_2}, ...]
      passed: true
    all_analyses_non_empty:
      checked: [{domain_key}: {word_count}, ...]
      min_word_count: 50
      passed: true
    wave2_peer_context_used:
      agents_checked: [{csuite_agent}: {peer_analyses_reviewed_count}, ...]
      min_peer_reads: 1
      passed: true
  overall: PASS
  timestamp: "{ISO_TIMESTAMP}"
```

### Validation Point 2: Post-Deliberation (after DELIBERATED)

Make sure that each objection was addressed. Also make sure that no contradiction stays between two domains.

```yaml
post_deliberation_validation:
  checkpoint: "after_deliberated"
  checks:
    all_objections_reviewed:
      total_objections: {N}
      blocking_objections: {N}
      blocking_resolved: {N}
      passed: true
    no_cross_domain_contradictions:
      contradiction_pairs_checked: [{domain_a}-{domain_b}, ...]
      contradictions_found: 0
      passed: true
    dependency_coverage:
      dependencies_declared: {N}
      dependencies_addressed_in_brief: {N}
      passed: true
  overall: PASS
  timestamp: "{ISO_TIMESTAMP}"
```

### Validation Point 3: Strategic Brief (after BRIEFED)

Make sure that the brief holds every required field. Also make sure that the brief is consistent with itself.

```yaml
strategic_brief_validation:
  checkpoint: "after_briefed"
  checks:
    required_fields_present:
      mission: true
      success_criteria: true
      domain_assignments: true
      cross_domain_dependencies: true
      risk_register: true
      passed: true
    success_criteria_measurable:
      total_criteria: {N}
      measurable_criteria: {N}
      passed: true  # all criteria are measurable
    domain_assignments_complete:
      domains_in_routing: [{domain_keys}]
      domains_in_assignments: [{domain_keys}]
      all_domains_assigned: true
      passed: true
    domain_dependency_type_declared:        # NEW (v12.2.0)
      entries_total: {N}
      entries_with_dependency_type: {N}
      entries_missing_dependency_type: []   # MUST be empty for PASS in v12.3.0+
      passed: true
    dependent_on_well_formed:                # NEW (v12.2.0)
      entries_with_dependency_type_dependent_on: {N}
      entries_with_non_empty_dependent_on: {N}
      entries_referencing_unknown_domain: []
      passed: true
    dependency_graph_acyclic:
      edges: {N}
      cycles_found: 0   # cycles detected in the dependent_on graph cause failure
      passed: true
  overall: PASS
  timestamp: "{ISO_TIMESTAMP}"
```

### Validation Point 4: Post-Execution (after EXECUTED)

Make sure that the execution results of every domain agree with the strategic brief.

```yaml
post_execution_validation:
  checkpoint: "after_executed"
  checks:
    all_domains_executed:
      expected: [{domain_keys}]
      completed: [{domain_keys}]
      partial: []
      failed: []
      passed: true
    success_criteria_coverage:
      total_criteria: {N}
      criteria_with_evidence: {N}
      criteria_without_evidence: []
      passed: true
    work_items_complete:
      total_wis: {N}
      completed_wis: {N}
      blocked_wis: 0
      passed: true
    escalations_resolved:
      total_escalations: {N}
      resolved: {N}
      unresolved: 0
      passed: true
  overall: PASS
  timestamp: "{ISO_TIMESTAMP}"
```

### Validation Point 5: Integration (after INTEGRATED)

Make sure that the cross-domain deliverables are consistent. Also make sure that every contract is fulfilled.

```yaml
integration_validation:
  checkpoint: "after_integrated"
  checks:
    cross_domain_dependencies_satisfied:
      total_dependencies: {N}
      satisfied: {N}
      unsatisfied: []
      passed: true
    output_consistency:
      domains_checked: [{domain_pair}: {consistent: true}, ...]
      conflicts_found: 0
      passed: true
    deliverables_complete:
      expected_outputs: [{path_1}, {path_2}, ...]
      present_outputs: [{path_1}, {path_2}, ...]
      missing_outputs: []
      passed: true
    brief_success_criteria_final:
      total_criteria: {N}
      met: {N}
      unmet: 0
      passed: true
  overall: PASS
  timestamp: "{ISO_TIMESTAMP}"
```

### Validation Storage

The lead appends every validation result to `${SESSION_DIR}/workflow/strategic_validations.yaml`:

```yaml
strategic_validations:
  - checkpoint: "after_analyzed"
    overall: PASS
    checks: {...}
    timestamp: "..."
  - checkpoint: "after_deliberated"
    overall: PASS
    checks: {...}
    timestamp: "..."
  - checkpoint: "after_briefed"
    overall: PASS
    checks: {...}
    timestamp: "..."
  - checkpoint: "after_executed"
    overall: PASS
    checks: {...}
    timestamp: "..."
  - checkpoint: "after_integrated"
    overall: PASS
    checks: {...}
    timestamp: "..."
```

### Validation Failure Handling

| Checkpoint | Failure Action |
|-----------|---------------|
| Pre-deliberation | Re-spawn each C-suite agent that is missing, and each one that is empty. Use 1 retry. If the retry fails, continue with the analyses that you have, and write down the gaps. |
| Post-deliberation | Run the objection phase again for each domain with an unresolved blocking objection. Use 1 retry. If a contradiction stays, escalate to the user. |
| Strategic brief | Fix each missing field inline. If a criterion is not measurable, add a measurement method. If an entry has no `dependency_type`, default to `independent` and emit a warning. If `dependent_on` names an unknown domain, escalate to the user. If `dependent_on` forms a cycle, also escalate to the user. There is no auto-fix. |
| Post-execution | For an incomplete domain, report the partial results. For an unmet criterion, do a check for evidence that exists but was not mapped. For an unresolved escalation, escalate to the user. |
| Integration | For an unsatisfied dependency, do a check for outputs in an unexpected location. For a conflict, the strategic-mode lead resolves it by priority. For a missing deliverable, write down the gap in integration_report.yaml. |
