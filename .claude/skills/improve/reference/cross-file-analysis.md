# Cross-File Analysis

When `--cross-file` is enabled (default for code optimization), the optimizer performs multi-file analysis.

## Analysis Types

### 1. Dependency Graph
Map import/export relationships across the project.

**Detects**:
- Circular dependencies
- Deep dependency chains
- Hub files (too many imports/exports)
- Unused exports

### 2. Data Flow Analysis
Track how data flows through the application.

**Detects**:
- Prop drilling (data passed through many layers)
- Redundant fetches (same data fetched in multiple places)
- State duplication (same state stored in multiple locations)
- Transformation chains (data transformed repeatedly)

### 3. Architectural Pattern Detection
Identify structural patterns and anti-patterns.

**Detects**:
- Feature duplication (same feature implemented differently)
- Inconsistent patterns (different approaches for same problem)
- Missing abstractions (repeated code that should be abstracted)
- Layering violations (bypassing architectural layers)
- God modules (files with too many responsibilities)

### 4. Performance Propagation
Analyze how performance issues cascade.

**Detects**:
- Waterfall renders (parent re-render causing child cascades)
- Bundle impact from heavy dependencies
- Re-render cascades (state changes triggering unnecessary updates)
- N+1 queries (database query patterns)
- Synchronous I/O (blocking operations)

## Confidence Adjustments

Cross-file findings adjust confidence scores of single-file opportunities:
- If a single-file issue is confirmed by cross-file analysis: +0.1-0.2 confidence
- If cross-file context reveals the issue is intentional: -0.2 confidence
- If cross-file analysis finds additional affected files: increases impact score

## Output

Write to `workflow/cross_file_analysis.yaml` and optionally `workflow/dependency_graph.json`.

## Flags

| Flag | Behavior |
|------|----------|
| `--cross-file` | Enable cross-file analysis (default for code) |
| `--no-cross-file` | Skip cross-file analysis (faster) |
| `--cross-file-only` | Only run cross-file analysis |
| `--dependency-graph` | Generate dependency graph visualization |

## Config

Cross-file patterns loaded from: `cagents-memory/_system/optimize/cross_file_patterns.yaml`
