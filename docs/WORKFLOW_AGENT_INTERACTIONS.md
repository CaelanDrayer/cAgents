# Workflow Agent Interactions

How agents interact during workflow execution. For architecture, commands, and agent reference, see `CLAUDE.md`.

**Last verified**: v12.2.0

_V11.0 removed /review, /optimize, /context, /debug — see [MIGRATION-V11.md](./MIGRATION-V11.md). v12.1.2 folded /improve into /run via a first-word keyword router; review and optimization are now modes of `/run` (`/run review`, `/run optimize`, `/run improve` — or `--mode review|optimize|full`). v12.2.0 removed /org and absorbed cross-domain coordination into `/team` strategic mode (auto-enabled when `router.domain_count >= 2`)._

---

## Command Flow Patterns

### /team Strategic Mode -- Cross-Domain Corporate Hierarchy (v12.2.0+; replaces /org)

```
User (Chairperson)
  +-- /team (strategic mode auto-enables when domain_count >= 2)
        +-- Wave 0 (Lead): orchestrator -> planner (decomposition inline)
        +-- Wave 1 (Teammates): C-suite agents via Agent (parallel analysis)
        +-- Wave 2 (Teammates): Deliberation (objections + resolution) -> Strategic brief
        +-- Wave 3..N-1 (Teammates): Per-domain dispatch (nested waves per domain)
        +-- Wave N (Lead): Integration controller -> final validator
```

**Trigger**: Strategic mode auto-enables when `router.domain_count >= 2`. Force-enable with `--strategic`; force-disable with `--no-strategic`. (Pre-v12.2.0 this work ran under a separate `/org` skill, which was removed in v12.2.0 and folded into `/team` strategic mode.)

**Routing**: 1 domain + simple scope -> /run. 1 domain + complex -> flat /team. 2+ domains -> /team strategic mode (Wave 0/1/2 C-suite deliberation + Wave 3..N per-domain dispatch in the same session).

**Example** (`/team Launch analytics product by Q2`):
1. Wave 0/1: router identifies 5 domains, lead spawns CTO, CCO, CRO, CFO, CHRO as Wave 1 teammates in parallel
2. Wave 2: CFO objects (budget), CHRO flags (hiring timeline) -> lead resolves with phased approach -> strategic brief written
3. Wave 3..N: Per-domain dispatch (engineering, creative, growth, operations, people) executes against the strategic brief
4. Wave N (Lead): integration + final validation

### /run -- Event-Driven Pipeline

```
/run (state machine, level 0; 5-state pipeline since v12.0.0)
  +-> orchestrator (level 1)    -> enriched_context.yaml
  +-> planner (level 1)         -> plan.yaml + work_items.yaml (task-decomposer and prompt-engineer were folded into the planner in v12.0.0; controllers use standard delegation prompts)
  +-> controller (level 1)
       +-> executor (level 2)   -> implementation
       +-> reviewer (level 2)   -> review_report.yaml
  +-> validator (level 1)       -> validation_report.yaml
```

**Revision routing**: FAIL -> re-run controller (PLANNED). REVISE -> re-coordinate (PLANNED). Max 3 cycles (tightened from 5 in v12.0.0 per audit recommendation).

**Example** (`/run Fix login auth bug`):
1. Domain=Engineering, tier=2. Orchestrator enriches (JWT auth, Express, React)
2. Planner selects tech-lead and decomposes into 3 work items
3. Tech-lead asks: "Current auth implementation?" -> backend-developer. "Test coverage?" -> qa-lead
4. Synthesizes fix, delegates implementation, reviewer validates -> PASS

### /team -- N-Wave Parallel Execution

```
Wave 0 (Lead): orchestrator -> planner (decomposition inline) -> bootstrap
Wave 1..N-1 (Teammates, parallel per wave): execution with GATE validation
Wave N (Lead): integration controller -> final validator
```

**Example** (`/team Implement OAuth2 authentication`):
1. Wave 0: Enrich, plan, decompose into 6 items across 4 waves
2. Wave 1 (2 teammates): Design OAuth flow + research token strategy -> GATE-1
3. Wave 2 (3 teammates): Implement endpoints + token refresh + login UI -> GATE-2
4. Wave 3 (1 teammate): Integration tests + security audit -> GATE-3
5. Wave 4 (Lead): Merge outputs, final validation -> PASS

### /run review (or --mode review) -- Parallel Review (v12.1.2+; replaces standalone /improve --mode review)

```
Phase 1: Detect review type + framework
Phase 2: Parallel agent groups (architecture, standards, performance, security)
Phase 3: Aggregate with confidence scoring
Phase 4: Auto-fix generation
Phase 5: Quality gates
```

### /run optimize (or --mode optimize) -- 5-Phase Optimization (v12.1.2+; replaces standalone /improve --mode optimize)

```
Phase 1 (15%): Detection -- auto-detect type, scan opportunities
Phase 2 (25%): Analysis -- baseline metrics, risk classification
Phase 3 (20%): Planning -- prioritize by ROI
Phase 4 (25%): Execution -- snapshot -> apply -> validate -> keep/rollback
Phase 5 (15%): Validation -- before/after metrics, regression tests
```

### /run improve (or --mode full) -- Combined Review + Optimize (v12.1.2+; replaces standalone /improve --mode full)

```
Stage 1: Review pass (auditing) -> findings + quality score
Stage 2: Optimize pass (measurable improvements) -> before/after metrics
Stage 3: Synthesized improve_report.md combining both
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
/team --strategic                      Strategic brief + per-domain dispatch in one session (v12.2.0+; replaces /org -> sequential /team chain)
/designer -> /run                      Design then build
/designer -> /team                     Design then parallel build
/run review <target> -> /run <fix>     Find issues then fix (v12.1.2+ keyword router)
/run optimize -> /run review           Improve then verify
/run improve <target>                  Single-pass review + optimize synthesis (= --mode full)
/run --team                            Shortcut for parallel execution
/team (fallback) -> /run               Auto-delegates if <3 work items
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

Each command creates `cagents-memory/sessions/{command}_{slug}_{YYMMDD}_{NNN}/` with:

| File | Purpose |
|------|---------|
| `instruction.yaml` | Original request + metadata |
| `status.yaml` | Current pipeline state |
| `task_plan.md` | Work item breakdown |
| `findings.md` | Discoveries and decisions |
| `progress.md` | Status and resume instructions |
| `workflow/plan.yaml` | Planner output |
| `workflow/coordination_log.yaml` | Controller Q&A and synthesis |
| `workflow/validation_report.yaml` | Validator PASS / FAIL / REVISE verdict |

---

## Agent Namespace

All agents registered under `cagents:` prefix. Use `cagents:tech-lead`, not `engineering:tech-lead`.
