# Skills Reference

Complete reference for all 9 cAgents skills. Use `/helper` to get interactive guidance, or read this doc to understand the full ecosystem.

## Overview Table

| Skill | Description | Context Mode | Interactive? | Best For |
|-------|-------------|--------------|-------------|----------|
| `/run` | Execute any task via coordinated agents | `none` (inline) | Autonomous | Building, fixing, writing — single-domain work |
| `/team` | Parallel multi-agent execution with wave-based quality gates | `fork` | Autonomous | Complex tasks with 3+ parallelizable work items |
| `/org` | C-suite hierarchy for cross-domain strategic initiatives | `none` (inline) | Autonomous | Multi-domain strategy, org-wide initiatives |
| `/designer` | Interactive design exploration via structured Q&A | `none` (inline) | **Interactive** | Planning features, systems, stories before building |
| `/review` | Quality review with parallel specialist agents | `fork` | Autonomous | Code review, security audits, quality checks |
| `/optimize` | Performance and efficiency improvements with metrics | `fork` | Autonomous | Speed, size, cost improvements with before/after proof |
| `/debug` | Systematic 4-phase root cause investigation | `none` (inline) | Autonomous | Bugs that resist quick fixes, unknown root causes |
| `/helper` | Interactive command guide and recommender | `none` (inline) | Interactive | Choosing the right skill, learning the ecosystem |
| `/context` | Persistent product context manager | `none` (inline) | Semi-interactive | Persisting project knowledge across sessions |

---

## Comparison Matrix

Use this matrix to choose the right skill for your task.

| Task Type | Recommended Skill | Why |
|-----------|-------------------|-----|
| Fix a bug (obvious cause) | `/run` | Single-domain, sequential fix |
| Fix a bug (unknown cause) | `/debug` | 4-phase investigation before fix |
| Implement a feature | `/run` | Controller + execution agent pipeline |
| Implement a large feature | `/team` | Parallel waves, faster delivery |
| Plan before building | `/designer` | Clarify requirements interactively |
| Review code quality | `/review` | Parallel specialist agents |
| Security audit | `/review --focus security` | Security mode with exploit scenarios |
| Improve performance | `/optimize` | Baseline → measure → apply → validate |
| Cross-domain initiative | `/org` | C-suite analysis + sequential /team execution |
| Multi-domain strategy | `/org` | CEO routes to relevant C-suite |
| Write content / copy | `/run` | Creative domain agents |
| Write a story / game narrative | `/run` or `/team` | Creative domain pipeline |
| Q4 campaign planning | `/org` | Business + Growth C-suite |
| Team restructuring | `/org` | Engineering + People C-suite |
| Learn which skill to use | `/helper` | Interactive guide |
| Persist project knowledge | `/context` | Enriches all future sessions |

---

## Decision Tree

Start here when unsure which skill to use.

```
Is the root cause of a bug unknown (resisted 2+ fix attempts)?
  YES → /debug
  NO  ↓

Does the task span 2+ business domains (e.g., engineering + marketing)?
  YES → /org
  NO  ↓

Do you need to PLAN / DESIGN before building?
  YES → /designer  (then /run --from-designer to build)
  NO  ↓

Do you want to CHECK quality of existing work?
  YES → /review  (then /run --from-review to fix)
  NO  ↓

Do you want to IMPROVE performance of existing work?
  YES → /optimize
  NO  ↓

Does the task have 3+ independent parallel work items?
  YES → /team   (40-60% faster via parallel waves)
  NO  ↓

→ /run   (single-domain task, standard pipeline)
```

---

## Per-Skill Reference

### /run — Event-Driven Pipeline Engine

**Purpose**: Executes any single-domain task through a config-driven state machine. Routes to the right domain controller, which coordinates specialist execution agents.

**Usage**:
```bash
/run Fix auth token expiry bug
/run Implement user profile page
/run Write blog post about performance optimization
/run Design game mechanics for puzzle mode
/run --dry-run Migrate database to PostgreSQL    # Preview only
/run --analytics                                  # Show pipeline metrics
/run Fix findings --from-review                   # Consume /review output
/run Build feature --from-designer                # Consume /designer output
/run --resume run_fix-auth_260317_001             # Resume a session
```

**Key Flags**:
| Flag | Purpose |
|------|---------|
| `--dry-run` | Preview routing decision without executing |
| `--quiet` / `-q` | Minimal output |
| `--team` | Run as /team (parallel execution) |
| `--analytics` | Show pipeline analytics dashboard |
| `--from-review` | Read `review_report.yaml` and create fix work items |
| `--from-designer` | Read design document and use as implementation spec |
| `--resume <id>` | Resume a previous session from last checkpoint |
| `--brief <path>` | Load strategic brief (set by /org) |

**Session Artifacts**:
- `workflow/enriched_context.yaml` — Orchestrator context enrichment
- `workflow/plan.yaml` — Domain, tier, controller, objectives
- `workflow/work_items.yaml` — Decomposed work items with acceptance criteria
- `workflow/delegation_prompts.yaml` — Optimized controller prompts
- `workflow/coordination_log.yaml` — Controller Q&A and synthesis
- `workflow/validation_report.yaml` — PASS/FAIL/REVISE verdict

---

### /team — N-Wave Parallel Team Execution

**Purpose**: Creates a real agent team and executes work in parallel waves with quality gates between each wave. Each wave spawns fresh teammate agents (controllers) that delegate to execution specialists. Provides 40-60% execution time reduction for tier 3+ work.

**Usage**:
```bash
/team Implement OAuth2 authentication
/team Build user dashboard with charts and tables
/team --dry-run Create microservices migration plan    # Preview wave structure
/team Build feature --waves 8                          # Force minimum 8 waves
/team Refactor auth module --teammate-mode tmux        # Split panes in tmux
```

**Key Flags**:
| Flag | Purpose |
|------|---------|
| `--dry-run` | Preview wave structure without executing |
| `--waves <n>` | Force minimum number of waves |
| `--members <n>` | Override default team size |
| `--teammate-mode tmux\|auto\|in-process` | Display mode for teammate panes |
| `--no-template` | Skip auto-template selection |

**Wave Structure** (typical):
```
Wave 0: Lead enrichment (orchestrator → planner → decomposer)
Wave 1: Research / Analysis / Design
Wave 2: Core Implementation
Wave 3: Supporting Implementation
Wave 4: Testing / Validation
Wave 5: Documentation / Polish
Wave N: Lead integration + final validation
```

**Session Artifacts**:
- `workflow/plan.yaml`, `workflow/work_items.yaml`
- `team/task_list.yaml` — Status overlay for all work items
- `team/team_manifest.yaml` — Team composition and display mode
- `workflow/coordination_log.yaml` — Per-wave coordination output

---

### /org — Corporate Hierarchy Orchestration

**Purpose**: Routes strategic initiatives through a C-suite hierarchy. The CEO (you, via /org) engages relevant C-suite agents for domain analysis and deliberation, produces a strategic brief, then delegates to sequential `/team` runs per domain. Use when work spans 2+ business domains.

**Usage**:
```bash
/org Launch new product with campaign           # Engineering + Business + Growth
/org Fix auth bug                               # Single /run with strategic brief
/org Restructure engineering team               # Engineering + People
/org Migrate to microservices                   # Engineering (CTO-level analysis)
/org --dry-run Expand to European markets       # Preview routing decision
/org --quick Prioritize Q4 roadmap              # Skip deliberation phase
/org --domains engineering,people Hire 10 devs  # Limit to specific C-suite
```

**Key Flags**:
| Flag | Purpose |
|------|---------|
| `--dry-run` | Preview routing and C-suite selection |
| `--quick` | Skip deliberation phase, go direct to brief |
| `--domains <d1,d2>` | Limit to specific C-suite domains |
| `--resume <id>` | Resume a previous /org session |

**C-Suite Roster**:
| Executive | Domain | Covers |
|-----------|--------|--------|
| CTO | Engineering | Backend, frontend, devops, QA, security |
| CCO | Creative | Narrative, design, game art, audio |
| CPO | Business/Product | Product management, strategy, roadmap |
| CRO | Business/Growth | Marketing, sales, revenue ops |
| CFO | Business/Finance | Finance, data, analytics |
| COO | Business/Ops | Operations, process, procurement |
| CHRO | People | HR, talent acquisition, culture |
| General Counsel | Service | Legal, compliance, customer success |

**Session Artifacts**:
- `workflow/strategic_brief.yaml` — CEO strategic brief (used by /team runs)
- Per-domain `analysis.yaml` from each C-suite agent
- Per-domain `/team` session output

---

### /designer — Interactive Design Engine

**Purpose**: Transforms vague ideas into implementation-ready design documents through structured Q&A. Research subagents pre-build context-rich question lists; you (the designer) act as the inline controller — presenting, adapting, and reordering questions based on responses. **The only interactive skill** — auto-proceed rules do not apply.

**Usage**:
```bash
/designer Authentication system
/designer Game economy with crafting and trading
/designer --deep API gateway architecture       # Research agents in all 6 phases
/designer --resume designer_auth_260317_001     # Resume a session
/designer --iterate designer_auth_260317_001    # Iterate on a completed design
/designer --template saas-onboarding           # Start from a template
```

**6-Phase Workflow**:
```
Phase 1: Empathize  — Who is this for? What problem does it solve?
Phase 2: Define     — Constraints, success criteria, scope boundaries
Phase 3: Conceptualize — High-level approaches and patterns
Phase 4: Ideation   — Specific design decisions and trade-offs
Phase 5: Refinement — Edge cases, error states, security concerns
Phase 6: Specification — Implementation-ready artifacts
```

**Key Flags**:
| Flag | Purpose |
|------|---------|
| `--deep` | Enable research agents in all 6 phases (more thorough) |
| `--resume <id>` | Resume a paused design session |
| `--iterate <id>` | Load completed design, make targeted modifications |
| `--template <name>` | Start from a design template |
| `--brief <path>` | Pre-populate from /org strategic brief |

**Session Artifacts**:
- `workflow/design_document.yaml` — Implementation-ready spec (consumed by `/run --from-designer`)
- `workflow/decision_log.yaml` — Design decisions with rationale
- Phase-specific research from subagents

---

### /review — Universal Review Orchestrator

**Purpose**: Runs parallel specialist review agents against code, docs, content, or infrastructure. Produces findings with confidence scores, file/line evidence, and optional auto-fix. Output feeds directly into `/run --from-review` for fix pipelines.

**Usage**:
```bash
/review src/auth/
/review . --focus security
/review src/ --auto-fix --severity high
/review --profile pre-merge                     # Gate mode for PR merges
/review --mode paranoid src/payments/           # Staff engineer mode
/review --baseline                              # Save current state as baseline
/review --suppress F-042                        # Suppress a known finding
```

**Review Modes**:
| Mode | Trigger | Behavior |
|------|---------|----------|
| `standard` | Default | Full review, all files |
| `paranoid` | `--mode paranoid` | Staff engineer mode, check race conditions, TOCTOU, trust boundaries |
| `quick` | `--mode quick` | Changed files only, high-confidence findings, no auto-fix |
| `security` | `--mode security` or `--focus security` | SQL injection, XSS, CSRF, auth bypass, secret exposure |
| `pre-merge` | `--profile pre-merge` | Strict gate for PR merges, baseline comparison |
| `diff-aware` | Auto on feature branches | Analyzes `git diff main...HEAD`, reviews only changed files |

**Key Flags**:
| Flag | Purpose |
|------|---------|
| `--focus <area>` | Scope to: security, performance, style, docs |
| `--auto-fix` | Automatically apply high-confidence fixes |
| `--severity <level>` | Filter to: critical, high, medium, low |
| `--profile <name>` | Apply a review profile (e.g., pre-merge) |
| `--baseline` | Save current findings as baseline |
| `--suppress <id>` | Suppress a specific finding ID |

**Session Artifacts**:
- `workflow/review_report.yaml` — All findings with evidence (consumed by `/run --from-review`)
- `workflow/review_summary.yaml` — Quality score and finding counts

---

### /optimize — Universal Optimizer

**Purpose**: A 5-phase structured optimization engine: detect opportunities → analyze impact → plan → execute atomically → validate with before/after metrics. Every change has a git snapshot for rollback. Never breaks existing functionality.

**Usage**:
```bash
/optimize src/api/
/optimize . --type code --focus performance
/optimize --type content blog/
/optimize --dry-run                             # Preview opportunities without changes
/optimize --interactive                         # Approve each optimization
/optimize --rollback                            # Roll back last optimization session
/optimize --history                             # Show past session outcomes
/optimize --benchmark auto                      # Use best available benchmark tool
```

**Optimization Types**:
| Type | Domain | What It Optimizes |
|------|--------|-------------------|
| `code` | Engineering | Performance, bundle size, algorithms, queries |
| `content` | Any | Readability, SEO, engagement, structure |
| `process` | Business | Workflow efficiency, automation, cycle time |
| `infrastructure` | Engineering | Cost, scaling, reliability |
| `data` | Engineering | Query performance, ETL speed, data quality |
| `campaign` | Growth | Conversion rates, engagement, targeting |
| `creative` | Creative | Pacing, character depth, plot structure |
| `sales` | Growth | Sales cycle, win rate, follow-up |

**Key Flags**:
| Flag | Purpose |
|------|---------|
| `--type <type>` | Optimization type (see table above) |
| `--focus performance\|cost\|quality` | Optimization focus |
| `--dry-run` | List opportunities without applying |
| `--interactive` | Prompt before each optimization |
| `--rollback` | Roll back last session changes |
| `--benchmark auto\|lighthouse\|k6\|hyperfine` | Benchmark integration |

**Session Artifacts**:
- `workflow/optimization_report.yaml` — Before/after metrics for every change
- `workflow/rollback_manifest.yaml` — Git snapshots for safe rollback

---

### /debug — Systematic Debugging Methodology

**Purpose**: A structured 4-phase root cause investigation. Use when bugs resist quick fixes, cause is unclear, or 2+ fix attempts have failed. Produces a root cause analysis and targeted fix, not just a patch.

**Usage**:
```bash
/debug Auth tokens expire prematurely
/debug "TypeError: Cannot read properties of undefined at auth.ts:42"
/debug Intermittent 500 errors on checkout
/debug --escalate Performance regression after deploy
/debug --phase 3 Resume at hypothesis testing phase
```

**4-Phase Workflow**:
```
Phase 1: Root Cause Investigation
  — Reproduce, gather evidence, map code paths

Phase 2: Pattern Analysis
  — Identify failure patterns, rule out red herrings

Phase 3: Hypothesis Testing
  — Form and test specific hypotheses with evidence

Phase 4: Implementation
  — Apply targeted fix, verify regression test, document
```

**Key Flags**:
| Flag | Purpose |
|------|---------|
| `--escalate` | Flag as high-priority, apply more thorough analysis |
| `--phase <1-4>` | Resume at a specific phase |

**When to use /debug vs /run**:
| Situation | Use |
|-----------|-----|
| Bug with obvious fix (typo, missing import) | `/run` |
| Bug that has resisted 2+ fix attempts | `/debug` |
| Intermittent or non-deterministic failure | `/debug` |
| Error message with unclear root cause | `/debug` |
| "It works on my machine" scenarios | `/debug` |

**Session Artifacts**:
- `workflow/root_cause_analysis.yaml` — Hypotheses, evidence, conclusion
- `workflow/fix_summary.yaml` — Applied fix with regression test reference

---

### /helper — Interactive Command Guide

**Purpose**: Explains cAgents commands and recommends the right one for your task. Does not execute tasks — only explains and guides. Use when unsure which skill fits, or when learning the ecosystem.

**Usage**:
```bash
/helper                                  # Full interactive guide
/helper run                              # Deep dive into /run
/helper how do I fix a bug              # Natural language recommendation
/helper --compare                        # Side-by-side command comparison
/helper --examples                       # Real-world usage examples
/helper --flags review                   # All flags for /review
/helper --topic integration              # How skills chain together
/helper --troubleshoot team              # Diagnose /team issues
```

**Key Flags**:
| Flag | Purpose |
|------|---------|
| `--compare` | Side-by-side comparison of all commands |
| `--flags <command>` | Show all flags for a specific command |
| `--examples` | Real-world examples across all commands |
| `--quick` | Brief summary only |
| `--topic <topic>` | Focus on: flags, integration, domains, workflow |
| `--troubleshoot <command>` | Diagnose issues with a specific command |

---

### /context — Shared Product Context Manager

**Purpose**: Creates and maintains a persistent product context document that all pipeline agents read during enrichment. Eliminates re-discovering project conventions in every session.

**Usage**:
```bash
/context init               # Initialize product context (auto-detects language, framework, etc.)
/context update             # Update existing context interactively
/context show               # Display current context
/context clear              # Remove product context
```

**What gets persisted**:
- Project name, description, primary language, framework
- Architecture style (monolith, microservices, serverless, etc.)
- Conventions: naming, test framework, formatter, linter
- Key directories: source, tests, docs, config
- Domain knowledge: key facts about the project
- Integration points: external APIs, databases, services

**Context Document Location**:
```
Agent_Memory/_projects/{project_hash}/product_context.yaml
```

Where `{project_hash}` is the first 8 characters of the SHA-256 hash of the project root path.

**When to use**: Run `/context init` once per project. All subsequent `/run`, `/team`, `/org`, `/review`, and `/optimize` sessions automatically benefit from the enriched context.

---

## Skill Chaining

Skills can be composed into pipelines, passing structured output from one to the next.

### Review → Fix Pipeline

```bash
# Step 1: Review and produce findings
/review src/auth/ --focus security

# Step 2: Fix the findings
/run Fix review findings --from-review
```

`/review` writes `workflow/review_report.yaml`. `/run --from-review` reads it and auto-creates work items for each finding. No manual copy-paste needed.

### Design → Build Pipeline

```bash
# Step 1: Design interactively
/designer Authentication system with OAuth2

# Step 2: Build from the design doc
/run Implement auth system --from-designer
```

`/designer` writes `workflow/design_document.yaml`. `/run --from-designer` reads it and uses the design as the implementation spec.

### Org → Team Pipeline (automatic)

When you run `/org`, it automatically:
1. Generates a `strategic_brief.yaml`
2. Calls `/team --brief <path>` per domain

You don't invoke this manually — `/org` orchestrates it internally.

### Optimize → Review Pipeline

```bash
# Optimize first, then validate quality
/optimize src/ --type code --review-after
```

The `--review-after` flag on `/optimize` automatically invokes `/review` after optimization completes, ensuring optimizations didn't introduce regressions.

---

## Session Artifacts Summary

All skills write session artifacts to `Agent_Memory/sessions/{session_id}/`.

| Artifact | Written By | Consumed By |
|----------|-----------|------------|
| `workflow/enriched_context.yaml` | `/run` orchestrator | planner, controller |
| `workflow/plan.yaml` | `/run` planner | controller, executor |
| `workflow/work_items.yaml` | `/run` decomposer | controller, validator |
| `workflow/coordination_log.yaml` | controller | `/run` validator |
| `workflow/validation_report.yaml` | validator | `/run` state machine |
| `workflow/review_report.yaml` | `/review` | `/run --from-review` |
| `workflow/design_document.yaml` | `/designer` | `/run --from-designer` |
| `workflow/optimization_report.yaml` | `/optimize` | user, `/review` |
| `workflow/strategic_brief.yaml` | `/org` CEO | `/team --brief` |
| `workflow/root_cause_analysis.yaml` | `/debug` | user, `/run` |
| `team/task_list.yaml` | `/team` | teammates, lead |
| `Agent_Memory/_projects/*/product_context.yaml` | `/context` | all orchestrators |

---

## Quick Flag Reference

| Skill | Flags |
|-------|-------|
| `/run` | `--dry-run`, `--quiet`, `--team`, `--analytics`, `--from-review`, `--from-designer`, `--resume <id>`, `--brief <path>` |
| `/team` | `--dry-run`, `--waves <n>`, `--members <n>`, `--teammate-mode tmux\|auto\|in-process`, `--no-template` |
| `/org` | `--dry-run`, `--quick`, `--domains <d1,d2>`, `--resume <id>` |
| `/designer` | `--deep`, `--resume <id>`, `--iterate <id>`, `--template <name>`, `--brief <path>` |
| `/review` | `--focus <area>`, `--auto-fix`, `--severity <level>`, `--mode <mode>`, `--profile <name>`, `--baseline`, `--suppress <id>` |
| `/optimize` | `--type <type>`, `--focus performance\|cost\|quality`, `--dry-run`, `--interactive`, `--rollback`, `--history`, `--benchmark auto` |
| `/debug` | `--escalate`, `--phase <1-4>` |
| `/helper` | `--compare`, `--flags <cmd>`, `--examples`, `--quick`, `--topic <topic>`, `--troubleshoot <cmd>` |
| `/context` | `init`, `update`, `show`, `clear` |

---

*For interactive guidance, run `/helper`. For full pipeline architecture, see `CLAUDE.md`. For agent catalog, see `docs/ARCHITECTURE.md`.*
