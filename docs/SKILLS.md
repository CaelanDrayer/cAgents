# cAgents Skills Reference

Comprehensive reference for all cAgents skills (formerly commands). V9.0 migrated commands to `.claude/skills/` format with proper SKILL.md frontmatter, context forking, and reference file splitting.

**Skill Location**: `.claude/skills/{name}/SKILL.md` + `reference/`

| Skill | Context | Agent | Lines | Ref Files |
|-------|---------|-------|-------|-----------|
| `/run` | fork | true | 391 | 3 |
| `/team` | fork | true | 181 | 3 |
| `/designer` | none | false | 160 | 7 |
| `/review` | fork | true | 177 | 6 |
| `/optimize` | fork | true | 160 | 6 |
| `/helper` | none | false | 265 | 6 |

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
Agent_Memory/sessions/designer_20260204_143022/
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

## /review - Enhanced Review System

**Status**: Production-Ready
**Domains**: Software, Docs, Content, Design, Process, Data, Infrastructure
**Complexity**: Tier 2

### Overview

Universal review system with intelligent agent selection, severity-based reporting, auto-fix suggestions, and pattern learning.

### Usage

```bash
/review                         # Review current directory
/review src/                    # Review specific path
/review --focus security        # Security-focused review
```

### Key Features

- **30-50% faster** (intelligent agent selection)
- **81% faster** to critical issues (severity-based early reporting)
- **98% more actionable** (auto-fix suggestions included)
- **78% pattern detection** (learns from previous reviews)

See CLAUDE.md for complete /review documentation.

---

## /optimize - Universal Optimizer

**Status**: Production-Ready
**Optimization Types**: 8 types (code, content, process, data, infrastructure, campaign, creative, sales)
**Complexity**: Tier 2-4

### Overview

Universal 5-phase optimization engine that detects opportunities, measures baselines, plans approach, executes changes atomically with rollback, and validates results with before/after metrics. Supports 8 optimization types across all domains with cross-file analysis, parallel execution, and ML-ready pattern learning.

### Usage

```bash
/optimize                              # Auto-detect and optimize
/optimize "Make the app faster"        # Natural language goal
/optimize --interactive                # Ask preferences via AskUserQuestion
/optimize src/ --type code             # Specific target and type
/optimize --dry-run                    # Preview without applying
/optimize --type content blog/         # Content optimization
/optimize --plan-only                  # Generate plan, trigger /run
/optimize --cross-file                 # Cross-file dependency analysis
```

### 5-Phase Workflow

```
Detection → Analysis → Planning → Execution → Validation
   ↓          ↓          ↓          ↓           ↓
 Type/    Baseline +   ROI +     Atomic +    Before/
 Intent   Opportunities  Groups   Rollback   After Metrics
```

### Key Features

1. **5-Phase Structured Workflow**: Detection → Analysis → Planning → Execution → Validation
2. **8 Optimization Types**: Code, content, process, infrastructure, data, campaign, creative, sales
3. **Atomic Execution**: Git snapshot before every change, automatic rollback on failure
4. **Cross-File Analysis**: Dependency graphs, data flow analysis, architectural patterns, performance propagation
5. **Risk Classification**: 5 levels (SAFE/LOW/MEDIUM/HIGH/CRITICAL) with appropriate auto-apply thresholds
6. **Parallel Execution**: Independent optimizations run simultaneously for 3-10x speedup
7. **Baseline Measurement**: Quantified before/after metrics for every optimization
8. **Quality Gates**: Tests pass, no new lint errors, performance improved, bundle size maintained
9. **Session Resilience**: Incremental saves, phase checkpoints, context monitoring, resume capability
10. **ML-Ready Learning**: Track predicted vs actual impact, update pattern accuracy over time
11. **Plugin Integration**: Auto-trigger `/run` for CRITICAL optimizations, `/designer` for exploration, `/review` for post-check

### Session Files

```
Agent_Memory/sessions/optimize_{YYYYMMDD_HHMMSS}/
├── status.yaml                    # Current phase + history
├── task_plan.md                   # Three-file pattern: work items
├── findings.md                    # Three-file pattern: discoveries
├── progress.md                    # Three-file pattern: status/resume
├── workflow/
│   ├── detection_report.yaml      # Phase 1 output
│   ├── baseline_metrics.yaml      # Phase 2 baseline
│   ├── opportunities.yaml         # Phase 2 opportunities
│   ├── cross_file_analysis.yaml   # Phase 2 cross-file (if enabled)
│   ├── plan.yaml                  # Phase 3 plan
│   ├── execution_summary.yaml     # Phase 4 results
│   └── coordination_log.yaml      # Controller Q&A
├── optimizations/{opt_id}/        # Per-optimization snapshots + results
├── waypoints/                     # Phase transition checkpoints
├── outputs/optimization_report.md # Final report
└── validation/validation_report.yaml
```

See `core/commands/optimize.md` for complete documentation.

---

## /helper - Interactive Command Guide

**Status**: Production-Ready
**Domains**: Meta (covers all commands)
**Complexity**: N/A (informational only)

### Overview

Interactive command guide that explains cAgents skills and recommends the right command for the user's needs. Provides detailed command explanations, usage examples, comparison tables, flag references, and guided recommendations through natural language intent classification.

### Usage

```bash
/helper                        # Full interactive guide with all commands
/helper run                    # Deep dive into /run command
/helper designer               # Deep dive into /designer command
/helper review                 # Deep dive into /review command
/helper optimize               # Deep dive into /optimize command
/helper team                   # Deep dive into /team command
/helper how do I fix a bug     # Natural language recommendation
/helper --compare              # Side-by-side comparison of all commands
/helper --flags review         # Complete flag reference for /review
/helper --examples             # Real-world usage examples by domain
/helper --quick                # One-screen quick reference card
/helper --topic domains        # Deep dive: the 5 super-domains
/helper --topic workflow       # Deep dive: agent orchestration
/helper --topic tiers          # Deep dive: complexity tiers
/helper --topic teams          # Deep dive: team mode
/helper --topic sessions       # Deep dive: session management
```

### Key Features

1. **8 Modes**: Full guide, specific command, natural language, comparison, flags, examples, quick reference, topic deep dive
2. **Intent Classification**: Analyzes natural language to recommend the right command
3. **Copy-Paste Examples**: All examples can be copied and used directly
4. **Integration Awareness**: Shows how commands work together in pipelines
5. **Non-Executing**: Explains and recommends only -- never executes commands

### Session Files

None -- `/helper` is informational only and does not create sessions.

---

## Command Comparison

| Command | Purpose | Duration | Interaction | Output |
|---------|---------|----------|-------------|--------|
| **/designer** | Structured design | 15-45 min | 4-phase Q&A | Design doc + artifacts + diagrams + validation |
| **/run** | Implementation | Varies | Autonomous | Working implementation |
| **/review** | Quality review | 3-10 min | Autonomous | Issue report + fixes |
| **/optimize** | Universal optimization | 5-20 min | Autonomous (or interactive) | Before/after metrics + optimized output |
| **/team** | Parallel execution | Varies (40-60% faster) | Autonomous | Aggregated parallel results |
| **/helper** | Command guidance | Instant | Informational | Recommendations + explanations |

---

## Getting Help

- **Command Guide**: Use `/helper` for interactive command guidance
- **Full Architecture**: See `CLAUDE.md` for complete system documentation
- **Getting Started**: See `docs/GETTING_STARTED.md` for quick start guide
- **Architecture**: See `docs/ARCHITECTURE.md` for architecture design

---

**Commands**: /run, /designer, /review, /optimize, /team, /helper
**Last Updated**: 2026-02-07
