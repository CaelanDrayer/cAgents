# Strategic Escalation and Error Recovery

This file is a combined reference. It covers two subjects:
1. **Escalation handling**: how the strategic-mode lead handles a domain escalation. It also covers when to escalate to the user through a HITL gate. It covers the error recovery patterns and the routing shortcuts too.
2. **Escalation protocol**: the full 4-level chain, which runs Execution -> Controller -> C-suite -> Strategic-Mode Lead -> User. It also covers the trigger taxonomy, the resolution patterns, and the timeouts.

`/team` uses this reference in strategic mode, which v12.2.0 introduced. The strategic-mode lead orchestrates the prefix waves. Those waves are the analysis, the deliberation, and the brief synthesis. The lead then dispatches the per-domain work in the waves that follow.

---

## Part 1 — Escalation Handling and Error Recovery

### Strategic-Mode Lead Escalation Flow

During the per-domain execution waves, a domain can report an escalation. Do these steps:

1. The strategic-mode lead reads the escalation context. That context is in `domain_status.escalations[]` in `strategic_brief.yaml`.
2. The lead tries to resolve the escalation at the strategic level:
   - Change the brief to address the blocker.
   - Give the work items a new priority order.
   - Add a risk mitigation.
   - Move the work from one domain to another.
3. If the lead cannot resolve the escalation, escalate it to the user. The user is the Chairperson. Give the user these three items:
   - The context of what happened.
   - What the lead tried.
   - The recommended options for the user to choose from.
4. Record the decision of the user in `strategic_brief.yaml`, as a `directive` field. The execution then continues.

### Routing Shortcuts

#### Single-Domain Simple (-> /act)

Use this shortcut for an instruction that touches only one domain with a simple scope:

1. The strategic-mode lead still generates `strategic_brief.yaml`. That file adds the mission and the success criteria.
2. Invoke: `Skill({ skill: "act", args: "{instruction} --brief {brief_path}" })`
3. /act reads the brief for richer context.
4. Skip these states: ANALYZED and DELIBERATED. The lead generates the brief inline.

#### Single-Domain Complex (-> /team standard mode)

An instruction can touch one domain with a complex scope. For that case, the strategic-mode lead hands the work to the standard mode of /team, which is the non-strategic mode. The lead attaches the brief:

1. The strategic-mode lead generates `strategic_brief.yaml`.
2. Invoke `/team` in standard mode with `--session {session_dir}`. The brief is then available.
3. Standard-mode /team reads strategic_brief.yaml from the session directory.
4. Skip these states: ANALYZED and DELIBERATED.

#### Multi-Domain (-> Full Strategic Pipeline)

An instruction can touch 2 domains or more. For that case, run `/team` with strategic mode enabled. It executes the full strategic-mode pipeline, which is INIT -> ANALYZED -> DELIBERATED -> BRIEFED -> EXECUTED -> INTEGRATED -> COMPLETE.

### Error Handling

| Failure Mode | Recovery |
|--------------|----------|
| **C-suite agent fails** | Retry once. If the retry fails, the strategic-mode lead produces the domain analysis inline. |
| **Deliberation deadlock** | After 2 rounds with unresolved blocking objections, escalate to the user. |
| **Per-domain execution fails** | The strategic-mode lead reads the partial outputs. It reports the status, and it suggests `--resume`. |
| **Context exhaustion** | The pre-compact hook saves a waypoint. Resume with `--resume {session_id}`. |

### Validation Failure Escalations

For the matrix of the validation failure handling at each checkpoint, see `@reference/strategic-brief-format.md`. This table is a summary:

| Checkpoint | Failure Action |
|-----------|---------------|
| Pre-deliberation | Re-spawn each C-suite agent that is missing or empty. Use 1 retry. If the problem stays, continue with the gaps. |
| Post-deliberation | Run the objection phase again. Use 1 retry. If a contradiction stays, escalate to the user. |
| Strategic brief | Fix each missing field inline. Break a dependency cycle with a new order. |
| Post-execution | Report the partial results. Map the evidence. Escalate each unresolved escalation. |
| Integration | Resolve each conflict by priority. Write down the gaps in integration_report.yaml. |

### Configuration Pointers

- Pipeline config: `cagents-memory/_system/config/strategic_pipeline_config.yaml`. This file is optional, and the system generates it at run time. If the file is absent, `/team` strategic mode uses its hardcoded defaults.
- C-suite mapping: See `@reference/csuite-mapping.md`
- Strategic brief schema: See `@reference/strategic-brief-format.md`
- Escalation protocol details: See Part 2 below

---

## Part 2 — Escalation Protocol

### Escalation Triggers

| # | Trigger | Severity | Example |
|---|---------|----------|---------|
| 1 | Cross-domain dependency conflict | High | Engineering needs the API spec from Grow before it builds |
| 2 | The budget or the scope exceeds the authority, with a scope change of more than 50% | High | The feature request doubles the engineering scope |
| 3 | The acceptance criteria cannot be met after 3 revision cycles | Critical | The tests cannot pass with the current architecture |
| 4 | A deadlock between two agents, from a circular dependency | Critical | A needs B, B needs A |
| 5 | A security concern or a compliance concern | Critical | Legal flags a privacy violation in the design |

### Escalation Chain

```
Execution agent -> Controller (coordination_log)
Controller -> C-suite (SendMessage within /team)
C-suite -> Strategic-Mode Lead (escalation in domain_status)
Strategic-Mode Lead -> User (HITL gate or report)
```

#### Level 1: Execution -> Controller

An execution agent flags each issue in its coordination_log.yaml file. The controller reads the issue, and the controller decides:
- **Resolvable**: the controller changes the task assignments, or the controller adds work items.
- **Domain-level**: escalate to the C-suite through domain_status.escalations.

#### Level 2: Controller -> C-suite

Within a `/team` per-domain wave, the controller writes to domain_status.escalations:
```yaml
escalations:
  - type: dependency_conflict
    description: "Need API spec from grow domain before implementation"
    blocking_wi: TASK-03
    requested_action: "Prioritize API spec in grow domain"
    escalated_at: "{timestamp}"
```

#### Level 3: C-suite -> Strategic-Mode Lead

The strategic-mode lead monitors domain_status at regular intervals. If the lead detects an escalation, do these steps:

1. **Read the context**: find what is blocked, find what is needed, and find the domain that must supply it.
2. **Try to resolve it**:
   - Change the priorities in strategic_brief.yaml.
   - Put cross_domain_dependencies into a new order.
   - Add work items for the mitigation.
   - Relax the acceptance criteria, if the mission still holds.
3. **Record the resolution** in the directives section of strategic_brief.yaml:
```yaml
directives:
  - source: strategic_lead_resolution
    context: "Engineering blocked on API spec from Grow"
    resolution: "Grow domain to produce API spec stub by Wave 2"
    timestamp: "{ISO_TIMESTAMP}"
```

#### Level 4: Strategic-Mode Lead -> User

If the strategic-mode lead cannot resolve the escalation, escalate it to the user:

**Format**:
```
ESCALATION: {brief description}

Context:
- {what is happening}
- {what is blocked}
- {what has been tried}

Options:
1. {option A with trade-offs}
2. {option B with trade-offs}
3. {option C with trade-offs}

Recommended: Option {N} because {rationale}
```

Record the decision of the user in strategic_brief.yaml:
```yaml
directives:
  - source: user_decision
    context: "{escalation description}"
    options_presented: ["{option 1}", "{option 2}", "{option 3}"]
    user_choice: "{selected option}"
    timestamp: "{ISO_TIMESTAMP}"
```

### Resolution Patterns

#### Cross-Domain Dependency Conflict
1. Find out whether a stub or an interface can satisfy the dependency.
2. Put the domain execution waves into a new order.
3. If neither step works, escalate to the user.

#### Scope Exceeds Authority
1. The strategic-mode lead finds out whether the scope change agrees with the mission.
2. If it agrees, approve it and update the risk register.
3. If it does not agree, reduce the scope to the original intent.
4. If the answer is unclear, escalate to the user.

#### Unachievable Acceptance Criteria
1. Review the criteria for flexibility.
2. Propose alternative criteria that still meet the mission.
3. If there is no alternative, escalate with the options.

#### Agent Deadlock
1. Find the circular dependency.
2. Break the cycle. Give one side a stub, or give one side an assumption.
3. Plan a check step for the time after both sides complete.

#### Security/Compliance Concern
1. Always escalate to the strategic-mode lead at once. Do not resolve it yourself.
2. The lead evaluates the concern with an analysis from the General Counsel.
3. If there is a legal risk, escalate to the user with the legal context.
4. Never continue with a known compliance violation.

### Escalation Timeouts

| Level | Timeout | Action on Timeout |
|-------|---------|-------------------|
| Execution -> Controller | 3 minutes | Auto-escalate to C-suite |
| Controller -> C-suite | 5 minutes | Auto-escalate to strategic-mode lead |
| C-suite -> Strategic-Mode Lead | 10 minutes | Lead auto-reviews |
| Strategic-Mode Lead -> User | No timeout | Wait for user response |
