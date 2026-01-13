# CLAUDE.md

Core architecture and development guidance for cAgents V5.0.

## Documentation Structure

- `CLAUDE.md` - Architecture, commands, agents (this file)
- `README.md` - Quick start
- `docs/` - Project documentation (implementation guides, summaries, standards)
- `archive/docs/` - Historical documentation (local only)
- `Agent_Memory/` - Runtime state (excluded from git)

**Project Documentation** (in `docs/`):
- `AGENT_OPTIMIZATION_INSTRUCTION.md` - Agent optimization guidelines
- `CONTEXT_MANAGEMENT.md` - Context handling and token management
- `DOCUMENTATION_STANDARDS.md` - Documentation best practices
- `OPTIMIZATION_PROGRESS.md` - Optimization tracking and progress
- `TASK_COMPLETION_ENFORCEMENT_SUMMARY.md` - Task completion protocol summary
- `TASK_CONSOLIDATION.md` - Task consolidation strategies
- `TOKEN_MIGRATION_SUMMARY.md` - Token optimization migration details
- `WORKFLOW_EVALUATION_FIXES.md` - Workflow issue resolutions
- `V5_ARCHITECTURE.md` - V5.0 architecture design (NEW)
- `V5_MIGRATION_GUIDE.md` - V4.0 to V5.0 migration guide (NEW)
- `V5_WORKFLOW_EXAMPLES.md` - Tier 2, 3, 4 reference implementations (NEW)

**Root Documentation** (exceptions):
- `workflow_agent_interactions.md` - Agent interaction patterns (referenced throughout)

## Memory Management

**Claude Code Memory Hierarchy**: cAgents leverages Claude Code's 5-tier memory system for flexible, scalable configuration.

### Memory Types

| Memory Type | Location | Purpose | Shared With | Use in cAgents |
|-------------|----------|---------|-------------|----------------|
| **Enterprise** | `/Library/Application Support/ClaudeCode/CLAUDE.md` (macOS)<br>`/etc/claude-code/CLAUDE.md` (Linux)<br>`C:\Program Files\ClaudeCode\CLAUDE.md` (Windows) | Organization-wide standards | All users | Company coding standards, security policies, compliance |
| **Project** | `./CLAUDE.md` | Team-shared instructions | Team via git | Architecture, workflow, commands (this file) |
| **Project Rules** | `./.claude/rules/*.md` | Modular topic-specific rules | Team via git | Domain-specific guidelines, agent patterns |
| **User** | `~/.claude/CLAUDE.md` | Personal preferences (all projects) | Just you | Code style, personal shortcuts |
| **Project Local** | `./CLAUDE.local.md` | Personal project preferences | Just you | Local URLs, test data, dev preferences |

**Loading Order**: Enterprise → User → Project → Project Rules → Project Local (later = higher priority)

### Project Rules Structure

**Modular Rules** (`.claude/rules/`): Organize instructions into focused topic files instead of one large CLAUDE.md.

```
cAgents/
├── .claude/
│   ├── CLAUDE.md                    # This file (main project memory)
│   └── rules/
│       ├── core/
│       │   ├── orchestration.md     # Workflow orchestration patterns
│       │   ├── controllers.md       # Controller coordination guidelines
│       │   └── execution.md         # Execution agent patterns
│       ├── domains/
│       │   ├── engineering.md       # Engineering domain specifics
│       │   ├── revenue.md           # Revenue domain specifics
│       │   └── creative.md          # Creative domain specifics
│       ├── memory/
│       │   ├── agent-memory.md      # Agent_Memory/ structure and usage
│       │   └── context-mgmt.md      # Context handling best practices
│       └── quality/
│           ├── testing.md           # Testing conventions
│           ├── validation.md        # Validation requirements
│           └── completion.md        # Task completion protocol
└── CLAUDE.local.md                  # Your local preferences (git-ignored)
```

**Path-Specific Rules**: Rules can apply conditionally using YAML frontmatter:

```markdown
---
paths:
  - "core/agents/**/*.md"
  - "shared/agents/**/*.md"
---

# Agent Development Rules

- All agents MUST have YAML frontmatter with tier field
- Controllers use question-based delegation pattern
- Execution agents answer questions and execute tasks
```

**Glob Patterns Supported**:
- `**/*.md` - All markdown files recursively
- `core/**/*` - All files under core/
- `*.{ts,js}` - TypeScript or JavaScript files
- `{core,shared}/agents/*.md` - Agent files in core or shared

### Memory Import Syntax

**Import Additional Files**: Use `@path/to/file` syntax to include external content:

```markdown
# cAgents V5.0 Architecture

See @docs/V5_ARCHITECTURE.md for detailed architecture design.

## Workflow Patterns
@workflow_agent_interactions.md

## Domain Configurations
- Engineering: @Agent_Memory/_system/domains/engineering/planner_config.yaml
- Revenue: @Agent_Memory/_system/domains/revenue/planner_config.yaml

## Personal Preferences
@~/.claude/my-cagents-preferences.md
```

**Import Features**:
- Supports both relative and absolute paths
- Home directory imports: `@~/.claude/file.md`
- Recursive imports (max depth: 5)
- Not evaluated in code spans or code blocks: `@package.json`
- View loaded files: `/memory` command

### Local Project Memory

**CLAUDE.local.md**: Personal project-specific preferences (auto-ignored by git):

```markdown
# My cAgents Development Preferences

## Local Environment
- Dev server: http://localhost:3000
- Test API: http://localhost:8080
- Claude Code server: http://localhost:52125

## Personal Shortcuts
- Use `pnpm` instead of `npm`
- Prefer functional components over class components
- Use Jest for unit tests, Playwright for E2E

## Test Data
- Test instruction: inst_20260113_001
- Test domain: engineering
- Test controller: engineering-manager
```

**Add to .gitignore**:
```
# Local memory (personal preferences)
CLAUDE.local.md
*.local.md
```

### User-Level Memory

**~/.claude/CLAUDE.md**: Personal preferences for ALL projects:

```markdown
# My Global Claude Preferences

## Code Style
- Use 2-space indentation
- Prefer const over let
- Always use semicolons
- Use single quotes for strings

## Git Workflow
- Always create feature branches
- Commit messages: type(scope): message
- Never force push to main

## Tool Preferences
- Use pnpm for package management
- Prefer Playwright over Cypress
- Use ESLint + Prettier
```

**User-Level Rules** (`~/.claude/rules/`):
```
~/.claude/rules/
├── coding-style.md       # Your coding preferences
├── git-workflow.md       # Your git conventions
└── tool-preferences.md   # Your tool choices
```

### Memory Commands

**Interactive Memory Management**:

```bash
/memory                    # View all loaded memory files
/memory edit               # Open project CLAUDE.md in editor
/memory edit --user        # Open ~/.claude/CLAUDE.md
/memory edit --local       # Open CLAUDE.local.md
```

**Bootstrap Project Memory**:
```bash
/init                      # Create initial CLAUDE.md for project
```

### Memory Best Practices

**1. Be Specific**:
- Good: "Use 2-space indentation for TypeScript files"
- Bad: "Format code properly"

**2. Use Structure**:
- Format as bullet points under descriptive headings
- Group related memories logically
- Use markdown sections for organization

**3. Review Periodically**:
- Update memories as project evolves
- Remove outdated instructions
- Keep memories current and relevant

**4. Choose Right Location**:
- **Enterprise**: Company-wide policies (security, compliance)
- **Project**: Team-shared architecture and workflows
- **Project Rules**: Modular topic-specific guidelines
- **User**: Personal preferences across all projects
- **Project Local**: Personal project-specific preferences

**5. Modular Organization**:
- Split large CLAUDE.md into focused rule files
- Use descriptive filenames (testing.md, api-design.md)
- Use path-specific rules sparingly (only when truly conditional)
- Organize with subdirectories (frontend/, backend/, quality/)

**6. Memory for cAgents**:
- Document frequently used commands (build, test, lint)
- Include domain-specific patterns and conventions
- Add controller question patterns and delegation strategies
- Document Agent_Memory/ structure and file locations
- Include task completion protocol requirements

### Memory Discovery

**Recursive Lookup**: Claude Code searches for CLAUDE.md files starting from cwd up to root:

```
/home/user/projects/cAgents/core/agents/  ← Start here
  ↓ Search up
/home/user/projects/cAgents/core/         ← Finds core/CLAUDE.md (if exists)
  ↓
/home/user/projects/cAgents/              ← Finds ./CLAUDE.md (main project memory)
  ↓
/home/user/projects/                      ← Continues searching
  ↓
/home/user/                               ← Finds ~/.claude/CLAUDE.md
```

**Subtree Discovery**: CLAUDE.md files in subdirectories are loaded only when Claude reads files in those subtrees.

### cAgents Memory Strategy

**Current Implementation**:
- Main project memory: `./CLAUDE.md` (this file)
- Agent patterns: `workflow_agent_interactions.md` (root-level exception)
- Domain configs: `Agent_Memory/_system/domains/{domain}/*.yaml`
- Runtime state: `Agent_Memory/` (git-ignored)

**Recommended Enhancements**:
1. Create `.claude/rules/` structure for modular organization
2. Add `CLAUDE.local.md` to .gitignore for personal preferences
3. Use imports for large documentation (architecture, patterns)
4. Create domain-specific rules with path filtering
5. Document memory structure in onboarding guides

## Project Overview

**cAgents V5.0**: Universal multi-domain agent system with 4-tier controller-centric architecture and question-based delegation.

**Architecture**: V5.0 - Controller-Centric Question-Based Delegation
- **Tier 1**: 10 core infrastructure agents (trigger, orchestrator, hitl, optimizer, task-consolidator, 5 universal workflow agents)
- **Tier 2**: ~50 controller agents (coordinate work via question-based delegation)
- **Tier 3**: ~150 execution agents (answer questions and implement solutions)
- **Tier 4**: ~19 support agents (foundational services)
- **Total**: 229 agents
- **Execution**: 4 modes (Sequential, Pipeline, Swarm, Mesh) - up to 50x speedup

**V5.0 Key Improvements**:
- **Controller-Centric**: Controllers coordinate execution, not planners or executors
- **Question-Based Delegation**: Controllers ask questions to specialists, synthesize answers, coordinate implementation
- **Objective-Driven Planning**: Plan defines WHAT (objectives), controllers determine HOW (questions + synthesis)
- **Simpler Planning**: High-level objectives instead of detailed task lists
- **Expert-Driven**: Controllers use domain expertise to break down work adaptively

**What Changed from V4.0**:
- ❌ Eliminated: Detailed task lists in planning phase
- ❌ Eliminated: Capability tags (replaced with tier designation)
- ❌ Eliminated: Direct agent assignment by planner
- ✅ Added: Coordinating phase between planning and executing
- ✅ Added: Controller tier (tier 2) for coordination
- ✅ Added: Question-based delegation pattern
- ✅ Added: Objective-driven planning
- ✅ Changed: Executor monitors controllers, not execution agents
- ✅ Simplified: 4-tier architecture (core, controller, execution, support)

**Agent Distribution** (4 tiers):
- **Core Infrastructure** (10): Workflow orchestration
- **Controllers** (~50): Coordination via question-based delegation
- **Execution** (~150): Specialist work (answer questions, implement solutions)
- **Support** (~19): Foundational services

**Domain Tags** (8 domains):
- Engineering (45), Revenue (40), Finance-Operations (32), People-Culture (19)
- Customer-Experience (18), Legal-Compliance (14), Creative (18), Universal (33)

## Core Infrastructure (Tier 1: 10 agents)

**Orchestration Agents** (4):
- `trigger` - Entry point, domain detection, routing
- `orchestrator` - Phase conductor (routing → planning → **coordinating** → executing → validating)
- `hitl` - Human escalation for tier-4 decisions
- `optimizer` - Universal optimization (code, content, processes, data, infrastructure, campaigns)

**Universal Workflow Agents** (5):
- `universal-router` - Tier classification (0-4), sets requires_controller flag
- `universal-planner` - **V5.0: Creates objectives + selects controllers** (not detailed tasks)
- `universal-executor` - **V5.0: Monitors controllers** (not execution agents)
- `universal-validator` - Quality gates with **V5.0: coordination validation**
- `universal-self-correct` - Adaptive recovery with **V5.0: coordination corrections**

**Additional** (1):
- `task-consolidator` - Task consolidation for 40-88% context reduction

**Config Location**: `Agent_Memory/_system/domains/{domain}/*.yaml` (5 files per domain)

## V5.0 CONTROLLER-CENTRIC ARCHITECTURE

**NEW IN V5.0**: Controllers are the coordination hub between planning and execution.

### Controller-Centric Pattern

**Controllers coordinate work through question-based delegation:**

```
V4.0 (Previous):
Planner → Detailed Tasks → Executor → Team Agents

V5.0 (Current):
Planner → Objectives → Controller → Questions → Execution Agents → Answers → Controller → Synthesized Solution → Implementation
```

**Core Concept**: Controllers use domain expertise to break down objectives into specific questions, delegate to specialists, synthesize answers, and coordinate implementation.

### Question-Based Delegation

**How it works**:
1. **Planner defines objectives** (high-level goals like "Implement OAuth2 authentication")
2. **Planner selects controller** (e.g., engineering-manager for engineering work)
3. **Controller receives objectives** from plan.yaml
4. **Controller breaks into questions** (specific, answerable queries to specialists)
5. **Controller delegates questions** to execution agents (backend-developer, architect, qa-lead, etc.)
6. **Execution agents answer** with their expertise
7. **Controller synthesizes answers** into coherent solution
8. **Controller coordinates implementation** by assigning tasks to execution agents
9. **Executor monitors controller** progress via coordination_log.yaml

**Key Principles**:
- **Controllers ask, not assign**: Controllers ask "What is the current auth implementation?" not "Analyze current auth"
- **Execution agents answer**: Specialists provide expert answers to specific questions
- **Synthesis drives implementation**: Controllers synthesize answers into implementation plan
- **Adaptive coordination**: Controllers can ask follow-up questions based on answers received

### Agent Tiers

| Tier | Role | Count | Purpose | Examples |
|------|------|-------|---------|----------|
| **1: Core** | Infrastructure | 10 | Workflow orchestration | orchestrator, planner, executor, validator |
| **2: Controller** | Coordination | ~50 | Question-based delegation and synthesis | engineering-manager, architect, cto, campaign-manager |
| **3: Execution** | Specialists | ~150 | Answer questions and execute tasks | backend-developer, copywriter, financial-analyst |
| **4: Support** | Operations | ~19 | Foundational services | scribe, data-extractor, etc. |

### Controller Selection

**Controllers are selected by domain and coordination style:**

**Engineering Domain**:
- **Tier 2**: engineering-manager (moderate complexity), architect (system design)
- **Tier 3**: engineering-manager + architect + security-specialist (comprehensive)
- **Tier 4**: cto + engineering-manager + architect (executive oversight)

**Revenue Domain**:
- **Tier 2**: campaign-manager (moderate), sales-strategist (sales focus)
- **Tier 3**: marketing-strategist + campaign-manager + copywriter
- **Tier 4**: cro + marketing-strategist + sales-strategist

**Creative Domain**:
- **Tier 2**: editor (moderate), story-architect (complex narratives)
- **Tier 3**: creative-director + story-architect + character-developer
- **Tier 4**: cco + creative-director + story-architect

**Discovery**: Planner loads `planner_config.yaml` → `controller_catalog` section → matches tier + domain

## V5.0 COORDINATING PHASE

**CRITICAL NEW IN V5.0**: Coordinating phase sits between planning and executing.

### Workflow Phases

```
routing → planning → coordinating → executing → validating
   ↓          ↓           ↓            ↓           ↓
  Router   Planner   Controller   Executor   Validator
(tier 0-4) (objectives) (questions) (monitor) (quality)
```

**NEW Phase**: **Coordinating**
- Orchestrator spawns controller from plan.yaml
- Controller breaks objectives into questions
- Controller delegates to execution agents
- Controller synthesizes answers
- Controller coordinates implementation
- Controller writes coordination_log.yaml
- Orchestrator detects completion (coordination_log exists with completed status)

### Coordinating Phase Workflow

1. **Orchestrator spawns controller** using Task tool with plan.yaml context
2. **Controller analyzes objectives** and creates question list
3. **Controller delegates questions** to execution agents (one question per agent)
4. **Execution agents answer** with expertise and context
5. **Controller synthesizes** all answers into coherent solution
6. **Controller creates implementation tasks** from synthesized solution
7. **Controller coordinates execution** by assigning tasks to execution agents
8. **Controller writes coordination_log.yaml** with all Q&A exchanges, synthesis, and tasks
9. **Orchestrator detects completion** when coordination_log.yaml has `status: completed`

**Key File**: `Agent_Memory/{instruction_id}/workflow/coordination_log.yaml`

### Coordination Log Structure

```yaml
# coordination_log.yaml
controller: engineering:engineering-manager
objectives: [...]
questions_asked:
  - question: "What is current auth implementation?"
    delegated_to: backend-developer
    answer: "Current implementation uses passport-local..."
  - question: "What OAuth2 library should we use?"
    delegated_to: architect
    answer: "Recommend passport-oauth2 for consistency..."

synthesized_solution:
  approach: "Add passport-oauth2 alongside passport-local"
  rationale: "Maintains backward compatibility while adding OAuth2"
  implementation_steps: [10 concrete steps]
  risks: ["Token storage security", "Migration complexity"]

implementation_tasks:
  - task_id: task_001
    name: "Implement OAuth2 endpoints"
    assigned_to: backend-developer
    acceptance_criteria: [...]
    status: completed

status: completed
```

## Complexity Tiers

| Tier | Type | Coordination | Example | Workflow |
|------|------|--------------|---------|----------|
| 0 | Trivial | None | "What is X?" | routing → answer |
| 1 | Simple | None | "Fix typo" | routing → planning → executing → validating |
| 2 | Moderate | 1 controller | "Fix bug" | routing → planning → **coordinating** → executing → validating |
| 3 | Complex | 1 primary + 1-2 supporting | "Add feature" | routing → planning → **coordinating** → executing → validating |
| 4 | Expert | 1 executive + 1 primary + 2-4 supporting | "Major refactor" | routing → planning → **coordinating** → executing → validating + HITL |

**V5.0 CRITICAL CHANGE**: Tier 2+ workflows include coordinating phase with controllers using question-based delegation.

### Coordination Patterns by Tier

**Tier 0-1**: No controllers (direct answer or simple execution)

**Tier 2**: 1 primary controller
- Example: "Fix authentication bug"
- Controller: engineering-manager
- Pattern: Ask questions → synthesize → coordinate implementation

**Tier 3**: 1 primary + 1-2 supporting controllers
- Example: "Implement OAuth2 system"
- Primary: engineering-manager (coordination)
- Supporting: architect (design), security-specialist (security review)
- Pattern: Multi-controller coordination with synthesis

**Tier 4**: 1 executive + 1 primary + 2-4 supporting + HITL
- Example: "Migrate to microservices architecture"
- Executive: cto (strategic oversight)
- Primary: engineering-manager (day-to-day coordination)
- Supporting: architect, devops-lead, security-specialist, qa-lead
- Pattern: Executive oversight + multi-controller + HITL approval

## Workflow Execution

```
User Request → Trigger (domain detect) → Orchestrator
  ↓
  Routing → Universal-Router (tier classification, requires_controller flag)
  ↓
  Planning → Universal-Planner (objectives + controller selection)
  ↓
  Coordinating → Controller (question-based delegation, synthesis, coordination_log)
  ↓
  Executing → Universal-Executor (monitor controller progress)
  ↓
  Validating → Universal-Validator (coordination quality + output quality)
  ↓
  PASS → Complete | FIXABLE → Self-Correct | BLOCKED → HITL
```

See `workflow_agent_interactions.md` for detailed agent interaction patterns.

## Objective-Based Planning

**V5.0 Planning**: Define WHAT needs to be done, let controllers determine HOW.

### Plan Structure (V5.0)

```yaml
# plan.yaml (V5.0)
objectives:
  - "Implement OAuth2 authentication for API"
  - "Maintain backward compatibility with existing auth"
  - "Follow OAuth2 best practices and security standards"

success_criteria:
  - "OAuth2 endpoints functional and tested"
  - "Existing passport-local auth continues to work"
  - "Security audit passes with no critical issues"

controller_assignment:
  primary: engineering:engineering-manager
  supporting:
    - engineering:architect
    - engineering:security-specialist

coordination_approach: question_based
estimated_questions: 8-12
estimated_duration: 3-5 hours
```

**Contrast with V4.0**:
```yaml
# plan.yaml (V4.0 - OLD)
tasks:
  - id: task_001
    name: "Design OAuth2 architecture"
    agent: architect
    dependencies: []
  - id: task_002
    name: "Implement OAuth2 endpoints"
    agent: backend-developer
    dependencies: [task_001]
  # ... 10 more detailed tasks
```

**V5.0 Benefits**:
- **Simpler planning**: Define objectives, not task breakdowns
- **Expert-driven**: Controller uses domain expertise to determine HOW
- **Adaptive**: Controller adjusts questions based on answers received
- **Flexible**: Not locked into predetermined task list

## Workflow Pattern

**Subagent Architecture**: Agents delegate to specialists, don't execute directly.

Pattern: "Use {subagent} to {task}"
Example (V5.0): Controller → backend-developer (question) → architect (question) → synthesis → backend-developer (implementation)

Benefits: Modularity, specialization, parallelization (up to 50 concurrent), reusability, expert coordination

## Task Completion Protocol

**MANDATORY**: All tasks must be fully completed before marking as done.

**Core Rule**: 100% completion with verified evidence, or it's not complete.

Protocol enforced by:
- Controllers: Verify ALL acceptance criteria in coordination_log before marking complete
- universal-executor: Verifies coordination_log completeness before phase transition
- universal-validator: Checks coordination quality + output quality
- orchestrator: Validates coordination_log exists and is complete before phase transitions

**Key Requirements**:
1. All objectives met with concrete evidence
2. All outputs exist and are production-quality
3. coordination_log.yaml with all Q&A exchanges, synthesis, and completed tasks
4. Evidence must be specific (file paths, test outputs, metrics)
5. NO partial completion - 100% or in_progress

**Files**:
- Protocol: `Agent_Memory/_system/task_completion_protocol.yaml`
- Coordination: `Agent_Memory/{instruction_id}/workflow/coordination_log.yaml`
- Summary: `docs/TASK_COMPLETION_ENFORCEMENT_SUMMARY.md`

**Context Overhead**: Add 3K tokens per coordination cycle for Q&A tracking (included in planning)

## Commands

### /trigger - Universal Entry Point
Auto-routes to domain, executes full workflow with controller-centric coordination.
```bash
/trigger Fix auth bug              # → Engineering domain (tier 2: engineering-manager controller)
/trigger Write fantasy story       # → Creative domain (tier 2: story-architect controller)
/trigger Plan Q4 campaign          # → Revenue domain (tier 3: marketing-strategist + campaign-manager)
/trigger Create budget             # → Finance-Operations (tier 4: cfo + fp-and-a-manager)
```

### /designer - Interactive Design
Asks questions to flesh out ideas across all domains. Runs until canceled.

### /reviewer - Enhanced Review (V2.0)
Universal review with 8 enhancements:
1. Intelligent agent selection (30-50% faster)
2. Severity-based early reporting (81% faster to critical)
3. Auto-fix suggestions (98% more actionable)
4. Priority intelligence (security first)
5. Diff-aware analysis
6. Context-aware (cross-file)
7. Real-time progress
8. Pattern learning (78% detection)

```bash
/reviewer src/              # Code review
/reviewer --focus security  # Security focus
```

Config: `Agent_Memory/_system/config/reviewer_config.yaml`
Patterns: `Agent_Memory/_knowledge/procedural/review_patterns.yaml`

### /optimize - Universal Optimizer (V6.8)
**NEW V6.8**: Trigger-style workflow with controller-centric coordination, zero-arg invocation, auto-detection.

**5-Phase Workflow**: detection → analysis → planning → execution → validation
- Creates instruction folder (`inst_{id}`) for each optimization
- Uses controller-centric coordination with question-based delegation
- Supports 8 optimization types: code, content, process, data, infrastructure, campaign, creative, sales

**Simplified Invocation**:
```bash
/optimize                              # Zero-arg: Auto-detect everything
/optimize "Make the app faster"        # Natural language goal
/optimize --auto                       # Comprehensive project scan
/optimize src/ --type code             # Specific target (backward compatible)
/optimize --continuous --interval 1d   # Background monitoring (NEW)
```

**V6.8 Key Features**:
- ✅ **Zero-arg invocation** - Auto-detect optimization targets from context
- ✅ **Natural language goals** - "Make it faster" → performance optimization
- ✅ **Instruction-based** - Full `inst_{id}` folder with workflow tracking
- ✅ **Controller coordination** - Question-based delegation to specialists
- ✅ **60+ detection patterns** - Comprehensive auto-scan across all types
- ✅ **Continuous mode** - Background optimization monitoring
- ✅ **Before/after metrics** - Comprehensive impact measurement

**Configuration**:
- Intent patterns: `Agent_Memory/_system/optimize/intent_patterns.yaml`
- Scan patterns: `Agent_Memory/_system/optimize/scan_patterns.yaml`
- Plan template: `Agent_Memory/_system/templates/optimization_plan.yaml`

**Example Workflow**:
```
$ /optimize

Detection Phase:
  - Found 23 optimization opportunities
  - Classified: code (12), process (8), content (3)
  - Complexity tier: 3 (requires controller)

Analysis Phase:
  - Baseline metrics measured
  - High-priority opportunities: 8
  - Estimated impact: 30-50% improvement

Planning Phase:
  - Controller: engineering-manager
  - Objectives: 3 defined
  - Approach: question-based delegation

Execution Phase:
  ✓ Code-split components (bundle -36%)
  ✓ Optimize images (FCP -50%)
  ✓ Fix N+1 queries (query -99%)

Validation Phase:
  ✓ All tests passing
  ✓ 18 optimizations applied
  ✓ 5 risky pending approval
```

See `core/commands/optimize.md` for detailed workflow documentation.

### /memory - Memory Management (NEW)
Interactive memory management and viewing:
```bash
/memory                    # View all loaded memory files
/memory edit               # Open project CLAUDE.md in editor
/memory edit --user        # Open ~/.claude/CLAUDE.md
/memory edit --local       # Open CLAUDE.local.md
```

### /init - Bootstrap Project Memory (NEW)
Create initial CLAUDE.md for new projects:
```bash
/init                      # Create CLAUDE.md with project structure
```

## Agent Memory

```
Agent_Memory/
├── _system/              # Registry, config, agent status
├── _knowledge/           # Patterns, calibration, learnings
├── _archive/             # Completed instructions
└── {instruction_id}/     # Per-task working memory
    ├── instruction.yaml  # Request + metadata
    ├── status.yaml       # Current phase
    ├── workflow/         # Plan, coordination_log, execution state (V5.0)
    ├── tasks/            # pending/, in_progress/, completed/
    └── outputs/          # Deliverables
```

**V5.0 Key Files**:
- `workflow/plan.yaml` - Objectives + controller assignment (not tasks)
- `workflow/coordination_log.yaml` - Q&A exchanges, synthesis, implementation tasks (NEW V5.0)
- `workflow/execution_summary.yaml` - Aggregated outputs from controller

**Principles**: File-based, instruction-scoped, parallel-safe, pause/resume capable

See `docs/CONTEXT_MANAGEMENT.md` for context handling details.

## Recursive Workflows

Complex tasks spawn child workflows (max depth: 5, max children: 100)

Example: `/trigger Write 10-chapter novel` → 1 parent + 10 child workflows

Each child workflow follows V5.0 pattern (objectives → controller → questions → synthesis → implementation)

## Creating Agents

1. Choose tier (controller or execution) and domain
2. Create `{domain}/agents/my-agent.md` with YAML frontmatter
3. **V5.0: Add tier field** to frontmatter
4. Add to `{domain}/.claude-plugin/plugin.json`
5. Test: `claude --plugin-dir .`

**V5.0 Frontmatter (Controller)**:
```yaml
---
name: engineering-manager
tier: controller
domain: engineering
coordination_style: question_based
question_limit: 15
typical_questions: ["What is current implementation?", "What are constraints?", ...]
---
```

**V5.0 Frontmatter (Execution)**:
```yaml
---
name: backend-developer
tier: execution
domain: engineering
answers_questions: ["implementation details", "technical constraints", ...]
executes_tasks: ["implement endpoints", "write tests", ...]
---
```

## Creating Domains

1. Create 5 config files: `Agent_Memory/_system/domains/{domain}/*.yaml`
2. **V5.0: Create controller_catalog** in `planner_config.yaml`
3. Create controller agents in `{domain}/agents/` with tier: controller
4. Create execution agents in `{domain}/agents/` with tier: execution
5. Create plugin manifest: `{domain}/.claude-plugin/plugin.json`
6. Update root `.claude-plugin/plugin.json` and `package.json`

No code required - universal agents load configs automatically.

## Directory Structure

```
cAgents/
├── core/                    # Core infrastructure (tier 1)
│   ├── agents/              # 10 core agents
│   └── commands/            # 4 universal commands
├── shared/                  # Universal agents (tier 2-3)
│   ├── agents/              # Controllers + execution agents
│   └── .claude-plugin/      # Shared manifest
├── {domain}/                # Domain packages (7 total)
│   ├── agents/              # Domain controllers + execution agents
│   └── .claude-plugin/      # Domain manifest
├── docs/                    # Project documentation
│   ├── V5_ARCHITECTURE.md   # V5.0 architecture design (NEW)
│   ├── V5_MIGRATION_GUIDE.md # V4.0 → V5.0 migration (NEW)
│   └── V5_WORKFLOW_EXAMPLES.md # Tier 2, 3, 4 examples (NEW)
├── .claude/                 # Memory system (NEW)
│   ├── CLAUDE.md            # Main project memory (symlink to root)
│   └── rules/               # Modular rules (NEW - planned)
├── .claude-plugin/          # Root manifest
└── Agent_Memory/            # Runtime state (git-ignored)
    └── _system/
        └── domains/{domain}/*.yaml    # Domain configs
```

**Root Directory Policy**: Only CLAUDE.md, README.md, and workflow_agent_interactions.md should exist in the root. All other documentation belongs in `docs/` or `archive/docs/`.

## Performance Benchmarks

**V5.0 Controller Pattern**: 30-40% simpler planning (objectives vs tasks), 20-30% fewer tokens (no detailed task lists)
**Reviewer V2.0**: 33% faster, 81% faster to critical, 98% more actionable, 78% pattern detection
**Parallel Execution**: 50x speedup (swarm), 80%+ efficiency
**Optimizer**: 20-50% faster, 30-60% smaller bundles, 15-40% less memory

See `docs/OPTIMIZATION_PROGRESS.md` for detailed optimization tracking.

## Quick Reference

**Commands**: `/trigger`, `/designer`, `/reviewer`, `/optimize`, `/memory`, `/init`
**Core Agents**: trigger, orchestrator, hitl, optimizer, 5 universal workflow, task-consolidator
**Controller Agents**: ~50 agents for coordination (engineering-manager, architect, cto, campaign-manager, etc.)
**Execution Agents**: ~150 agents for specialist work (backend-developer, copywriter, financial-analyst, etc.)
**Key Files**:
- `.claude-plugin/plugin.json` - Root manifest
- `CLAUDE.md` - Main project memory (this file)
- `.claude/rules/*.md` - Modular rules (planned)
- `CLAUDE.local.md` - Personal project preferences (git-ignored)
- `~/.claude/CLAUDE.md` - Personal global preferences
- `Agent_Memory/_system/domains/{domain}/*.yaml` - Domain configs (including controller_catalog)
- `Agent_Memory/_system/task_completion_protocol.yaml` - Mandatory completion rules
- `Agent_Memory/inst_{id}/workflow/coordination_log.yaml` - V5.0 coordination tracking (NEW)
- `docs/V5_ARCHITECTURE.md` - V5.0 architecture design (NEW)
- `docs/V5_MIGRATION_GUIDE.md` - V4.0 → V5.0 migration guide (NEW)
- `docs/V5_WORKFLOW_EXAMPLES.md` - Reference implementations (NEW)
- `docs/DOCUMENTATION_STANDARDS.md` - Documentation guidelines
**Critical Rules**:
- ✅ 100% task completion with verified evidence required
- ✅ **Coordinating phase MANDATORY for tier 2+ workflows** (V5.0)
- ✅ Controllers use question-based delegation (V5.0)
- ✅ Objectives in plan, tasks in coordination_log (V5.0)

## V5.0 Migration

**From V4.0 to V5.0**:
- ✅ All 229 agents migrated with tier field (controller, execution, or support)
- ✅ All 18 domain configs updated with controller_catalog sections
- ✅ Planning changed from task-based to objective-based
- ✅ Coordinating phase added to workflow
- ✅ Executor changed from team manager to controller monitor
- ✅ Validator enhanced with coordination quality checks

**Key Changes**:
- Tier 1 (core) remains
- Tier 2 (capability agents) → Tier 2 (controllers) + Tier 3 (execution)
- Capability tags → tier field (controller, execution, support)
- Detailed tasks → objectives + question-based delegation
- Team coordination → controller coordination

See `docs/V5_MIGRATION_GUIDE.md` for detailed upgrade instructions.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Wrong domain detected | Use explicit domain keywords |
| No controller selected | Check planner_config.yaml has controller_catalog section |
| coordination_log missing | Check controller completed coordinating phase |
| Agent not found | Check agent has tier field in frontmatter |
| All 9 QA agents run | Enable `intelligent_agent_selection` in reviewer config |
| No progress updates | Ensure agents use TodoWrite |
| Workflow stuck in coordinating | Check controller is asking questions and synthesizing |
| Missing coordination_log | Controller didn't complete - check controller logs |
| Memory not loading | Run `/memory` to view loaded files, check file locations |
| Local preferences not applied | Ensure CLAUDE.local.md in .gitignore, check loading order |

Full troubleshooting: `archive/docs/TROUBLESHOOTING.md`

See `docs/WORKFLOW_EVALUATION_FIXES.md` for recent workflow issue resolutions.

## V5.0 Philosophy

**V5.0 Design Principles**:
- **Controller-Centric**: Controllers coordinate work, not planners or executors
- **Question-Based**: Controllers ask questions to specialists, not assign predetermined tasks
- **Objective-Driven**: Plan defines WHAT (objectives), controllers determine HOW (questions + synthesis)
- **Expert-Driven**: Controllers use domain expertise to break down work adaptively
- **Simpler Planning**: High-level objectives instead of detailed task lists
- **Adaptive Coordination**: Controllers adjust based on answers received

**What V5.0 Fixes**:
- ❌ V4.0: Detailed task lists upfront → Planning overhead high, inflexible
- ✅ V5.0: Objectives upfront → Simpler planning, adaptive execution
- ❌ V4.0: Planner assigns agents → Required knowing all agents upfront
- ✅ V5.0: Controller delegates → Expert-driven question-based delegation
- ❌ V4.0: Executor manages team → Complex coordination logic
- ✅ V5.0: Controller coordinates → Domain expert handles coordination
- ❌ V4.0: Rigid task list → Cannot adapt to discoveries
- ✅ V5.0: Question-based → Adapts to answers received

**User Benefits**:
1. ✅ **Simpler planning** - Define objectives, not task breakdowns
2. ✅ **Expert-driven execution** - Controllers use domain expertise
3. ✅ **Adaptive coordination** - Adjust based on what's discovered
4. ✅ **Clear separation** - WHAT (planner) vs HOW (controller) vs WHEN (executor)

---

**Version**: 5.0.0
**Total Agents**: 229 (10 core + ~50 controller + ~150 execution + ~19 support)
**Architecture**: V5.0 - Controller-Centric Question-Based Delegation
**Domains**: 8 (engineering, revenue, finance-operations, people-culture, customer-experience, legal-compliance, creative, universal)
**Dependencies**: None (file-based, self-contained)
**Backward Compatibility**: Breaking changes from V4.0 (requires migration)
**Key Innovation**: Controller-centric coordination with question-based delegation
