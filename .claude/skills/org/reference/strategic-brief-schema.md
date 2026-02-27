# Strategic Brief Schema

## Full Schema

```yaml
strategic_brief:
  version: 1
  session_id: org_{timestamp}

  # Core mission derived from user instruction
  mission: "{user instruction reframed as strategic mission}"

  # Measurable success criteria
  success_criteria:
    - "{criterion 1 - specific and verifiable}"
    - "{criterion 2}"

  # Domain assignments with work scope
  domain_assignments:
    {domain_key}:
      csuite: cagents:{agent}
      scope: "{what this domain handles}"
      work_items:
        - id: WI-{NNN}
          description: "{work item}"
          acceptance_criteria:
            - "{criterion}"
      priority: high|medium|low
      estimated_complexity: simple|moderate|complex

  # Cross-domain dependency map
  cross_domain_dependencies:
    - from: "{domain_key}.{WI-id}"
      to: "{domain_key}.{WI-id}"
      type: blocks|informs
      description: "{why this dependency exists}"

  # Risk register with ownership
  risk_register:
    - risk: "{risk description}"
      impact: high|medium|low
      likelihood: high|medium|low
      mitigation: "{mitigation strategy}"
      owner: cagents:{agent}

  # Escalation contacts per domain
  escalation_contacts:
    {domain_key}: cagents:{csuite_agent}
    ceo: /org

  # Real-time status tracking (updated during execution)
  domain_status:
    {domain_key}:
      progress: 0          # percentage 0-100
      status: pending|in_progress|completed|blocked
      blockers: []
      escalations: []
      completed_wis: []
      started_at: null
      completed_at: null

  # User directives (from escalation resolution)
  directives: []
```

## Field Descriptions

### mission
The user's instruction reframed as a strategic mission statement. Should be actionable and measurable.

**Good**: "Migrate authentication from session-based to JWT across all services while maintaining backward compatibility"
**Bad**: "Fix auth"

### success_criteria
List of specific, verifiable criteria that define mission success. Each criterion should be testable.

### domain_assignments
Maps each involved domain to its C-suite owner, work scope, and priority. Only domains touched by the instruction are included.

### cross_domain_dependencies
Explicit dependency graph between work items in different domains. `blocks` means the target cannot start until the source completes. `informs` means the target benefits from the source but can proceed independently.

### risk_register
Identified risks with impact assessment, mitigation strategies, and assigned owners. Populated during C-suite analysis and deliberation.

### domain_status
Real-time status updated by /team during execution. CEO monitors this for escalation handling and integration readiness.

### directives
User decisions recorded when escalated. Each directive includes context, options presented, user choice, and timestamp.

## Objections Schema

Used during the deliberation phase:

```yaml
agent: cagents:{csuite}
domain: {domain_key}
status: approved|conditional_approval|objection
approved:
  - "{approved items}"
objections:
  - item: "{what is being objected to}"
    concern: "{why this is a problem}"
    alternative: "{proposed alternative}"
    severity: blocking|suggestion
requested_dependencies:
  - from: {other_domain}
    need: "{what is needed}"
    by_when: "{timing requirement}"
risk_flags:
  - "{newly identified risk}"
```

## Template Location

A blank strategic_brief.yaml template is available at:
`Agent_Memory/_system/templates/strategic_brief.yaml`
