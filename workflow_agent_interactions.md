# Workflow Agent Interactions

How cAgents executes tasks across 11 domains using universal workflows.

---

## Core Concept

**One workflow architecture, multiple domains.** The same 5 universal agents handle software, creative, business, marketing, sales, finance, operations, planning, HR, legal, and support—by loading domain-specific configurations.

## The Universal Workflow

Every task flows through the same pipeline:

```
User Request
    ↓
┌─────────────────────────────────────────────────────┐
│ TRIGGER (Core Infrastructure)                       │
│ • Parse request & detect domain                     │
│ • Create instruction workspace                      │
│ • Initialize Agent_Memory/{instruction_id}/         │
└─────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────┐
│ UNIVERSAL-ROUTER (Config-Driven)                    │
│ • Load domain config: {domain}/router.yaml          │
│ • Classify complexity: Tier 0-4                     │
│ • Select task template or create custom             │
└─────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────┐
│ UNIVERSAL-PLANNER (Config-Driven)                   │
│ • Load domain config: {domain}/planner.yaml         │
│ • Decompose into domain-appropriate tasks           │
│ • Assign to domain team agents                      │
│ • Define acceptance criteria                        │
└─────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────┐
│ UNIVERSAL-EXECUTOR (Config-Driven)                  │
│ • Load domain config: {domain}/executor.yaml        │
│ • Spawn team agents via Task tool                   │
│ • Execute tasks in dependency order                 │
│ • Up to 50 agents in parallel                       │
└─────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────┐
│ UNIVERSAL-VALIDATOR (Config-Driven)                 │
│ • Load domain config: {domain}/validator.yaml       │
│ • Check acceptance criteria                         │
│ • Run domain-specific quality gates                 │
│ • Result: PASS | FIXABLE | BLOCKED                  │
└─────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────┐
│ UNIVERSAL-SELF-CORRECT (If FIXABLE)                 │
│ • Load domain config: {domain}/self-correct.yaml    │
│ • Attempt automated fixes                           │
│ • Re-run validator                                  │
└─────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────┐
│ HITL (If BLOCKED) | ORCHESTRATOR (If PASS)          │
│ • HITL: Escalate to human decision-maker            │
│ • Orchestrator: Archive & extract learnings         │
└─────────────────────────────────────────────────────┘
    ↓
Complete
```

---

## How It Works: Three Examples

### Example 1: Software - Fix Authentication Bug (Tier 2)

**User Request**: "Fix the login bug where users can't authenticate"

**Domain**: Software
**Tier**: 2 (Moderate)

**Flow**:

1. **Trigger** → Detects "software" domain, creates `inst_20260112_001/`
2. **Universal-Router** → Loads `software/router.yaml`, classifies Tier 2
3. **Universal-Planner** → Loads `software/planner.yaml`, creates tasks:
   - Investigate auth flow
   - Identify bug root cause
   - Implement fix
   - Write tests
   - Run test suite
4. **Universal-Executor** → Loads `software/executor.yaml`, spawns:
   - `backend-developer` → Investigates, finds JWT validation error
   - `backend-developer` → Fixes token validation logic
   - `backend-developer` → Writes unit tests
   - `qa-lead` → Runs full test suite (parallel)
5. **Universal-Validator** → Loads `software/validator.yaml`:
   - ✓ Bug fixed
   - ✓ Tests passing (98% coverage)
   - ✓ No security regressions
   - **Result**: PASS
6. **Orchestrator** → Archives to `Agent_Memory/_archive/`, extracts learnings

**Agents Used**: backend-developer (3 tasks), qa-lead (1 task)
**Duration**: ~8 minutes
**Output**: Fixed code, passing tests, validation report

---

### Example 2: Creative - Write Novel Chapter (Tier 3)

**User Request**: "Write Chapter 3 where the protagonist discovers the hidden truth"

**Domain**: Creative
**Tier**: 3 (Complex)

**Flow**:

1. **Trigger** → Detects "creative" domain, creates `inst_20260112_002/`
2. **Universal-Router** → Loads `creative/router.yaml`, classifies Tier 3
3. **Universal-Planner** → Loads `creative/planner.yaml`, creates tasks:
   - Review story arc and character state
   - Design revelation scene
   - Write chapter draft
   - Edit for pacing and emotion
   - Continuity check
4. **Universal-Executor** → Loads `creative/executor.yaml`, spawns:
   - `story-architect` → Reviews arc, designs revelation (sequential)
   - `prose-stylist` → Writes 3,500-word draft (sequential)
   - `editor` → Refines pacing, dialogue, tension (sequential)
   - `continuity-checker` → Validates timeline, character consistency (parallel)
5. **Universal-Validator** → Loads `creative/validator.yaml`:
   - ✓ Advances plot meaningfully
   - ✓ Character voice consistent
   - ✓ No continuity errors
   - ✓ Emotional impact achieved
   - **Result**: PASS
6. **Orchestrator** → Archives chapter, updates story knowledge base

**Agents Used**: story-architect, prose-stylist, editor, continuity-checker
**Duration**: ~25 minutes
**Output**: Polished chapter (3,500 words), continuity report

---

### Example 3: Marketing - Q1 Campaign Plan (Tier 4)

**User Request**: "Design comprehensive Q1 product launch campaign with multi-channel strategy"

**Domain**: Marketing
**Tier**: 4 (Expert - requires leadership oversight)

**Flow**:

1. **Trigger** → Detects "marketing" domain, creates `inst_20260112_003/`
2. **Universal-Router** → Loads `marketing/router.yaml`, classifies Tier 4
3. **Universal-Planner** → Loads `marketing/planner.yaml`, consults intelligence:
   - `predictive-analyst` → Forecasts campaign performance (parallel)
   - `risk-assessment` → Identifies budget, timing, competitive risks (parallel)
   - Creates 15 tasks across strategy, creative, media, analytics
4. **Universal-Executor** → Loads `marketing/executor.yaml`, spawns in waves:
   - **Wave 1** (Leadership):
     - `cmo` → Defines strategic positioning, budget ($250K), goals
     - `product-marketing-manager` → Develops messaging framework
   - **Wave 2** (Planning - Parallel):
     - `marketing-strategist` → Multi-channel strategy
     - `demand-generation-manager` → Lead gen plan
     - `content-marketing-manager` → Content calendar
     - `digital-marketing-manager` → Paid media plan
   - **Wave 3** (Execution - Parallel):
     - `creative-director` → Campaign creative concepts
     - `copywriter` → Ad copy, landing pages
     - `email-marketing-specialist` → Email sequences
     - `social-media-manager` → Social content plan
     - `events-manager` → Launch event design
   - **Wave 4** (Analytics):
     - `marketing-analyst` → Tracking dashboards, attribution model
5. **Universal-Validator** → Loads `marketing/validator.yaml`, spawns QA:
   - `marketing-operations-manager` → Reviews feasibility, tech stack (parallel)
   - `brand-manager` → Validates brand consistency (parallel)
   - `marketing-data-analyst` → Validates metrics framework (parallel)
   - **Result**: FIXABLE (budget exceeds approval threshold)
6. **Universal-Self-Correct** → Loads `marketing/self-correct.yaml`:
   - Re-engages `cmo` → Optimizes budget to $225K, adjusts paid media
   - Re-runs validator → **Result**: PASS with CMO approval
7. **HITL** → Escalates final approval to human (Tier 4 requirement)
8. **Orchestrator** → Archives complete campaign plan, updates marketing patterns

**Agents Used**: 14 agents (1 leadership, 3 planning, 5 execution, 2 creative, 3 QA)
**Duration**: ~45 minutes
**Output**: Complete campaign plan, creative brief, media plan, content calendar, tracking framework, budget breakdown

---

## Key Principles

### 1. Config-Driven Domain Adaptation

Universal agents load domain-specific configs:

```
Agent_Memory/_system/domains/
├── software/
│   ├── router.yaml      # Tier rules: "bug fix" → Tier 1-2
│   ├── planner.yaml     # Task templates: test-driven workflow
│   ├── executor.yaml    # Team: backend-dev, frontend-dev, qa
│   ├── validator.yaml   # Gates: tests pass, no regressions
│   └── self-correct.yaml
├── creative/
│   ├── router.yaml      # Tier rules: "write chapter" → Tier 2-3
│   ├── planner.yaml     # Task templates: draft → edit → polish
│   ├── executor.yaml    # Team: prose-stylist, editor, continuity
│   ├── validator.yaml   # Gates: plot coherent, voice consistent
│   └── self-correct.yaml
└── marketing/
    ├── router.yaml      # Tier rules: "campaign" → Tier 3-4
    ├── planner.yaml     # Task templates: strategy → creative → media
    ├── executor.yaml    # Team: CMO, strategist, creative, media
    ├── validator.yaml   # Gates: on-brand, feasible, measurable
    └── self-correct.yaml
```

### 2. Subagent Spawning Pattern

Executors **never execute directly**—they spawn specialists:

```python
# Universal-Executor reads executor.yaml for domain
config = load_config(f"{domain}/executor.yaml")

for task in pending_tasks:
    agent = config.get_agent_for_task(task.type)
    result = spawn_agent(agent, task)  # Uses Task tool
```

Benefits:
- **Modularity**: Swap agents without changing workflow
- **Parallelization**: Up to 50 concurrent agents
- **Specialization**: Right expert for each task
- **Reusability**: Same agents across workflows

### 3. Complexity Tiers

| Tier | Type | Example | Workflow |
|------|------|---------|----------|
| 0 | Trivial | "What is X?" | Direct answer, no workflow |
| 1 | Simple | "Fix typo" | Execute → Validate |
| 2 | Moderate | "Fix bug", "Write chapter" | Plan → Execute → Validate |
| 3 | Complex | "Add feature", "Campaign plan" | Plan → Parallel execution → Validate |
| 4 | Expert | "Architecture design", "Major launch" | Full orchestration + HITL approval |

### 4. Validation Outcomes

| Outcome | Meaning | Next Step |
|---------|---------|-----------|
| **PASS** | Meets all criteria | Complete |
| **FIXABLE** | Issues can be auto-corrected | Self-Correct → Re-validate |
| **BLOCKED** | Requires human decision | HITL escalation |

---

## Special Workflows

### Reviewer (Enhanced Code Review)

**Shortcut**: Bypasses trigger/router, directly spawns QA agents.

```
/reviewer src/ --focus security
    ↓
┌─────────────────────────────────────────────────────┐
│ REVIEWER AGENT (Intelligent Selection)              │
│ • Analyzes codebase (127 files, 15K lines)          │
│ • Selects relevant QA agents (not all 9)            │
│ • Spawns in parallel:                               │
│   - security-analyst                                │
│   - code-standards-auditor                          │
│   - dependency-auditor                              │
│   - performance-analyzer                            │
└─────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────┐
│ AGGREGATION                                         │
│ • Deduplicates findings                             │
│ • Prioritizes by severity (CRITICAL → LOW)          │
│ • Generates actionable report                       │
└─────────────────────────────────────────────────────┘
```

**Duration**: ~12 minutes (vs. ~45 for full workflow)
**Use Case**: Tactical review without strategic planning overhead

### Optimizer (Universal Optimization)

**Shortcut**: Direct optimization without full workflow.

```
/optimize src/ --type code --focus performance
    ↓
┌─────────────────────────────────────────────────────┐
│ OPTIMIZER AGENT                                     │
│ 1. Baseline measurement                             │
│ 2. Multi-dimensional analysis (8 types)             │
│ 3. Auto-apply safe optimizations                    │
│ 4. Re-measure impact                                │
│ 5. Generate report                                  │
└─────────────────────────────────────────────────────┘
```

**Types**: code, content, process, data, infrastructure, campaign, creative, sales
**Duration**: ~15 minutes
**Use Case**: Focused optimization without planning/validation overhead

---

## Intelligence Layer (Proactive Agents)

Five agents provide predictive insights to Router/Planner:

| Agent | Function | When Used |
|-------|----------|-----------|
| **pattern-recognition** | Identifies recurring patterns, suggests proven solutions | Planning phase (all tiers) |
| **risk-assessment** | Predicts failure points, security risks, bottlenecks | Planning phase (Tier 2-4) |
| **dependency-analyzer** | Maps dependencies, optimizes execution order | Planning phase (Tier 3-4) |
| **predictive-analyst** | Forecasts issues using historical data | Planning phase (Tier 3-4) |
| **learning-coordinator** | Tracks outcomes, updates calibration | Post-completion (all tiers) |

**Usage Pattern**:
```
Planner → Consults pattern-recognition + risk-assessment
       → Incorporates insights into task plan
       → Better upfront planning, fewer mid-flight corrections
```

---

## QA Layer (9 Specialized Agents)

Validator can spawn domain-specific QA agents:

| Agent | Focus | Typical Domains |
|-------|-------|-----------------|
| architecture-reviewer | System design, patterns | Software, Data |
| code-standards-auditor | Style, conventions | Software |
| security-analyst | Vulnerabilities, OWASP | Software, Finance, Legal |
| qa-compliance-officer | Regulatory compliance | Finance, HR, Legal |
| performance-analyzer | Speed, memory, scalability | Software, Marketing |
| test-coverage-validator | Test gaps | Software |
| documentation-reviewer | Doc completeness | All domains |
| dependency-auditor | Supply chain risks | Software, Operations |
| accessibility-checker | WCAG compliance | Software, Marketing |

**Intelligent Selection**: Reviewer only spawns relevant agents (30-50% faster).

---

## Execution Modes

| Mode | Description | Use Case | Max Agents |
|------|-------------|----------|------------|
| **Sequential** | One task at a time | Dependencies, low complexity | 1 |
| **Pipeline** | Streaming execution | Moderate dependencies | 5-10 |
| **Swarm** | Fully parallel | Independent tasks, high volume | 50 |
| **Mesh** | Hybrid parallel + coordination | Complex workflows | 20-30 |

**Auto-Selected**: Executor chooses mode based on task dependencies and tier.

---

## Agent Memory Structure

Every workflow creates persistent state:

```
Agent_Memory/
├── _system/              # Infrastructure
│   ├── registry.yaml     # All active instructions
│   ├── domains/          # Domain configs (5 files × 11 domains)
│   └── config/           # Reviewer, optimizer configs
├── _knowledge/           # Learning layer
│   ├── patterns/         # Proven solutions
│   ├── calibration/      # Historical accuracy
│   └── learnings/        # Extracted insights
├── _archive/             # Completed workflows
└── inst_20260112_001/    # Active instruction
    ├── instruction.yaml  # Original request
    ├── status.yaml       # Current phase
    ├── workflow/
    │   └── plan.yaml     # Task breakdown
    ├── tasks/
    │   ├── pending/
    │   ├── in_progress/
    │   └── completed/
    ├── decisions/
    │   └── router.yaml   # Tier classification
    └── outputs/
        └── final/        # Deliverables
```

**Pause/Resume**: Any workflow can stop and restart from Agent_Memory state.

---

## Performance

| Metric | Result | Context |
|--------|--------|---------|
| **Parallel Execution** | 50x speedup | Swarm mode vs. sequential |
| **Context Reduction** | 30-50% | Agent optimization (v6.4.0) |
| **Reviewer Speed** | 81% faster | Critical findings (intelligent selection) |
| **Actionable Findings** | 98% improvement | Auto-fix suggestions |
| **Pattern Detection** | 78% accuracy | Cross-workflow learning |

---

## Summary

**cAgents = One universal workflow × 11 domain configs × 228 specialized agents**

- **Universal**: Same 5 workflow agents handle all domains
- **Config-Driven**: Domains customize via YAML, not code
- **Subagent Pattern**: Executors spawn specialists, don't execute
- **Scalable**: Up to 50 concurrent agents
- **Intelligent**: Predictive insights, auto-correction, learning
- **Persistent**: Full state in Agent_Memory for pause/resume

**Result**: Any request, any domain, fully automated end-to-end execution.
