# Best Practices: Human-in-the-Loop (HITL)

> Design principles, patterns, and frameworks that guide high-quality human escalation and approval gate work.

## Design Principles

- **30-Second Rule**: Every escalation request must be understandable in under 30 seconds — include status, risk, and options up front
- **Always Recommend**: Never present a choice without a recommended option and clear rationale — humans decide better with anchoring
- **Domain Isolation**: Patterns learned from engineering decisions must never auto-apply to creative or business domains — calibration data is domain-scoped
- **Safe Defaults**: When escalation fails or times out, prefer the non-destructive path — destructive actions require explicit human confirmation
- **Minimal Interruption**: Escalate only when agent authority is genuinely exhausted — not as a shortcut for uncertainty
- **Evidence-Backed Options**: Each option must show consequences, not just label them — "Option A: Delete user records (irreversible, 3000 rows affected)" not just "Option A: Delete"
- **Capture Rationale**: Record not just the decision but the human's reasoning — this drives future automation and domain calibration

## Key Patterns & Frameworks

- **Approval Gate Pattern**: A mandatory pause point in the pipeline where execution cannot proceed until a human explicitly approves — used for destructive actions, production deploys, security changes, and tier 4 workflows
- **Options Matrix**: Present 2-5 mutually exclusive options in a structured table with action, risk level, reversibility, and estimated effort — removes cognitive load from the human
- **Consequence Disclosure**: Before any human decision, enumerate what changes if the action is taken, what is lost if declined, and what the abort path looks like
- **Decision Capture Log**: Every HITL event is logged to a durable append-only record with timestamp, domain, context, options presented, decision made, and rationale — enables pattern extraction
- **Confidence-Triggered Escalation**: When an agent's self-assessed confidence drops below 0.3, it escalates rather than proceeding with uncertain output — humans override, not guess
- **Exhaustion Protocol**: HITL is the final stop after self-correct has cycled 3+ times — the escalation packet must include all prior attempts and what each one produced
- **Domain-Isolated Learning**: After each HITL resolution, extract a domain-scoped heuristic — "In engineering, when X happens, prefer Y" — never cross-pollinate domains automatically
- **Workflow Pause/Resume**: HITL freezes the session state to a waypoint so that when the human responds, execution resumes exactly where it stopped — no re-planning needed

## Domain Concepts & Terminology

### Escalation Triggers
- **Pre-Action Gate**: Escalation that fires before a potentially harmful action — cannot be bypassed
- **Post-Exhaustion Gate**: Escalation after self-correct or revision cycles are spent — last resort before abandonment
- **Policy-Mandated Checkpoint**: Escalation defined in domain config as mandatory regardless of agent confidence
- **Tier 4 Approval**: Any tier-4 workflow requires HITL before final execution — architectural and company-wide changes

### Decision Mechanics
- **Option Anchor**: The recommended option surfaced first or flagged as preferred — reduces decision fatigue
- **Reversibility Rating**: Each option tagged as reversible, partially reversible, or irreversible — key input to human risk assessment
- **Blast Radius Estimate**: How much data, code, infrastructure, or users are affected by each option
- **Abort Path**: A safe "do nothing" option that is always available — humans must always be able to decline

### Workflow State
- **Paused Session**: A session whose pipeline is frozen awaiting a human response — state is preserved in waypoint files
- **Resume Token**: The identifier that tells the pipeline exactly where to continue after a human decision
- **Escalation Packet**: The full context bundle sent to the human: status, risk, options, recommendation, and evidence

### Calibration
- **Domain Calibration Data**: Per-domain history of what decisions humans made in similar situations — informs future automation thresholds
- **Automation Candidate**: A recurring decision pattern that could be auto-resolved in the future once confidence is high enough
- **Cross-Contamination Risk**: The bug where a pattern from one domain incorrectly influences another — must be prevented by domain scoping

## Anti-Patterns to Avoid

- **Premature Escalation**: Escalating to humans before self-correct or revision cycles are exhausted — wastes human attention and degrades trust in the system
- **Option Overload**: Presenting more than 5 options — cognitive overload leads to poor decisions and delays; prune to the essential choices
- **Undisclosed Consequences**: Presenting an option without stating what happens if it is chosen — the human must understand blast radius before deciding
- **No Recommendation**: Listing options without indicating a preferred one — forces the human to synthesize from scratch what the agent should already know
- **Rationale-Free Decisions**: Capturing only the decision, not the reasoning — future automation cannot learn from unlabeled examples
- **Domain Cross-Contamination**: Applying a pattern learned from an engineering escalation to a creative domain decision — each domain has its own context and risk profile
- **Blocking Without Evidence**: Escalating because "something feels wrong" without concrete signals — escalation must be justified with specific failure conditions

## Quality Indicators

- **Time-to-Decision**: Average time from escalation to human response — target under 24 hours; long wait times indicate unclear presentations
- **Option Selection Distribution**: If 95% of humans always pick Option 1, the other options are noise — prune and improve framing
- **Escalation Rate by Domain**: High rates in one domain suggest agents need better calibration or self-correct tuning there
- **Rationale Capture Rate**: Percentage of decisions where human rationale is recorded — target 100% for learning pipeline
- **False Escalation Rate**: Decisions the human resolves as "agent should have handled this" — signals premature escalation
- **Resume Success Rate**: Percentage of paused sessions that successfully resume after HITL — failed resumes indicate state management bugs
- **Automation Extraction Rate**: How often HITL events produce a reusable calibration heuristic — measures learning loop health

## Collaboration Touchpoints

- **With universal-self-correct**: Receives escalations after self-correct exhausts its 6-step recovery ladder — HITL is the final step, not the first response
- **With universal-validator**: Validator escalates BLOCKED classifications to HITL when issues cannot be auto-resolved — HITL determines whether to re-plan, accept partial results, or abandon
- **With orchestrator**: Orchestrator pauses phase transitions and creates a waypoint when HITL is triggered — resumes the state machine after HITL resolves
- **With trigger**: Trigger routes tier 4 requests to include a mandatory HITL checkpoint before final execution — HITL approves go/no-go for high-impact work
