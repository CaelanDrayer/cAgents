# cAgents Commands Reference

Comprehensive reference for all cAgents universal commands.

> **Migration Note** (current as of v12.6.0):
> - `/review`, `/optimize`, `/context`, `/debug` were removed in V11.0.0.
> - `/improve` was folded into `/run` via the first-word keyword router in v12.1.2: use `/run review`, `/run optimize`, or `/run improve` (equivalent to `/run --mode review|optimize|full`); `/run context <subcmd>` for product context; `/run --mode debug <request>` for systematic debugging.
> - `/org` was removed in v12.2.0 and absorbed into `/team` strategic mode (auto-enables when `router.domain_count >= 2`; override with `--strategic` / `--no-strategic`).
>
> See [docs/MIGRATION-V11.md](MIGRATION-V11.md) for the V10→V11 migration baseline and CHANGELOG entries v12.1.2 / v12.2.0 for the v12 follow-ups.

## /designer - Interactive Design Engine

**Status**: Production-Ready (V2.0)
**Domains**: All (Software, Creative, Business)
**Complexity**: Universal (adapts to any domain)

### Overview

Structured design engine that transforms vague ideas into comprehensive, implementation-ready design documents through a 4-phase workflow with artifact generation, pattern recommendations, and 4-level validation.

### What's New in V2.0

- **4-Phase Structured Workflow**: Discovery → Ideation → Refinement → Specification
- **Artifact Generation**: Auto-generate user stories, tech specs, mermaid diagrams, implementation checklists
- **Pattern Recommendations**: Proven design patterns from library recommended during ideation
- **4-Level Validation**: Completeness, consistency, feasibility, quality checks with scores
- **Real-Time Design Building**: Watch the design document form as you answer questions
- **Template Library**: 6 pre-built templates (product feature, UI/UX, system architecture, API, business process, creative content)
- **Phase Quality Gates**: Enforced checks before phase transitions - no gaps allowed
- **Auto-Build Integration**: Automatically triggers `/run` when design is complete

### Usage

```bash
/designer                              # Start fresh design session
/designer [topic]                      # Start with a specific topic
/designer --resume {id}                # Resume previous session
/designer --template product-feature   # Start with template
/designer --focus technical            # Focus on specific areas
/designer --detail high                # Comprehensive detail level
```

### How It Works

```
Phase 1: Discovery (15%)
   ├─> Opening question + domain detection
   ├─> Context discovery (search codebase for software projects)
   ├─> Domain-specific questions (from chunk templates)
   ├─> Template offer (if matches a known pattern)
   ├─> Phase gate: problem, stakeholders, constraints, success criteria
   └─> Synthesis confirmation

Phase 2: Ideation (25%)
   ├─> Generate 2-4 solution alternatives (pattern-informed)
   ├─> Trade-off exploration for key decisions
   ├─> Pattern recommendations from design pattern library
   ├─> Phase gate: 2+ alternatives explored, approach selected with rationale
   └─> Selection confirmation

Phase 3: Refinement (35%)
   ├─> Domain-specific detailing (architecture, flows, data model, etc.)
   ├─> Real-time design building with progress display
   ├─> Mermaid diagram generation (architecture, sequence, ERD, flow)
   ├─> Phase gate: all major design questions answered, diagrams generated
   └─> Edge cases and error handling

Phase 4: Specification (25%)
   ├─> Auto-generate artifacts (user stories, specs, diagrams, checklists)
   ├─> 4-level validation (completeness, consistency, feasibility, quality)
   ├─> Design document assembly
   └─> Build offer → auto-trigger /run
```

### Key Features

#### 1. 4-Phase Structured Workflow

Each phase has a specific goal, quality gate, and natural transition:

| Phase | Goal | Questions | Gate |
|-------|------|-----------|------|
| Discovery | Understand problem | 5-7 | Problem + stakeholders + constraints defined |
| Ideation | Select approach | 4-6 | 2+ alternatives explored, one selected |
| Refinement | Detail design | 8-15 | Architecture + data model + flows complete |
| Specification | Generate artifacts | 2-4 | Artifacts generated, validation passed |

#### 2. Pattern Recommendations

During ideation, /designer recommends proven design patterns from the library:

```
For authentication, I recommend "JWT with Refresh Token Rotation":
- Short-lived access tokens (15min)
- Rotating refresh tokens (7 days)
- httpOnly cookies for storage

This is proven by Auth0, Supabase, and similar services.
```

Pattern categories: Authentication, Architecture, Data, Integration, Product, Business Process, Creative Content.

#### 3. Artifact Generation

In the specification phase, /designer auto-generates:

**Software**: User stories (with acceptance criteria), technical specs, mermaid diagrams (architecture, sequence, ERD), implementation checklists
**Business**: Process flow documents, RACI matrices, implementation roadmaps, risk registers
**Creative**: Story bibles, character sheets, plot outlines, world bibles, style guides

#### 4. 4-Level Validation

Before finalizing, every design is validated:

| Level | Checks | Example |
|-------|--------|---------|
| Completeness | All critical areas covered | Problem statement exists, stakeholders identified |
| Consistency | No contradictions | Scale requirements match architecture choice |
| Feasibility | Realistic and implementable | Timeline fits scope, team can deliver |
| Quality | Best practices followed | Security addressed, testing planned |

Scores from 0.0 to 1.0 with overall assessment.

#### 5. Real-Time Design Building

During refinement, the design document forms in real-time:

```
Design Progress: Phase 3 - Refinement

  [x] Technical Architecture (Complete)
  [x] Data Model (Complete)
  [ ] User Flows (In Progress - 2/4 flows)
  [ ] Security (Pending)

Latest addition:
  ## Data Model
  [mermaid ERD diagram]
```

#### 6. Context Discovery (Software Projects)

Automatically discovers project context:
- Language/framework from package files
- Architecture pattern (monorepo, microservices, monolith)
- Key modules (auth, checkout, user management, etc.)
- Tech stack (frontend, backend, database, infrastructure)

#### 7. Expertise Adaptation

Questions adapt to user's expertise level:
- **Beginner**: "What programming language would you like to use?"
- **Expert**: "What's your current tech stack, and are there any constraints?"

Detects within 2-3 exchanges and adapts accordingly.

#### 8. Template Library

6 pre-built templates for common design scenarios:

1. **Product Feature** - Features with user stories and flows
2. **UI/UX Design** - Interfaces with wireframes and interactions
3. **System Architecture** - Full architecture from requirements to deployment
4. **API Design** - REST/GraphQL with OpenAPI specs
5. **Business Process** - Workflows with BPMN-style diagrams
6. **Creative Content** - Stories, novels, screenplays

#### 9. Long Session Resilience

Sessions survive context compaction and can resume from any point:

- **Incremental saves**: Phase files written to disk as each phase completes
- **Context monitoring**: After 20 questions, enters context-conscious mode (shorter summaries, immediate writes)
- **Document splitting**: Large designs auto-split into per-feature/per-component files
- **Phase checkpoints**: Waypoint files created at every phase transition with resume instructions
- **Assembly, not rebuild**: Final document assembled from phase files on disk

### Session Files

```
cagents-memory/sessions/designer_20260204_143022/
├── session.yaml                    # Master state (updated per question)
├── qa_log.yaml                     # Active phase Q&A only (completed phases summarized)
├── phases/                         # Phase outputs (written at completion)
│   ├── 01_discovery.md
│   ├── 02_ideation.md
│   ├── 03_refinement.md
│   └── 04_specification.md
├── artifacts/                      # Individual artifact files
│   ├── user_stories.md
│   ├── technical_spec.md
│   ├── implementation_checklist.md
│   └── diagrams/*.mermaid
├── waypoints/                      # Phase transition checkpoints
├── design_document.md              # Final assembled document (or index)
└── validation/
    └── validation_report.yaml
```

### Integration with /run

When user selects "Build it now", /designer automatically triggers:

```
Skill({skill: "run", args: "implement design from designer_20260204_143022"})
```

The /run workflow receives the full design document with all decisions, constraints, patterns, and artifacts as implementation context.

### Tips for Best Results

1. **Be specific in first answer**: Helps domain detection and context discovery
2. **Trust the phases**: Discovery → Ideation → Refinement → Specification
3. **Review synthesis points**: Confirm understanding before moving forward
4. **Explore alternatives**: The ideation phase is where you avoid bad decisions
5. **Look at validation scores**: They catch real issues in your design
6. **Use templates**: They ensure comprehensive coverage of important areas
7. **Let it build**: Transition directly to /run when design is complete

---

## /run - Universal Entry Point

**Status**: Production-Ready
**Domains**: All
**Complexity**: Tier 2-4 (auto-detected, minimum tier 2 enforced)

### Overview

Universal entry point that automatically routes requests to appropriate domain, creates objectives-based plan, coordinates controller-based execution, and validates results.

### Usage

```bash
/run [your request]                # Any task in any domain
/run Fix auth bug                  # → Engineering domain (tier 2)
/run Write fantasy story           # → Creative domain (tier 2)
/run Plan Q4 campaign              # → Revenue domain (tier 3)
/run Create budget                 # → Finance-Operations (tier 4)
```

### Workflow Phases

1. **Routing**: Classify complexity tier (2-4), detect domain, set requirements
2. **Planning**: Create objectives (not detailed tasks), select controller
3. **Coordinating**: Controller uses question-based delegation to specialists
4. **Executing**: Execute implementation with controller coordination
5. **Validating**: Ensure all success criteria met

See CLAUDE.md for complete /run documentation.

---

## /run review|optimize|improve — Review and Optimization Modes (v12.1.2+)

**Status**: Folded into `/run` via keyword router (v12.1.2)
**Predecessor**: standalone `/improve` skill (V11.0.0–v12.1.1); itself replaced `/review` + `/optimize` (V11.0.0)

### Overview

Quality review and measurable optimization run inside `/run` via the first-word keyword router introduced in v12.1.2. Mode selection via the keyword (`review`/`audit`/`optimize`/`improve`) — or explicitly via `--mode review|optimize|full` — drives whether the engine reports findings, applies improvements, or chains both with a single baseline.

### Usage

```bash
/run review src/                       # Find issues, no fixes
/run audit src/                        # Alias for review
/run optimize src/                     # Apply improvements with metrics
/run improve src/                      # Review + optimize chained (= --mode full)
/run review src/ --baseline            # Establish review baseline
/run review src/ --suppress            # Suppress baselined findings
/run optimize src/ --benchmark         # Capture before/after benchmark
```

### Modes

| Mode | Keyword Trigger | What It Does | When to Use |
|------|-----------------|--------------|-------------|
| `review` | `review`, `audit` | Detect findings, report severity, suggest fixes | Pre-merge audit, security scan, content QA |
| `optimize` | `optimize` | Apply improvements atomically with before/after metrics | Performance tuning, refactoring, cost reduction |
| `full` | `improve` | Review + optimize chained with one baseline and unified report | End-to-end quality pipeline |

### Key Flags

- `--mode review|optimize|full` — explicit mode override (keyword router selects automatically)
- `--scope <path>` — restrict scope
- `--baseline` — record current findings as the baseline
- `--suppress` — suppress baselined findings on subsequent runs
- `--benchmark` — capture before/after benchmark numbers (perf, size, cost)
- `--dry-run` — preview plan without applying
- `--focus security|performance|quality` — focus area
- `--auto-fix safe` — apply only SAFE-tier fixes automatically

### Pattern Effectiveness Tracking

The improve modes track predicted vs. actual impact for each pattern applied. Over time the engine boosts patterns that consistently deliver and demotes ones that do not. Atomic rollback is preserved: every change is git-snapshotted, and any failed quality gate triggers automatic revert.

See [.claude/skills/run/reference/improve-mode.md](../.claude/skills/run/reference/improve-mode.md) for the full keyword-router contract and flag list.

---

## Command Comparison

| Command | Purpose | Duration | Interaction | Output |
|---------|---------|----------|-------------|--------|
| **/designer** | Structured design | 15-45 min | 4-phase Q&A | Design doc + artifacts + diagrams + validation |
| **/run** | Implementation (incl. review/optimize/improve modes) | Varies | Autonomous | Working implementation, findings, fixes, before/after metrics |

---

## Getting Help

- **Full Architecture**: See `CLAUDE.md` for complete system documentation
- **Getting Started**: See `docs/GETTING_STARTED.md` for quick start guide
- **Architecture**: See `docs/ARCHITECTURE.md` for architecture design
- **V11 Migration**: See [docs/MIGRATION-V11.md](MIGRATION-V11.md) for `/review`, `/optimize`, `/context`, `/debug` replacements. (v12.1.2 further folded `/improve` into `/run`; v12.2.0 folded `/org` into `/team` strategic mode — see CHANGELOG entries for the v12 migrations.)

---

**Commands**: /run, /designer, /team, /helper (v12.2.0+). `/improve` was folded into `/run` in v12.1.2; `/org` was removed in v12.2.0 and absorbed into `/team` strategic mode.
**Last Updated**: 2026-05-22
