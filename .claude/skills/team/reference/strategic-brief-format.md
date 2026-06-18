# Strategic Brief Format

The full schema for `strategic_brief.yaml` and the validation protocol that ensures it is complete, measurable, and acyclic.

Used by `/team` in strategic mode (introduced in v12.2.0). The CEO role is played by the `/team` strategic-mode prefix waves (Wave 0 C-suite analysis, Wave 1 objection phase, Wave 2 brief synthesis); subsequent waves dispatch per-domain work according to the brief's `domain_assignments`.

## Step 6: Finalize Strategic Brief (DELIBERATED -> BRIEFED)

Write final `strategic_brief.yaml` incorporating all resolutions.

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

Update status to BRIEFED. (v12.6.0: `workflow/events/EVT-{N}.yaml` emission removed — the `status.yaml` `pipeline_state` update plus the `strategic_brief.yaml` output are the canonical state-transition signal.)

## domain_assignments Schema Extensions (v12.2.0)

Two new fields position at the **top level of each `domain_assignments` entry** (peer to `name`, `priority`, `work_required`, etc.). These fields drive the post-brief dispatch logic in `/team` strategic mode: independent domains dispatch in parallel via the Agent tool, dependent domains dispatch sequentially via the Skill tool with `--brief` passing.

### dependency_type (required)

Allowed values: `independent` | `dependent_on`

- **`independent`** — the domain's work items can begin immediately once the strategic brief is finalized. No upstream domain output is required as input. Independent domains are dispatched **in parallel** during the per-domain wave (Wave 3+ in /team strategic mode), using the Agent tool to spawn the domain controller.
- **`dependent_on`** — the domain's work items require output from one or more upstream domains before they can begin. Dependent domains are dispatched **sequentially** after their upstream dependencies complete, via `Skill(/run --brief {strategic_brief.yaml} --domain {key})` so the upstream outputs are available as context.

If `dependency_type` is omitted from an entry, the planner SHOULD treat the entry as `independent` and emit a warning that the field is missing (the field becomes required in v12.3.0).

### dependent_on (optional — required when dependency_type == dependent_on)

Allowed value: an array of `domain_key` strings naming upstream domains whose outputs the dependent domain needs.

- Must contain at least one entry when `dependency_type` is `dependent_on`.
- Each listed domain_key MUST exist as another entry in `domain_assignments` and MUST be either `independent` or upstream of this entry in the dependency graph (no cycles).
- The dependency graph formed by `dependent_on` arrays MUST be acyclic. Cycle detection is performed during Validation Point 3 (`dependency_graph_acyclic` check below).

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

In this example, `engineering` and `creative` dispatch in parallel during the first per-domain wave; `growth` waits and dispatches after both complete (because `growth` depends on both per its `dependent_on` list).

## Cross-Domain Validation Protocol (V10.23.0)

Every state transition in the `/team` strategic-mode pipeline MUST include structured validation. The strategic-mode lead (formerly the CEO role) validates outputs at 5 checkpoints to ensure cross-domain consistency and completeness.

### Validation Point 1: Pre-Deliberation (after ANALYZED)

Verify all C-suite analyses are complete and non-empty before drafting the strategic brief.

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

Verify objections were addressed and no contradictions remain between domains.

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

Verify the brief has all required fields and is internally consistent.

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

Verify all domain execution results align with the strategic brief.

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

Verify cross-domain deliverables are consistent and all contracts fulfilled.

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

All validation results are appended to `${SESSION_DIR}/workflow/strategic_validations.yaml`:

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
| Pre-deliberation | Re-spawn missing/empty C-suite agents (1 retry). If still fails, proceed with available analyses and note gaps. |
| Post-deliberation | Re-run objection phase for domains with unresolved blocking objections (1 retry). If contradictions persist, escalate to user. |
| Strategic brief | Fix missing fields inline. If criteria are unmeasurable, add measurement methods. If `dependency_type` is missing on any entry, default to `independent` and emit warning. If `dependent_on` references an unknown domain or forms a cycle, escalate to user — no auto-fix. |
| Post-execution | For incomplete domains: report partial results. For unmet criteria: check if evidence exists but was not mapped. For unresolved escalations: escalate to user. |
| Integration | For unsatisfied dependencies: check if outputs exist in unexpected locations. For conflicts: strategic-mode lead resolves by priority. For missing deliverables: document gaps in integration_report.yaml. |
