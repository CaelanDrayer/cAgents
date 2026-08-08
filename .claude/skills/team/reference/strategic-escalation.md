# Strategic Escalation and Error Recovery

Combined reference covering:
1. **Escalation handling** — how the strategic-mode lead handles domain escalations, when to escalate to the user (HITL), error recovery patterns, and routing shortcuts.
2. **Escalation protocol** — the full 4-level chain (Execution -> Controller -> C-suite -> Strategic-Mode Lead -> User), trigger taxonomy, resolution patterns, and timeouts.

Used by `/team` in strategic mode (introduced in v12.2.0). The strategic-mode lead orchestrates the prefix waves (analysis, deliberation, brief synthesis) and dispatches per-domain work in subsequent waves.

---

## Part 1 — Escalation Handling and Error Recovery

### Strategic-Mode Lead Escalation Flow

When a domain reports an escalation during the per-domain execution waves:

1. The strategic-mode lead reads the escalation context from `domain_status.escalations[]` in `strategic_brief.yaml`
2. The lead attempts resolution at the strategic level:
   - Adjust brief to address the blocker
   - Re-prioritize work items
   - Add risk mitigation
   - Reassign work between domains
3. If the lead cannot resolve: escalate to user (Chairperson) with:
   - Context of what happened
   - What was tried
   - Recommended options for the user to choose from
4. User decision is recorded in `strategic_brief.yaml` as a `directive` field, then execution continues

### Routing Shortcuts

#### Single-Domain Simple (-> /act)

For instructions touching only one domain with simple scope:

1. Strategic-mode lead still generates `strategic_brief.yaml` (adds mission, success criteria)
2. Invoke: `Skill({ skill: "act", args: "{instruction} --brief {brief_path}" })`
3. /act reads brief for richer context
4. Skip states: ANALYZED, DELIBERATED (brief generated inline)

#### Single-Domain Complex (-> /team standard mode)

For instructions touching one domain with complex scope, the strategic-mode lead can hand off to /team standard mode (non-strategic) with the brief attached:

1. Strategic-mode lead generates `strategic_brief.yaml`
2. Invoke `/team` in standard mode with `--session {session_dir}` so the brief is available
3. Standard-mode /team reads strategic_brief.yaml from session dir
4. Skip states: ANALYZED, DELIBERATED

#### Multi-Domain (-> Full Strategic Pipeline)

For instructions touching 2+ domains: execute the full strategic-mode pipeline (INIT -> ANALYZED -> DELIBERATED -> BRIEFED -> EXECUTED -> INTEGRATED -> COMPLETE) by running `/team` with strategic mode enabled.

### Error Handling

| Failure Mode | Recovery |
|--------------|----------|
| **C-suite agent fails** | Retry once. If still fails, the strategic-mode lead produces the domain analysis inline. |
| **Deliberation deadlock** | After 2 rounds of unresolved blocking objections, escalate to user. |
| **Per-domain execution fails** | Strategic-mode lead reads partial outputs, reports status, suggests `--resume`. |
| **Context exhaustion** | Pre-compact hook saves waypoint. Resume via `--resume {session_id}`. |

### Validation Failure Escalations

See `@reference/strategic-brief-format.md` for the per-checkpoint validation failure handling matrix. Summary:

| Checkpoint | Failure Action |
|-----------|---------------|
| Pre-deliberation | Re-spawn missing/empty C-suite agents (1 retry); proceed with gaps if persistent |
| Post-deliberation | Re-run objection phase (1 retry); escalate to user if contradictions persist |
| Strategic brief | Fix missing fields inline; break dependency cycles by reordering |
| Post-execution | Report partial results; map evidence; escalate unresolved escalations |
| Integration | Resolve conflicts by priority; document gaps in integration_report.yaml |

### Configuration Pointers

- Pipeline config: `cagents-memory/_system/config/strategic_pipeline_config.yaml` (optional — generated at runtime; `/team` strategic mode operates with hardcoded defaults if absent)
- C-suite mapping: See `@reference/csuite-mapping.md`
- Strategic brief schema: See `@reference/strategic-brief-format.md`
- Escalation protocol details: See Part 2 below

---

## Part 2 — Escalation Protocol

### Escalation Triggers

| # | Trigger | Severity | Example |
|---|---------|----------|---------|
| 1 | Cross-domain dependency conflict | High | Engineering needs API spec from Grow before building |
| 2 | Budget/scope exceeds authority (>50% scope change) | High | Feature request doubles engineering scope |
| 3 | Acceptance criteria unachievable (after 3 revision cycles) | Critical | Tests cannot pass with current architecture |
| 4 | Deadlock between agents (circular dependency) | Critical | A needs B, B needs A |
| 5 | Security/compliance concern | Critical | Legal flags a privacy violation in the design |

### Escalation Chain

```
Execution agent -> Controller (coordination_log)
Controller -> C-suite (SendMessage within /team)
C-suite -> Strategic-Mode Lead (escalation in domain_status)
Strategic-Mode Lead -> User (HITL gate or report)
```

#### Level 1: Execution -> Controller

Execution agents flag issues in their coordination_log.yaml. The controller reads and decides:
- **Resolvable**: Controller adjusts task assignments or adds work items
- **Domain-level**: Escalate to C-suite via domain_status.escalations

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

The strategic-mode lead monitors domain_status periodically. When an escalation is detected:

1. **Read context**: What is blocked, what is needed, from which domain
2. **Attempt resolution**:
   - Adjust strategic_brief.yaml priorities
   - Re-order cross_domain_dependencies
   - Add mitigation work items
   - Relax acceptance criteria if appropriate
3. **Record resolution** in strategic_brief.yaml directives:
```yaml
directives:
  - source: strategic_lead_resolution
    context: "Engineering blocked on API spec from Grow"
    resolution: "Grow domain to produce API spec stub by Wave 2"
    timestamp: "{ISO_TIMESTAMP}"
```

#### Level 4: Strategic-Mode Lead -> User

If the strategic-mode lead cannot resolve, escalate to user:

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

User decision recorded in strategic_brief.yaml:
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
1. Check if dependency can be satisfied with a stub/interface
2. Re-order domain execution waves
3. If neither works: escalate to user

#### Scope Exceeds Authority
1. Strategic-mode lead evaluates if scope change aligns with mission
2. If aligned: approve with risk register update
3. If not aligned: reduce scope to original intent
4. If ambiguous: escalate to user

#### Unachievable Acceptance Criteria
1. Review criteria for flexibility
2. Propose alternative criteria that still meet mission
3. If no alternatives: escalate with options

#### Agent Deadlock
1. Identify circular dependency
2. Break cycle by providing one side with a stub/assumption
3. Plan verification step after both sides complete

#### Security/Compliance Concern
1. Always escalate to the strategic-mode lead immediately (no self-resolution)
2. Lead evaluates with General Counsel analysis
3. If legal risk: escalate to user with legal context
4. Never proceed with known compliance violation

### Escalation Timeouts

| Level | Timeout | Action on Timeout |
|-------|---------|-------------------|
| Execution -> Controller | 3 minutes | Auto-escalate to C-suite |
| Controller -> C-suite | 5 minutes | Auto-escalate to strategic-mode lead |
| C-suite -> Strategic-Mode Lead | 10 minutes | Lead auto-reviews |
| Strategic-Mode Lead -> User | No timeout | Wait for user response |
