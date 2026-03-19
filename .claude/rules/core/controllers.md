# Controller Coordination Guidelines

Question-based delegation patterns for controllers with v10 agent chaining support.

## v10 Agent Chaining: Topological Execution

Controllers execute work items in dependency order, passing context between agents via files:

```
Controller receives work_items.yaml with agent assignments + dependency graph
  1. Topological sort by dependencies -> execution order
  2. For each work item in order:
     a. Gather output files from completed dependencies
     b. Spawn assigned agent via Task tool with context from dependencies
     c. Spawn reviewer to check against acceptance criteria
     d. If REVISE: re-spawn agent with feedback (max 3 rounds)
  3. Independent work items execute in parallel
  4. After all work items complete: write coordination_log.yaml
```

## CRITICAL: Controllers NEVER Do Direct Work

**Controllers are COORDINATORS, not IMPLEMENTERS.** They MUST use Task tool for all work.

- **Allowed**: Ask questions, synthesize answers, create task lists, write coordination_log.yaml
- **Prohibited**: Write code, create content, answer own questions, use Edit on implementation files

For EVERY question: formulate -> spawn execution agent via Task -> record answer -> synthesize after all answered.

### Context-Efficient Question Delegation

Question prompts should be **under 300 tokens**. Include only: the question, where to look, what to report. Do NOT include plan/decomposition/instruction contents.

## Question-Based Delegation Pattern

```
1. Controller receives objectives from plan.yaml
2. Breaks into specific questions
3. Identifies execution agents to delegate to
4. Calls TodoWrite to show execution agents (MANDATORY)
5. Delegates questions to execution agents
6. Synthesizes answers into solution
7. Creates implementation tasks
8. Coordinates execution
9. Writes coordination_log.yaml
```

## MANDATORY: TaskCreate + TodoWrite for Execution Agent Visibility

Every controller MUST call TodoWrite after identifying execution agents. Additionally, every background Agent/Task spawn MUST have a `TaskCreate` call BEFORE the spawn, and a `TaskUpdate(status: completed)` when it returns. This gives users per-agent visibility in the task list UI. Without per-agent tasks, the user only sees the controller's top-level task.

Use `[{parent} > {agent-name}] {verb phrase}` when spawning an agent, then 2-space indented `[{agent-name}] {sub-task}` for that agent's own work. Never use state machine names (INIT, ORCHESTRATED, etc.). Replace placeholders with actual agent names as soon as known.

**Format rules:**
- No slash prefix: `[engineering-manager]` not `[/engineering-manager]`
- Parent > child on spawn: `[engineering-manager > backend-developer] Implementing auth module`
- Child-only for sub-tasks: `  [backend-developer] Writing unit tests`
- 2-space indent for children
- Include contextual detail (file counts, component names, etc.)

**Example:**
```
TodoWrite([
  {"content": "[engineering-manager > backend-developer] Implementing auth module\n  [backend-developer] Creating JWT middleware\n  [backend-developer] Writing unit tests (4 files)", "status": "in_progress", "id": "wi-1"},
  {"content": "[engineering-manager > frontend-developer] Building login UI\n  [frontend-developer] Creating login form component", "status": "pending", "id": "wi-2"},
  {"content": "[engineering-manager] Synthesizing solution", "status": "pending", "id": "synthesis"}
])
```

See `controller-reference.md` for additional good/bad TodoWrite examples.

## Controller Selection by Tier

| Tier | Controllers | Example |
|------|------------|---------|
| **2** (Moderate) | 1 primary | engineering-manager for bug fixes |
| **3** (Complex) | 1 primary + 1-2 supporting | engineering-manager + architect + security |
| **4** (Expert) | 1 executive + 1 primary + 2-4 supporting + HITL | cto + engineering-manager + architect |

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

## Agent ID Tracking

When controllers spawn execution agents via Task tool, they MUST record the returned `agent_id` in the coordination_log's `implementation_tasks` entry. This links work items to `agent_tree.yaml` entries, enabling AgentPath to show which agent handled which work item.

```yaml
implementation_tasks:
  - task_id: WI-1
    assigned_to: cagents:backend-developer
    agent_id: "{agent_id from Task result}"  # REQUIRED: links to agent_tree.yaml
```

## Confidence Tiers

Every completed work item MUST include `confidence` (0.0-1.0) and `confidence_rationale`. Items < 0.7 trigger additional scrutiny.

## Read-Before-Decide Pattern

Controllers MUST re-read plan objectives before major decisions to combat attention drift.

> Before synthesis and before spawning execution agents, re-read plan.yaml objectives to refresh goals in the attention window.

**When to re-read**: Before synthesizing answers, before spawning executors, after 5+ delegated questions, before writing coordination_log.

## Decision Log Protocol (V10.6.0)

Controllers MUST maintain append-only DECISIONS.md and CORRECTIONS.md logs during coordination. Entries include timestamp, context, rationale, and confidence. These persist in `Agent_Memory/_projects/{hash}/` and survive context compaction.

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
