# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

**cAgents** (Caelan's Agents) is a universal multi-domain agent system for Claude Code. It provides specialized autonomous agent teams that collaborate through a file-based memory system to execute complex tasks across any domain - software engineering, creative writing, business operations, and beyond.

The system features a **modular multi-domain architecture**:
- **@cagents/core** - Universal infrastructure (Trigger, Orchestrator, HITL, Agent_Memory)
- **@cagents/software** - 46 software engineering agents (default installation)
- **@cagents/creative** - Creative writing agents (Phase 2)
- Future domains: Sales, Marketing, Finance, Operations, Support, HR, Legal

## Core Architecture

### Universal Infrastructure (@cagents/core)

**Core Workflow Agents** (3 agents in core/)
- `trigger` - Universal entry point, intent detection, domain routing
- `orchestrator` - Phase management (planning → executing → validating → complete)
- `hitl` - Human-in-the-loop escalation for complex decisions

### Software Engineering Domain (@cagents/software)

**Workflow Agents** (5 agents in software/)
- `router` - Classifies complexity (tier 0-4) and assigns templates
- `planner` - Decomposes tasks into executable subtasks
- `executor` - Runs tasks using tools and produces outputs
- `validator` - Quality gate that classifies results (PASS/FIXABLE/BLOCKED)
- `self-correct` - Adaptive recovery using learned strategies

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

### First Run Initialization

On first install, `npm install` automatically initializes the Agent_Memory structure, creating:
- `Agent_Memory/_system/` with registry.yaml, config.yaml, agent_status.yaml
- `Agent_Memory/_archive/` for completed workflows
- `Agent_Memory/_knowledge/` with semantic/, procedural/, calibration/ folders
- `Agent_Memory/_communication/inbox/` with per-agent folders
- `Agent_Memory/_communication/broadcast/` for system announcements

The Agent_Memory folder structure is created automatically when needed by the workflow agents.

### Available Slash Commands
```bash
/trigger <task>           # Universal entry point - auto-routes to appropriate domain
/designer                 # Interactive design assistant (software domain)
/reviewer [path]          # Comprehensive code review (software domain)
/plugins                  # List available agents across all domains
```

## Directory Structure

```
cAgents/
├── core/                    # @cagents/core - Required foundation
│   ├── .claude-plugin/      # Core plugin manifest
│   ├── agents/              # trigger.md, orchestrator.md, hitl.md
│   ├── commands/            # /trigger command
│   └── package.json
│
├── software/                # @cagents/software - Software engineering domain
│   ├── .claude-plugin/      # Software domain plugin manifest
│   ├── agents/              # 46 specialized agents
│   ├── commands/            # /designer, /reviewer, /plugins
│   ├── skills/              # trigger/, reviewer/
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

## Workflow Execution Flow

```
User Request
  ↓
Trigger (Core) → Domain Detection → Router → Planner → Executor (Team Agents) → Validator
                                                                                      ↓
                                                               PASS ← ← ← ← ← ← ← ←┘
                                                                 ↓
                                                              Complete

                                                            FIXABLE
                                                                 ↓
                                                           Self-Correct → Retry

                                                            BLOCKED
                                                                 ↓
                                                               HITL
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

## Creating New Domains

To add a new domain (e.g., @cagents/medical):

1. Create domain folder: `medical/`
2. Add structure:
   ```
   medical/
   ├── .claude-plugin/plugin.json
   ├── agents/
   ├── commands/
   ├── skills/
   └── package.json
   ```
3. Update root `package.json` workspaces array
4. Update root `.claude-plugin/plugin.json` to include domain paths
5. Create domain-specific router in `medical/agents/router.md`

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

# Verify all agents load correctly
/plugins

# Test universal /trigger across domains
/trigger Fix the bug in auth.py         # Routes to software domain
/trigger Write a short story about AI    # Routes to creative domain (Phase 2)
/trigger Analyze Q4 sales trends         # Routes to sales domain (Future)
```

---

**Version**: 4.1.0
**Total Agents**: 46 (3 core + 43 software)
**Architecture**: Multi-domain (Core + Domains)
**Dependencies**: None (file-based, self-contained)
**Primary Domain**: Software Engineering (@cagents/software)
