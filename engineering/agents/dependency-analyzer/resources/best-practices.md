# Best Practices: Dependency Analyzer

> Design principles, patterns, and frameworks that guide high-quality dependency tree analysis and execution order optimization.

## Design Principles

- **Dependency First, Implementation Second**: Analyzing dependencies before execution prevents work on tasks whose prerequisites aren't met — saving wasted effort.
- **Expose Hidden Coupling**: Surface implicit dependencies (shared state, timing assumptions, implicit ordering) that aren't captured in explicit declarations.
- **Critical Path is the Bottleneck**: The longest dependency chain determines minimum completion time — focus optimization on the critical path, not on parallelizing non-bottleneck tasks.
- **Fail Fast on Cycles**: Circular dependencies must be detected and reported immediately — they represent design problems that cannot be resolved by ordering.
- **Validate at the Boundary**: Dependencies should be validated before execution begins, not discovered as runtime failures.
- **Maximize Parallelism**: Independent work items should be identified explicitly so they can be executed concurrently — dependency analysis enables this.
- **Reproducible Execution Order**: Given the same dependency graph, analysis should always produce the same execution order — determinism enables reliable pipelines.

## Key Patterns & Frameworks

- **Topological Sort (Kahn's Algorithm)**: BFS-based algorithm for ordering nodes in a DAG; processes nodes with zero in-degree first; naturally detects cycles.
- **DFS-Based Topological Sort**: Depth-first traversal marking nodes as visited/complete; identifies back edges (cycles) during traversal.
- **Critical Path Method (CPM)**: Identifies the longest path through a dependency graph; used for project scheduling and parallel execution planning.
- **Dependency Graph Visualization**: Represent dependencies as a directed graph; use level-based layout (nodes at the same dependency depth in the same column) for readability.
- **Parallel Wave Identification**: Group nodes that can execute simultaneously (same depth in the topological order) into execution waves.
- **Transitive Dependency Expansion**: Resolve direct dependencies to their full transitive closure — exposes hidden deep dependencies.
- **Prerequisite Validation**: Before execution starts, check that all prerequisite conditions (files, services, previous outputs) are available.
- **Dependency Pruning**: Remove work items that are already complete from the dependency graph before planning execution order.

## Domain Concepts & Terminology

### Graph Theory
- **DAG (Directed Acyclic Graph)**: Directed graph with no cycles — the fundamental structure for dependency analysis
- **Node**: A work item, task, or module in the dependency graph
- **Edge**: A dependency relationship (A → B means B depends on A / A must complete before B)
- **In-Degree**: Number of incoming edges to a node — zero in-degree means no dependencies (can execute first)
- **Out-Degree**: Number of outgoing edges — high out-degree nodes are "blocking" many others
- **Topological Order**: Linear ordering where every node appears before all nodes it points to
- **Cycle / Back Edge**: An edge that points to an ancestor in the DFS tree — indicates a circular dependency

### Execution Planning
- **Critical Path**: The longest sequence of dependent tasks — determines minimum total execution time
- **Float / Slack**: Extra time a non-critical task can take without delaying the overall completion
- **Execution Wave**: Set of tasks that share the same dependency depth and can execute in parallel
- **Parallel Fanout**: Number of tasks that can execute simultaneously in a wave
- **Blocking Task**: A task that many others depend on — completing it quickly unlocks the most parallelism

### Dependency Types
- **Hard Dependency**: Task B cannot start until Task A completes successfully
- **Soft Dependency**: Task B prefers to run after Task A but can proceed independently
- **Resource Dependency**: Tasks that compete for the same resource (database, file, API) and must be serialized
- **Implicit Dependency**: Dependency not declared explicitly but present in the execution environment (shared state, initialization order)
- **Circular Dependency**: A → B → C → A — makes topological ordering impossible; must be broken

## Anti-Patterns to Avoid

- **Undeclared Implicit Dependencies**: Assuming execution order without declaring it — leads to race conditions and non-deterministic failures.
- **Over-Declaring Dependencies**: Adding unnecessary dependencies to "be safe" — reduces parallelism and increases execution time without adding correctness.
- **Ignoring Cycles**: Reporting cycles as warnings and continuing anyway — cycles represent fundamental design flaws that cannot be safely executed.
- **Flat Execution Lists**: Executing all tasks sequentially without dependency analysis — misses parallelism opportunities and is unnecessarily slow.
- **Static Analysis Only**: Analyzing declared dependencies without checking whether prerequisite artifacts actually exist at execution time.
- **Missing Transitive Dependencies**: Only resolving direct dependencies without expanding the full transitive closure — causes silent failures when indirect prerequisites are missing.
- **Analysis Without Visualization**: Producing dependency analysis results without a human-readable representation — makes it hard for engineers to verify correctness.

## Quality Indicators

- **Cycle Detection Completeness**: All cycles in the dependency graph are identified before execution begins.
- **Topological Order Correctness**: Produced execution order satisfies all declared dependencies when verified by reverse check.
- **Parallelism Utilization**: Identified parallel wave structure reduces total execution time versus sequential baseline.
- **Critical Path Identified**: Output includes the critical path with its estimated total duration.
- **Prerequisite Validation Pass Rate**: Percentage of executions where all prerequisites are validated before the first task starts.
- **False Dependency Rate**: Number of over-declared dependencies that reduce parallelism unnecessarily — reviewed during retrospectives.
- **Analysis Latency**: Dependency graph analysis completes in under 1 second for graphs with fewer than 500 nodes.

## Collaboration Touchpoints

- **With Architect**: Validate that declared dependencies match the architectural intent — implicit dependencies that should be explicit surface during architecture review.
- **With QA Lead**: Dependency analysis informs test execution order — tests with dependencies on shared state or initialization order need explicit ordering.
- **With DevOps Engineer**: Pipeline dependency analysis directly maps to CI/CD job dependency configuration — coordinate to keep declarations consistent.
- **With Engineering Manager**: Surface critical path bottlenecks during sprint planning — dependencies on external teams or systems need to be resolved early.
