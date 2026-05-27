# Best Practices: Universal Planner

> Design principles, patterns, and frameworks that guide high-quality objective definition, controller selection, and plan creation across all domains.

## Design Principles

- **Users State Outcomes, Not Requirements**: A request is an iceberg — the planner surfaces the 90% below the waterline that users didn't explicitly state
- **Fill in the Blanks**: When the request is abstract, the planner determines WHAT, HOW, and implicit prerequisites — specificity is the planner's primary contribution
- **Plan.yaml Stays Concise**: plan.yaml is a strategic document, not a specification — keep it under 80 lines; detailed acceptance criteria live in decomposition.yaml
- **Decomposition for Tier 3+**: For complex requests, delegate deep decomposition to task-decomposer — planner writes plan.yaml and orchestrates the planning phase; decomposer writes work_items.yaml
- **Auto-Proceed After Planning**: After writing plan.yaml and decomposition.yaml, signal completion immediately — no user review, no approval requests
- **Controller Selection is Consequential**: The controller assigned in plan.yaml determines the expertise, coordination style, and quality approach for the entire workflow — choose based on domain, tier, and work nature
- **Context Efficiency**: plan.yaml and decomposition.yaml token budgets are enforced — bloated planning documents slow every subsequent agent in the pipeline

## Key Patterns & Frameworks

- **5-Step Extrapolation Process**: Classify abstraction level → Discover WHAT specifically → Discover HOW (approach, method, patterns) → Fill in unsaid (pre-work, during-work, post-work) → Decompose aggressively into concrete work items — apply in order for every planning request
- **UNDERSTAND-DESIGN-BUILD-VERIFY-DOCUMENT Framework**: Every non-trivial plan should include work items from all five types — a plan with no VERIFY items is an incomplete plan; a plan with no UNDERSTAND items is flying blind
- **Temporal Analysis**: Identify the likely sequence of challenges over time (hour 1: foundations, hour 2-3: core complexity, hour 4-5: integration challenges, hour 6+: edge cases) — helps controllers anticipate blockers before encountering them
- **Not-in-Scope Explicit Declaration**: For every obvious extension the user might expect, explicitly state why it's out of scope and where it belongs in future planning — prevents scope creep and clarifies boundaries
- **Existing Code Discovery**: Search for relevant existing files before planning — plans that ignore what already exists generate redundant or conflicting work items
- **Controller Catalog Lookup**: Read `{domain}/config/domain_overrides.yaml` to find the controller catalog for the detected domain and tier — never guess controller names
- **Context Budget Enforcement**: plan.yaml < 80 lines (~800 tokens); decomposition.yaml < 150 lines (~1500 tokens) — enforce these limits by removing verbose descriptions and keeping acceptance criteria concise
- **No-Duplicate Criteria Rule**: Define acceptance criteria once in decomposition.yaml — do not repeat them in plan.yaml objectives; cross-reference by TASK-ID from plan to decomposition
- **Event Completion Signal**: After writing plan.yaml AND work_items.yaml, write EVT-2 to `workflow/events/` — the /run state machine reads this event to advance from ORCHESTRATED to PLANNED. (v12.0.0: planner produces both artifacts inline; pre-v12 the state advanced to DECOMPOSED after a separate task-decomposer ran, but that state no longer exists.)

## Domain Concepts & Terminology

### Plan Components
- **Objectives**: 2-5 high-level goals the workflow must achieve — expressed as outcomes, not activities; the validator checks these at the end
- **Controller Assignment**: The primary controller and any supporting controllers — chosen based on domain, tier, and work complexity; drives the entire coordination phase
- **Temporal Analysis**: Time-phased description of when complexity emerges — helps controllers anticipate and sequence their Q&A delegation
- **Not-in-Scope**: Explicit list of extensions that are out of scope with rationale and future consideration — prevents scope creep by naming and setting aside common extensions
- **Existing Code**: Relevant files already in the codebase that the workflow must extend, avoid duplicating, or migrate from — essential context for implementation planning
- **Work Breakdown File**: Reference to `workflow/decomposition.yaml` where full work item detail lives — plan.yaml stays strategic, decomposition.yaml is tactical

### Abstraction Levels
- **Level 1 (Full Spec)**: Validate and structure — requirements are complete; planner organizes them into work items
- **Level 2 (Partial Spec)**: Fill in gaps — most details exist; planner adds missing specifics
- **Level 3 (Intent)**: Define approach — user knows what, not how; planner determines methodology
- **Level 4 (Vague Goal)**: Discover target — user knows the area; planner defines the specific target
- **Level 5 (Pure Outcome)**: Full extrapolation — "make it better"; planner discovers everything from scratch

### Controller Selection Criteria
- **Tier 2**: Single primary controller — tech-lead for engineering, narrative-director for creative, operations-manager for business
- **Tier 3**: Primary + 1-2 supporting controllers — adds architect or security-lead for complex engineering
- **Tier 4**: Executive + primary + 2-4 supporting + HITL — for architectural migrations and company-wide changes
- **Domain Override**: Each domain's `domain_overrides.yaml` provides the controller catalog — always use this, never guess

### Decomposition Types
- **Inline Decomposition (Tier 2)**: Planner handles decomposition directly within plan creation — produces plan.yaml with embedded work items for simple requests
- **Delegated Decomposition (Tier 3+)**: Planner delegates to task-decomposer which writes a separate decomposition.yaml — enables deeper abstraction handling and more aggressive work item generation

## Anti-Patterns to Avoid

- **Surface-Level Acceptance**: Writing a plan for "implement auth" with 2-3 work items when the request implies 20+ — the user stated an outcome; the planner is responsible for unpacking all the work it entails
- **Verbose plan.yaml**: plan.yaml exceeding 80 lines with detailed per-work-item descriptions — context bloat slows every downstream agent; detail belongs in decomposition.yaml
- **Duplicate Acceptance Criteria**: Repeating full acceptance criteria in both plan.yaml objectives AND decomposition.yaml work items — define once, reference by TASK-ID from the other file
- **Controller Guessing**: Assigning a controller without reading the domain's `domain_overrides.yaml` controller catalog — guessed names may not exist or may be wrong tier
- **Missing Temporal Analysis**: Omitting the time-phased challenge forecast — controllers entering coordination without temporal context encounter surprises that were predictable
- **No Existing Code Discovery**: Planning without searching the codebase for existing relevant files — generates redundant work items and conflicts with what's already implemented
- **Permission Waiting**: Writing plan.yaml then waiting for user approval before signaling completion — auto-proceed is mandatory; waiting delays the entire pipeline unnecessarily

## Quality Indicators

- **Plan.yaml Token Count**: Size of plan.yaml in tokens — target <800; values over 1500 indicate bloat
- **Work Item Count by Type**: Distribution across UNDERSTAND, DESIGN, BUILD, VERIFY, DOCUMENT — all five should appear in tier 3+ plans
- **Implicit Requirement Discovery Count**: Number of requirements surfaced that the user did not explicitly state — target >5 for tier 3+ requests
- **Existing Code References**: Number of existing files discovered and noted in plan.yaml — target >2 for requests in an existing codebase
- **Controller Selection Correctness**: Whether the selected controller matches the domain config's recommendation for the tier — validated against domain_overrides.yaml
- **Temporal Analysis Coverage**: Whether the analysis covers early (foundations), middle (core complexity), and late (integration) phases — target all three phases present

## Collaboration Touchpoints

- **With orchestrator**: Orchestrator spawns planner after enriched_context.yaml is written — planner reads enriched_context.yaml as its primary input and returns plan.yaml to the pipeline
- **With task-decomposer**: For tier 3+ requests, planner delegates decomposition to task-decomposer — planner writes strategic objectives; decomposer writes granular work items with acceptance criteria and dependency graphs
- **With prompt-engineer**: Prompt-engineer consumes plan.yaml and decomposition.yaml to build delegation prompts — plan quality directly affects prompt quality; clear controller assignment and objectives produce better prompts
- **With domain controllers**: Controllers read plan.yaml as their primary coordination brief — the objectives and temporal analysis guide which questions the controller asks and in what order
