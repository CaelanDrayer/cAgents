---
paths:
  - ".claude/rules/core/controllers.md"
  - ".claude/rules/core/controller-reference.md"
  - ".claude/rules/core/resources/controller-validation-checklist.md"
  - ".claude/rules/playbooks/pat-controller-coordination-protocol.md"
  - ".claude/rules/playbooks/pat-two-stage-review.md"
  - "agents/cco.md"
  - "agents/cco/**"
  - "agents/ceo.md"
  - "agents/ceo/**"
  - "agents/cfo.md"
  - "agents/cfo/**"
  - "agents/chro.md"
  - "agents/chro/**"
  - "agents/cmo.md"
  - "agents/cmo/**"
  - "agents/coo.md"
  - "agents/coo/**"
  - "agents/cpo.md"
  - "agents/cpo/**"
  - "agents/cro.md"
  - "agents/cro/**"
  - "agents/cto.md"
  - "agents/cto/**"
  - "agents/coordinator.md"
  - "agents/architect/**"
  - "agents/data-lead/**"
  - "agents/tech-lead/**"
  - "agents/security-engineer/**"
  - "agents/qa-lead/**"
  - "agents/general-counsel/**"
  - "agents/operations-manager/**"
  - "agents/marketing-strategist/**"
  - "agents/sales-strategist/**"
  - "agents/hr-manager/**"
  - "agents/customer-success-manager/**"
  - "agents/support-director/**"
  - "agents/product-owner/**"
  - "agents/strategic-planner/**"
  - "agents/editor/**"
  - "agents/narrative-director/**"
  - ".claude/skills/act/SKILL.md"
  - ".claude/skills/act/reference/delegation-patterns.md"
  - ".claude/skills/act/reference/delegation-workaround.md"
  - ".claude/skills/team/SKILL.md"
  - ".claude/hooks/controller-delegation-validator.cjs"
  - "cagents-memory/sessions/**/workflow/coordination_log.yaml"
  - "cagents-memory/sessions/**/workflow/plan.yaml"
---

# Controller Coordination Guidelines

Question-based delegation patterns for controllers with v10 agent chaining support.

## Enforced vs Advisory Ledger

The table below shows which coordination protocols in this file are enforced
mechanically. A protocol is enforced when a hook, a CI check, or a test blocks or
rewrites the work on a violation. A protocol is advisory when the model is asked to
follow it and no hook checks it yet.

| Protocol | Enforced by | Status |
|----------|-------------|--------|
| Controllers never Write/Edit implementation files (`src/`, `lib/`, `components/`, `app/`, `services/`, `middleware/`) | `controller-delegation-validator.cjs`: PreToolUse[Write\|Edit] deny while a controller is active | Enforced |
| `coordination_log.yaml` and `plan.yaml` JSON+YAML syntax validity | `post-write-validator.cjs`: PostToolUse[Write\|Edit] | Enforced |
| Evidence-first execution (cited file:line / grep / test evidence) | `validator-evidence-recheck.cjs` re-runs cited methods after a write and downgrades PASS→FAIL | Partial (post-write recheck) |
| Pre-execution validation checklist (Checks 0–6) | agent-self-reported; `verify-completion.cjs` only warns if the `pre_execution` field is absent from the log | Advisory |
| Mid-execution validation checkpoints (5 checks) | agent-self-reported; warn-only presence check on the `mid_execution` field | Advisory |
| Guard-command pattern + regression-validation chain | agent-self-reported; no hook runs the guard chain | Advisory |
| Dead-letter promotion contract | agent-self-reported (this section itself notes "no hook currently enforces it") | Advisory |
| Two-stage review, blind review + Devil's Advocate | agent-self-reported | Advisory |
| Confidence tiers | agent-self-reported | Advisory |
| Per-subagent context-budget aim (how large a spawned subagent's own context gets) | agent-self-reported; no hook measures subagent context fill | Advisory |

For the 5 cross-cutting checks that hooks do enforce, see
@.claude/rules/quality/resources/validation-checklist-active.md.

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

**Controllers coordinate. They do not implement.** They MUST use the Agent tool for
all work.

- **Allowed**: Ask questions, synthesize answers, create task lists, write coordination_log.yaml
- **Prohibited**: Write code, create content, answer own questions, use Edit on implementation files

For every question: formulate the question, spawn an execution agent with the Agent
tool, then record the answer. Synthesize after every question has an answer.

### Context-Efficient Question Delegation

Keep a question prompt **under 300 tokens**. Include only three things: the
question, where to look, and what to report. Do NOT include the contents of the
plan, of the decomposition, or of the instruction.

Spawned subagents carry an advisory per-subagent context aim; see `.claude/rules/playbooks/pat-context-budget-tiers.md` for the figures and for the delegation levers that hold them.

## CRITICAL: Synchronous Spawning (never background-and-yield)

Controllers and `/team` leads MUST spawn execution agents **synchronously**. Collect
each result before you yield the turn. Issue every `Agent(...)` call with an
explicit `run_in_background: false`, because subagents are background-by-default
since Claude Code 2.1.198. The controller then waits for the result in the same turn
that it spawned the agent.

**Never background a sub-agent and then yield.** A backgrounded child plus a parent
that returns before it collects the child produces an **hours-long stall**. The
child sits with `stopped_at: null` in `agent_tree.yaml`, so the session *looks*
alive, because a null-stop child reads as "actively working". Nothing progresses,
because no agent waits for the child. This is the controller-background-yield stall
(REC-05, session `run_bash-guard-evaluator_260708_001`).

The Stop-hook stale-child freshness gate is `sessionActivelyWorking` in
`verify-completion.cjs`. It now discounts a null-stop child whose `spawned_at` is
older than `CAGENTS_STALE_CHILD_MS` (default 30 min), so the stall surfaces. The
primary fix stays behavioral: **spawn synchronously, collect, then proceed.**

The one exception is the optional experimental named-background-teammate path
(`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`). There you coordinate a named background
teammate via `SendMessage`, and you still collect its result explicitly. It is never
spawned-and-forgotten. On the default concurrent-Agent path, always pass
`run_in_background: false`.

**`name` wins over `run_in_background: false`.** Passing `name` promotes the spawn
to a named background teammate, and it discards your blocking request without an
error. This was CONFIRMED on Claude Code 2.1.221. You then yield holding nothing,
and you re-do the work yourself.

Spawn UNNAMED with `run_in_background: false` for anything you must collect in-turn.
Reserve a named teammate for the experimental resumable path, where you collect the
result explicitly via `SendMessage`. Per-subagent visibility comes from the
`TaskCreate` subject (§ MANDATORY: TaskCreate below), not from `name`. Name the
task, never the spawn. For the mechanism and the choose-which table, see
@.claude/rules/core/delegation.md § Synchronous Spawning.

**If the hand-back of a child is missing, look on disk before you re-spawn.** A
child that wrote its artifact to `outputs/` has already done the work, even if you
never collected its summary. A re-run pays for that work a second time.

## Invoking Workspace Skills (reuse-before-rebuild)

The planner may assign a work item to a **workspace skill** in place of a cAgents
agent. The fields are `assigned_skill` and `skill_args`. Use them when a skill
already present in the workspace owns that work. Two examples are a user's `pr`
skill that owns their SOW and quote templates, and a `deep-research` skill. This is
the minimal-solution ladder at planning time: reuse before rebuild.

When a controller processes an `assigned_skill` work item, it invokes the
skill via the **Skill tool** rather than spawning an execution agent:

```
Skill({ skill: "{assigned_skill}", args: "{skill_args}" })
```

When a controller invokes a workspace skill, that IS a valid form of delegation. It
is NOT the controller "doing the work directly". Treat the output of the skill as
the deliverable of the work item. Then run the normal reviewer loop against the
acceptance criteria.

**Graceful fallback**: the `Skill` tool can be absent from the surface of the
controller, at the nesting ceiling or on a regressed harness. If it is verifiably
absent, do NOT fail the work item. Spawn the closest-matching cAgents execution
agent instead, and record `skill_fallback: "{reason}"` in `coordination_log.yaml`.
Make sure the tool is absent before you fall back. Never route an `assigned_skill`
work item back into the cAgents `act`, `team`, `designer`, or `helper` skills.

See @.claude/skills/act/reference/skill-awareness.md for the discovery
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

Every controller MUST call TaskCreate once it has chosen its execution agents.
TaskCreate is the main tool a controller uses to show progress to the user in an
interactive Claude Code session. Its companions are TaskUpdate for a status change,
TaskList for an inventory, and TaskGet for a detail read.

**Note on TodoWrite (SDK only)**: TodoWrite is the equivalent tool for
non-interactive mode and for the Agent SDK. See docs.claude.com/docs/en/tools.md. An
interactive Claude Code session is the primary cAgents runtime, and it MUST use
TaskCreate, TaskUpdate, TaskList, and TaskGet instead. A sweep is removing the
historical TodoWrite references from legacy SKILL.md prompt bodies. Read any
reference that stays as an equivalent of TaskCreate, unless it carries the mark
"(SDK only)".

**TaskCreate scope boundary**: /act owns the pipeline-level tasks at level 0, which
track the pipeline agent that is running. Controllers do NOT create TaskCreate tasks
that /act expects to clean up. Such a task lives in the scope of the controller, and
/act cannot update it. The cleanup step then reports a "Task not found" error.

Controllers MAY use TaskCreate for their OWN internal sub-spawns, such as each
execution agent they spawn at level 2. These tasks are controller-scoped, so the
controller itself must clean them up before it returns. Step 4 of the /act task
cleanup cannot see them.

Use `[{parent} > {agent-name}] {verb phrase}` when you spawn an agent. Use a 2-space
indented `[{agent-name}] {sub-task}` for the work of that agent. Never use a state
machine name such as INIT or ORCHESTRATED. Replace each placeholder with the real
agent name as soon as you know it.

**Format rules:**
- No slash prefix: `[tech-lead]` not `[/tech-lead]`
- Parent > child on spawn: `[tech-lead > backend-developer] Implementing auth module`
- Child-only for sub-tasks: `  [backend-developer] Writing unit tests`
- 2-space indent for children
- Include contextual detail (file counts, component names, etc.)

**Example for interactive Claude Code (TaskCreate and TaskUpdate):**
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

- **Ask, do not assign**: write "What is the current auth?", not "Analyze auth".
- **Synthesis drives implementation**: combine the answers into one coherent whole.
- **Adaptive coordination**: base each follow-up question on the answers you have.

## Reviewer Loop

Controllers include an internal reviewer loop (max 2 rounds). After each executor
completes, spawn a reviewer to judge the work against the acceptance criteria. PASS
accepts the work. REVISE sends the feedback back. On each REVISE round, spawn a
fresh reviewer that carries no context, so it does not anchor on its own earlier
verdict. See @.claude/rules/playbooks/pat-two-stage-review.md.

**Tier 2**: Single reviewer. **Tier 3+**: Blind review with 2-3 independent reviewers + Devil's Advocate on unanimous PASS.

### Dead-Letter Promotion Contract (P1-6, v12.6.x)

> **Advisory, not hook-enforced.** The steps below are agent-self-reported. No hook
> checks them now. See docs/FUTURE_VALIDATION_FRAMEWORK.md for the
> deferred-enforcement roadmap.

The rounds-cap is `controller_revision.max_internal_rounds: 2` in
`pipeline_config.yaml`. LP-27 (v12.7.x) lowered it from 3. When a work item fails
2 consecutive reviewer rounds, the controller should promote the item. It should not retry in silence, and it should
not claim completion. This contract holds by convention, and no hook currently
enforces it. The promotion has four steps:

1. **Set the underlying implementation_task status** to `dead_letter` (NOT `completed`, NOT `in_progress`) in `coordination_log.yaml`.
2. **Append the item to `dead_letter_items[]`** in `coordination_log.yaml` with the schema documented in `controller-reference.md` (task_id, name, rounds_attempted, last_feedback, best_attempt_location, reason).
3. **Continue with the remaining work items.** Do NOT halt coordination on a single
   dead_letter. The pipeline classifies a session with `dead_letter_items.length > 0`
   as `PARTIAL_PASS`. `pipeline_config.yaml` maps `PARTIAL_PASS` to PASS, and
   `validation_report.yaml` reports the dead-letter items to the user.
4. **Do NOT re-route to PLANNED** for an individual dead_letter item. The outer
   FAIL/REVISE revision loop (max 3 cycles) handles whole-session validator
   verdicts, not per-item reviewer failures. A dead_letter item that goes back into
   the reviewer loop without controller-level intervention wastes revision budget.
   Such an intervention is new acceptance criteria, a different executor, or an
   escalation to the user.

This contract is documented here and in the dead-letter-queue section of
`controller-reference.md`. Enforcement is advisory today. A future hook will check
that every item with `review_rounds >= 2` appears in `dead_letter_items[]` before
the controller writes its terminal `status: completed` on the coordination log.
LP-27 in v12.7.x lowered the rounds-cap from 3 to 2, which saves about 33% of the
reviewer-call token budget per failed item. The promotion contract itself did not
change.

See `controller-reference.md` for reviewer spawning patterns, blind review protocol, dead-letter queue schema, and confidence tiers.

### Rule-of-Three: Architecture-Question Escalation

> **Advisory, not hook-enforced.** The steps below are agent-self-reported. No hook
> checks them now. See docs/FUTURE_VALIDATION_FRAMEWORK.md for the
> deferred-enforcement roadmap.

Sometimes 2-3 consecutive fixes each close the reported failure but surface a *new*
downstream failure somewhere else. That is whack-a-mole. Stop, because a failure
that relocates is a design smell, not a code bug. Do not promote the item to
dead_letter in silence, and do not spend more revision rounds. Set
`architecture_question: true` in `coordination_log.yaml` and escalate to the user.

- **Trigger**: 2-3 fixes in a row. Each one fixes the earlier failure but spawns a
  fresh failure elsewhere, so the failure set moves and does not shrink.
- **Action**: stop the reviewer loop and the fix loop for that item. Summarize the
  pattern: the sequence of fixes, and where each new failure appeared. Then ask the
  user for an architecture-level decision. The user can change the interface,
  re-scope the acceptance criteria, or accept a documented tradeoff.
- **Why**: a failure that moves means the fixes are treating the symptoms of a
  structural mismatch. One escalation costs less than a revision budget burned on a
  problem that only the user can re-scope.

This differs from stuck-detection, where the *same* failure recurs. It also differs
from dead-letter promotion, where one item uses up its rounds. Here each fix
succeeds locally, yet the failure keeps moving. That is the signal that the design
needs a decision, not the code.

### Two-Stage Review Protocol (V10.22.0)

> **Advisory, not hook-enforced.** The steps below are agent-self-reported. No hook
> checks them now. See docs/FUTURE_VALIDATION_FRAMEWORK.md for the
> deferred-enforcement roadmap.

Every reviewer loop runs two stages in order. Stage 1 is spec compliance, a binary
PASS or REVISE on the acceptance criteria. Stage 2 is code quality, with
severity-tagged findings. No code-quality review starts until spec compliance
passes.

See @.claude/rules/playbooks/pat-two-stage-review.md for the canonical pattern. It
holds the reviewer prompts per stage, the REVISE thresholds, the rationale for two
stages, and the coordination-log format.

### Guard Command Pattern (V10.18.0)

> **Advisory, not hook-enforced.** The steps below are agent-self-reported. No hook
> checks them now. See docs/FUTURE_VALIDATION_FRAMEWORK.md for the
> deferred-enforcement roadmap.

After the reviewer checks the acceptance criteria, controllers SHOULD also run a
**guard command** to make sure that no regression appeared. A guard command is an
automated check, such as a test run, a lint run, or a type check. It catches the
issues that a human-style review misses.

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

**When to skip guards**: a bootstrap or scaffolding work item that has no tests yet,
pure documentation, and a design artifact. Controllers use judgment, and they run
the guards by default when a command is available.

### Regression Validation Chain (V10.23.0)

> **Advisory, not hook-enforced.** The steps below are agent-self-reported. No hook
> checks them now. See docs/FUTURE_VALIDATION_FRAMEWORK.md for the
> deferred-enforcement roadmap.

Controllers SHOULD chain several guard commands, so that the chain covers every kind
of regression. Run ALL applicable guards, not only the first one.

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

**Nesting model (v12.17.0+).** Claude Code 2.1.172 and later lets a subagent spawn
its own subagents up to 5 levels deep. A controller or a subagent spawned at depth 1
**keeps the `Agent` tool** and can spawn execution agents. Those execution agents
can spawn deeper sub-agents, inside the 5-level ceiling. Delegation is the expected
behavior at every level. A controller normally still has `Agent` at depth 1, and it
MUST delegate.

**Graceful degradation is a defensive fallback**, not the expected depth-1 behavior.
It triggers only when the `Agent` tool is genuinely absent. That happens at the real
nesting ceiling, where a subagent at depth 5 cannot spawn a depth-6 child. It also
happens if an older harness or a future harness loses the capability.

Before you report a failure for a missing `Agent` tool, make sure that the tool is
absent. When `Agent` is verifiably absent, the spawned agent degrades to direct
execution and self-validation. It does not fail.

See @.claude/rules/playbooks/pat-graceful-degradation-depth1.md for the canonical
fallback pattern. That playbook holds:

- the tool-inventory-check-before-BLOCKED rule;
- what you must document;
- the scope of the ceiling and of a harness regression;
- the depth-1 stripping context from before v12.17.0.

## Agent ID Tracking

When controllers spawn execution agents with the Agent tool, they MUST record the
returned `agent_id`. It goes in the `implementation_tasks` entry of the
coordination_log. That link joins a work item to its `agent_tree.yaml` entry, which
makes the audit trail traceable.

When you call the Agent tool to spawn an execution agent, set `subagent_type` to the
`cagents:{name}` identifier. The SubagentTracker hook then records the agent type in
the audit trail. It does not have to fall back to a parse of the description.

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

The Agent tool returns rich metadata beside the agent result. Controllers SHOULD
capture that metadata and log it in the coordination_log:

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

**Why capture this**: a token count gives you the cost of each work item. A tool-use
count shows how efficient the agent is, and a high count can signal thrashing. A
duration gives you SLA tracking, and it helps you find a stuck agent. That is
Check 10 in mid-execution validation.

Controllers record this in `coordination_log.yaml` under the matching `implementation_tasks` entry.

## Confidence Tiers

Every completed work item MUST include `confidence` (0.0-1.0) and
`confidence_rationale`. An item below 0.7 triggers more scrutiny.

## Read-Before-Decide Pattern

Controllers MUST re-read plan objectives before major decisions to combat attention drift.

> Before synthesis and before spawning execution agents, re-read plan.yaml objectives to refresh goals in the attention window.

**When to re-read**: before you synthesize the answers, before you spawn an
executor, after 5 or more delegated questions, and before you write the
coordination_log.

## Pre-Execution and Mid-Execution Validation (V10.23.0)

> **Advisory, not hook-enforced.** The steps below are agent-self-reported. No hook
> checks them now. See docs/FUTURE_VALIDATION_FRAMEWORK.md for the
> deferred-enforcement roadmap.

Controllers MUST run validation checkpoints at two points:

**Pre-Execution** (7 checks): run these before you spawn any executor.

1. The planner output schema (Check 0, added LP-28).
2. Plan completeness.
3. Work item criteria.
4. Dependency acyclicity.
5. Agent existence.
6. Existence of each referenced file.
7. The coordination log schema.

**Mid-Execution** (5 checks): run these after every 3 completed work items.

1. Evidence capture.
2. Stuck item detection.
3. Timestamp monotonicity.
4. Evidence spot-check, on a random sample.
5. Dependency satisfaction.

See @resources/controller-validation-checklist.md for detailed check descriptions and failure handling.

## Decision Log Protocol (V10.6.0)

Controllers MUST keep append-only DECISIONS.md and CORRECTIONS.md logs during
coordination. Each entry holds a timestamp, the context, the rationale, and the
confidence. These logs live in `cagents-memory/_projects/{hash}/`, and they survive
context compaction.

See `controller-reference.md` for examples and file location details.

## Evidence-First Execution Pattern (V10.10.0)

Controllers MUST ask execution agents for specific evidence: a file path, a line
number, test output, or a measured metric. A vague confirmation is not evidence.
"Looks correct" and "reviewed code, all good" are not acceptable.

See @.claude/rules/playbooks/pat-evidence-first-execution.md for the canonical
pattern, the bad-versus-good examples, and the four things an execution agent must
put in its response.

## CRITICAL: Do Not Ask Permission

After completing coordination:
- Write coordination_log.yaml with `schema_version: "1"` at the top. Write the
  handoff document and the completion event.
- Signal completion: coordination_log.yaml carries a complete status.
- DO NOT ask the user to review or approve. /act auto-proceeds to validation.

**Canonical Sources**: `workflow/work_items.yaml` is the canonical source for the
work item definitions. `team/task_list.yaml` is a status-only overlay that holds
IDs, status, and assigned_to.

---

## See Also

- **controller-reference.md**: detailed schemas, examples, and protocols
  (path-conditional).
- **orchestration.md**: workflow phases and automatic transitions.
- **execution.md**: execution agent patterns (tier 3).
- **completion.md**: the task completion protocol and what evidence it needs.
