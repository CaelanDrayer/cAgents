# Aggressive Task Decomposition

> **Absorption note (v12.0.0)**: This resource was absorbed from the
> pre-v12.0.0 standalone decomposer agent in v12.0.0 when the pipeline
> collapsed 7 -> 5 states. The planner now handles decomposition inline —
> there is no separate decomposer agent in v12. The Three-Tier Progressive
> Disclosure pattern (see `.claude/rules/core/skill-format.md`) keeps the
> SKILL.md body small while preserving the full decomposition guidance
> here for on-demand loading.

**Role**: Aggressive task decomposition specialist. When a user says "I want X", extrapolate EVERYTHING needed to produce X successfully.

**Philosophy**: Users state outcomes, not requirements. The planner's job is to unpack what they actually need.

**Use When**:
- Tier 3+ complex decomposition is needed inline during planning
- Re-decomposition of consolidated tasks (formerly task-consolidator collaboration)
- Request has implicit requirements that must be made explicit
- Dependencies and prerequisites need discovery

## Core Mission

Transform vague user requests into comprehensive, actionable work breakdowns:

```
User says: "Add authentication to my app"

Planner extrapolates:
├── Discover Current State
├── Design Decisions
├── Backend Requirements (10+ items)
├── Frontend Requirements (7+ items)
├── Security Requirements (5+ items)
├── Testing Requirements (4+ items)
└── Documentation (3+ items)
```

## Abstraction Classification (FIRST STEP)

Before decomposing, classify how abstract the request is:

| Level | Pattern | Extrapolation Needed |
|-------|---------|---------------------|
| 5 | "Make it better" | WHAT, WHERE, HOW, WHY |
| 4 | "Improve performance" | WHERE, HOW, metrics |
| 3 | "Fix the login" | HOW, specifics, criteria |
| 2 | "Add caching to API" | Details, edge cases |
| 1 | Full specification | Validate only |

**The more abstract, the more we must fill in on behalf of the user.**

## Decomposition Framework — The 5 Steps

1. **Request Analysis** - Extract core intent, identify request type
2. **Component Extraction** - DISCOVER, DESIGN, CREATE, VALIDATE, DOCUMENT
   - **DISCOVER** (formerly UNDERSTAND): discover requirements, context, and constraints for any domain
   - **DESIGN**: plan and architect the approach (domain-neutral)
   - **CREATE** (formerly BUILD): produce the primary deliverable — code, content, policy, analysis, or any artifact
   - **VALIDATE** (formerly VERIFY): verify the deliverable meets acceptance criteria (tests, reviews, audits, compliance checks)
   - **DOCUMENT**: capture knowledge for future reference
3. **Implicit Discovery** - What didn't user say but needs?
4. **Dependency Mapping** - What depends on what?
5. **Work Item Generation** - Concrete tasks with acceptance criteria

See also:
- `@resources/component-extraction.md` for the 5-type component breakdown.
- `@resources/dependency-mapping.md` for dependency graph creation.
- `@resources/work-item-generation.md` for work item format and quality.
- `.claude/rules/quality/implicit-discovery.md` for the Unsaid Framework that powers step 3.

## Critical Rules

1. **NEVER accept surface-level requests** - Always dig deeper
2. **ALWAYS classify abstraction level** - How much must we fill in?
3. **ALWAYS identify implicit requirements** - What did user NOT say?
4. **ALWAYS discover dependencies** - What must happen first?
5. **ALWAYS include verification** - How do we know it works?
6. **CONTEXT is king** - Search codebase, understand current state
7. **FILL IN THE BLANKS** - User states outcome, we determine requirements

## v10 Enhanced Work Item Format (Agent Chaining)

Each work item MUST include:
- `agent`: Specific agent assignment (e.g., `cagents:architect`, `cagents:backend-developer`)
- `inputs`: File paths of dependency outputs this work item consumes
- `outputs`: File path where this agent writes its output (format: `outputs/TASK-{N}_{name}.md`)
- `dependencies`: List of work item IDs that must complete before this one starts

```yaml
work_items:
  - id: TASK-01
    name: "Design API architecture"
    agent: cagents:architect
    type: DESIGN
    inputs: [user_request]
    outputs: ["outputs/TASK-01_architecture.md"]
    acceptance_criteria:
      - "Architecture decisions documented"
    dependencies: []

  - id: TASK-02
    name: "Design database schema"
    agent: cagents:backend-developer
    type: BUILD
    inputs: ["outputs/TASK-01_architecture.md"]
    outputs: ["outputs/TASK-02_schema.md"]
    acceptance_criteria:
      - "Schema migration created"
    dependencies: [TASK-01]
```

The controller uses this to execute work items in topological order, passing file outputs from completed dependencies as context to downstream agents.

## Adaptive Chain Depth

Chain depth adapts to pipeline path:
- **Minimal**: 2-3 agents (planner -> executor -> reviewer)
- **Medium**: 3-5 agents (planner -> architect -> executor -> qa -> reviewer)
- **Full**: 5-8 agents (full specialist chain)

## Pipeline Integration (v12.0.0)

In v12.0.0 the pipeline collapses 7 -> 5 states. The planner is the
single state owner for the ORCHESTRATED -> PLANNED transition and produces
BOTH `plan.yaml` AND `work_items.yaml` in one pass. (Pre-v12, the planner
produced only plan.yaml and a separate task-decomposer produced
work_items.yaml during a now-removed DECOMPOSED state.) The planner writes
BOTH artifacts in one pass:

```
/run state machine (v12) -> PLANNED -> planner -> plan.yaml + work_items.yaml + event file
```

### Inputs

- `workflow/enriched_context.yaml` - domain, constraints, project context
- `workflow/plan.yaml` - if previously written this session (revision routing)
- Codebase files via Grep/Glob - context discovery
- `{domain}/config/planner_config.yaml` - domain controller catalog and patterns

### Outputs

- `workflow/plan.yaml` - objectives, controller assignment, temporal analysis, not-in-scope, existing-code, diagrams
- `workflow/work_items.yaml` - v10 enhanced work item format with agent chaining
- `workflow/dependency_graph.yaml` - explicit dependency mappings (if non-trivial)
- `workflow/events/EVT-{N}.yaml` - completion event with `next_state: PLANNED`

## Memory Operations

### Writes
- `workflow/plan.yaml` - Plan with objectives and controller assignment
- `workflow/work_items.yaml` - Pipeline-standard decomposition output
- `workflow/decomposition.yaml` - Optional full decomposition artifact (legacy filename; same content as work_items.yaml)
- `workflow/work_items/` - Individual work item files (optional, for very large breakdowns)
- `workflow/dependency_graph.yaml` - Dependency mappings (when non-trivial)
- `workflow/events/EVT-{N}.yaml` - Completion event

### Reads
- `instruction.yaml` - User request
- `workflow/enriched_context.yaml` - Orchestrator's output
- Codebase files via Grep/Glob - Context discovery
- `{domain}/config/planner_config.yaml` - Domain controller catalog and patterns

---

**Part of**: cAgents Aggressive Task Decomposition (absorbed into planner in v12.0.0)
