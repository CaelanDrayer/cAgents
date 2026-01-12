# cAgents V5.0: Controller-Centric Architecture

**Version**: 5.0
**Release Date**: 2026-01-12
**Architecture**: Controller-Centric Question-Based Delegation

## Executive Summary

V5.0 represents a complete architectural overhaul from V4.0, introducing a **controller-centric coordination layer** that uses **question-based delegation** to execute work.

**Key Innovation**: Controllers coordinate execution by asking questions to specialists, synthesizing answers, and coordinating implementation—not by creating detailed task lists upfront.

## Core Concept

**Controllers are the coordination hub** between planning and execution:

```
V4.0 (REPLACED):
Planner → Detailed Tasks → Executor → Team Agents

V5.0 (NEW):
Planner → Objectives → Controller → Questions → Execution Agents → Answers → Controller → Synthesized Solution → Implementation
```

## Architecture Overview

### 4-Tier System

| Tier | Role | Count | Purpose |
|------|------|-------|---------|
| **1: Core** | Infrastructure | 10 | Workflow orchestration |
| **2: Controller** | Coordination | ~50 | Question-based delegation and synthesis |
| **3: Execution** | Specialists | ~150 | Answer questions and execute tasks |
| **4: Support** | Operations | ~19 | Foundational services |

### Workflow Phases (V5.0)

```
routing → planning → coordinating → executing → validating
   ↓          ↓           ↓            ↓           ↓
  Router   Planner   Controller   Executor   Validator
(tier 0-4) (objectives) (questions) (monitor) (quality)
```

**NEW Phase**: **Coordinating** - Controllers break objectives into questions, delegate to specialists, synthesize answers

## Question-Based Delegation Pattern

### Pattern Overview

1. **Planner defines objectives** (high-level goals)
2. **Controller receives objectives**
3. **Controller breaks into questions** (specific, answerable queries)
4. **Controller delegates questions** to execution agents (one question per agent)
5. **Execution agents answer** with expertise
6. **Controller synthesizes answers** into coherent solution
7. **Controller coordinates implementation** by assigning tasks
8. **Executor monitors** controller progress

### Example: Implement OAuth2 Authentication

**Planner Output (V5.0)**:
```yaml
objectives:
  - "Implement OAuth2 authentication for API"
  - "Maintain backward compatibility"
  - "Follow security best practices"

success_criteria:
  - "OAuth2 endpoints functional"
  - "Existing auth still works"
  - "Security audit passes"

controller_assignment:
  primary: engineering:engineering-manager
```

**Controller Questions**:
1. "What is current auth implementation?" → backend-developer
2. "What OAuth2 library for Node.js?" → architect
3. "What security vulnerabilities to watch for?" → security-specialist
4. "What tests are required?" → qa-lead

**Controller Synthesis**:
```yaml
synthesized_solution:
  approach: "Add passport-oauth2 alongside passport-local"
  implementation_steps: [10 steps derived from answers]
  risks: [identified from security-specialist]
  tests: [from qa-lead recommendations]
```

**Controller Implementation Coordination**:
- Backend-developer: Implement OAuth2 endpoints
- QA-lead: Create comprehensive tests
- Security-specialist: Security review

## V5.0 vs V4.0 Comparison

| Aspect | V4.0 (REPLACED) | V5.0 (NEW) |
|--------|----------------|------------|
| **Planning** | Detailed task lists | High-level objectives |
| **Coordination** | Executor manages team | Controller coordinates via questions |
| **Agent Assignment** | Planner assigns agents | Controller delegates to specialists |
| **Task Breakdown** | Planner creates tasks | Controller creates tasks from synthesized solution |
| **Execution** | Executor tracks tasks | Executor monitors controller |
| **Flexibility** | Rigid upfront planning | Adaptive question-based approach |
| **Complexity** | High (detailed planning) | Low (objective-focused) |

## Core Infrastructure Changes

### Orchestrator (V5.0)

**NEW**: Added **coordinating** phase between planning and executing

```
routing → planning → coordinating → executing → validating
```

### Universal-Planner (V5.0)

**Role Changed**: From detailed task creator to objective definer + controller selector

**V4.0**: Created task lists, assigned agents, defined dependencies
**V5.0**: Defines objectives, selects controllers, sets coordination approach

### Universal-Executor (V5.0)

**Role Changed**: From team coordinator to controller monitor

**V4.0**: Spawned execution agents, tracked tasks, managed dependencies
**V5.0**: Monitors controllers, tracks questions/answers, aggregates outputs

## Agent Tier Classification

### Tier 1: Core Infrastructure (10 agents)

- trigger
- orchestrator
- universal-router
- universal-planner
- universal-executor
- universal-validator
- universal-self-correct
- hitl
- optimizer
- task-consolidator

### Tier 2: Controllers (~50 agents)

**Purpose**: Coordinate work through question-based delegation

**Key Controllers by Domain**:
- **Engineering**: cto, vp-engineering, engineering-manager, architect, tech-lead, backend-lead, frontend-lead, qa-lead, devops-lead, security-lead
- **Revenue**: cro, sales-strategist, marketing-strategist, campaign-manager
- **Creative**: cco, creative-director, story-architect, editor
- **Finance**: cfo, financial-controller, fp-and-a-manager
- **Operations**: coo, operations-manager
- **HR**: chro, talent-acquisition-lead
- **Legal**: general-counsel, compliance-director
- **Shared**: ceo, strategic-planner, program-manager, project-manager

### Tier 3: Execution (~150 agents)

**Purpose**: Answer questions and execute implementation tasks

**By Domain**:
- **Engineering** (25): backend-developer, frontend-developer, qa-analyst, devops, security-specialist, etc.
- **Revenue** (32): sales-rep, copywriter, seo-specialist, marketing-analyst, etc.
- **Creative** (14): novelist, screenwriter, character-developer, copy-editor, etc.
- **Finance** (12): financial-analyst, accountant, tax-specialist, etc.
- **Operations** (13): operations-analyst, supply-chain-analyst, logistics-coordinator, etc.
- **HR** (15): recruiter, hr-generalist, trainer, etc.
- **Customer** (15): support-agent, success-analyst, community-manager, etc.
- **Legal** (12): legal-counsel, contract-specialist, compliance-analyst, etc.
- **Shared** (24): business-analyst, data-analyst, market-research-analyst, etc.

### Tier 4: Support (~19 agents)

**Purpose**: Foundational services and operations

## Coordination Patterns by Tier

### Tier 0: Trivial
- **Flow**: routing → answer
- **Controllers**: None
- **Example**: "What is X?"

### Tier 1: Simple
- **Flow**: routing → planning → executing → validating
- **Controllers**: None (direct execution)
- **Example**: "Fix typo in file"

### Tier 2: Moderate
- **Flow**: routing → planning → **coordinating** → executing → validating
- **Controllers**: 1 primary controller
- **Example**: "Fix authentication bug"
- **Pattern**: engineering-manager asks questions, synthesizes, coordinates

### Tier 3: Complex
- **Flow**: routing → planning → **coordinating** → executing → validating
- **Controllers**: 1 primary + 1-2 supporting
- **Example**: "Implement OAuth2 system"
- **Pattern**: engineering-manager (primary) + architect + security-specialist (supporting)

### Tier 4: Expert
- **Flow**: routing → planning → **coordinating** → executing → validating + HITL
- **Controllers**: 1 executive + 1 primary + 2-4 supporting
- **Example**: "Migrate to microservices"
- **Pattern**: cto (executive) + engineering-manager (primary) + architect + devops-lead + security-specialist (supporting)

## Benefits of V5.0

### 1. Simpler Planning
- Define objectives, not detailed tasks
- Let controllers figure out "how" based on context
- Less upfront planning overhead

### 2. Expert-Driven Execution
- Controllers use domain expertise to break down work
- Execution agents provide specialist knowledge
- Adaptive to context and constraints

### 3. Flexible Coordination
- Question-based approach adapts to what's discovered
- Not locked into predetermined task list
- Can pivot based on answers received

### 4. Clear Separation of Concerns
- **Planner**: WHAT needs to be done (objectives)
- **Controller**: HOW to coordinate (questions + synthesis)
- **Execution**: WHO does specific work (specialists)
- **Executor**: WHEN complete (monitoring)

### 5. Reduced Complexity
- Executor monitors controllers, not individual tasks
- Controllers coordinate teams, not planner or executor
- Fewer agents to manage at orchestration level

## Migration from V4.0

### What's Removed
- ❌ Detailed task lists in planning phase
- ❌ Direct agent assignment by planner
- ❌ Task dependency management in planner
- ❌ Direct team management by executor
- ❌ Capability tags (replaced with tier designation)

### What's Added
- ✅ Objective-based planning
- ✅ Controller selection in planning
- ✅ Coordinating phase
- ✅ Question-based delegation pattern
- ✅ Controller monitoring by executor
- ✅ Tier designation (controller vs execution)

### Breaking Changes
- **Plan schema**: No more `tasks` array, now `objectives` + `success_criteria` + `controller_assignment`
- **Executor role**: No longer spawns execution agents, spawns controllers
- **Agent frontmatter**: `tier: controller|execution` instead of `capabilities: [...]`

## File Structure Changes

### V4.0 Plan (REPLACED)
```yaml
tasks:
  - id: task_001
    name: "Design architecture"
    agent: architect
    dependencies: []
  - id: task_002
    name: "Implement backend"
    agent: backend-developer
    dependencies: [task_001]
```

### V5.0 Plan (NEW)
```yaml
objectives:
  - "Implement OAuth2 authentication"
  - "Maintain backward compatibility"

success_criteria:
  - "OAuth2 endpoints functional"
  - "Existing auth still works"

controller_assignment:
  primary: engineering:engineering-manager
  supporting: [engineering:architect]

coordination_approach: question_based
```

### NEW File: coordination_log.yaml
```yaml
questions_asked:
  - question: "What is current auth?"
    delegated_to: backend-developer
    answer: {...}

synthesized_solution:
  approach: "..."
  implementation_steps: [...]

implementation_tasks:
  - task_id: task_001
    assigned_to: backend-developer
    status: completed
```

## Success Criteria for V5.0

- ✅ Orchestrator includes coordinating phase
- ✅ Planner defines objectives (not tasks)
- ✅ Planner selects controllers
- ✅ Controllers use question-based delegation
- ✅ Execution agents answer questions with expertise
- ✅ Controllers synthesize answers into solutions
- ✅ Executor monitors controllers (not individual tasks)
- ✅ coordination_log.yaml tracks Q&A cycles
- ✅ All 229 agents categorized (controller vs execution)

---

**Version**: 5.0
**Architecture**: Controller-Centric Question-Based Delegation
**Total Agents**: 229 (10 core + 50 controllers + 150 execution + 19 support)
**Key Innovation**: Controllers coordinate via questions, not predetermined task lists
