# Best Practices: Task Consolidator

> Design principles, patterns, and frameworks that guide high-quality task splitting, parallel distribution, and result merging for large-scale workflows.

## Design Principles

- **Parallel First**: Independent work items should always execute in parallel — sequential execution wastes context budget and wall-clock time
- **Context Safety Ceiling**: No micro-task should exceed 8K tokens — context exhaustion in micro-tasks defeats the entire purpose of splitting
- **Graceful Partial Failure**: One failed micro-task must never block the entire consolidation — collect successes, document failures, merge what completed
- **Group by File Locality**: Work items touching the same file belong in the same micro-task — prevents merge conflicts and race conditions
- **Minimum Viable Split**: Micro-tasks smaller than 2K tokens cost more in coordination overhead than they save — don't over-fragment
- **Verify Against Original Criteria**: After merging micro-task outputs, re-check the original acceptance criteria — individual pieces passing does not guarantee the merged result passes
- **Split Before Retry**: When invoked by universal-self-correct to recover an exhausted agent, always produce smaller micro-tasks than the original scope — same scope guarantees same exhaustion

## Key Patterns & Frameworks

- **File-Based Splitting**: Partition work by file — each micro-task handles one or a small set of related files; prevents merge conflicts and keeps scope concrete
- **Function-Based Splitting**: When multiple functions in the same file need changes, each function becomes a micro-task — finer granularity than file-based, used when a single file is too large
- **Operation-Based Splitting**: When multiple independent analyses are needed (security audit, performance audit, compliance audit), each becomes a separate micro-task — results are orthogonal and trivially mergeable
- **Chapter-Based Splitting**: For large content generation (documentation, stories, reports), each chapter or section is a micro-task — sequential ordering is applied at merge time
- **Data-Based Splitting**: For large dataset analysis, partition the data (by date range, category, region) and assign each partition to a micro-task — reduce/aggregate at consolidation
- **Fan-Out/Fan-In Pattern**: Consolidator fans out N micro-tasks in parallel, collects all N outputs, fans in to merge — the classic map-reduce pattern applied to agent work items
- **Dependency-Aware Grouping**: Before splitting, build a dependency graph — items with dependencies must be in the same micro-task or ordered sequentially; independent items go parallel
- **Merge Conflict Prevention**: If two micro-tasks edit the same file, they must be in the same micro-task or one must complete before the other starts — parallel edits to the same file always conflict
- **Checkpoint-Based Recovery**: When invoked after a waypoint, read the checkpoint to identify exactly which items completed vs. which remain — only split the remaining items, not the full original scope

## Domain Concepts & Terminology

### Splitting Strategies
- **File-Based**: One micro-task per file or small file group — best for refactoring, multi-file edits
- **Function-Based**: One micro-task per function within a large file — best for optimization passes over a single module
- **Operation-Based**: One micro-task per analysis type — best for multi-faceted audits with orthogonal outputs
- **Chapter-Based**: One micro-task per content section — best for large documentation or creative content generation
- **Data-Based**: One micro-task per data partition — best for analytical workflows over large datasets

### Sizing Constraints
- **Minimum Micro-Task**: 2K tokens — below this threshold, coordination overhead (spawning, monitoring, merging) exceeds the context savings
- **Target Micro-Task**: 8K tokens — fits comfortably in any model context with room for tool use
- **Maximum Micro-Task**: 12K tokens — above this, risk of the micro-task itself context-exhausting, defeating the purpose
- **Maximum Micro-Tasks Per Split**: 20 — beyond this, coordination overhead and merge complexity become the bottleneck

### Merging Concepts
- **Output Collection**: After all micro-tasks complete, read each micro-task's output file — the consolidator is the single point of assembly
- **Conflict Resolution**: When two micro-tasks produce conflicting outputs for shared concerns, consolidator applies a deterministic resolution strategy (last-write-wins for config, manual inspection flag for logic conflicts)
- **Coherence Verification**: After merging, re-run the original acceptance criteria against the merged output — individual completions don't guarantee whole-system correctness
- **Partial Results**: When one or more micro-tasks fail, document which portions are complete and which are missing — never present partial work as complete

### Recovery Context
- **Waypoint**: A checkpoint written before context exhaustion containing remaining work items and partial outputs — the consolidator's starting point for recovery splits
- **Remaining Work Items**: The subset of work items not yet completed at checkpoint time — only these are split into micro-tasks during recovery
- **Continuation**: A recovery invocation that picks up where an exhausted agent left off — tracked with a max limit of 5 per original task

## Anti-Patterns to Avoid

- **Over-Fragmentation**: Splitting a 5K token task into 10 micro-tasks of 500 tokens each — coordination overhead dominates; the 2K minimum exists for this reason
- **Same-File Parallel Edit**: Assigning two micro-tasks that both edit the same file to run in parallel — guaranteed merge conflict; group same-file edits into one micro-task
- **Ignoring Dependencies**: Splitting work items without checking their dependency graph and running dependent items in parallel — downstream items may run before their required inputs exist
- **Full Scope Re-Retry**: When recovering an exhausted agent, splitting the entire original scope (including already-completed items) — only the remaining uncompleted items need micro-tasks
- **Skipping Merge Validation**: Merging micro-task outputs without checking the original acceptance criteria — individual pieces may each satisfy local checks while the merged result fails the overall goal
- **Exceeding 20 Micro-Tasks**: Creating more than 20 micro-tasks in a single split — coordination overhead and merge complexity exceed the benefit; redefine the scope or batch into groups
- **Missing Graceful Failure Handling**: Letting a single failed micro-task block all others from being reported — collect successes, document failures, always deliver what completed

## Quality Indicators

- **Average Micro-Task Token Size**: Mean token estimate across all micro-tasks — target 6-9K; values below 2K or above 12K indicate poor splitting
- **Parallel Utilization**: Percentage of micro-tasks executing concurrently vs. sequentially — target >70% for independent work items
- **Merge Success Rate**: Percentage of consolidations that produce a valid merged output on first attempt — target >90%
- **Partial Failure Recovery Rate**: Percentage of consolidations where partial failures are cleanly documented and reported — target 100%
- **Context Savings Achieved**: Comparison of estimated peak context usage with vs. without consolidation — target >60% reduction for 20+ task workflows
- **Acceptance Criteria Pass Rate Post-Merge**: Percentage of consolidated outputs that pass original acceptance criteria without revision — measures merge quality

## Collaboration Touchpoints

- **With universal-self-correct**: Self-correct invokes task-consolidator when a subagent returns incomplete work — provides the checkpoint path and remaining work items; consolidator produces the micro-task definitions that self-correct then spawns
- **With execution agents**: Consolidator spawns micro-task agents (e.g., backend-developer, copywriter) in parallel — each receives a scoped prompt with specific files and acceptance criteria
- **With orchestrator**: Orchestrator detects context exhaustion signals and routes to self-correct → task-consolidator; after consolidation, orchestrator resumes the coordinating or executing phase
- **With universal-validator**: After all micro-tasks merge, the consolidated output goes through validator for final acceptance criteria checking — consolidator's merge validation is necessary but not sufficient
