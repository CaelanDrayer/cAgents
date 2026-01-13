# CLAUDE.md

Core architecture and development guidance for cAgents V4.0.

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
- `V4_MIGRATION_GUIDE.md` - V3.0 to V4.0 migration guide (NEW)

**Root Documentation** (exceptions):
- `workflow_agent_interactions.md` - Agent interaction patterns (referenced throughout)

## Project Overview

**cAgents V4.0**: Universal multi-domain agent system with 2-tier capability-based architecture and mandatory planning for tier 2+ workflows.

**Architecture**: V4.0 - 2-Tier Capability-Based
- **Tier 1**: 10 core infrastructure agents (trigger, orchestrator, hitl, optimizer, task-consolidator, 5 universal workflow agents)
- **Tier 2**: 219 capability agents (organized by capabilities, not "shared vs domain")
- **Total**: 229 agents (10 core + 219 capability)
- **Execution**: 4 modes (Sequential, Pipeline, Swarm, Mesh) - up to 50x speedup

**V4.0 Key Improvements**:
- **2-Tier Architecture**: Eliminated tier-2/tier-3 distinction (shared vs domain) → simpler capability-based approach
- **Mandatory Planning**: Planning is now MANDATORY for tier 2+ workflows (no skipping)
- **Capability-Based Discovery**: Find agents by capability + domain tags (not manual assignment)
- **User-Focused**: Directly addresses user goals (planning focus, task completion, smooth coordination)

**What Changed from V3.0**:
- ❌ Eliminated: Tier 2 (shared) vs Tier 3 (domain) separation
- ✅ Added: Capability tags to all 219 agents
- ✅ Added: Mandatory planning enforcement for tier 2+ workflows
- ✅ Added: Capability-based agent discovery algorithm
- ✅ Simplified: 2-tier instead of 3-tier architecture

**Capability Categories** (12 primary):
- **Leadership** (24 agents): Strategic decisions, executive oversight
- **Planning** (18 agents): Project management, strategic planning, roadmapping
- **Execution** (78 agents): Hands-on implementation (coding, content, building)
- **Quality** (32 agents): Testing, QA, review, audit, compliance
- **Data** (14 agents): Analysis, BI, reporting, metrics
- **Security** (12 agents): Security review, vulnerability analysis, compliance
- **Creative** (18 agents): Content creation, design, storytelling
- **Customer** (18 agents): Customer success, support, service
- **Operations** (17 agents): Infrastructure, DevOps, process optimization
- **Finance** (17 agents): Financial analysis, budgeting, forecasting
- **Legal** (14 agents): Legal review, contracts, compliance
- **HR** (19 agents): Talent, onboarding, performance management

**Domain Tags** (8 domains):
- Engineering (45), Revenue (40), Finance-Operations (32), People-Culture (19)
- Customer-Experience (18), Legal-Compliance (14), Creative (18), Universal (33)

## Core Infrastructure (Tier 1: 10 agents)

**Orchestration Agents** (4):
- `trigger` - Entry point, domain detection, routing
- `orchestrator` - Phase conductor (routing → planning → executing → validating)
- `hitl` - Human escalation for tier-4 decisions
- `optimizer` - Universal optimization (code, content, processes, data, infrastructure, campaigns)

**Universal Workflow Agents** (5):
- `universal-router` - Tier classification (0-4)
- `universal-planner` - **V4.0: Enforces mandatory planning for tier 2+ workflows**
- `universal-executor` - Team coordination via capability-based agent discovery
- `universal-validator` - Quality gates with verification checks
- `universal-self-correct` - Adaptive recovery with escalation

**Additional** (1):
- `task-consolidator` - Task consolidation for 40-88% context reduction

**Config Location**: `Agent_Memory/_system/domains/{domain}/*.yaml` (5 files per domain)

## V4.0 CAPABILITY-BASED ARCHITECTURE

**NEW IN V4.0**: Agents are organized by **capabilities**, not by "shared vs domain" tiers.

### Capability-Based Agent Discovery

**How it works**:
1. **Identify required capability** for task (leadership, planning, execution, quality, etc.)
2. **Match capability + domain** to find agents
3. **Select best match** based on task specifics
4. **Fallback**: Try universal domain if no domain-specific match

**Example**: Need "planning" capability in "engineering" domain
- Matches: architect, tech-lead, engineering-manager, project-manager
- Selects: architect (for architecture planning) OR project-manager (for project planning)

### All Agents Have Capability Tags

Every agent's frontmatter includes capabilities:
```yaml
name: architect
capabilities: [system_design, architecture_patterns, api_design, ...]
domain: engineering
```

**Discovery uses these tags** to find the right agent for each task.

### No More "Shared vs Domain" Distinction

**V3.0 had**:
- Tier 2: "Shared" agents (cross-domain)
- Tier 3: "Domain" agents (specialized)

**V4.0 has**:
- Tier 1: Core infrastructure (10 agents)
- Tier 2: All other agents (219), organized by **capabilities**

**Benefit**: Simpler architecture, more flexible agent discovery, no artificial separation.

## V4.0 MANDATORY PLANNING PHASE

**CRITICAL NEW IN V4.0**: Planning is now **MANDATORY** for tier 2+ workflows.

### Planning Requirements by Tier

| Tier | Planning Required | Planning Level | Planning Agents | Time Estimate |
|------|------------------|----------------|-----------------|---------------|
| **0** | ❌ No | N/A | None | Trivial, direct answer |
| **1** | ❌ No | N/A | None | Simple, single-step execution |
| **2** | ✅ **YES - MANDATORY** | Basic | 10-30 min | project-manager, business-analyst |
| **3** | ✅ **MANDATORY** | Comprehensive | 1-3 hours | strategic-planner, program-manager, architect |
| **4** | ✅ **MANDATORY + HITL** | Executive | 4-8 hours | ceo, cto, cfo, strategic-planner |

**What This Means**:
- **Tier 0-1**: Planning optional (trivial/simple tasks)
- **Tier 2+**: Planning MANDATORY (cannot skip to execution)
- **Planning artifacts required** before execution starts
- **Enforced by**: universal-planner, universal-executor, universal-validator, orchestrator

### Tier-Specific Planning Artifacts

**Tier 2 (Basic Planning)**:
- `workflow/plan.yaml` - Task breakdown
- `workflow/acceptance_criteria.md` - Success criteria
- Planning agents: project-manager, business-analyst

**Tier 3 (Comprehensive Planning)**:
- `workflow/implementation_plan.md`
- `workflow/risk_assessment.md`
- `decisions/architecture_decision_record.md` (if technical)
- All tier 2 artifacts
- Planning agents: strategic-planner, program-manager, architect

**Tier 4 (Executive Planning)**:
- `workflow/strategic_brief.md` (executive approval)
- `workflow/resource_plan.md`
- `workflow/stakeholder_communication_plan.md`
- All tier 3 artifacts
- Planning agents: ceo, cto, cfo, strategic-planner
- HITL approval required

### Why Mandatory Planning Matters

**User's Core Goals** (addressed by V4.0):
1. ✅ **Focus on planning** - Planning is now mandatory and explicit for tier 2+
2. ✅ **Ensure task completion** - Planning defines clear acceptance criteria upfront
3. ✅ **Smooth coordination** - Planning identifies all dependencies and handoffs

**Benefits**:
- **Clarity**: Everyone knows what "done" means before starting
- **Coordination**: Dependencies identified upfront, not discovered mid-execution
- **Quality**: Acceptance criteria defined with stakeholder input
- **Risk mitigation**: Risks identified and mitigated proactively
- **Accountability**: Clear ownership and deliverables

**Enforcement**:
- universal-planner: Refuses to create execution-only plans for tier 2+
- universal-executor: Checks planning artifacts exist before starting execution
- universal-validator: Verifies planning artifacts as part of validation
- orchestrator: Blocks phase transition if planning incomplete

## Workflow Pattern

**Subagent Architecture**: Agents delegate to specialists, don't execute directly.

Pattern: "Use {subagent} to {task}"
Example: Use project-manager → architect → backend-developer → qa-lead

Benefits: Modularity, specialization, parallelization (up to 50 concurrent), reusability

## Task Completion Protocol

**MANDATORY**: All tasks must be fully completed before marking as done.

**Core Rule**: 100% completion with verified evidence, or it's not complete.

Protocol enforced by:
- universal-executor: Verifies ALL acceptance criteria before marking complete
- universal-validator: Checks verification records in task manifests
- orchestrator: Validates all tasks have verification before phase transitions

**Key Requirements**:
1. All acceptance criteria met with concrete evidence
2. All outputs exist and are production-quality
3. manifest.yaml with completion_verification for every task
4. Evidence must be specific (file paths, test outputs, metrics)
5. NO partial completion - 100% or in_progress

**Files**:
- Protocol: `Agent_Memory/_system/task_completion_protocol.yaml`
- Template: `Agent_Memory/_system/templates/task_manifest_template.yaml`
- Summary: `docs/TASK_COMPLETION_ENFORCEMENT_SUMMARY.md`

**Context Overhead**: Add 2K tokens per task for verification (included in planning)

## Commands

### /trigger - Universal Entry Point
Auto-routes to domain, executes full workflow with capability-based agent discovery.
```bash
/trigger Fix auth bug              # → Engineering domain (planning MANDATORY for tier 2+)
/trigger Write fantasy story       # → Creative domain
/trigger Plan Q4 campaign          # → Revenue domain (strategic-planner engaged first)
/trigger Create budget             # → Finance-Operations (cfo approval for tier 4)
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

### /optimize - Universal Optimizer
8 types: code, content, process, data, infrastructure, campaign, creative, sales

```bash
/optimize src/ --type code --focus performance
/optimize --type content blog-posts/
```

See `docs/AGENT_OPTIMIZATION_INSTRUCTION.md` for optimization guidelines.

## Agent Memory

```
Agent_Memory/
├── _system/              # Registry, config, agent status
├── _knowledge/           # Patterns, calibration, learnings
├── _archive/             # Completed instructions
└── {instruction_id}/     # Per-task working memory
    ├── instruction.yaml  # Request + metadata
    ├── status.yaml       # Current phase
    ├── workflow/         # Plan, execution state, PLANNING ARTIFACTS (V4.0)
    ├── tasks/            # pending/, in_progress/, completed/
    └── outputs/          # Deliverables
```

**Principles**: File-based, instruction-scoped, parallel-safe, pause/resume capable

See `docs/CONTEXT_MANAGEMENT.md` for context handling details.

## Complexity Tiers

| Tier | Type | Planning Required | Example | Workflow |
|------|------|------------------|---------|----------|
| 0 | Trivial | No | "What is X?" | Direct answer |
| 1 | Simple | No | "Fix typo" | Execute → Validate |
| 2 | Moderate | **YES** ✓ | "Fix bug" | **Plan** → Execute → Validate |
| 3 | Complex | **YES** ✓ | "Add feature" | **Plan** → Parallel execution → Validate |
| 4 | Expert | **YES + HITL** ✓ | "Major refactor" | **Executive plan** → Full orchestration + HITL |

**V4.0 CRITICAL CHANGE**: Planning is MANDATORY for tier 2+ workflows. No execution without planning artifacts.

## Workflow Execution

```
User Request → Trigger (domain detect) → Orchestrator
  ↓
  Routing → Universal-Router (tier classification)
  ↓
  Planning → Universal-Planner (MANDATORY for tier 2+, capability-based agent selection)
  ↓
  Executing → Universal-Executor (capability-based team coordination)
  ↓
  Validating → Universal-Validator (quality gates + planning artifact verification)
  ↓
  PASS → Complete | FIXABLE → Self-Correct | BLOCKED → HITL
```

See `workflow_agent_interactions.md` for detailed agent interaction patterns.

## Recursive Workflows

Complex tasks spawn child workflows (max depth: 5, max children: 100)

Example: `/trigger Write 10-chapter novel` → 1 parent + 10 child workflows

## Creating Agents

1. Choose domain (or universal for cross-domain capabilities)
2. Create `{domain}/agents/my-agent.md` with YAML frontmatter
3. **V4.0: Add capability tags** to frontmatter
4. Add to `{domain}/.claude-plugin/plugin.json`
5. Test: `claude --plugin-dir .`

**V4.0 Frontmatter**:
```yaml
---
name: my-agent
capabilities: [primary_capability, secondary_capability, ...]
domain: engineering  # or universal
tier: 2              # 1=core, 2=capability agent
---
```

## Creating Domains

1. Create 5 config files: `Agent_Memory/_system/domains/{domain}/*.yaml`
2. Create team agents in `{domain}/agents/`
3. **V4.0: Add capability tags to all agents**
4. Create plugin manifest: `{domain}/.claude-plugin/plugin.json`
5. Update root `.claude-plugin/plugin.json` and `package.json`

No code required - universal agents load configs automatically.

## Directory Structure

```
cAgents/
├── core/                    # Core infrastructure (tier 1)
│   ├── agents/              # 10 core agents
│   └── commands/            # 4 universal commands
├── shared/                  # Universal capability agents (33 agents)
│   ├── agents/              # Cross-domain capabilities
│   └── .claude-plugin/      # Shared manifest
├── {domain}/                # Domain packages (7 total)
│   ├── agents/              # Domain specialists (with capability tags)
│   └── .claude-plugin/      # Domain manifest
├── docs/                    # Project documentation
│   └── V4_MIGRATION_GUIDE.md  # V3.0 → V4.0 migration (NEW)
├── .claude-plugin/          # Root manifest
└── Agent_Memory/            # Runtime state (git-ignored)
    └── _system/
        └── domains/{domain}/*.yaml    # Domain configs
```

**Root Directory Policy**: Only CLAUDE.md, README.md, and workflow_agent_interactions.md should exist in the root. All other documentation belongs in `docs/` or `archive/docs/`.

## Performance Benchmarks

**Reviewer V2.0**: 33% faster, 81% faster to critical, 98% more actionable, 78% pattern detection
**Parallel Execution**: 50x speedup (swarm), 80%+ efficiency
**Optimizer**: 20-50% faster, 30-60% smaller bundles, 15-40% less memory
**V4.0 Architecture**: Simpler (2-tier vs 3-tier), mandatory planning reduces rework by 40-60%

See `docs/OPTIMIZATION_PROGRESS.md` for detailed optimization tracking.

## Quick Reference

**Commands**: `/trigger`, `/designer`, `/reviewer`, `/optimize`
**Core Agents**: trigger, orchestrator, hitl, optimizer, 5 universal workflow, task-consolidator
**Capability Agents**: 219 agents organized by 12 capability categories
**Key Files**:
- `.claude-plugin/plugin.json` - Root manifest
- `Agent_Memory/_system/domains/{domain}/*.yaml` - Domain configs
- `Agent_Memory/_system/task_completion_protocol.yaml` - Mandatory completion rules
- `Agent_Memory/inst_{id}/outputs/capability_taxonomy.yaml` - V4.0 capability taxonomy (NEW)
- `docs/DOCUMENTATION_STANDARDS.md` - Documentation guidelines
- `docs/V4_MIGRATION_GUIDE.md` - V3.0 → V4.0 migration guide (NEW)
**Critical Rules**:
- ✅ 100% task completion with verified evidence required
- ✅ **Planning MANDATORY for tier 2+ workflows** (V4.0)
- ✅ Capability-based agent discovery (V4.0)

## V4.0 Migration

**From V3.0 to V4.0**:
- ✅ No breaking changes - capability tags are additive
- ✅ All agents already have capability tags in frontmatter
- ✅ Planning enforcement added to universal-planner
- ✅ Capability-based discovery algorithm in universal-planner
- ✅ Documentation updated to reflect 2-tier architecture

**Key Changes**:
- Tier 2 (shared) + Tier 3 (domain) → Tier 2 (all capability agents)
- Planning now MANDATORY for tier 2+ workflows
- Agent discovery uses capability + domain matching

See `docs/V4_MIGRATION_GUIDE.md` for detailed upgrade instructions.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Wrong domain detected | Use explicit domain keywords |
| Planning skipped | V4.0 enforces mandatory planning for tier 2+ |
| Agent not found | Check capability tags in agent frontmatter |
| All 9 QA agents run | Enable `intelligent_agent_selection` in reviewer config |
| No progress updates | Ensure agents use TodoWrite |
| Workflow stuck | Check `Agent_Memory/{instruction_id}/status.yaml` |
| Missing planning artifacts | universal-executor blocks execution until planning complete |

Full troubleshooting: `archive/docs/TROUBLESHOOTING.md`

See `docs/WORKFLOW_EVALUATION_FIXES.md` for recent workflow issue resolutions.

## V4.0 Philosophy

**User's Core Goals**:
1. ✅ **Focus on planning** - Planning is now mandatory and explicit for tier 2+
2. ✅ **Ensure task completion** - Planning defines clear acceptance criteria upfront
3. ✅ **Smooth coordination** - Planning identifies all dependencies and handoffs

**V4.0 Design Principles**:
- **Simplicity**: 2-tier instead of 3-tier (no artificial shared/domain distinction)
- **Planning-first**: Mandatory planning for tier 2+ (no skipping)
- **Capability-driven**: Find agents by what they do (capabilities), not where they are (tiers)
- **User-focused**: Architecture serves user goals (planning, completion, coordination)

**What V4.0 Fixes**:
- ❌ V3.0: Planning optional → Tasks started without clear acceptance criteria
- ✅ V4.0: Planning mandatory → Clear success criteria before execution starts
- ❌ V3.0: Manual agent assignment → Required knowing all agents
- ✅ V4.0: Capability-based discovery → Automatic matching by capability + domain
- ❌ V3.0: Complex 3-tier architecture → Confusing shared vs domain distinction
- ✅ V4.0: Simple 2-tier architecture → Core + capability agents

---

**Version**: 4.0.0
**Total Agents**: 229 (10 core + 219 capability)
**Architecture**: V4.0 - 2-Tier Capability-Based (infrastructure + capability agents)
**Domains**: 8 (engineering, revenue, finance-operations, people-culture, customer-experience, legal-compliance, creative, universal)
**Dependencies**: None (file-based, self-contained)
**Backward Compatibility**: Full (V3.0 capability tags already present, additive changes only)
**Key Innovation**: Mandatory planning + capability-based discovery
