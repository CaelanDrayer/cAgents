# Workflow Agent Interactions

How cAgents executes tasks across 5 super-domains using 6 commands and 238 specialized agents.

**Version**: 9.25.0 (Event-Driven Pipeline Architecture)

---

## Table of Contents

- [Core Concept](#core-concept)
- [Commands Overview](#commands-overview)
- [/run -- Event-Driven Pipeline Engine](#run----event-driven-pipeline-engine)
- [/team -- N-Wave Parallel Team Execution](#team----n-wave-parallel-team-execution)
- [/review -- Universal Review Orchestrator](#review----universal-review-orchestrator)
- [/optimize -- Universal Optimizer](#optimize----universal-optimizer)
- [/designer -- Interactive Design Engine](#designer----interactive-design-engine)
- [/helper -- Interactive Command Guide](#helper----interactive-command-guide)
- [Cross-Command Integration](#cross-command-integration)
- [Agent Architecture](#agent-architecture)
- [Controller-Centric Delegation](#controller-centric-delegation)
- [Complexity Tiers](#complexity-tiers)
- [Agent Memory and Sessions](#agent-memory-and-sessions)
- [Execution Modes](#execution-modes)
- [Hook System](#hook-system)
- [Performance](#performance)
- [Summary](#summary)

---

## Core Concept

**One event-driven pipeline, six commands, five super-domains.** Every task enters through one of six commands (`/run`, `/team`, `/review`, `/optimize`, `/designer`, `/helper`), which route the request through a config-driven state machine to specialized controller and execution agents.

The architecture is **controller-centric**: controllers coordinate work by asking questions of specialist execution agents, synthesizing their answers, and driving implementation. Controllers never implement directly.

---

## Commands Overview

| Command | Purpose | Execution Model | Best For |
|---------|---------|-----------------|----------|
| `/run` | Universal workflow engine | Event-driven state machine, sequential pipeline | Building, fixing, writing, analyzing |
| `/team` | Parallel team execution | N-wave parallel with per-wave quality gates | Large features with 3+ parallel work items |
| `/review` | Universal review | Parallel review agents with confidence scoring | Code, docs, content, infrastructure review |
| `/optimize` | Universal optimizer | 5-phase atomic optimization with rollback | Performance, cost, quality improvements |
| `/designer` | Interactive design engine | 4-phase guided Q&A | Planning features, systems, stories before building |
| `/helper` | Command guide | Interactive reference | Learning commands, comparing options |

---

## /run -- Event-Driven Pipeline Engine

The primary command. Runs a config-driven state machine loop, spawning pipeline agents sequentially. Each agent writes a completion event file that `/run` reads to advance the state.

### Architecture

```
/run (state machine loop -- level 0)
  |
  Phase 1: Sequential Enrichment (all level 1, spawned by /run)
  +-> orchestrator (level 1)    -> enriched_context.yaml
  +-> planner (level 1)         -> plan.yaml
  +-> decomposer (level 1)      -> work_items.yaml
  +-> prompt-engineer (level 1)  -> delegation_prompts.yaml
  |
  Phase 2: Nested Execution (level 1 + 2)
  +-> controller (level 1)
       +-> executor (level 2)   -> implementation
       +-> reviewer (level 2)   -> review_report.yaml
       +-> revision loop (level 2, max 3 rounds)
  |
  Phase 3: Validation (level 1)
  +-> validator (level 1)       -> validation_report.yaml
  |
  Pipeline Revision Loop (max 5 rounds):
    FAIL   -> back to Phase 2 (PROMPTS_READY)
    REVISE -> back to Phase 1 (PLANNED, re-plan)
```

### State Machine

States advance automatically. No user permission is requested between states.

```
INIT -> ORCHESTRATED -> PLANNED -> DECOMPOSED -> PROMPTS_READY -> COORDINATED -> VALIDATED -> COMPLETE
                                                                                     |
                                                                              FAIL -> PROMPTS_READY (retry)
                                                                              REVISE -> PLANNED (re-plan)
```

### What /run Does Inline (Level 0)

| Responsibility | Description |
|---------------|-------------|
| **Parse arguments** | Flags (`--interactive`, `--dry-run`, `--team`, `--resume`, `--session`) |
| **Create session** | `Agent_Memory/sessions/run_{YYYYMMDD_HHMMSS}/` with instruction.yaml, status.yaml |
| **Load pipeline config** | Read `Agent_Memory/_system/config/pipeline_config.yaml` |
| **Domain detection** | Classify request into Make, Grow, Operate, People, or Serve |
| **Tier classification** | Assign tier 2/3/4 (minimum tier 2, no tier 0/1) |
| **State machine loop** | Spawn agents per state, read completion events, advance |
| **TodoWrite** | Update UI task list at every state transition |
| **Revision routing** | Route FAIL to PROMPTS_READY, REVISE to PLANNED |
| **Pre-enrichment detection** | For /team flows, skip already-completed states |
| **Results reporting** | Write execution_summary.yaml, report to user |

### What /run Delegates (Pipeline Agents)

| State | Agent | Output | Purpose |
|-------|-------|--------|---------|
| INIT | `orchestrator` | enriched_context.yaml | Context enrichment |
| ORCHESTRATED | `universal-planner` | plan.yaml | Objectives, controller selection |
| PLANNED | `task-decomposer` | work_items.yaml | Work item decomposition with acceptance criteria |
| DECOMPOSED | `prompt-engineer` | delegation_prompts.yaml | Optimized prompts with code snippets, constraints |
| PROMPTS_READY | Controller (dynamic) | coordination_log.yaml | Question-based coordination with reviewer loop |
| COORDINATED | `universal-validator` | validation_report.yaml | Quality validation (PASS/FAIL/REVISE) |

The controller (PROMPTS_READY state) spawns execution agents and reviewers at level 2. The specific controller is determined from `plan.yaml`'s `controller_assignment.primary` field.

### Example: Fix Authentication Bug (Tier 2)

**User**: `/run Fix the login bug where users can't authenticate`

**Flow**:

1. **INIT** -- /run creates session `run_20260227_143022/`, classifies domain=Make, tier=2
2. **Orchestrator** -- Enriches context: project uses JWT auth, Express backend, React frontend
3. **Planner** -- Defines objectives, selects `engineering-manager` as controller
4. **Decomposer** -- Creates work items: WI-001 (investigate), WI-002 (fix), WI-003 (test)
5. **Prompt-engineer** -- Reads auth-related code, crafts delegation prompts with code snippets
6. **Engineering-manager** (controller) -- Asks questions:
   - "What is the current auth implementation?" -> delegates to `backend-developer`
   - "Where is the JWT validation failing?" -> delegates to `backend-developer`
   - "What test coverage exists?" -> delegates to `qa-tester`
   - Reviewer validates each executor's output (max 3 internal rounds)
   - Synthesizes answers, coordinates implementation
7. **Validator** -- Checks: bug fixed, tests passing, no regressions -> PASS
8. **/run** -- Writes execution_summary.yaml, reports results

**Agents spawned**: orchestrator, universal-planner, task-decomposer, prompt-engineer, engineering-manager, backend-developer (x2), qa-tester, reviewer, universal-validator

### Revision Handling

| Validator Result | Action | Max Cycles |
|-----------------|--------|------------|
| **PASS** | Pipeline complete | -- |
| **FAIL** | Re-run from PROMPTS_READY (controller re-executes with feedback) | 5 |
| **REVISE** | Re-run from PLANNED (planner re-plans with feedback) | 5 |
| **Max cycles exceeded** | Escalate to user (HITL), suggest `--resume` | -- |

### Flags

| Flag | Effect |
|------|--------|
| `--interactive` | Ask user preferences before executing |
| `--dry-run` | Show plan only, do not execute |
| `--quiet` / `-q` | Suppress plan display |
| `--team` | Hand off to `/team` for parallel execution |
| `--resume <session_id>` | Resume from last checkpoint |
| `--session <session_dir>` | Pre-enriched session (from /team) |
| `--domain <domain>` | Force domain classification |
| `--tier <N>` | Force tier classification |

---

## /team -- N-Wave Parallel Team Execution

Decomposes a request into work items across multiple waves, creates a real agent team via TeamCreate, and spawns fresh teammates per wave. Each teammate invokes `/run` for its work item. 40-60% execution time reduction for tier 3+.

### Architecture

```
/team <request>
    |
    Wave 0 (Lead, sequential): Enrichment + Foundation
      orchestrator -> planner -> decomposer -> bootstrap work items
    |
    Wave 1..N-1 (Teammates, parallel per wave):
      Wave K: Spawn teammates -> each runs /run --session -> validate GATE-K -> next wave
    |
    Wave N (Lead, sequential): Integration + Final Validation
      integration controller -> final validator -> complete
```

### N-Wave Execution Model

Each wave is a distinct spawn-execute-validate cycle:

1. **Wave 0 (Lead)** -- Enrichment pipeline (orchestrator, planner, decomposer) + bootstrap tasks
2. **Waves 1..N-1 (Teammates)** -- Parallel execution with GATE sentinel quality checks between waves
3. **Wave N (Lead)** -- Integration controller merges outputs, final validator confirms completion

**Key principle**: Teammates never implement directly. Each teammate invokes `/run` via the Skill tool, which creates its own controller and execution agents.

```
Teammate -> Skill({skill: "run", args: "WI-001: ..."})
  -> /run state machine -> controller -> execution agents -> validated output
```

### Wave Dependency Enforcement

Dependencies are enforced via GATE sentinel tasks using TaskCreate and TaskUpdate:

```
Wave 0 tasks -> GATE-0 (blocked by all wave 0 tasks)
Wave 1 tasks (blocked by GATE-0) -> GATE-1 (blocked by all wave 1 tasks)
Wave 2 tasks (blocked by GATE-1) -> GATE-2 ...
```

The team lead validates gate criteria before marking GATE-N complete, which unblocks the next wave.

### Wave Count Guidance

| Tier | Minimum Waves | Typical Waves |
|------|---------------|---------------|
| 2 | 3 | 3-4 |
| 3 | 5 | 5-7 |
| 4 | 6 | 6-10 |

More waves are always better -- each wave provides a quality gate checkpoint, a coordination point, and clearer dependency boundaries.

### Typical Wave Breakdown

| Wave | Type | Executor | Description |
|------|------|----------|-------------|
| 0 | Bootstrap | Lead (sequential) | Scaffolding, schemas, contracts |
| 1 | Research | Teammates (parallel) | Analysis, information gathering |
| 2 | Design | Teammates (parallel) | Architecture, interface definitions |
| 3 | Core Implementation | Teammates (parallel) | Primary build work |
| 4 | Supporting | Teammates (parallel) | Secondary features, integrations |
| 5 | Testing | Teammates (parallel) | QA, security, validation |
| 6 | Documentation | Teammates (parallel) | Docs, cleanup, optimization |
| N | Integration | Lead (sequential) | Merge, final validation |

### Built-in Agent Team Tools

| Tool | Purpose |
|------|---------|
| **TeamCreate** | Create team with shared task list (enables tmux panes) |
| **TeamDelete** | Clean up team and task resources |
| **TaskCreate** | Create work items as shared tasks |
| **TaskUpdate** | Update status, set owner, manage dependencies |
| **TaskList** | View all tasks and status |
| **SendMessage** | Direct messaging between lead and teammates |

### Display Modes

| Mode | Behavior | Requirements |
|------|----------|--------------|
| `auto` (default) | tmux if inside tmux, otherwise in-process | None |
| `tmux` | Each teammate in own tmux split pane | tmux installed |
| `in-process` | All teammates in main terminal (Shift+Up/Down) | None |

### Example: Implement OAuth2 Authentication (Tier 3)

**User**: `/team Implement OAuth2 authentication system`

**Flow**:

1. **Wave 0 (Lead)**: Enrichment + bootstrap
   - Orchestrator enriches context (Express + React stack)
   - Planner selects engineering-manager, identifies 6 work items
   - Decomposer assigns waves with acceptance criteria
   - Lead scaffolds OAuth config, database schema

2. **Wave 1 (2 teammates, parallel)**:
   - Teammate-1: `/run WI-001: Design OAuth flow and provider integration`
   - Teammate-2: `/run WI-002: Research token management strategy`
   - GATE-1: Lead validates design artifacts exist

3. **Wave 2 (3 teammates, parallel)**:
   - Teammate-3: `/run WI-003: Implement OAuth provider endpoints`
   - Teammate-4: `/run WI-004: Implement token refresh logic`
   - Teammate-5: `/run WI-005: Build login/logout UI components`
   - GATE-2: Lead validates endpoints work, UI renders

4. **Wave 3 (1 teammate)**:
   - Teammate-6: `/run WI-006: Integration tests + security audit`
   - GATE-3: Lead validates tests pass, no vulnerabilities

5. **Wave 4 (Lead)**: Integration
   - Merge cross-WI outputs, final validation -> PASS

**Result**: 40-60% faster than sequential `/run`

### Fallback

If the request produces fewer than 3 work items or has no parallelizable items, `/team` automatically delegates to `/run`.

---

## /review -- Universal Review Orchestrator

Runs parallel specialist review agents with framework detection, confidence scoring, auto-fix generation, and quality gates.

### Architecture

```
/review <target> [flags]
    |
    Phase 1: Initialize
      Detect review type + framework
      Analyze scope, plan parallel strategy
    |
    Phase 2: Parallel Agent Execution
      Group 1 (independent): architecture-reviewer, code-standards-auditor, documentation-reviewer
      Group 2 (context-dependent): performance-analyzer, security-analyst, test-coverage-validator
      Group 3 (specialized): dependency-auditor, accessibility-checker, qa-compliance-officer
    |
    Phase 3: Aggregate Findings
      Confidence scoring (0.0-1.0), deduplication, severity classification
    |
    Phase 4: Auto-Fix Generation
      Confidence-based fixes with validation and rollback
    |
    Phase 5: Quality Gates
      Threshold checking, regression testing
    |
    Phase 6: Report
      Type-specific report with findings, fixes, metrics
```

### Review Types

| Type | Indicators | Focus Areas |
|------|-----------|-------------|
| **Code** | .js, .ts, .py files; src/ | Architecture, security, performance, standards, tests |
| **Documentation** | .md, .txt, docs/ | Clarity, completeness, accuracy, structure |
| **Content** | Blog posts, marketing copy | Tone, grammar, messaging, audience fit |
| **Design** | .fig, wireframes, mockups | UX, accessibility, consistency, branding |
| **Process** | Workflows, SOPs | Efficiency, clarity, risk, compliance |
| **Data** | .csv, .json, databases | Quality, completeness, consistency, schema |
| **Infrastructure** | Docker, k8s, Terraform | Security, scalability, reliability, cost |

### Agent Spawning Pattern

Review agents are spawned in parallel groups via the Task tool:

```
Task({
  subagent_type: "cagents:architecture-reviewer",
  description: "Review architecture and design patterns",
  prompt: "Review architecture for: {target}..."
})
```

Groups execute sequentially (Group 2 after Group 1), but agents within each group run in parallel. 3-5x faster than sequential review.

### Key Features

- **Framework detection**: Next.js, React, FastAPI, Django with 90%+ accuracy
- **Confidence scoring**: Every finding scored 0.0-1.0 with framework-specific bonus
- **Auto-fix engine**: Confidence-based fixes with validation, rollback, and quality gates
- **Cross-skill integration**: Offers `/run` to fix critical issues, `/optimize` for performance opportunities

### Key Flags

| Flag | Effect |
|------|--------|
| `--focus security\|performance\|quality` | Focus area |
| `--auto-fix safe\|all` | Generate and apply fixes |
| `--scope changed\|staged\|all` | Scope filter |
| `--framework nextjs\|react\|...` | Force framework detection |
| `--quality-gate strict\|standard\|relaxed` | Gate threshold |
| `--parallel` / `--sequential` | Execution mode |

---

## /optimize -- Universal Optimizer

Structured 5-phase optimization with 8 optimization types, atomic execution with rollback, and before/after metrics.

### Architecture

```
/optimize [target] [flags]
    |
    Phase 1: Detection (15%)
      Auto-detect type, scan for opportunities, parse intent
    |
    Phase 2: Analysis (25%)
      Measure baseline metrics, classify risk per opportunity
      Cross-file analysis: dependency graph, data flow, propagation
    |
    Phase 3: Planning (20%)
      Prioritize by ROI: (impact x ease x confidence) / risk
      Group by file independence for parallel execution
    |
    Phase 4: Execution (25%)
      For each optimization: snapshot -> apply -> validate -> keep or rollback
      Independent optimizations run in parallel
    |
    Phase 5: Validation (15%)
      Re-measure all metrics, compare before/after
      Run regression tests, check quality gates
      Generate report with concrete numbers
```

### 8 Optimization Types

| Type | Domain | What It Optimizes |
|------|--------|-------------------|
| **code** | Make | Performance, bundle size, algorithms, memory, queries |
| **content** | Make/Grow | Readability, SEO, engagement, CTAs, structure |
| **process** | Operate | Workflow efficiency, automation, cycle time |
| **infrastructure** | Make/Operate | Cost, scaling, reliability, monitoring |
| **data** | Make/Operate | Query performance, ETL speed, data quality |
| **campaign** | Grow | Conversion rates, engagement, targeting |
| **creative** | Make | Pacing, character depth, plot structure, dialogue |
| **sales** | Grow | Sales cycle, win rate, follow-up completion |

### Risk Classification

| Level | Auto-Apply? | Examples |
|-------|-------------|---------|
| SAFE | Yes | Formatting, unused imports, dead code |
| LOW | Yes | Simple refactors, type annotations |
| MEDIUM | With validation | Algorithm changes, query optimization |
| HIGH | Requires approval or `/run` | Architecture changes, dependency updates |
| CRITICAL | Always via `/run` | Breaking changes, data migrations |

### Key Features

- **Atomic operations**: Every optimization gets a git snapshot; rollback on failure
- **Cross-file analysis**: Dependency graphs, data flow tracing, performance propagation
- **Measurable impact**: Baseline before, final after -- no vague "improvements"
- **Cross-skill integration**: Hands off CRITICAL items to `/run`, triggers `/review` post-optimization

### Key Flags

| Flag | Effect |
|------|--------|
| `--type code\|content\|process\|...` | Force optimization type |
| `--dry-run` | Preview without applying |
| `--safety safe\|medium\|all` | Risk level filter |
| `--cross-file` | Enable multi-file analysis |
| `--plan-only` | Generate plan, hand off to `/run` |
| `--review-after` | Trigger `/review` after optimization |

---

## /designer -- Interactive Design Engine

Transforms ideas into implementation-ready design documents through 4-phase guided exploration with artifact generation and pattern-based recommendations.

### Architecture

```
/designer [topic] [flags]
    |
    Phase 1: Discovery (15%)
      Problem, stakeholders, constraints, success criteria
      Codebase search for context-aware questions
    |
    Phase 2: Ideation (25%)
      2-4 alternatives with trade-offs
      Pattern recommendations from design library
      User selects approach
    |
    Phase 3: Refinement (35%)
      Architecture, flows, data model, security, testing
      Mermaid diagrams generated inline
      Real-time design building
    |
    Phase 4: Specification (25%)
      User stories with acceptance criteria
      Technical spec, implementation checklist
      4-level validation (completeness, consistency, feasibility, quality)
    |
    Build Offer:
      "Build it now" -> /run
      "Build with team" -> /team
      "Save design only"
      "Continue refining"
```

### Key Features

- **Always interactive**: Uses AskUserQuestion for every question (never plain text)
- **Context-aware**: Searches codebase before asking questions
- **Generative**: Builds artifacts (diagrams, specs, stories) as the design forms
- **Pattern-driven**: Recommends proven patterns from the design pattern library
- **Long session resilience**: Writes incrementally, monitors context, creates waypoints
- **Domain adaptable**: Software (architecture, API, data model), Business (RACI, timeline, risks), Creative (plot, characters, world)
- **Build integration**: Directly triggers `/run` or `/team` when user is ready

### Design Domains

| Domain | Refinement Areas | Output Artifacts |
|--------|-----------------|-----------------|
| **Software** | Architecture, data model, user flows, API, security, testing, deployment | User stories, tech spec, implementation checklist, diagrams |
| **Business** | Process flow, RACI, resources, timeline, change management, risks | Process doc, RACI matrix, roadmap, risk register |
| **Creative** | Plot, characters, world, scenes, themes, style | Story bible, character sheets, plot outline, style guide |

---

## /helper -- Interactive Command Guide

Explains cAgents commands and recommends the right one for the user's needs. Does not execute commands -- only educates and recommends.

### Modes

| Mode | Trigger | Output |
|------|---------|--------|
| **Full guide** | `/helper` (no args) | Command overview table + quick decision guide |
| **Command help** | `/helper run` | Deep dive: what, when, workflow, flags, examples |
| **Recommendation** | `/helper how do I fix a bug` | Best command + rationale + alternatives |
| **Comparison** | `/helper --compare` | Side-by-side comparison of all commands |
| **Flag reference** | `/helper --flags run` | Complete flag table for a command |
| **Examples** | `/helper --examples` | Categorized real-world usage examples |
| **Quick mode** | `/helper --quick` | One-screen reference card |
| **Topic dive** | `/helper --topic workflow` | Deep explanation of a concept |

---

## Cross-Command Integration

Commands are designed to work together through well-defined handoffs:

```
/designer -> /run          Design thoroughly, then build (most common pipeline)
/designer -> /team         Design, then build in parallel (for big features)
/optimize -> /review       Optimize, then verify quality
/review -> /run            Review finds issues, /run fixes them
/optimize -> /run          Optimizer generates plan, /run implements CRITICAL items
/run --team                Shortcut: /run with parallel team execution
/team (fallback) -> /run   If <3 work items, /team delegates to /run
```

### Integration Patterns

**Design-then-build**:
```
/designer OAuth2 system
  -> User explores design with guided Q&A
  -> Selects "Build with team"
  -> /team implement design from designer_20260227_143022
    -> Spawns teammates, each invokes /run
```

**Optimize-then-verify**:
```
/optimize src/ --type code --review-after
  -> Detects and applies safe optimizations
  -> Triggers /review on changed files
  -> Review confirms quality maintained
```

**Review-then-fix**:
```
/review src/ --focus security
  -> Finds 3 critical, 7 high findings
  -> Offers: "Fix critical issues with /run?"
  -> /run fix critical security issues from review session review_20260227_150000
```

---

## Agent Architecture

### Tier System

| Tier | Role | Count | Description |
|------|------|-------|-------------|
| **Core** | Infrastructure | 14 | Orchestration, team, workflow, task management |
| **2 (Controller)** | Coordination | ~53 | Question-based delegation, synthesis |
| **3 (Execution)** | Implementation | ~149 | Answer questions, implement tasks |
| **4 (Support)** | Services | ~19 | Foundational utilities |
| **Shared** | Cross-domain | 14 | Capabilities used across domains |
| **Total** | | 238 | |

### Super-Domain Distribution

| Domain | Agents | Scope |
|--------|--------|-------|
| **Make** | 111 | Engineering, creative, product, game dev (28 game dev agents) |
| **Grow** | 38 | Marketing, sales |
| **Operate** | 13 | Finance, operations |
| **People** | 20 | HR, culture, talent |
| **Serve** | 28 | Customer support, legal, compliance |

### Core Infrastructure Agents (14)

**Orchestration** (4): trigger, orchestrator, hitl, optimizer
**Team** (2): team-trigger, team-lead-adapter
**Universal Workflow** (5): universal-router, universal-planner, universal-executor, universal-validator, universal-self-correct
**Task Management** (3): task-consolidator, task-decomposer, task-inventory

### Pipeline Agents (used by /run)

| Agent | Pipeline State | Level | Output |
|-------|---------------|-------|--------|
| `orchestrator` | INIT | 1 | enriched_context.yaml |
| `universal-planner` | ORCHESTRATED | 1 | plan.yaml |
| `task-decomposer` | PLANNED | 1 | work_items.yaml |
| `prompt-engineer` | DECOMPOSED | 1 | delegation_prompts.yaml |
| Controller (dynamic) | PROMPTS_READY | 1 | coordination_log.yaml |
| Execution agents | (via controller) | 2 | Implementation |
| Reviewer | (via controller) | 2 | review_report.yaml |
| `universal-validator` | COORDINATED | 1 | validation_report.yaml |

### Agent Namespace

All agents are registered under the `cagents:` plugin namespace:

```
cagents:engineering-manager    (controller)
cagents:backend-developer      (execution)
cagents:copywriter             (execution)
cagents:qa-tester              (execution)
cagents:architect              (controller)
```

Do NOT use `{domain}:{agent-name}` format. The wrong prefix causes fallback to a generic agent.

---

## Controller-Centric Delegation

Controllers are the coordination hub between planning and execution. They receive objectives from the planner and use **question-based delegation** to coordinate specialist execution agents.

### Pattern

```
Planner -> Objectives -> Controller
  Controller asks questions -> delegates to execution agents (via Task tool)
  Execution agents answer -> Controller synthesizes
  Controller creates implementation tasks -> Execution agents implement
  Reviewer validates against acceptance criteria (max 3 rounds)
  Controller writes coordination_log.yaml
```

### Question-Based Delegation

Controllers ask questions rather than assigning tasks:

```
Controller: "What is the current auth implementation?"
  -> Task({subagent_type: "cagents:backend-developer", prompt: "Question: What is current auth?"})
  -> Answer: "JWT-based, Express middleware, RSA-256 signing"

Controller: "What test coverage exists for auth?"
  -> Task({subagent_type: "cagents:qa-tester", prompt: "Question: What test coverage for auth?"})
  -> Answer: "42 tests, 78% coverage, missing token refresh tests"

Controller synthesizes answers -> creates implementation plan
  -> Delegates implementation to execution agents
  -> Reviewer validates outputs
```

### Mandatory Rules

- Controllers NEVER implement directly (no Edit/Write on implementation files)
- Every question is delegated to an execution agent via Task tool
- Self-answered questions are prohibited
- Minimum 2 subagents per objective
- Prompts to execution agents should be under 300 tokens (question + where to look + what to report)

### Controllers by Super-Domain

| Domain | Tier 2 | Tier 3 (Additional) | Tier 4 (Additional) |
|--------|--------|---------------------|---------------------|
| **Make** | engineering-manager, architect, creative-director | security-specialist | cto + architect |
| **Grow** | campaign-manager, sales-strategist | content-strategist | cro + marketing-strategist |
| **Operate** | operations-manager, finance-manager | compliance-officer | cfo + coo |
| **People** | hr-manager, talent-acquisition | culture-champion | chro + ceo |
| **Serve** | customer-success-manager, legal-counsel | compliance-director | general-counsel |

### Coordination Log

The controller writes `coordination_log.yaml` when complete:

```yaml
controller: cagents:engineering-manager
objectives: [...]
questions_asked:
  - question: "What is the current auth implementation?"
    delegated_to: cagents:backend-developer
    answer: "JWT-based with Express middleware..."
  - question: "What test coverage exists?"
    delegated_to: cagents:qa-tester
    answer: "42 tests, 78% coverage..."
synthesized_solution:
  approach: "Fix JWT validation, add refresh token tests"
  rationale: "Root cause is in token expiry check"
  implementation_steps: [...]
  risks: [...]
implementation_tasks:
  - task_id: WI-002
    name: "Fix JWT validation"
    assigned_to: cagents:backend-developer
    acceptance_criteria: [...]
    status: completed
status: completed
```

---

## Complexity Tiers

All requests are classified into tiers. Minimum is tier 2 (controller coordination required). Former tiers 0/1 are auto-upgraded.

| Tier | Complexity | Controllers | Example Requests |
|------|-----------|-------------|-----------------|
| **2** (Moderate) | 1 primary controller | "Fix bug", "Answer question", "Fix typo" |
| **3** (Complex) | 1 primary + 1-2 supporting | "Add feature", "Create system", "Campaign plan" |
| **4** (Expert) | 1 executive + 1 primary + 2-4 supporting + HITL | "Major refactor", "Architecture migration", "Product launch" |

### Domain Detection Keywords

| Domain | Keywords |
|--------|----------|
| Make (engineering) | fix, bug, implement, code, api, database, build, refactor, test, deploy |
| Make (creative) | write, story, content, design, creative, novel, script, poem |
| Make (game dev) | game, level, quest, character, mechanic, balance, gameplay |
| Grow | campaign, marketing, sales, conversion, SEO, funnel, leads, revenue |
| Operate | budget, cost, forecast, operations, process, supply chain, procurement |
| People | hire, recruit, onboard, culture, HR, talent, performance review |
| Serve | support, legal, compliance, customer, SLA, contract, privacy |

### Validation Outcomes

| Outcome | Meaning | Next Step |
|---------|---------|-----------|
| **PASS** | Meets all acceptance criteria | Complete |
| **FAIL** | Issues can be retried with feedback | Re-execute controller (PROMPTS_READY) |
| **REVISE** | Plan needs rework | Re-plan from PLANNED state |
| **BLOCKED** | Requires human decision | HITL escalation |

---

## Agent Memory and Sessions

### Session Structure

Every command creates a session in `Agent_Memory/sessions/`:

```
Agent_Memory/sessions/{command}_{YYYYMMDD_HHMMSS}/
+-- instruction.yaml              # Original request + metadata
+-- status.yaml                   # Current pipeline state, state history
+-- task_plan.md                  # Three-file pattern: work item breakdown
+-- findings.md                   # Three-file pattern: discoveries/decisions
+-- progress.md                   # Three-file pattern: status/resume
+-- workflow/
|   +-- enriched_context.yaml     # Orchestrator output
|   +-- plan.yaml                 # Planner output (objectives, controllers)
|   +-- work_items.yaml           # Decomposer output (work items, waves)
|   +-- delegation_prompts.yaml   # Prompt-engineer output
|   +-- coordination_log.yaml     # Controller output (Q&A, synthesis)
|   +-- execution_summary.yaml    # Final aggregated results
|   +-- agent_tree.yaml           # Spawned agent hierarchy
|   +-- events/                   # Completion events (EVT-1.yaml, ...)
|   +-- checkpoints/              # State snapshots
+-- waypoints/                    # Resume checkpoints at phase transitions
+-- tasks/                        # Task tracking (pending, in_progress, completed)
+-- outputs/                      # Deliverables (partial, final)
+-- validation/                   # Validation records
```

### Three-File Pattern

Compact session tracking that survives context compaction and enables easy resumption (60-80% context savings vs. full logs):

| File | Tokens | Content |
|------|--------|---------|
| `task_plan.md` | 500-2000 | Work item breakdown, completion status, evidence |
| `findings.md` | 1000-5000 | Key discoveries, decisions, Q&A log |
| `progress.md` | 200-500 | Current phase, progress summary, resume instructions |

### Waypoints

Checkpoint snapshots created at phase transitions and before context compaction. Enable pause/resume via `/run --resume {session_id}`.

### Agent Memory Hierarchy

```
Agent_Memory/
+-- _system/       # Configs, commands/, templates/, metrics/, evals/
+-- _knowledge/    # Patterns, calibration, learnings
+-- _archive/      # Completed sessions
+-- _communication/# Agent messaging (inbox/{agent}/, broadcast/)
+-- sessions/      # run_*, team_*, designer_*, review_*, optimize_*
```

### Event Files

Each pipeline agent writes a completion event to `workflow/events/EVT-{N}.yaml`:

```yaml
event_id: EVT-1
state: ORCHESTRATED
agent: cagents:orchestrator
timestamp: "2026-02-27T14:30:22Z"
inputs_consumed: [instruction.yaml]
outputs_produced: [workflow/enriched_context.yaml]
next_state: ORCHESTRATED
```

/run reads these events to determine state transitions.

---

## Execution Modes

| Mode | Description | Use Case | Max Agents |
|------|-------------|----------|------------|
| **Sequential** | One task at a time | Dependencies, low complexity | 1 |
| **Pipeline** | Streaming execution | Moderate dependencies | 5-10 |
| **Swarm** | Fully parallel | Independent tasks, high volume | 50 |
| **Mesh** | Hybrid parallel + coordination | Complex workflows | 20-30 |

Execution mode is auto-selected based on task dependencies and tier. `/team` uses the N-wave model (parallel within wave, sequential between waves).

---

## Hook System

17 CJS files providing lifecycle hooks across 12 event types. All use the `createHook()` factory from `hook-utils.cjs`.

### Active Hooks

| Event Type | Hook | Purpose |
|------------|------|---------|
| `SessionStart` | `session-catchup.cjs` | Detect incomplete sessions, inject context |
| `SessionEnd` | `team-stop.cjs` | Finalize metrics, update status |
| `Stop` | `verify-completion.cjs` | Verify completion criteria before stop |
| `SubagentStart` | `subagent-tracker.cjs` | Log spawns to agent_tree.yaml |
| `SubagentStart` | `team-start.cjs` | Initialize team monitoring |
| `SubagentStop` | `subagent-stop-tracker.cjs` | Track agent stop timestamps |
| `PreToolUse[Bash]` | `bash-validator.cjs` | Block dangerous commands |
| `PreToolUse[Write\|Edit]` | `secret-detection.cjs` | Block secrets and protected paths |
| `PostToolUseFailure` | `tool-failure-tracker.cjs` | Track failures, suggest recovery |
| `TeammateIdle` | `teammate-idle-handler.cjs` | Find available work for idle members |
| `TaskCompleted` | `team-task-complete.cjs` | Update task list, unblock dependencies |
| `PermissionRequest` | `permission-handler.cjs` | Auto-approve safe patterns, HITL gates |
| `PreCompact` | `pre-compact-save.cjs` | Save state before context compaction |
| `Notification` | `notification.cjs` | Log notifications with rotation |

### Hook Architecture

All hooks invoked via `bash -c` wrapper with 3-tier fallback chain (`CLAUDE_PLUGIN_ROOT` -> `CLAUDE_PROJECT_DIR` -> `pwd`). The `createHook()` factory eliminates boilerplate: handles stdin reading, JSON parsing, try-catch wrapping, and single JSON output.

---

## Performance

| Feature | Improvement |
|---------|-------------|
| **Parallel Execution** | 50x speedup (swarm mode vs. sequential) |
| **Team Mode** | 40-60% execution time reduction for tier 3+ |
| **Task Inventory** | 60-80% context savings for 20+ task workflows |
| **Three-File Pattern** | 60-80% context savings vs. full coordination logs |
| **Aggressive Decomposition** | 30+ work items from simple requests |
| **Controller Pattern** | 30-40% simpler planning, 20-30% fewer tokens |
| **Review (Parallel)** | 3-5x faster with intelligent agent selection |

---

## Summary

**cAgents = 6 commands x event-driven pipeline x 5 super-domains x 238 specialized agents**

- **Event-Driven**: Config-driven state machine with sequential enrichment, nested execution with reviewer loops, and revision routing
- **6 Commands**: `/run` (execute), `/team` (parallel), `/review` (quality), `/optimize` (improve), `/designer` (plan), `/helper` (guide)
- **Controller-Centric**: Controllers coordinate via question-based delegation, never implement directly
- **N-Wave Parallel**: `/team` decomposes into waves with GATE quality checks, teammates invoke `/run`
- **Cross-Skill Integration**: Commands hand off to each other (`/designer` -> `/run`, `/review` -> `/run`, `/optimize` -> `/review`)
- **Config-Driven**: Domains customize via YAML configs (`planner_config.yaml`, `pipeline_config.yaml`), not code
- **Scalable**: Up to 50 concurrent agents, N-wave team execution
- **Resilient**: Three-file pattern, waypoints, pre-compact hooks, `--resume` for interrupted sessions
- **Quality-Gated**: Dual revision loops (controller-level 3 rounds, pipeline-level 5 cycles), GATE sentinels between waves

**Result**: Any request, any domain, fully automated end-to-end execution with quality gates and revision routing.
