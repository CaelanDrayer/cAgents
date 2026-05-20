---
paths:
  - "**/agents/**/*.md"
  - ".claude/skills/**"
  - "cagents-memory/sessions/**/workflow/coordination_log.yaml"
  - "cagents-memory/sessions/**/workflow/plan.yaml"
---

# Controller Coordination Guidelines

Question-based delegation patterns for controllers with v10 agent chaining support.

## v10 Agent Chaining: Topological Execution

Controllers execute work items in dependency order, passing context between agents via files:

```
Controller receives work_items.yaml with agent assignments + dependency graph
  1. Topological sort by dependencies -> execution order
  2. For each work item in order:
     a. Gather output files from completed dependencies
     b. Spawn assigned agent via Agent tool with context from dependencies
     c. Spawn reviewer to check against acceptance criteria
     d. If REVISE: re-spawn agent with feedback (max 3 rounds)
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

Controllers include an internal reviewer loop (max 3 rounds). After each executor completes, spawn a reviewer to evaluate against acceptance criteria. PASS accepts, REVISE sends feedback back. After round 3, mark as dead_letter and continue.

**Tier 2**: Single reviewer. **Tier 3+**: Blind review with 2-3 independent reviewers + Devil's Advocate on unanimous PASS.

See `controller-reference.md` for reviewer spawning patterns, blind review protocol, dead-letter queue, and confidence tiers.

### Two-Stage Review Protocol (V10.22.0)

Every reviewer loop MUST use two distinct review stages, in strict order. No code quality review before spec compliance passes.

**Stage 1: Spec Compliance Review**

Does the implementation meet the acceptance criteria exactly?

```
Reviewer prompt (Stage 1):
  "Review TASK-{N} for SPEC COMPLIANCE ONLY.
   Acceptance criteria: {criteria from work_items.yaml}

   For each criterion:
   - MET: cite specific file:line evidence
   - NOT MET: describe what is missing or incorrect
   - PARTIAL: describe what is done and what remains

   Verdict: PASS (all criteria MET) or REVISE (any NOT MET/PARTIAL)

   DO NOT comment on code quality, style, or maintainability in this stage."
```

**Stage 1 checks**:
- Every acceptance criterion has a MET/NOT MET/PARTIAL status
- Evidence is specific (file paths, line numbers, test output)
- No subjective quality judgments in this stage
- Verdict is binary: all criteria MET = PASS, otherwise REVISE

**If Stage 1 returns REVISE**: Send feedback to execution agent with the specific unmet criteria. Do NOT proceed to Stage 2. The execution agent must address all unmet criteria before code quality review begins.

**Stage 2: Code Quality Review**

Is the implementation well-written, maintainable, and secure?

```
Reviewer prompt (Stage 2):
  "Review TASK-{N} for CODE QUALITY.
   Spec compliance has PASSED -- all acceptance criteria are met.

   Review for:
   - Correctness: edge cases, error handling, null safety
   - Maintainability: naming, structure, complexity, DRY
   - Security: injection, auth bypass, data exposure, trust boundaries
   - Performance: obvious inefficiencies, N+1 queries, memory leaks
   - Conventions: project style guide, existing patterns, consistency

   Verdict: PASS (acceptable quality) or REVISE (quality issues that should be fixed)
   Severity per finding: CRITICAL (must fix) / HIGH (should fix) / LOW (nice to fix)

   Only REVISE for CRITICAL or 2+ HIGH findings."
```

**Stage 2 checks**:
- Only runs after Stage 1 PASS
- Findings are severity-tagged (CRITICAL/HIGH/LOW)
- REVISE threshold: any CRITICAL or 2+ HIGH findings
- LOW findings are recorded but do not trigger REVISE

**Why two stages**:
- Prevents "code is beautiful but doesn't meet requirements" false passes
- Ensures functional correctness before spending review budget on quality
- Separates objective (spec compliance) from subjective (code quality) assessment
- Reduces revision round waste (fixing quality issues in code that doesn't meet spec)

**Coordination log format for two-stage review**:
```yaml
implementation_tasks:
  - task_id: WI-1
    assigned_to: cagents:backend-developer
    stage_1_result: PASS    # spec compliance
    stage_2_result: PASS    # code quality
    review_result: PASS     # overall (both must PASS)
    review_rounds: 1
```

### Guard Command Pattern (V10.18.0)

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

## Graceful Degradation Under Harness Tool Stripping (PHASE-N1, V11.1.13)

**Applies to: controllers spawned as `/team` teammates at depth ≥ 1.**

When a controller agent (e.g., `cagents:tech-lead`) is spawned by `/team` as a teammate, the Claude Code runtime may strip the `Agent` tool from the controller's tool surface — even when the controller's SKILL.md frontmatter correctly declares `allowed-tools: Agent ...`. This is upstream platform behavior, not a cAgents config issue (no `settings.json`, `plugin.json`, or env-var knob exposes the depth-1 stripping; see PHASE-N1 audit at `cagents-memory/_knowledge/agent-tool-depth1-stripping.md`).

**Rule:** When a teammate controller discovers that `Agent` is unavailable, it MUST gracefully degrade to direct execution rather than fail the work item. The teammate uses the tools it does have (`Read`, `Write`, `Edit`, `Bash`, `Grep`, `Glob`), self-validates against acceptance criteria via the 5 hook-verifiable checks in @resources/execution-self-validation.md, and writes the result to `outputs/task-{N}/self-validation.yaml` with the standard `status: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED` field.

**Documentation requirement:** the coordination_log for the wave MUST include the literal sentence "Agent/subagent-spawn tool was not available" so that `verify-completion.cjs` recognizes the graceful-degradation pattern and downgrades the protocol-violation warning. See `.claude/rules/core/teams.md` § Known Harness Limitation for the full evidence chain and the upstream-config null-finding.

**Scope boundary:** this degradation is acceptable for `/team` teammate workflows only. Controllers running under `/run` execute at level 1 with the Agent tool present and MUST delegate (the reviewer-loop pattern remains mandatory). Controllers running as `/org` C-suite agents at level 1 likewise have Agent and MUST delegate.

## Agent ID Tracking

When controllers spawn execution agents via Agent tool, they MUST record the returned `agent_id` in the coordination_log's `implementation_tasks` entry. This links work items to `agent_tree.yaml` entries, enabling AgentPath to show which agent handled which work item.

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

Controllers MUST run validation checkpoints at two points:

**Pre-Execution** (6 checks): Before spawning any executor — plan completeness, work item criteria, dependency acyclicity, agent existence, referenced file existence, coordination log schema.

**Mid-Execution** (5 checks): After every 3 completed work items — evidence capture, stuck item detection, timestamp monotonicity, evidence spot-check (random verification), dependency satisfaction.

See @resources/controller-validation-checklist.md for detailed check descriptions and failure handling.

## Decision Log Protocol (V10.6.0)

Controllers MUST maintain append-only DECISIONS.md and CORRECTIONS.md logs during coordination. Entries include timestamp, context, rationale, and confidence. These persist in `cagents-memory/_projects/{hash}/` and survive context compaction.

See `controller-reference.md` for examples and file location details.

## Evidence-First Execution Pattern (V10.10.0)

Controllers MUST require specific evidence from execution agents, not vague confirmations.

### Bad (vague):
```yaml
- criterion: "Auth is secure"
  evidence: "Reviewed auth code, looks good"
```

### Good (specific):
```yaml
- criterion: "Auth is secure"
  evidence: |
    - Password hashing: bcrypt with cost=12 at src/auth/hash.ts:15
    - Session tokens: 256-bit random via crypto.randomBytes at src/auth/session.ts:8
    - CSRF protection: double-submit cookie pattern at src/middleware/csrf.ts:22
    - Rate limiting: 5 attempts/15min window at src/auth/rate-limit.ts:30
```

### Execution Agent Response Requirements
When controllers delegate questions, execution agents MUST respond with:
1. **Specific file paths and line numbers** (not "in the auth module")
2. **Actual code snippets** (not "it uses bcrypt")
3. **Measured metrics** (not "performance is good")
4. **Named failure modes** (not "it handles errors")

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
