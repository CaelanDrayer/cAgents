# Best Practices: Prompt Engineer

> Design principles, patterns, and frameworks that guide high-quality delegation prompt crafting for controller agents.

## Design Principles

- **Context Sufficiency Over Brevity**: A controller should never need to re-search the codebase because the delegation prompt omitted key context — include relevant snippets with file paths and line numbers
- **Measurable Acceptance Criteria**: Every criterion in a delegation prompt must have a verification method (file_exists, test_result, output_contains) — vague criteria produce vague reviews
- **Token Budget Discipline**: Target 300-600 tokens per prompt — enough for full context, not so much it crowds the controller's working memory
- **Specific Anti-Patterns Only**: Never write "don't write bad code" — always name the specific mistake: "Don't use synchronous fs.readFile in async request handlers — use fs.readFileSync causes blocking"
- **Dependency Awareness**: Reference outputs from upstream work items by file path — controllers need to know what earlier tasks produced so they can consume it
- **Confidence Before Output**: Score every prompt on the 5-check rubric before writing delegation_prompts.yaml — prompts below 0.7 get revised, not shipped
- **Read Before Prompting**: Use Grep/Glob/Read to discover actual codebase patterns before writing prompts — prompts built on assumptions mislead controllers

## Key Patterns & Frameworks

- **5-Check Confidence Rubric**: Evaluate every prompt on Context Sufficiency (0.25), Criteria Clarity (0.25), Anti-Pattern Coverage (0.15), Dependency Awareness (0.15), Token Efficiency (0.20) — weighted average must reach 0.7 before output
- **Role-Request-Context-Criteria Structure**: Every delegation prompt follows the same skeleton: controller role, work item description, relevant code snippets, acceptance criteria, constraints, anti-patterns, cross-references
- **Code Snippet Injection**: Pull 10-50 line excerpts from relevant files and embed them with file paths and line numbers — eliminates the controller's need to search for context it will definitely need
- **Verification Method Binding**: Pair each acceptance criterion with how it will be verified: `criterion: "JWT tokens validated" | verification: "grep for validateToken in src/middleware/auth.ts"`
- **Anti-Pattern Specificity Ladder**: Generic anti-patterns (no value) → domain anti-patterns (some value) → task-specific anti-patterns (full value) — always aim for task-specific
- **Dependency Output Reference**: For work items with dependencies, include the output file path from the upstream task — `inputs: outputs/TASK-01_architecture.md` tells the controller exactly where to find prior context
- **Cross-Reference Linking**: When two work items share logic or touch related files, note the relationship in both prompts — prevents duplicated effort and contradictory implementations
- **Token Trimming Technique**: If a prompt exceeds 600 tokens, remove full file contents (keep file paths), remove duplicate information already in plan.yaml, and reduce acceptance criteria descriptions without losing measurability

## Domain Concepts & Terminology

### Prompt Structure Components
- **Role Declaration**: The opening statement telling the controller its identity and scope — "You are a controller coordinating the backend authentication module implementation"
- **Request Description**: The work item's name and description in full, not paraphrased — copy from work_items.yaml to prevent information loss
- **Code Snippet**: A relevant excerpt from the codebase with file path, line numbers, and brief annotation — the most context-dense element per token
- **Acceptance Criterion**: A specific, testable condition that the work item must satisfy — the contract between planner and reviewer
- **Verification Method**: How the reviewer will confirm a criterion is met — must be a concrete check, not "verify the developer confirmed it"
- **Constraint**: A technical boundary the controller must not cross — existing patterns to preserve, deprecated APIs to avoid, version requirements
- **Anti-Pattern**: A named mistake that commonly occurs in similar tasks — "Don't use direct SQL interpolation, use parameterized queries in src/db/query.ts"
- **Cross-Reference**: A pointer to a related work item's output or a shared dependency — `See outputs/TASK-01_schema.md for table definitions`

### Confidence Scoring
- **Context Sufficiency Score**: How completely the prompt provides codebase context the controller will need — 1.0 means no search needed
- **Criteria Clarity Score**: How specifically measurable each acceptance criterion is — 1.0 means every criterion has an unambiguous pass/fail test
- **Anti-Pattern Coverage Score**: Whether anti-patterns listed are task-specific (1.0), generic (0.5), or absent (0.0)
- **Dependency Awareness Score**: Whether upstream dependency outputs are referenced by file path — 1.0 if all referenced, 0.0 if missing
- **Token Efficiency Score**: Whether the prompt is in the 300-600 token sweet spot — 1.0 for in-range, 0.5 for 600-1000, 0.0 for over 1000

### Pipeline Context
- **delegation_prompts.yaml**: The output artifact — one entry per work item, each with controller assignment, prompt text, context files list, token estimate, and confidence scores
- **Prompt Position**: Sits between task-decomposer and controller in the pipeline — consumes work_items.yaml, plan.yaml, enriched_context.yaml; produces delegation_prompts.yaml
- **Context Files List**: The enumeration of files the controller will likely need to read — helps the controller load context efficiently rather than searching

## Anti-Patterns to Avoid

- **Generic Anti-Patterns**: Writing "avoid tight coupling" without specifying where or what — controllers ignore non-specific guidance; name the exact file, function, or pattern
- **Copying Plan Content Verbatim**: Including full plan.yaml or enriched_context.yaml content in every prompt — each prompt should contain only what that specific controller needs, not a full briefing packet
- **Missing File Paths in Snippets**: Including code without citing the source file and line numbers — renders the snippet useless for the controller who needs to locate and modify the actual code
- **Vague Acceptance Criteria**: "Authentication should work correctly" — worthless without a verification method; "JWT validation implemented at src/middleware/auth.ts with tests covering expiry, invalid signature, and missing token" is what's needed
- **Below-Threshold Shipping**: Writing prompts that score below 0.7 on the confidence rubric and outputting them anyway — controllers receiving weak prompts produce weak results that require extra review cycles
- **Ignoring Upstream Dependencies**: Creating delegation prompts for work items that depend on upstream outputs without referencing those outputs — controllers attempt the work without critical prior context
- **Prompt Inflation**: Adding every possibly relevant file or consideration to every prompt regardless of relevance — inflates tokens, reduces focus, and buries the critical context in noise

## Quality Indicators

- **Average Confidence Score**: Mean confidence across all prompts in delegation_prompts.yaml — target >0.85 overall
- **Prompt Token Distribution**: Percentage of prompts within 300-600 token target range — target >90%
- **Controller Clarification Rate**: How often controllers ask clarifying questions that should have been answered by the delegation prompt — lower is better
- **Revision Cycle Correlation**: Whether low-confidence prompts correlate with more REVISE verdicts from reviewers — validates the rubric's predictive power
- **Anti-Pattern Specificity Rate**: Percentage of anti-patterns that are task-specific rather than generic — target >80%
- **Dependency Reference Coverage**: Percentage of work items with dependencies that include upstream output references — target 100%

## Collaboration Touchpoints

- **With task-decomposer**: Consumes work_items.yaml produced by task-decomposer — the acceptance criteria and dependency structure defined there become the backbone of each delegation prompt
- **With universal-planner**: Reads plan.yaml for controller assignment and objectives — ensures prompts align with what the planner intended for each work item
- **With domain controllers**: The primary consumer of delegation_prompts.yaml — a well-crafted prompt reduces the controller's research burden and accelerates coordination quality
- **With orchestrator**: Orchestrator spawns prompt-engineer after decomposition completes — this is a sequential, blocking step; orchestrator waits for delegation_prompts.yaml before spawning the controller
