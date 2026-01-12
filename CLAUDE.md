# CLAUDE.md

Core architecture and development guidance for cAgents V3.0.

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

**Root Documentation** (exceptions):
- `workflow_agent_interactions.md` - Agent interaction patterns (referenced throughout)

## Project Overview

**cAgents V3.0**: Universal multi-domain agent system with 3-tier hybrid architecture and massive parallel execution (up to 50 concurrent agents).

**Architecture**: V3.0 - 3-Tier Hybrid
- **Tier 1**: 10 core infrastructure agents (trigger, orchestrator, hitl, optimizer, task-consolidator, 5 universal workflow agents)
- **Tier 2**: 33 shared capabilities (cross-domain leadership, planning, data, quality, customer, operations)
- **Tier 3**: 157 domain specialists across 7 domains
- **Total**: 200 agents (10 + 33 + 157)
- **Execution**: 4 modes (Sequential, Pipeline, Swarm, Mesh) - up to 50x speedup

**V3.0 Key Improvements**:
- **Domain Consolidation**: 11 → 7 domains (12.7% agent reduction via deduplication)
- **Shared Capabilities**: New tier-2 for cross-domain agents (eliminates duplication)
- **Enhanced Integration**: All domains reference shared agents for leadership, planning, quality
- **Backward Compatibility**: Agent aliases for smooth migration from V2.0

**Domains** (V3.0 agent counts):
- Engineering (35, was Software) | Creative (18) | Revenue (40, merged Sales + Marketing)
- Finance-Operations (32, merged Finance + Operations) | People-Culture (19, was HR)
- Customer-Experience (16, was Support) | Legal-Compliance (14, was Legal)

## Core Infrastructure (Tier 1: 10 agents)

**Orchestration Agents** (4):
- `trigger` - Entry point, domain detection, routing
- `orchestrator` - Phase conductor (routing → planning → executing → validating)
- `hitl` - Human escalation for tier-4 decisions
- `optimizer` - Universal optimization (code, content, processes, data, infrastructure, campaigns)

**Universal Workflow Agents** (5):
- `universal-router` - Tier classification (0-4) with shared agent recommendations
- `universal-planner` - Task decomposition with shared agent assignment
- `universal-executor` - Team coordination with shared agent delegation
- `universal-validator` - Quality gates with shared agent validation
- `universal-self-correct` - Adaptive recovery with shared agent escalation

**Additional** (1):
- `task-consolidator` - Task consolidation for 40-88% context reduction

**Config Location**: `Agent_Memory/_system/domains/{domain}/*.yaml` (5 files per domain: router, planner, executor, validator, self-correct)

## Shared Capabilities (Tier 2: 33 agents)

**NEW IN V3.0**: Cross-domain capabilities accessible to all workflows.

**Leadership (5 agents)**:
- shared:ceo, shared:cfo, shared:coo, shared:cso, shared:cpo
- Strategic vision, financial oversight, operational execution, sales strategy, product direction

**Planning (9 agents)**:
- shared:strategic-planner, shared:portfolio-manager, shared:business-analyst
- shared:project-manager, shared:program-manager, shared:agile-coach
- shared:roadmap-planner, shared:okr-specialist, shared:change-manager
- Strategic planning, project management, business analysis, organizational change

**Data & Analytics (5 agents)**:
- shared:data-analyst, shared:business-intelligence-specialist, shared:data-scientist
- shared:market-research-analyst, shared:competitive-intelligence-analyst
- Data analysis, BI reporting, advanced analytics, market research

**Quality & Compliance (5 agents)**:
- shared:quality-manager, shared:process-auditor, shared:compliance-officer
- shared:risk-manager, shared:performance-analyst
- Quality assurance, compliance, risk management, performance optimization

**Customer (4 agents)**:
- shared:account-manager, shared:customer-success-manager
- shared:customer-advocacy-manager, shared:relationship-manager
- Customer relationships, success programs, advocacy, stakeholder management

**Operations (5 agents)**:
- shared:operations-manager, shared:process-improvement-specialist
- shared:change-management-specialist, shared:resource-planner, shared:capacity-planner
- Operational excellence, process improvement, resource allocation

**Location**: `/shared/agents/` (Week 1, inst_20260112_006)

## Domain Specialists (Tier 3: 157 agents)

### Engineering (35 agents, was Software/45)
**Leadership**: engineering-manager, tech-lead, architect, senior-developer
**Domain Leads**: frontend-lead, backend-lead, devops-lead, data-lead, security-lead, qa-lead
**Developers**: frontend-developer, backend-developer, dba, ux-designer, security-specialist
**Operations**: devops, sysadmin, it-support
**Documentation**: scribe, reviewer
**Intelligence** (5): pattern-recognition, risk-assessment, dependency-analyzer, learning-coordinator, predictive-analyst
**QA** (9): architecture-reviewer, code-standards-auditor, security-analyst, qa-compliance-officer, performance-analyzer, test-coverage-validator, documentation-reviewer, dependency-auditor, accessibility-checker

**Note**: 10 agents moved to shared (ceo, cfo, coo, cpo, project-manager, business-analyst, data-analyst, quality-manager, etc.)

### Revenue (40 agents, merged Sales/18 + Marketing/22)
**Sales Specialists**: sales-director, sales-engineer, account-executive, sales-development-rep, sales-enablement-specialist, sales-ops-analyst
**Marketing Specialists**: marketing-director, demand-gen-manager, content-marketing-manager, product-marketing-manager, digital-marketing-specialist, marketing-automation-specialist, brand-manager, social-media-manager, seo-specialist, event-marketing-manager, marketing-analyst

**Note**: Unified revenue operations with shared account-manager, customer-success-manager

### Finance-Operations (32 agents, merged Finance/17 + Operations/15)
**Finance**: financial-planner, budget-analyst, cost-accountant, financial-analyst, treasury-manager, tax-specialist, audit-manager, payroll-specialist
**Operations**: supply-chain-manager, logistics-coordinator, procurement-specialist, inventory-manager, facilities-manager, vendor-manager, lean-specialist

**Note**: Uses shared:cfo, shared:operations-manager, shared:compliance-officer, shared:risk-manager

### People-Culture (19 agents, was HR)
**Specialists**: hr-director, talent-acquisition-manager, recruiter, onboarding-specialist, learning-development-manager, performance-management-specialist, compensation-benefits-analyst, employee-relations-specialist, hr-business-partner, diversity-inclusion-specialist, culture-ambassador, hr-analyst, hr-operations-specialist

**Note**: Uses shared:change-manager, shared:compliance-officer for organizational change and compliance

### Customer-Experience (16 agents, was Support/18)
**Specialists**: cx-director, support-manager, support-engineer, customer-service-rep, escalation-manager, onboarding-specialist, training-specialist, knowledge-manager, voc-analyst, cx-analyst

**Note**: 2 agents moved to shared (account-manager, customer-success-manager)

### Legal-Compliance (14 agents, was Legal)
**Specialists**: general-counsel, corporate-lawyer, contract-lawyer, ip-lawyer, employment-lawyer, regulatory-specialist, privacy-officer, legal-analyst, paralegal, compliance-analyst, governance-specialist

**Note**: Uses shared:compliance-officer, shared:risk-manager for enterprise compliance

### Creative (18 agents, unchanged)
**Specialists**: cco, creative-director, story-architect, narrative-designer, plot-developer, character-designer, character-psychologist, worldbuilder, lore-master, prose-stylist, dialogue-specialist, editor, continuity-checker, copy-editor, genre-specialist

**Note**: Uses shared:project-manager for story planning, shared:quality-manager for editorial quality

## Workflow Pattern

**Subagent Architecture**: Agents delegate to specialists, don't execute directly.

Pattern: "Use {subagent} to {task}"
Example: Use shared:project-manager → architect → backend-developer → shared:quality-manager

Benefits: Modularity, specialization, parallelization (up to 50 concurrent), reusability, cross-domain consistency

**V3.0 Enhancement**: Workflows can now seamlessly use both shared (tier-2) and domain (tier-3) agents

## Backward Compatibility

**Agent Aliases**: `/Agent_Memory/_system/agent_aliases.yaml`

**150+ mappings** enable smooth migration:
- `software:ceo` → `shared:ceo`
- `software:architect` → `engineering:architect`
- `sales:account-manager` → `shared:account-manager`
- `hr:*` → `people-culture:*` (wildcard)

**Resolution Priority**:
1. Exact match (domain:agent → target)
2. Wildcard match (domain:* → target-domain:*)
3. No match → assume unchanged

## Task Completion Protocol

**MANDATORY**: All tasks must be fully completed before marking as done.

**Core Rule**: 100% completion with verified evidence, or it's not complete.

Protocol enforced by:
- universal-executor: Verifies ALL acceptance criteria before marking complete
- universal-validator: Checks verification records in task manifests (including shared agents)
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
Auto-routes to domain, executes full workflow with shared agent support.
```bash
/trigger Fix auth bug              # → Engineering domain + shared:project-manager
/trigger Write fantasy story       # → Creative domain + shared:quality-manager
/trigger Plan Q4 campaign          # → Revenue domain + shared:strategic-planner
/trigger Create budget             # → Finance-Operations + shared:cfo
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
├── _system/              # Registry, config, agent status, aliases
│   ├── agent_aliases.yaml        # V3.0 backward compatibility
│   └── domains/{domain}/*.yaml   # Domain configs (router, planner, executor, validator, self-correct)
├── _knowledge/           # Patterns, calibration, learnings
├── _archive/             # Completed instructions
└── {instruction_id}/     # Per-task working memory
    ├── instruction.yaml  # Request + metadata
    ├── status.yaml       # Current phase
    ├── workflow/         # Plan, execution state
    ├── tasks/            # pending/, in_progress/, completed/
    └── outputs/          # Deliverables
```

**Principles**: File-based, instruction-scoped, parallel-safe, pause/resume capable

See `docs/CONTEXT_MANAGEMENT.md` for context handling details.

## Complexity Tiers

| Tier | Type | Example | Workflow |
|------|------|---------|----------|
| 0 | Trivial | "What is X?" | Direct answer |
| 1 | Simple | "Fix typo" | Execute → Validate |
| 2 | Moderate | "Fix bug" | Plan → Execute → Validate (with shared agents) |
| 3 | Complex | "Add feature" | Parallel team execution (domain + shared) |
| 4 | Expert | "Major refactor" | Full orchestration + shared leadership + HITL |

**V3.0 Enhancement**: Tiers 2+ leverage shared agents for planning, quality, risk management

## Workflow Execution

```
User Request → Trigger (domain detect) → Orchestrator
  ↓
  Routing → Universal-Router (tier + shared agent recommendations)
  ↓
  Planning → Universal-Planner (tasks + domain + shared agents)
  ↓
  Executing → Universal-Executor (domain specialists + shared coordination)
  ↓
  Validating → Universal-Validator (domain + shared quality gates)
  ↓
  PASS → Complete | FIXABLE → Self-Correct | BLOCKED → HITL
```

See `workflow_agent_interactions.md` for detailed agent interaction patterns.

## Recursive Workflows

Complex tasks spawn child workflows (max depth: 5, max children: 100)

Example: `/trigger Write 10-chapter novel` → 1 parent + 10 child workflows

**V3.0**: Child workflows inherit shared agent access from parent

## Creating Agents

1. Choose domain (or shared for cross-domain capabilities)
2. Create `{domain}/agents/my-agent.md` with YAML frontmatter
3. Add to `{domain}/.claude-plugin/plugin.json`
4. Test: `claude --plugin-dir .`

**V3.0 Frontmatter**:
```yaml
---
name: my-agent
domain: engineering  # or shared
tier: 3              # 1=core, 2=shared, 3=specialist
dependencies: [shared:project-manager, shared:quality-manager]
---
```

## Creating Domains

1. Create 5 config files: `Agent_Memory/_system/domains/{domain}/*.yaml`
2. Create team agents in `{domain}/agents/`
3. Create plugin manifest: `{domain}/.claude-plugin/plugin.json` (MUST include shared dependency)
4. Update root `.claude-plugin/plugin.json` and `package.json`

No code required - universal agents load configs automatically.

## Directory Structure

```
cAgents/
├── core/                    # Core infrastructure (tier 1)
│   ├── agents/              # 10 core agents
│   └── commands/            # 4 universal commands
├── shared/                  # NEW: Shared capabilities (tier 2)
│   ├── agents/              # 33 shared agents
│   └── .claude-plugin/      # Shared manifest
├── {domain}/                # Domain packages (7 total, tier 3)
│   ├── agents/              # Domain specialists
│   └── .claude-plugin/      # Domain manifest (includes shared dependency)
├── docs/                    # Project documentation
├── .claude-plugin/          # Root manifest
└── Agent_Memory/            # Runtime state (git-ignored)
    └── _system/
        ├── agent_aliases.yaml         # V3.0 backward compatibility
        └── domains/{domain}/*.yaml    # Domain configs
```

**Root Directory Policy**: Only CLAUDE.md, README.md, and workflow_agent_interactions.md should exist in the root. All other documentation belongs in `docs/` or `archive/docs/`.

## Performance Benchmarks

**Reviewer V2.0**: 33% faster, 81% faster to critical, 98% more actionable, 78% pattern detection
**Parallel Execution**: 50x speedup (swarm), 80%+ efficiency
**Optimizer**: 20-50% faster, 30-60% smaller bundles, 15-40% less memory
**V3.0 Architecture**: 12.7% agent reduction, improved consistency via shared capabilities

See `docs/OPTIMIZATION_PROGRESS.md` for detailed optimization tracking.

## Quick Reference

**Commands**: `/trigger`, `/designer`, `/reviewer`, `/optimize`
**Core Agents**: trigger, orchestrator, hitl, optimizer, 5 universal workflow, task-consolidator
**Shared Agents**: 33 cross-domain capabilities (leadership, planning, data, quality, customer, operations)
**Key Files**:
- `.claude-plugin/plugin.json` - Root manifest
- `Agent_Memory/_system/agent_aliases.yaml` - V3.0 backward compatibility
- `Agent_Memory/_system/domains/{domain}/*.yaml` - Domain configs
- `Agent_Memory/_system/task_completion_protocol.yaml` - Mandatory completion rules
- `docs/DOCUMENTATION_STANDARDS.md` - Documentation guidelines
**Critical Rule**: 100% task completion with verified evidence required

## V3.0 Migration

**From V2.0 to V3.0**:
- Old domain names still work (via agent_aliases.yaml)
- Software → Engineering
- HR → People-Culture
- Support → Customer-Experience
- Legal → Legal-Compliance
- Sales + Marketing → Revenue
- Finance + Operations → Finance-Operations
- 30-40 duplicate agents consolidated into shared tier

See migration guide in `docs/` for detailed upgrade instructions.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Wrong domain detected | Use explicit domain keywords |
| Agent not found | Check agent_aliases.yaml for V3.0 mapping |
| Shared agent inaccessible | Verify domain manifest includes shared dependency |
| All 9 QA agents run | Enable `intelligent_agent_selection` in reviewer config |
| No progress updates | Ensure agents use TodoWrite |
| Workflow stuck | Check `Agent_Memory/{instruction_id}/status.yaml` |

Full troubleshooting: `archive/docs/TROUBLESHOOTING.md`

See `docs/WORKFLOW_EVALUATION_FIXES.md` for recent workflow issue resolutions.

---

**Version**: 3.0.0
**Total Agents**: 200 (10 core + 33 shared + 157 specialists)
**Architecture**: V3.0 - 3-Tier Hybrid (infrastructure + shared capabilities + domain specialists)
**Domains**: 7 (engineering, revenue, finance-operations, people-culture, customer-experience, legal-compliance, creative)
**Dependencies**: None (file-based, self-contained)
**Backward Compatibility**: Full (via agent_aliases.yaml)
