# Strategic Brief Format

The full schema for `strategic_brief.yaml` and the validation protocol that ensures it is complete, measurable, and acyclic.

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
      csuite: cagents:{agent}
      scope: "{what this domain handles}"
      work_items: [TASK-xx, ...]
      priority: high|medium|low
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
    ceo: /org
  domain_status:
    {domain}:
      progress: 0
      blockers: []
      escalations: []
      completed_wis: []
```

Update status to BRIEFED.

Write state transition event to `workflow/events/EVT-{N}.yaml`:
```yaml
event_id: EVT-{N}
type: state_transition
state: briefed
agent: cagents:ceo
timestamp: "{ISO_TIMESTAMP}"
outputs_produced: [strategic_brief.yaml]
```

## Cross-Domain Validation Protocol (V10.23.0)

Every state transition in the /org pipeline MUST include structured validation. The CEO validates outputs at 5 checkpoints to ensure cross-domain consistency and completeness.

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
    dependency_graph_acyclic:
      edges: {N}
      cycles_found: 0
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

All validation results are appended to `${SESSION_DIR}/workflow/org_validations.yaml`:

```yaml
org_validations:
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
| Strategic brief | Fix missing fields inline. If criteria are unmeasurable, add measurement methods. If dependency graph is cyclic, break cycles by reordering. |
| Post-execution | For incomplete domains: report partial results. For unmet criteria: check if evidence exists but was not mapped. For unresolved escalations: escalate to user. |
| Integration | For unsatisfied dependencies: check if outputs exist in unexpected locations. For conflicts: CEO resolves by priority. For missing deliverables: document gaps in integration_report.yaml. |
