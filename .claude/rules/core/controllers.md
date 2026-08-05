---
paths:
  - ".claude/rules/core/controllers.md"
  - ".claude/rules/core/controller-reference.md"
  - ".claude/rules/core/resources/controller-validation-checklist.md"
  - ".claude/rules/playbooks/pat-controller-coordination-protocol.md"
  - ".claude/rules/playbooks/pat-two-stage-review.md"
  - "agents/leadership/**"
  - "agents/core/coordinator/**"
  - "agents/developer/fullstack/architect/**"
  - "agents/developer/fullstack/data-lead/**"
  - "agents/developer/fullstack/tech-lead/**"
  - "agents/developer/infrastructure/security-engineer/**"
  - "agents/developer/quality/qa-lead/**"
  - "agents/advisor/legal/general-counsel/**"
  - "agents/operator/business-ops/operations-manager/**"
  - "agents/operator/marketing-sales/marketing-strategist/**"
  - "agents/operator/marketing-sales/sales-strategist/**"
  - "agents/operator/people-ops/hr-manager/**"
  - "agents/operator/support/customer-success-manager/**"
  - "agents/operator/support/support-director/**"
  - "agents/strategist/product-owner/**"
  - "agents/strategist/strategic-planner/**"
  - "agents/writer/editor/**"
  - "agents/writer/narrative-director/**"
  - ".claude/skills/run/SKILL.md"
  - ".claude/skills/run/reference/delegation-patterns.md"
  - ".claude/skills/run/reference/delegation-workaround.md"
  - ".claude/skills/team/SKILL.md"
  - ".claude/hooks/controller-delegation-validator.cjs"
  - "cagents-memory/sessions/**/workflow/coordination_log.yaml"
  - "cagents-memory/sessions/**/workflow/plan.yaml"
---

# Controller Coordination Guidelines

Question-based delegation patterns for controllers with v10 agent chaining support.

## Enforced vs Advisory Ledger

The table below tells you at a glance which coordination protocols in this file are mechanically enforced (a hook, CI check, or test blocks or rewrites on violation) versus advisory. Advisory = the model is asked to follow it; no hook verifies it yet.

| Protocol | Enforced by | Status |
|----------|-------------|--------|
| Controllers never Write/Edit implementation files (`src/`, `lib/`, `components/`, `app/`, `services/`, `middleware/`) | `controller-delegation-validator.cjs` — PreToolUse[Write\|Edit] deny while a controller is active | Enforced |
| `coordination_log.yaml` / `plan.yaml` JSON+YAML syntax validity | `post-write-validator.cjs` — PostToolUse[Write\|Edit] | Enforced |
| Evidence-first execution (cited file:line / grep / test evidence) | `validator-evidence-recheck.cjs` re-runs cited methods after a write and downgrades PASS→FAIL | Partial (post-write recheck) |
| Pre-execution validation checklist (Checks 0–6) | agent-self-reported; `verify-completion.cjs` only warns if the `pre_execution` field is absent from the log | Advisory |
| Mid-execution validation checkpoints (5 checks) | agent-self-reported; warn-only presence check on the `mid_execution` field | Advisory |
| Guard-command pattern + regression-validation chain | agent-self-reported; no hook runs the guard chain | Advisory |
| Dead-letter promotion contract | agent-self-reported (this section itself notes "no hook currently enforces it") | Advisory |
| Two-stage review, blind review + Devil's Advocate | agent-self-reported | Advisory |
| Confidence tiers | agent-self-reported | Advisory |

For the cross-cutting checks that ARE hook-enforced (exactly 5), see @.claude/rules/quality/resources/validation-checklist-active.md.

## v10 Agent Chaining: Topological Execution

Controllers execute work items in dependency order, passing context between agents via files:

```
Controller receives work_items.yaml with agent assignments + dependency graph
  1. Topological sort by dependencies -> execution order
  2. For each work item in order:
     a. Gather output files from completed dependencies
     b. Spawn assigned agent via Agent tool with context from dependencies
     c. Spawn reviewer to check against acceptance criteria
     d. If REVISE: re-spawn agent with feedback (max 2 rounds)
  3. Independent work items execute in parallel
  4. After all work items complete: write coordination_log.yaml
```

## CRITICAL: Controllers NEVER Do Direct Work

**Controllers are COORDINATORS, not IMPLEMENTERS.** They MUST use Agent tool for all work.

- **Allowed**: Ask questions, synthesize answers, create task lists, write coordination_log.yaml
- **Prohibited**: Write code, create content, answer own questions, use Edit on implementation files

For EVERY question: formulate -> spawn execution agent via Agent -> record answer -> synthesize after all answered.

### Context-Efficient Question Delegation

Question prompts should be **under 300 tokens**. Include only: the question, where to look, what to report. Do NOT include plan/decomposition/instruction contents.

## CRITICAL: Synchronous Spawning (never background-and-yield)

Controllers (and `/team` leads) MUST spawn execution agents **synchronously** and collect each result before yielding the turn. Concretely: every `Agent(...)` call is issued with `run_in_background: false` (explicit — subagents are background-by-default since Claude Code 2.1.198), and the controller waits for the spawned agent's result in the same turn it spawned it.

**Never background a sub-agent and then yield.** A backgrounded child plus a parent that returns/yields before collecting the child's result produces an **hours-long stall**: the child sits with `stopped_at: null` in `agent_tree.yaml`, so the session *looks* alive (a null-stop child reads as "actively working"), yet nothing progresses because no agent is awaiting the child. This is the controller-background-yield stall (REC-05, session `run_bash-guard-evaluator_260708_001`). The Stop-hook stale-child freshness gate (`verify-completion.cjs` `sessionActivelyWorking`) now discounts a null-stop child whose `spawned_at` is older than `CAGENTS_STALE_CHILD_MS` (default 30 min) specifically to surface this stall — but the primary fix is behavioral: **spawn synchronously, collect, then proceed.**

The one exception is the OPTIONAL experimental named-background-teammate path (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`), where a named background teammate is coordinated via `SendMessage` and its result is still explicitly collected — never spawned-and-forgotten. On the default concurrent-Agent path, always `run_in_background: false`.

## Invoking Workspace Skills (reuse-before-rebuild)

The planner may assign a work item to a **workspace skill** instead of a
cAgents agent (field `assigned_skill`, with `skill_args`) when a skill already
present in the workspace owns that work — e.g. a user's `pr` skill that owns
their SOW/quote templates, or a `deep-research` skill. This is the
minimal-solution ladder at planning time: reuse before rebuild.

When a controller processes an `assigned_skill` work item, it invokes the
skill via the **Skill tool** rather than spawning an execution agent:

```
Skill({ skill: "{assigned_skill}", args: "{skill_args}" })
```

Invoking a workspace skill IS a valid form of delegation — it is NOT the
controller "doing the work directly." Treat the skill's output as the work
item's deliverable and run the normal reviewer loop against the acceptance
criteria.

**Graceful fallback**: if the `Skill` tool is verifiably absent from the
controller's surface (nesting ceiling, or a regressed harness), do NOT fail
the work item — spawn the closest-matching cAgents execution agent instead and
record `skill_fallback: "{reason}"` in `coordination_log.yaml`. Verify the tool
is actually absent before falling back. Never route an `assigned_skill` work
item back into cAgents' own `run`/`team`/`designer`/`helper` skills.

See @.claude/skills/run/reference/skill-awareness.md for the discovery
procedure, `available_skills.yaml` schema, and the planner contract.

## Question-Based Delegation Pattern

```
1. Controller receives objectives from plan.yaml
2. Breaks into specific questions
3. Identifies execution agents to delegate to
4. Calls TaskCreate to show execution agents (MANDATORY)
5. Delegates questions to execution agents
6. Synthesizes answers into solution
7. Creates implementation tasks
8. Coordinates execution
9. Writes coordination_log.yaml
```

## MANDATORY: TaskCreate for Execution Agent Visibility

Every controller MUST call TaskCreate after identifying execution agents. TaskCreate (with TaskUpdate for status changes, TaskList for inventory, TaskGet for detail reads) is the controller's primary tool for showing progress to the user in interactive Claude Code sessions.

**Note on TodoWrite (SDK only)**: TodoWrite is the equivalent tool in non-interactive mode and the Agent SDK (per docs.claude.com/docs/en/tools.md). Interactive Claude Code sessions — which is the primary cAgents runtime — MUST use TaskCreate/TaskUpdate/TaskList/TaskGet instead. Historical references to TodoWrite in legacy SKILL.md prompt bodies are being swept; treat any remaining reference as equivalent to TaskCreate unless explicitly marked "(SDK only)".

**TaskCreate scope boundary**: Pipeline-level tasks (tracking which pipeline agent is running) are owned by /run at level 0. Controllers do NOT create TaskCreate tasks that /run expects to clean up -- those tasks live in the controller's scope and /run cannot update them, causing "Task not found" errors during pipeline cleanup.

Controllers MAY use TaskCreate for their OWN internal sub-spawns (e.g., tracking individual execution agents they spawn at level 2), but these are controller-scoped tasks that the controller itself must clean up before returning. They are invisible to /run's Step 4 task cleanup.

Use `[{parent} > {agent-name}] {verb phrase}` when spawning an agent, then 2-space indented `[{agent-name}] {sub-task}` for that agent's own work. Never use state machine names (INIT, ORCHESTRATED, etc.). Replace placeholders with actual agent names as soon as known.

**Format rules:**
- No slash prefix: `[tech-lead]` not `[/tech-lead]`
- Parent > child on spawn: `[tech-lead > backend-developer] Implementing auth module`
- Child-only for sub-tasks: `  [backend-developer] Writing unit tests`
- 2-space indent for children
- Include contextual detail (file counts, component names, etc.)

**Example (interactive Claude Code — TaskCreate/TaskUpdate):**
```
TaskCreate({ subject: "[tech-lead > backend-developer] Implementing auth module", description: "Creating JWT middleware; Writing unit tests (4 files)" })
TaskCreate({ subject: "[tech-lead > frontend-developer] Building login UI", description: "Creating login form component" })
TaskCreate({ subject: "[tech-lead] Synthesizing solution", description: "Combine answers from execution agents into coherent implementation plan" })
# As work progresses:
TaskUpdate({ taskId: "1", status: "in_progress" })
TaskUpdate({ taskId: "1", status: "completed" })
```

**SDK / non-interactive equivalent (TodoWrite):**
```
TodoWrite([
  {"content": "[tech-lead > backend-developer] Implementing auth module\n  [backend-developer] Creating JWT middleware\n  [backend-developer] Writing unit tests (4 files)", "status": "in_progress", "id": "wi-1"},
  {"content": "[tech-lead > frontend-developer] Building login UI\n  [frontend-developer] Creating login form component", "status": "pending", "id": "wi-2"},
  {"content": "[tech-lead] Synthesizing solution", "status": "pending", "id": "synthesis"}
])
```

See `controller-reference.md` for additional good/bad task-tracking examples.

## Controller Selection by Tier

| Tier | Controllers | Example |
|------|------------|---------|
| **2** (Moderate) | 1 primary | tech-lead for bug fixes |
| **3** (Complex) | 1 primary + 1-2 supporting | tech-lead + architect + security |
| **4** (Expert) | 1 executive + 1 primary + 2-4 supporting + HITL | cto + tech-lead + architect |

## Key Guidelines

- **Ask, don't assign**: "What is current auth?" not "Analyze auth"
- **Synthesis drives implementation**: Combine answers coherently
- **Adaptive coordination**: Follow-up questions based on answers

## Reviewer Loop

Controllers include an internal reviewer loop (max 2 rounds). After each executor completes, spawn a reviewer to evaluate against acceptance criteria. PASS accepts, REVISE sends feedback back. On each REVISE round, spawn a fresh reviewer with no carried context so it does not anchor on its own prior verdict. See @.claude/rules/playbooks/pat-two-stage-review.md.

**Tier 2**: Single reviewer. **Tier 3+**: Blind review with 2-3 independent reviewers + Devil's Advocate on unanimous PASS.

### Dead-Letter Promotion Contract (P1-6, v12.6.x)

> **Advisory — not hook-enforced.** The steps below are agent-self-reported; no hook currently verifies them. See docs/FUTURE_VALIDATION_FRAMEWORK.md for the deferred-enforcement roadmap.

When a work item fails 2 consecutive reviewer rounds (rounds-cap reached per `controller_revision.max_internal_rounds: 2` in `pipeline_config.yaml`; lowered from 3 in LP-27, v12.7.x), the controller should promote the item rather than silently retrying or claiming completion. This is a by-convention contract — no hook currently enforces it (see the advisory note below):

1. **Set the underlying implementation_task status** to `dead_letter` (NOT `completed`, NOT `in_progress`) in `coordination_log.yaml`.
2. **Append the item to `dead_letter_items[]`** in `coordination_log.yaml` with the schema documented in `controller-reference.md` (task_id, name, rounds_attempted, last_feedback, best_attempt_location, reason).
3. **Continue with the remaining work items** — do NOT halt coordination on a single dead_letter. The pipeline classifies a session with `dead_letter_items.length > 0` as `PARTIAL_PASS` (which maps to PASS in `pipeline_config.yaml` and reports the dead-letter items to the user via `validation_report.yaml`).
4. **Do NOT re-route to PLANNED** for individual dead_letter items. The outer FAIL/REVISE revision loop (max 3 cycles) is for whole-session validator verdicts, not for per-item reviewer failures. Re-promoting a dead_letter item back into the reviewer loop without controller-level intervention (new acceptance criteria, different executor, escalation to user) wastes revision budget.

This contract is documented (here + in `controller-reference.md`'s dead-letter-queue section); enforcement is currently advisory. A future hook will mechanically verify that `review_rounds >= 2` items appear in `dead_letter_items[]` before the controller writes its terminal `status: completed` on the coordination log. (LP-27 in v12.7.x lowered the rounds-cap from 3 → 2 to save ~33% reviewer-call token budget per failed item; the promotion contract itself was unchanged.)

See `controller-reference.md` for reviewer spawning patterns, blind review protocol, dead-letter queue schema, and confidence tiers.

### Rule-of-Three: Architecture-Question Escalation

> **Advisory — not hook-enforced.** The steps below are agent-self-reported; no hook currently verifies them. See docs/FUTURE_VALIDATION_FRAMEWORK.md for the deferred-enforcement roadmap.

When 2-3 consecutive fixes each close the reported failure but surface a *new* downstream failure somewhere else (whack-a-mole), stop — a relocating failure is a design smell, not a code bug. Rather than silently promoting the item to dead_letter or spending more revision rounds, set `architecture_question: true` in `coordination_log.yaml` and escalate to the user.

- **Trigger**: 2-3 fixes in a row, each fixing the prior failure but spawning a fresh one elsewhere (the failure set moves rather than shrinks).
- **Action**: Stop the reviewer/fix loop for that item. Summarize the pattern — the sequence of fixes and where each new failure appeared — and ask the user for an architecture-level decision (change the interface, re-scope the acceptance criteria, or accept a documented tradeoff).
- **Why**: A moving-target failure means the fixes are treating symptoms of a structural mismatch. One escalation is cheaper than burning the revision budget on a problem only the user can re-scope.

This differs from stuck-detection (the *same* failure recurring) and from dead-letter promotion (one item exhausting its rounds): here each fix succeeds locally, yet the failure keeps moving, which is the signal that the design — not the code — needs a decision.

### Two-Stage Review Protocol (V10.22.0)

> **Advisory — not hook-enforced.** The steps below are agent-self-reported; no hook currently verifies them. See docs/FUTURE_VALIDATION_FRAMEWORK.md for the deferred-enforcement roadmap.

Every reviewer loop runs two ordered stages: Stage 1 spec compliance (binary PASS/REVISE on acceptance criteria) before Stage 2 code quality (severity-tagged findings). No code quality review begins until spec compliance passes.

See @.claude/rules/playbooks/pat-two-stage-review.md for the canonical pattern, reviewer prompts per stage, REVISE thresholds, why-two-stages rationale, and coordination-log format.

### Guard Command Pattern (V10.18.0)

> **Advisory — not hook-enforced.** The steps below are agent-self-reported; no hook currently verifies them. See docs/FUTURE_VALIDATION_FRAMEWORK.md for the deferred-enforcement roadmap.

After the reviewer checks acceptance criteria, controllers SHOULD also run a **guard command** to verify no regressions were introduced. Guard commands are automated verification steps (tests, linting, type checks) that catch issues human-style review misses.

**Guard command flow**:
```
Executor completes -> Reviewer checks acceptance criteria -> PASS
  -> Run guard command (e.g., npm test, npm run lint, tsc --noEmit)
  -> Guard PASS: Work item complete
  -> Guard FAIL: Rework with guard output as feedback (max 2 attempts)
  -> Guard FAIL x2: Mark as dead_letter with guard failure context
```

**Guard command selection** (by work item type):
| Work Item Type | Guard Command | Purpose |
|---------------|---------------|---------|
| Code changes | `npm test` or `pytest` | No test regressions |
| TypeScript | `tsc --noEmit` | Type safety preserved |
| Linting-sensitive | `npm run lint` or `ruff check` | Style compliance |
| Config changes | Schema validation | Config validity |
| Documentation | Link/reference check | No broken references |

**Guard command in coordination_log**:
```yaml
implementation_tasks:
  - task_id: WI-1
    assigned_to: cagents:backend-developer
    review_result: PASS
    guard_command: "npm test"
    guard_result: PASS  # or FAIL
    guard_attempts: 1   # max 2
    guard_output: "45/45 tests passed"  # truncated output on failure
```

**When to skip guards**: Bootstrap/scaffolding work items (no tests yet), pure documentation, design artifacts. Controllers use judgment but default to running guards when a command is available.

### Regression Validation Chain (V10.23.0)

> **Advisory — not hook-enforced.** The steps below are agent-self-reported; no hook currently verifies them. See docs/FUTURE_VALIDATION_FRAMEWORK.md for the deferred-enforcement roadmap.

Controllers SHOULD chain multiple guard commands for comprehensive regression detection. Run ALL applicable guards, not just the first one.

#### Guard Command Chain

```yaml
regression_validation_chain:
  - name: "Test Suite"
    command: "npm test"
    required_for: [code_changes]
    severity: CRITICAL
  - name: "Type Check"
    command: "tsc --noEmit"
    required_for: [typescript_changes]
    severity: CRITICAL
  - name: "Lint Check"
    command: "npm run lint"
    required_for: [code_changes]
    severity: HIGH
  - name: "YAML Syntax"
    command: "node -e \"const yaml=require('yaml'); yaml.parse(require('fs').readFileSync('{file}','utf8'))\""
    required_for: [yaml_changes]
    severity: HIGH
  - name: "JSON Syntax"
    command: "node -e \"JSON.parse(require('fs').readFileSync('{file}','utf8'))\""
    required_for: [json_changes]
    severity: HIGH
  - name: "Import Check"
    command: "node -e \"require('{entry_point}')\""
    required_for: [module_changes]
    severity: MEDIUM
```

#### Guard Chain Result

```yaml
guard_chain_result:
  total_guards: 4
  passed: 4
  failed: 0
  skipped: 2  # not applicable to this work item type
  results:
    - name: "Test Suite"
      result: PASS
      output: "45/45 tests passed"
      duration_ms: 3200
    - name: "Type Check"
      result: PASS
      output: "No errors"
      duration_ms: 1100
    - name: "Lint Check"
      result: PASS
      output: "0 errors, 0 warnings"
      duration_ms: 800
    - name: "YAML Syntax"
      result: PASS
      output: "Valid YAML"
      duration_ms: 50
```

#### Guard Chain Failure Escalation

| Guards Failed | Action |
|--------------|--------|
| 0 | PASS -- proceed to next work item |
| 1 MEDIUM | WARN -- note in coordination_log, proceed |
| 1 HIGH | REVISE -- send guard output as feedback |
| 1 CRITICAL | REVISE -- must fix before proceeding |
| 2+ any severity | REVISE -- prioritize CRITICAL, then HIGH, then MEDIUM |
| 2 CRITICAL after rework | dead_letter -- escalate to user |

## Nesting Model and Graceful Degradation Under Nesting-Ceiling / Tool Absence (repositioned in v12.17.0)

**Nesting model (v12.17.0+).** Claude Code ≥ 2.1.172 lets subagents spawn their own subagents up to 5 levels deep. Controllers and subagents spawned at depth 1 **retain the `Agent` tool** and CAN spawn execution agents (and those execution agents can spawn deeper sub-agents, within the 5-level ceiling). Delegation is the expected behavior at every level — a controller normally still has `Agent` at depth 1 and MUST delegate.

**Graceful degradation is a DEFENSIVE FALLBACK**, not the expected depth-1 behavior. It triggers ONLY when the `Agent` tool is genuinely absent — at the actual nesting ceiling (a subagent at depth 5 cannot spawn a depth-6 child) or if a future/older harness regresses the capability. Before reporting failure for a missing `Agent` tool, an agent MUST verify the tool is actually absent. When `Agent` is verifiably absent, the spawned agent gracefully degrades to direct execution + self-validation rather than failing.

See @.claude/rules/playbooks/pat-graceful-degradation-depth1.md for the canonical fallback pattern, the tool-inventory-check-before-BLOCKED rule, documentation requirement, ceiling/regression scope, and the historical pre-v12.17.0 depth-1 stripping context.

## Agent ID Tracking

When controllers spawn execution agents via Agent tool, they MUST record the returned `agent_id` in the coordination_log's `implementation_tasks` entry. This links work items to `agent_tree.yaml` entries for audit-trail traceability.

When calling the Agent tool to spawn an execution agent, include `subagent_type` set to the `cagents:{name}` identifier. This ensures the SubagentTracker hook can record the agent type in the audit trail without falling back to description parsing.

```
Agent(
  description: "...",
  subagent_type: "cagents:backend-developer",  # REQUIRED: enables full audit trail
  ...
)
```

```yaml
implementation_tasks:
  - task_id: WI-1
    assigned_to: cagents:backend-developer
    agent_id: "{agent_id from Task result}"  # REQUIRED: links to agent_tree.yaml
```

### Task Result Metadata (CC 2.1.30)

The Agent tool returns rich metadata alongside the agent result. Controllers SHOULD capture and log this metadata in the coordination_log:

```yaml
implementation_tasks:
  - task_id: WI-1
    assigned_to: cagents:backend-developer
    agent_id: "{agent_id from Task result}"
    # CC 2.1.30 metadata fields:
    token_count:
      input: 4521
      output: 892
      cache_read: 3100
    tool_uses: 12          # Number of tool calls made
    duration_seconds: 47   # Wall-clock time
```

**Why capture this**: Token counts enable cost tracking per work item. Tool use counts indicate agent efficiency (high counts may signal thrashing). Duration enables SLA tracking and helps identify stuck agents (Check 10 in mid-execution validation).

Controllers record this in `coordination_log.yaml` under the matching `implementation_tasks` entry.

## Confidence Tiers

Every completed work item MUST include `confidence` (0.0-1.0) and `confidence_rationale`. Items < 0.7 trigger additional scrutiny.

## Read-Before-Decide Pattern

Controllers MUST re-read plan objectives before major decisions to combat attention drift.

> Before synthesis and before spawning execution agents, re-read plan.yaml objectives to refresh goals in the attention window.

**When to re-read**: Before synthesizing answers, before spawning executors, after 5+ delegated questions, before writing coordination_log.

## Pre-Execution and Mid-Execution Validation (V10.23.0)

> **Advisory — not hook-enforced.** The steps below are agent-self-reported; no hook currently verifies them. See docs/FUTURE_VALIDATION_FRAMEWORK.md for the deferred-enforcement roadmap.

Controllers MUST run validation checkpoints at two points:

**Pre-Execution** (7 checks): Before spawning any executor — planner output schema (Check 0, added LP-28), plan completeness, work item criteria, dependency acyclicity, agent existence, referenced file existence, coordination log schema.

**Mid-Execution** (5 checks): After every 3 completed work items — evidence capture, stuck item detection, timestamp monotonicity, evidence spot-check (random verification), dependency satisfaction.

See @resources/controller-validation-checklist.md for detailed check descriptions and failure handling.

## Decision Log Protocol (V10.6.0)

Controllers MUST maintain append-only DECISIONS.md and CORRECTIONS.md logs during coordination. Entries include timestamp, context, rationale, and confidence. These persist in `cagents-memory/_projects/{hash}/` and survive context compaction.

See `controller-reference.md` for examples and file location details.

## Evidence-First Execution Pattern (V10.10.0)

Controllers MUST require specific evidence from execution agents (file paths, line numbers, test output, measured metrics) — not vague confirmations like "looks correct" or "reviewed code, all good".

See @.claude/rules/playbooks/pat-evidence-first-execution.md for the canonical pattern, bad-vs-good examples, and the four execution-agent response requirements.

## CRITICAL: Do Not Ask Permission

After completing coordination:
- Write coordination_log.yaml (with `schema_version: "1"` at top), handoff document, and completion event
- Signal completion (coordination_log.yaml with complete status)
- DO NOT ask user to review or approve — /run auto-proceeds to validation

**Canonical Sources**: `workflow/work_items.yaml` is the canonical source for work item definitions. `team/task_list.yaml` is a status-only overlay (IDs + status + assigned_to).

---

## See Also

- **controller-reference.md** - Detailed schemas, examples, and protocols (path-conditional)
- **orchestration.md** - Workflow phases and automatic transitions
- **execution.md** - Execution agent patterns (tier 3)
- **completion.md** - Task completion protocol and evidence requirements
