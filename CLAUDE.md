# CLAUDE.md

Core architecture and development guidance for cAgents.

## Documentation Structure

- `CLAUDE.md` - Architecture, commands, agents (this file)
- `README.md` - Quick start
- `archive/docs/` - Detailed guides (local only)
- `Agent_Memory/` - Runtime state (excluded from git)

## Project Overview

**cAgents**: Universal multi-domain agent system with massive parallel execution (up to 50 concurrent agents).

**Architecture**: V2 Universal Workflow
- **Core**: 9 infrastructure agents (trigger, orchestrator, hitl, optimizer, 5 universal workflow agents)
- **Domains**: 11 domains, 219 team agents total
- **Execution**: 4 modes (Sequential, Pipeline, Swarm, Mesh) - up to 50x speedup

**Domains** (agent counts):
- Software (45) | Business (18) | Creative (18) | Planning (17) | Sales (18) | Marketing (22)
- Finance (17) | Operations (15) | HR (19) | Legal (14) | Support (18)

## Core Infrastructure

**4 Orchestration Agents**:
- `trigger` - Entry point, domain detection, routing
- `orchestrator` - Phase conductor (routing → planning → executing → validating)
- `hitl` - Human escalation
- `optimizer` - Universal optimization (code, content, processes, data, infrastructure, campaigns)

**5 Universal Workflow Agents** (config-driven, work across ALL domains):
- `universal-router` - Tier classification (0-4)
- `universal-planner` - Task decomposition
- `universal-executor` - Team coordination via subagent spawning
- `universal-validator` - Quality gates
- `universal-self-correct` - Adaptive recovery

**Config Location**: `Agent_Memory/_system/domains/{domain}/*.yaml` (5 files per domain: router, planner, executor, validator, self-correct)

## Workflow Pattern

**Subagent Architecture**: Agents delegate to specialists, don't execute directly.

Pattern: "Use {subagent} to {task}"
Example: Use architect → backend-developer → qa-lead

Benefits: Modularity, specialization, parallelization (up to 50 concurrent), reusability

## Commands

### /trigger - Universal Entry Point
Auto-routes to domain, executes full workflow.
```bash
/trigger Fix auth bug           # → Software domain
/trigger Write fantasy story    # → Creative domain
/trigger Plan Q4 campaign       # → Marketing domain
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

## Agent Memory

```
Agent_Memory/
├── _system/              # Registry, config, agent status
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

## Domain Agents

### Software (45 agents)
**Leadership**: ceo, cto, cfo, coo, vp-engineering
**Leads**: engineering-manager, frontend-lead, backend-lead, devops-lead, data-lead, security-lead, qa-lead
**Developers**: frontend-developer, backend-developer, senior-developer
**Specialists**: architect, dba, data-analyst, ux-designer, security-specialist, devops, sysadmin, it-support, scribe
**Business**: product-owner, stakeholder-rep, finance-manager, compliance
**Intelligence** (5): pattern-recognition, risk-assessment, dependency-analyzer, learning-coordinator, predictive-analyst
**QA** (9): architecture-reviewer, code-standards-auditor, security-analyst, qa-compliance-officer, performance-analyzer, test-coverage-validator, documentation-reviewer, dependency-auditor, accessibility-checker
**Special**: reviewer (enhanced v2.0)

### Other Domains
See `archive/docs/DOMAIN_AGENTS.md` for complete listings of all 11 domains.

## Complexity Tiers

| Tier | Type | Example | Workflow |
|------|------|---------|----------|
| 0 | Trivial | "What is X?" | Direct answer |
| 1 | Simple | "Fix typo" | Execute → Validate |
| 2 | Moderate | "Fix bug" | Plan → Execute → Validate |
| 3 | Complex | "Add feature" | Parallel team execution |
| 4 | Expert | "Major refactor" | Full orchestration + HITL |

## Workflow Execution

```
User Request → Trigger (domain detect) → Orchestrator
  ↓
  Routing → Universal-Router (tier + template)
  ↓
  Planning → Universal-Planner (tasks + agents)
  ↓
  Executing → Universal-Executor (team coordination)
  ↓
  Validating → Universal-Validator (quality gates)
  ↓
  PASS → Complete | FIXABLE → Self-Correct | BLOCKED → HITL
```

## Recursive Workflows

Complex tasks spawn child workflows (max depth: 5, max children: 20)

Example: `/trigger Write 10-chapter novel` → 1 parent + 10 child workflows

## Creating Agents

1. Choose domain
2. Create `{domain}/agents/my-agent.md` with YAML frontmatter
3. Add to `{domain}/.claude-plugin/plugin.json`
4. Test: `claude --plugin-dir .`

## Creating Domains

1. Create 5 config files: `Agent_Memory/_system/domains/{domain}/*.yaml`
2. Create team agents in `{domain}/agents/`
3. Create plugin manifest: `{domain}/.claude-plugin/plugin.json`
4. Update root `.claude-plugin/plugin.json` and `package.json`

No code required - universal agents load configs automatically.

## Directory Structure

```
cAgents/
├── core/                    # Core infrastructure
│   ├── agents/              # 9 core agents
│   └── commands/            # 4 universal commands
├── {domain}/                # Domain packages (11 total)
│   ├── agents/              # Team agents
│   └── .claude-plugin/      # Domain manifest
├── .claude-plugin/          # Root manifest
└── Agent_Memory/            # Runtime state (git-ignored)
```

## Performance Benchmarks

**Reviewer V2.0**: 33% faster, 81% faster to critical, 98% more actionable, 78% pattern detection
**Parallel Execution**: 50x speedup (swarm), 80%+ efficiency
**Optimizer**: 20-50% faster, 30-60% smaller bundles, 15-40% less memory

## Quick Reference

**Commands**: `/trigger`, `/designer`, `/reviewer`, `/optimize`
**Core Agents**: trigger, orchestrator, hitl, optimizer, 5 universal workflow
**Key Files**: `.claude-plugin/plugin.json`, `Agent_Memory/_system/domains/{domain}/*.yaml`

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Wrong domain detected | Use explicit domain keywords |
| All 9 QA agents run | Enable `intelligent_agent_selection` in reviewer config |
| No progress updates | Ensure agents use TodoWrite |
| Workflow stuck | Check `Agent_Memory/{instruction_id}/status.yaml` |

Full troubleshooting: `archive/docs/TROUBLESHOOTING.md`

---

**Version**: 6.3.0
**Total Agents**: 228 (9 core + 219 domain)
**Architecture**: V2 Universal Workflow (config-driven, 11 domains)
**Dependencies**: None (file-based, self-contained)
