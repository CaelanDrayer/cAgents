# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

**cAgents** (Caelan's Agents) is a universal multi-domain agent system for Claude Code. It provides specialized autonomous agent teams that collaborate through a file-based memory system to execute complex tasks across any domain - software engineering, creative writing, business operations, and beyond.

The system features a **V2 Universal Workflow Architecture**:
- **@cagents/core** - Universal infrastructure (Trigger, Orchestrator, HITL, 5 Universal Workflow Agents, Agent_Memory, universal commands)
- **11 Active Domains** - All configured with domain-specific behavior via YAML configs:
  - **@cagents/software** - 41 team agents (software engineering)
  - **@cagents/business** - 18 team agents (business operations)
  - **@cagents/creative** - 17 team agents (creative writing)
  - **@cagents/planning** - 16 team agents (strategic planning)
  - **@cagents/sales** - 17 team agents (sales strategy)
  - **@cagents/marketing** - 21 team agents (marketing campaigns)
  - **@cagents/finance** - 16 team agents (financial analysis)
  - **@cagents/operations** - 15 team agents (process optimization)
  - **@cagents/hr** - 19 team agents (human resources)
  - **@cagents/legal** - 14 team agents (legal compliance)
  - **@cagents/support** - 15 team agents (customer success)

## Core Architecture

### Universal Infrastructure (@cagents/core)

**Core Infrastructure Agents** (3 agents in core/)
- `trigger` - Universal entry point, intent detection, domain routing, recursive workflow support
- `orchestrator` - Phase management conductor (planning → executing → validating → complete)
- `hitl` - Human-in-the-loop escalation for complex decisions

**Universal Workflow Agents** (5 agents in core/) - NEW in V2
- `universal-router` - Tier classification (0-4) across ALL domains via config
- `universal-planner` - Task decomposition across ALL domains via config
- `universal-executor` - **Team coordination via specialized subagent spawning** across ALL domains via config
- `universal-validator` - Quality gates across ALL domains via config
- `universal-self-correct` - Adaptive recovery across ALL domains via config

These 5 universal agents replace 55 domain-specific workflow agents (11 domains × 5 agents) through configuration-driven behavior. Domain-specific logic is defined in `Agent_Memory/_system/domains/{domain}/*.yaml` files.

### Subagent-Oriented Workflow Pattern

**cAgents uses a subagent spawning architecture**: Agents delegate to specialized subagents rather than executing tasks directly.

**Pattern**: "Use the {subagent-name} subagent to {specific task}"

**Examples**:
- **Use the code-reviewer subagent** to find performance issues
- **Then use the optimizer subagent** to fix them
- **Use the architect subagent** to design the API schema
- **Then use the backend-developer subagent** to implement the endpoints
- **Finally use the qa-lead subagent** to create integration tests

**Benefits**:
- **Modularity**: Each subagent handles one concern
- **Specialization**: Right expert for each task
- **Parallelization**: Independent subagents run concurrently
- **Reusability**: Subagent patterns reused across workflows

**See**: `SUBAGENT_WORKFLOW_PATTERNS.md` for comprehensive patterns and examples

### Software Engineering Domain (@cagents/software)

**Workflow**: Handled by universal workflow agents + software domain configs in `Agent_Memory/_system/domains/software/`

**Executive Leadership** (5 agents)
- `ceo` - Strategic vision, stakeholder management, executive decisions
- `cto` - Technology strategy, innovation, technical architecture
- `cfo` - Financial strategy, budgeting, fundraising
- `coo` - Operational execution, process optimization
- `vp-engineering` - Engineering organization, team building

**Team Agents** (18 agents)
- Business: product-owner, stakeholder-rep, finance-manager, compliance
- Technical Leadership: tech-lead, architect, senior-developer
- Development: frontend-developer, backend-developer, qa-lead, security-specialist
- Operations: sysadmin, devops, it-support
- Data & Specialized: dba, data-analyst, ux-designer, scribe

**Intelligence Layer** (5 agents)
- pattern-recognition, risk-assessment, dependency-analyzer, learning-coordinator, predictive-analyst

**QA Layer** (9 agents)
- architecture-reviewer, code-standards-auditor, security-analyst, qa-compliance-officer, performance-analyzer, test-coverage-validator, documentation-reviewer, dependency-auditor, accessibility-checker

### Business Operations Domain (@cagents/business)

**Workflow**: Handled by universal workflow agents + business domain configs in `Agent_Memory/_system/domains/business/`

**Executive Leadership** (1 agent)
- `cso` - Chief Strategy Officer: strategic planning, competitive positioning, market analysis

**Business Team Agents** (18 agents)
- Strategic Management: business-development-manager, market-analyst
- Operations: operations-manager, process-improvement-specialist, supply-chain-manager, quality-manager-business
- Project & Change: project-manager, program-manager, change-manager, business-analyst
- Customer & Sales: customer-success-manager, account-manager, sales-operations-manager
- Specialized Functions: risk-manager, compliance-manager-business, procurement-specialist, facilities-manager

### Agent Memory System

All state persists in the `Agent_Memory/` folder at project root:

```
Agent_Memory/
├── _system/              # System-level state (registry, config, agent status)
├── _archive/             # Completed/archived instructions
├── _knowledge/           # Persistent cross-instruction learning
│   ├── semantic/         # Facts about the project (conventions, entities, domain)
│   ├── procedural/       # How to do things (patterns, strategies, tool recipes)
│   └── calibration/      # Learning data (routing accuracy, strategy effectiveness)
├── _communication/       # Inter-agent message queues
│   ├── inbox/            # Per-agent inboxes
│   └── broadcast/        # Announcements to all agents
└── {instruction_id}/     # Per-instruction working memory
    ├── instruction.yaml  # Original request + metadata
    ├── status.yaml       # Current workflow status
    ├── workflow/         # Plan, execution state, checkpoints
    ├── tasks/            # pending/, in_progress/, completed/, blocked/
    ├── outputs/          # partial/ and final/ deliverables
    ├── decisions/        # Autonomous decision logs
    ├── reviews/          # Review requests and responses
    └── episodic/         # Event history timeline
```

**Key Principles:**
- File-based: All state lives in YAML files, no external API dependencies
- Multi-domain: Shared core, specialized domains
- Instruction-scoped: Each task gets its own isolated folder
- Pause/Resume: Any workflow can pause and resume from files
- Parallel-safe: Multiple instructions can run concurrently
- Agent ownership: Each agent owns specific memory sections
- Archival-first: Completed work automatically moves to `_archive/`

### V2 Universal Workflow Architecture (NEW)

**Configuration-Driven Domain Behavior**

V2 replaces 55 domain-specific workflow agents with 5 universal agents that load domain behavior from YAML configuration files:

```
Agent_Memory/_system/domains/{domain}/
├── router_config.yaml          # Tier classification + template matching
├── planner_config.yaml         # Task patterns + agent assignments
├── executor_config.yaml        # Coordination strategies + workflows
├── validator_config.yaml       # Quality gates + pass criteria
└── self_correct_config.yaml    # Correction strategies + fixes
```

**How Universal Agents Work**

1. **Orchestrator** invokes universal agent via Task tool with domain context
2. **Universal agent** loads config from `Agent_Memory/_system/domains/{domain}/{agent}_config.yaml`
3. **Config drives behavior**: Tier classification, templates, agents, quality gates, etc.
4. **Universal agent** executes using domain-specific patterns from config
5. **Results** written to instruction folder, orchestrator continues phase progression

**Example: Universal-Router Workflow**

```
Orchestrator → Task(universal-router, domain="software", request="Fix login bug")
                   ↓
Universal-Router reads: Agent_Memory/_system/domains/software/router_config.yaml
                   ↓
Config defines:
  - tier_2_indicators: ["Fix bug"]
  - template: "bug_fix"
  - required_agents: 2-3
                   ↓
Universal-Router writes: Agent_Memory/{instruction_id}/workflow/routing.yaml
                   ↓
Orchestrator transitions to planning phase
```

**Recursive Workflows** (NEW in V2)

Workflows can spawn child workflows for complex multi-component work:

```
Parent Workflow (Novel Writing)
  ↓
  Child Workflow 1 (Chapter 1) → Child Workflow 1a (Scene 1)
  Child Workflow 2 (Chapter 2) → Child Workflow 2a (Scene 1)
  Child Workflow 3 (Chapter 3)
```

**Safety Mechanisms**:
- Maximum depth: 5 levels
- Maximum children per parent: 20
- Circular reference prevention
- Parent-child result aggregation

**Creating Child Workflows**:

Universal-executor or other agents can invoke trigger to create child workflows:

```markdown
Use Task tool:
- subagent_type: "trigger"
- prompt: |
    Create child workflow for parent instruction {parent_id}

    Parent domain: creative
    Child request: Write chapter 2 of the novel
    Child domain: creative

    This is a child workflow (depth 1)
```

## Development Commands

### Plugin Installation
```bash
# From Claude Code Marketplace (recommended)
claude /plugin install cagents

# Install specific domain plugins
claude /plugin install @cagents/core
claude /plugin install @cagents/software
claude /plugin install @cagents/creative  # Coming Phase 2

# Local development
cd cAgents
npm install
claude --plugin-dir .
```

### Agent_Memory Initialization

The Agent_Memory folder structure is created automatically when needed by the workflow agents. Skills and workflows handle initialization on first use.

### Available Slash Commands
```bash
/trigger <task>           # Universal entry point - auto-routes to appropriate domain
/designer                 # Interactive design assistant (works across all domains)
/reviewer [path]          # Comprehensive review (code, documents, strategies - all domains)
```

## Directory Structure

```
cAgents/
├── core/                    # @cagents/core - Required foundation
│   ├── .claude-plugin/      # Core plugin manifest
│   ├── agents/              # trigger.md, orchestrator.md, hitl.md
│   ├── commands/            # /trigger, /designer, /reviewer (universal commands)
│   └── memory/              # Agent_Memory templates
│
├── software/                # @cagents/software - Software engineering domain
│   ├── .claude-plugin/      # Software domain plugin manifest
│   ├── agents/              # 46 specialized agents (5 workflow + 41 team)
│   └── skills/              # trigger/, reviewer/
│
├── business/                # @cagents/business - Business operations domain
│   ├── .claude-plugin/      # Business domain plugin manifest
│   ├── agents/              # 23 specialized agents (5 workflow + 18 team)
│   └── package.json
│
├── creative/                # @cagents/creative - Coming Phase 2
├── sales/                   # @cagents/sales - Coming soon
├── marketing/               # @cagents/marketing - Coming soon
├── finance/                 # @cagents/finance - Coming soon
├── operations/              # @cagents/operations - Coming soon
├── support/                 # @cagents/support - Coming soon
├── hr/                      # @cagents/hr - Coming soon
├── legal/                   # @cagents/legal - Coming soon
│
├── .claude-plugin/          # Root plugin manifest
├── package.json             # Root package with workspaces
├── README.md                # Project documentation
└── LICENSE                  # MIT License
```

## Agent File Structure

All agents are defined as Markdown files with YAML frontmatter:

```markdown
---
name: agent-name
description: Brief description. Use PROACTIVELY when...
tools: Read, Grep, Glob, Bash, Edit, Write, TodoWrite
model: sonnet | opus | haiku
color: cyan
capabilities: ["capability1", "capability2", "capability3"]
---

Agent's system prompt and instructions here...
```

## Workflow Execution Flow (V2)

```
User Request
  ↓
Trigger (Core) → Domain Detection → Orchestrator
  ↓                                       ↓
  Creates instruction folder         Phase: Routing
                                          ↓
                                     Universal-Router
                                     (loads domain config)
                                          ↓
                                     Phase: Planning
                                          ↓
                                     Universal-Planner
                                     (loads domain config)
                                          ↓
                                     Phase: Executing
                                          ↓
                                     Universal-Executor
                                     (delegates to team agents)
                                          ↓
                                     Phase: Validating
                                          ↓
                                     Universal-Validator
                                     (loads domain config)
                                          ↓
                                     ┌────┴────┐
                                     │         │
                                   PASS    FIXABLE    BLOCKED
                                     │         │         │
                                     ↓         ↓         ↓
                                Complete  Self-Correct  HITL
                                              ↓
                                           Retry
```

## Complexity Tiers

Tasks are automatically classified by the Router:

| Tier | Type | Example | Workflow |
|------|------|---------|----------|
| 0 | Trivial | "What is X?" | Direct answer |
| 1 | Simple | "Fix typo" | Execute → Validate |
| 2 | Moderate | "Fix bug" | Plan → Execute → Validate |
| 3 | Complex | "Add feature" | Parallel team execution with checkpoints |
| 4 | Expert | "Major refactor" | Full team orchestration + HITL |

## Progress Tracking with TodoWrite

**CRITICAL**: All workflow agents MUST use Claude Code's TodoWrite tool to display progress.

### When to Use TodoWrite

- **Trigger**: Show parsing, folder creation, and handoff steps
- **Orchestrator**: Display high-level phase transitions
- **Planner**: Show planning steps
- **Executor**: Display individual task execution
- **Team Agents**: Show their specific work items

### TodoWrite Format

```javascript
TodoWrite({
  todos: [
    {content: "Step description", status: "completed", activeForm: "Doing step description"},
    {content: "Current step", status: "in_progress", activeForm: "Doing current step"},
    {content: "Future step", status: "pending", activeForm: "Doing future step"}
  ]
})
```

## Important File Locations

### Core Domain
- Core agents: `core/agents/*.md`
- Core commands: `core/commands/*.md`
- Core plugin manifest: `core/.claude-plugin/plugin.json`

### Software Domain
- Software agents: `software/agents/*.md`
- Software commands: `software/commands/*.md`
- Software skills: `software/skills/*/SKILL.md`
- Software plugin manifest: `software/.claude-plugin/plugin.json`

### Root Level
- Root plugin manifest: `.claude-plugin/plugin.json`
- Root package config: `package.json`
- Documentation: `README.md`, `CLAUDE.md`

## Creating New Agents

1. Determine the appropriate domain (core, software, creative, etc.)
2. Create `{domain}/agents/my-agent.md` with YAML frontmatter
3. Define agent identity, responsibilities, and memory ownership
4. Implement collaboration protocols (consultation, review, delegation, escalation)
5. Add agent path to `{domain}/.claude-plugin/plugin.json` agents array
6. Test locally: `claude --plugin-dir .`

## Creating New Domains (V2)

To add a new domain (e.g., @cagents/medical):

**Step 1: Create Domain Configuration Files** (5 configs - NO CODE REQUIRED)

```bash
mkdir -p Agent_Memory/_system/domains/medical
```

Create these 5 YAML configuration files in `Agent_Memory/_system/domains/medical/`:

1. **router_config.yaml** - Tier classification + template matching
2. **planner_config.yaml** - Task patterns + agent assignments
3. **executor_config.yaml** - Coordination strategies + workflows
4. **validator_config.yaml** - Quality gates + pass criteria
5. **self_correct_config.yaml** - Correction strategies + fixes

Use templates from `Agent_Memory/_system/domains/_template/` as starting point.

**Step 2: Create Domain Team Agents** (agent files)

```bash
mkdir -p medical/agents
```

Create team agents in `medical/agents/`:
- Executive: `medical-director.md`, etc.
- Specialists: `surgeon.md`, `diagnostician.md`, etc.
- Support: `nurse.md`, `pharmacist.md`, etc.

_Note: Do NOT create workflow agents (router, planner, executor, validator, self-correct). Universal workflow agents handle all domains._

**Step 3: Update Plugin Manifests**

1. Create `medical/.claude-plugin/plugin.json`:
   ```json
   {
     "name": "@cagents/medical",
     "version": "1.0.0",
     "agents": [
       "./agents/medical-director.md",
       "./agents/surgeon.md",
       ...
     ]
   }
   ```

2. Update root `.claude-plugin/plugin.json` to include medical agent paths
3. Update root `package.json` workspaces array

**That's it!** The universal workflow agents will automatically load the medical domain configs and work with the medical team agents.

## Plugin Manifest Structure

The root `.claude-plugin/plugin.json` aggregates all domains:

```json
{
  "name": "cagents",
  "version": "4.1.0",
  "description": "Universal multi-domain agent system",
  "bundledDomains": ["@cagents/core", "@cagents/software"],
  "commands": [
    "./core/commands/trigger.md",
    "./software/commands/designer.md",
    "./software/commands/reviewer.md"
  ],
  "agents": [
    "./core/agents/trigger.md",
    "./software/agents/router.md",
    // ... all agents from all domains
  ]
}
```

## Plugin Testing

```bash
# Local development and testing
cd cAgents
claude --plugin-dir .

# Test universal /trigger across domains
/trigger Fix the bug in auth.py         # Routes to software domain
/trigger Write a short story about AI    # Routes to creative domain (Phase 2)
/trigger Analyze Q4 sales trends         # Routes to sales domain (Future)
```

---

**Version**: 6.1.0
**Total Agents**: 228 (8 core infrastructure + 220 domain team agents)
**Architecture**: V2 Universal Workflow (5 universal agents + 55 domain configs + 11 domains)
**Dependencies**: None (file-based, self-contained)
**Active Domains**: All 11 domains fully configured (software, business, creative, planning, sales, marketing, finance, operations, hr, legal, support)
