# Workflow Agent Interactions

How agents interact during workflow execution. For architecture, commands, and agent reference, see `CLAUDE.md`.

**Version**: 10.9.0

---

## Command Flow Patterns

### /org -- Corporate Hierarchy

```
User (Chairperson)
  +-- /org (CEO inline, context: none)
        +-- C-suite agents via Agent (parallel analysis)
        +-- Deliberation (objections + resolution)
        +-- Strategic brief
        +-- Sequential /team per domain via Skill
```

**States**: INIT -> ANALYZED -> DELIBERATED -> BRIEFED -> EXECUTED -> INTEGRATED -> COMPLETE

**Routing**: 1 domain + simple scope -> /run with brief. 1 domain + complex -> /team. 2+ domains -> full hierarchy.

**Example** (`/org Launch analytics product by Q2`):
1. CEO identifies 5 domains, spawns CTO, CCO, CRO, CFO, CHRO in parallel
2. CFO objects (budget), CHRO flags (hiring timeline) -> CEO resolves with phased approach
3. Strategic brief with domain assignments -> 5 sequential /team instances -> CEO merges outputs

### /run -- Event-Driven Pipeline

```
/run (state machine, level 0)
  +-> orchestrator (level 1)    -> enriched_context.yaml
  +-> planner (level 1)         -> plan.yaml
  +-> decomposer (level 1)      -> work_items.yaml
  +-> prompt-engineer (level 1)  -> delegation_prompts.yaml
  +-> controller (level 1)
       +-> executor (level 2)   -> implementation
       +-> reviewer (level 2)   -> review_report.yaml
  +-> validator (level 1)       -> validation_report.yaml
```

**Revision routing**: FAIL -> re-run controller (PROMPTS_READY). REVISE -> re-run planner (PLANNED). Max 5 cycles.

**Example** (`/run Fix login auth bug`):
1. Domain=Engineering, tier=2. Orchestrator enriches (JWT auth, Express, React)
2. Planner selects engineering-manager. Decomposer creates 3 work items
3. Engineering-manager asks: "Current auth implementation?" -> backend-developer. "Test coverage?" -> qa-tester
4. Synthesizes fix, delegates implementation, reviewer validates -> PASS

### /team -- N-Wave Parallel Execution

```
Wave 0 (Lead): orchestrator -> planner -> decomposer -> bootstrap
Wave 1..N-1 (Teammates, parallel per wave): execution with GATE validation
Wave N (Lead): integration controller -> final validator
```

**Example** (`/team Implement OAuth2 authentication`):
1. Wave 0: Enrich, plan, decompose into 6 items across 4 waves
2. Wave 1 (2 teammates): Design OAuth flow + research token strategy -> GATE-1
3. Wave 2 (3 teammates): Implement endpoints + token refresh + login UI -> GATE-2
4. Wave 3 (1 teammate): Integration tests + security audit -> GATE-3
5. Wave 4 (Lead): Merge outputs, final validation -> PASS

### /review -- Parallel Review

```
Phase 1: Detect review type + framework
Phase 2: Parallel agent groups (architecture, standards, performance, security)
Phase 3: Aggregate with confidence scoring
Phase 4: Auto-fix generation
Phase 5: Quality gates
```

### /optimize -- 5-Phase Optimization

```
Phase 1 (15%): Detection -- auto-detect type, scan opportunities
Phase 2 (25%): Analysis -- baseline metrics, risk classification
Phase 3 (20%): Planning -- prioritize by ROI
Phase 4 (25%): Execution -- snapshot -> apply -> validate -> keep/rollback
Phase 5 (15%): Validation -- before/after metrics, regression tests
```

### /designer -- Interactive Design

```
Phase 1 (15%): Discovery -- problem, stakeholders, constraints
Phase 2 (25%): Ideation -- 2-4 alternatives with trade-offs
Phase 3 (35%): Refinement -- architecture, flows, data model
Phase 4 (25%): Specification -- user stories, tech spec, checklist
Build offer: /run, /team, save, or continue refining
```

---

## Cross-Command Integration

```
/org -> /team              Strategic brief -> domain execution
/designer -> /run          Design then build
/designer -> /team         Design then parallel build
/review -> /run            Find issues then fix
/optimize -> /review       Improve then verify
/run --team                Shortcut for parallel execution
/team (fallback) -> /run   Auto-delegates if <3 work items
```

---

## Controller Delegation Pattern

Controllers coordinate via questions, never implement directly:

```
Controller receives objectives from plan.yaml
  -> Breaks into questions
  -> Delegates each to execution agent via Agent tool
  -> Synthesizes answers
  -> Coordinates implementation
  -> Reviewer validates (max 3 rounds)
  -> Writes coordination_log.yaml
```

**Mandatory rules**: Every question delegated via Task. Self-answered questions prohibited. Prompts under 300 tokens.

---

## Session Files

Each command creates `Agent_Memory/sessions/{command}_{slug}_{YYMMDD}_{NNN}/` with:

| File | Purpose |
|------|---------|
| `instruction.yaml` | Original request + metadata |
| `status.yaml` | Current pipeline state |
| `task_plan.md` | Work item breakdown |
| `findings.md` | Discoveries and decisions |
| `progress.md` | Status and resume instructions |
| `workflow/plan.yaml` | Planner output |
| `workflow/coordination_log.yaml` | Controller Q&A and synthesis |
| `workflow/events/EVT-*.yaml` | State transition events |

---

## Agent Namespace

All agents registered under `cagents:` prefix. Use `cagents:engineering-manager`, not `engineering:engineering-manager`.
