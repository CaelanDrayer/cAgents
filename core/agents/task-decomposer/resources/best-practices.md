# Best Practices: Task Decomposer

> Design principles, patterns, and frameworks that guide high-quality requirement decomposition, dependency mapping, and work item generation.

## Design Principles

- **Users State Outcomes, Not Requirements**: A request like "add authentication" implies 30+ work items — the decomposer's job is to unpack everything needed, not just the surface request
- **Never Accept Surface Level**: Always classify abstraction level (1-5) and excavate deeper — a Level 5 request ("make it better") requires discovering WHAT, WHERE, HOW, and WHY before decomposing
- **Classify Before Decomposing**: Establish the abstraction level first — the more abstract, the more the decomposer must fill in on behalf of the user
- **Implicit Discovery is Mandatory**: Security requirements, test coverage, error handling, documentation, and monitoring are always implicit — they must be discovered even when the user never mentioned them
- **Dependency Mapping is Non-Negotiable**: Every work item must declare what it depends on — decompositions without dependency graphs produce coordination chaos
- **Concrete Acceptance Criteria**: Acceptance criteria are the contract between planner and reviewer — they must be specific and testable, not aspirational
- **Agent Assignment Per Item**: Every work item must name the specific agent that will execute it — `cagents:architect`, not "someone who knows architecture"

## Key Patterns & Frameworks

- **5-Step Decomposition Framework**: Request Analysis → Component Extraction (UNDERSTAND/DESIGN/BUILD/VERIFY/DOCUMENT) → Implicit Discovery → Dependency Mapping → Work Item Generation — apply in sequence for every request
- **Abstraction Level Classification**: Classify the request as Level 1 (full spec) through Level 5 (pure outcome) before decomposing — determines how much extrapolation is required
- **UNDERSTAND-DESIGN-BUILD-VERIFY-DOCUMENT Components**: The five universal work item types that appear in every non-trivial request — a decomposition missing VERIFY or DOCUMENT is incomplete
- **Unsaid Framework**: A structured approach to discovering implicit requirements — what security implications exist? What tests are needed? What documentation must be updated? What monitoring should be added? What migrations are required?
- **Topological Dependency Graph**: A directed acyclic graph where each node is a work item and each edge is a dependency — the critical path identifies the longest sequential chain
- **Parallel Group Identification**: Work items with no dependencies on each other form parallel groups — the decomposer marks these so the controller can execute them concurrently
- **v10 Agent Chaining Format**: Each work item includes `agent`, `inputs` (file paths of upstream outputs), `outputs` (where this agent writes), and `dependencies` — enables topological execution with context passing
- **Adaptive Chain Depth**: Decomposition depth scales with pipeline path — minimal (2-3 agents), medium (3-5 agents), full (5-8 agents); tier drives which path is used
- **Context-First Approach**: Before decomposing, search the codebase (Grep/Glob/Read) to discover current state — decompositions built without codebase context miss what already exists and what must be preserved

## Domain Concepts & Terminology

### Abstraction Levels
- **Level 1**: Full specification — user has provided all requirements; decomposer validates and structures them
- **Level 2**: Partial specification — user has provided most details but gaps exist; decomposer fills in missing specifics
- **Level 3**: Intent with missing details — user knows what but not how; decomposer defines approach and specifics
- **Level 4**: Vague goal — user knows the area but not the target; decomposer discovers what the target should be
- **Level 5**: Pure outcome — "make it better"; decomposer must discover WHAT, WHERE, HOW, and WHY from scratch

### Work Item Components (v10 Format)
- **ID**: Stable identifier (TASK-01, TASK-02) used for cross-referencing throughout the pipeline
- **Agent**: The specific cAgents agent assigned to execute this work item — must be a real agent name, not a generic role
- **Inputs**: File paths of outputs produced by dependency work items — consumed as context during execution
- **Outputs**: The file path where this work item's agent writes its primary artifact — consumed by dependent work items
- **Acceptance Criteria**: Specific, testable conditions that constitute completion — the contract the reviewer will enforce
- **Dependencies**: List of TASK-IDs that must complete before this work item can start — drives topological execution order
- **Type**: UNDERSTAND, DESIGN, BUILD, VERIFY, or DOCUMENT — classifies the nature of the work

### Dependency Concepts
- **Critical Path**: The longest chain of sequentially dependent work items — determines minimum total execution time
- **Parallel Group**: A set of work items with no mutual dependencies — can execute simultaneously
- **Root Work Item**: A work item with no dependencies — can start immediately in wave 0
- **Leaf Work Item**: A work item that nothing else depends on — often DOCUMENT or VERIFY types
- **Dependency Graph**: The full directed acyclic graph representing all work item relationships

### Implicit Requirement Categories
- **Security Implications**: Authentication, authorization, input validation, output encoding, credential management
- **Testing Requirements**: Unit tests, integration tests, edge case coverage, regression tests
- **Error Handling**: Failure modes, error messages, fallback behaviors, partial failure handling
- **Documentation**: API docs, inline comments for complex logic, README updates, runbook entries
- **Monitoring and Observability**: Logging, metrics, alerting thresholds, health checks
- **Migration Requirements**: Database migrations, data backfills, backward compatibility shims

## Anti-Patterns to Avoid

- **Surface Acceptance**: Decomposing "add authentication" into a single work item "implement auth" — misses 25+ implicit requirements and produces an unexecutable work item
- **Missing VERIFY Items**: Producing a decomposition with no test or verification work items — executable but unvalidated work is incomplete by definition
- **Undeclared Dependencies**: Creating work items without dependency edges — the controller cannot determine execution order and may run items in parallel that must be sequential
- **Vague Acceptance Criteria**: "Authentication should be secure" as an acceptance criterion — the reviewer cannot determine what evidence proves this; use "JWT tokens validated for expiry, invalid signature, and missing token at src/middleware/auth.ts"
- **Missing Agent Assignment**: Work items without a specific agent assignment — the controller must guess who should do the work, introducing decision latency
- **Skipping Codebase Discovery**: Decomposing based on the request alone without reading what already exists — generates work items for things already implemented and misses what must be preserved
- **Over-Decomposition**: Creating 50+ work items for a tier 2 request — coordination overhead exceeds execution value; tier 2 should produce 3-8 work items
- **Ignoring Context Constraints**: Generating work items that conflict with existing architectural decisions or technology constraints found in enriched_context.yaml

## Quality Indicators

- **Implicit Requirement Discovery Rate**: Number of implicit requirements discovered per decomposition relative to request complexity — target 5+ for tier 3+ requests
- **Acceptance Criteria Specificity**: Percentage of acceptance criteria that include a concrete verification method — target 100%
- **Dependency Graph Completeness**: Percentage of work items with either declared dependencies or explicit "no dependencies" annotation — target 100%
- **Agent Assignment Coverage**: Percentage of work items with a specific agent name — target 100%
- **Critical Path Accuracy**: Whether the identified critical path actually represents the longest execution chain — validates dependency graph correctness
- **Work Item Type Distribution**: Balance across UNDERSTAND, DESIGN, BUILD, VERIFY, DOCUMENT — all five types should appear in tier 3+ decompositions

## Collaboration Touchpoints

- **With universal-planner**: Planner orchestrates the planning phase and delegates complex decomposition here — planner writes plan.yaml; decomposer writes work_items.yaml and dependency_graph.yaml; they divide labor on the same planning phase
- **With prompt-engineer**: Prompt-engineer consumes work_items.yaml to build context-rich delegation prompts — the quality of acceptance criteria and dependency declarations in work_items.yaml directly determines prompt quality
- **With controllers**: Controllers consume work_items.yaml to coordinate execution in topological order — precise agent assignments and dependency graphs are the controller's execution blueprint
- **With task-consolidator**: When an agent context-exhausts mid-execution, task-consolidator may invoke task-decomposer to re-decompose the remaining work into smaller micro-tasks for parallel recovery
