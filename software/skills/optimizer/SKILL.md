---
name: Code Optimizer Orchestrator
description: Comprehensive code optimization with automatic baseline measurement, multi-dimensional analysis, safe auto-apply, and impact reporting
version: 1.0.0
---

# Optimizer Skill

This skill is invoked by the `/optimize` command to execute comprehensive code optimization with full autonomous execution.

## What It Does

The skill implements an equal partnership with the optimizer agent:

**Skill Responsibilities**:
1. Parse command arguments (target path, optimization types, safety level)
2. Determine invocation context (standalone vs integrated with /trigger)
3. Create context-aware instruction folder
4. Analyze codebase scope and detect optimization opportunities
5. Measure baseline metrics (performance, bundle, memory, database)
6. Hand off to optimizer agent with parsed context

**Agent Responsibilities** (after handoff):
7. Initialize optimization with 5 setup todos
8. Determine execution strategy based on opportunities
9. Orchestrate 5-phase workflow with TodoWrite
10. Coordinate 6 optimization agent groups
11. Auto-apply SAFE and MEDIUM optimizations
12. Re-measure metrics and calculate impact
13. Generate comprehensive before/after report

## Command Arguments

```bash
/optimize [target_path] [options]

Arguments:
  target_path          Path to optimize (default: current directory)

Options:
  --type <types>       Optimization types (performance|bundle|algorithms|memory|database|network|build|patterns)
  --safety <level>     Safety level (safe|medium|aggressive) (default: medium)
  --scope <value>      Scope filter (all|changed|staged)
  --benchmark          Run performance benchmarks
  --profile            Generate detailed profiling data
  --no-apply           Identify opportunities only, don't apply
```

## Workflow Phases

### Phase 1: Initialize (Skill)
```
[in_progress] Creating optimization instruction folder
[pending] Measuring baseline metrics (performance, bundle, memory, database)
[pending] Analyzing codebase and detecting opportunities
[pending] Parsing command arguments and determining strategy
```

### Phase 2-5: Detect, Optimize, Apply, Measure, Report (Agent)
See command definition for detailed phase descriptions.

## Context-Aware Folder Creation

The skill detects invocation context and creates appropriate folder structure:

**Standalone Invocation**:
```
Agent_Memory/optimize_{id}/
├── instruction.yaml
├── status.yaml
├── workflow/
│   ├── baseline_metrics.yaml
│   ├── opportunities.yaml
│   └── execution_strategy.yaml
├── optimizations/{performance,bundle,algorithms,memory,database,network,build,patterns}/
├── reports/
│   ├── baseline_metrics.yaml
│   ├── applied_optimizations.yaml
│   ├── impact_analysis.yaml
│   └── optimization_report.md
└── episodic/
```

**Integrated with /trigger Workflow**:
```
Agent_Memory/inst_{id}/optimizations/optimize_{timestamp}/
└── [same structure as standalone]
```

Detection logic:
1. Check `Agent_Memory/_system/registry.yaml` for active instructions
2. If active instruction in `executing` or `validating` phase → integrated mode
3. Otherwise → standalone mode

## Baseline Metrics Collection

The skill analyzes the codebase and measures baseline metrics:

**Performance Metrics** (if applicable):
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Time to Interactive (TTI)
- Total Blocking Time (TBT)
- Render times for key components

**Bundle Metrics** (if applicable):
- Total bundle size (compressed/uncompressed)
- Individual chunk sizes
- Dependency tree analysis
- Unused code detection

**Database Metrics** (if applicable):
- Query execution times
- Missing indexes
- N+1 query patterns
- Slow query log analysis

**Memory Metrics** (if applicable):
- Average memory usage
- Peak memory usage
- Memory leak detection
- Heap snapshot analysis

**Build Metrics**:
- Total build time
- Compilation time per module
- Cache hit rates

Writes to: `baseline_metrics.yaml`

## Opportunity Detection

The skill scans for optimization opportunities across dimensions:

```yaml
opportunities_id: opp_20260110_001
timestamp: 2026-01-10T00:00:00Z
target_path: /path/to/code

performance_opportunities:
  - type: unnecessary_rerender
    location: src/components/ProductList.tsx
    severity: high
    impact: "Component rerenders on every parent update"
    solution: "Add React.memo wrapper"
    safety: safe
    estimated_improvement: "50% faster renders"

  - type: expensive_computation
    location: src/utils/calculations.ts:45
    severity: medium
    impact: "O(n²) loop in hot path"
    solution: "Replace with O(n) algorithm using Map"
    safety: medium
    estimated_improvement: "10x faster for n>100"

bundle_opportunities:
  - type: unused_dependency
    location: package.json
    package: moment
    severity: high
    impact: "298 KB unused (using date-fns instead)"
    solution: "Remove moment from dependencies"
    safety: safe
    estimated_improvement: "298 KB bundle reduction"

database_opportunities:
  - type: missing_index
    location: users table on email column
    severity: critical
    impact: "Full table scan on login query"
    solution: "CREATE INDEX idx_users_email ON users(email)"
    safety: safe
    estimated_improvement: "100x faster login queries"

  - type: n_plus_one
    location: src/api/posts.ts:67
    severity: high
    impact: "Separate query for each post author"
    solution: "Use JOIN or eager loading"
    safety: medium
    estimated_improvement: "50x fewer queries"

memory_opportunities:
  - type: memory_leak
    location: src/hooks/useWebSocket.ts
    severity: critical
    impact: "Event listener not cleaned up"
    solution: "Add cleanup in useEffect return"
    safety: safe
    estimated_improvement: "Prevent memory leak"

totals:
  critical: 2
  high: 5
  medium: 8
  low: 3
  total: 18
```

Writes to: `opportunities.yaml`

## Execution Strategy

Based on opportunities and safety level, determine strategy:

```yaml
strategy_id: strategy_20260110_001
timestamp: 2026-01-10T00:00:00Z
safety_level: medium

groups_to_invoke:
  - name: performance_optimization
    agents: [performance-analyzer, frontend-developer, architect]
    opportunities: 7
    estimated_duration: 5min
    
  - name: bundle_optimization
    agents: [frontend-developer, devops]
    opportunities: 4
    estimated_duration: 3min
    
  - name: database_optimization
    agents: [dba, backend-developer, performance-analyzer]
    opportunities: 3
    estimated_duration: 4min

  - name: memory_optimization
    agents: [senior-developer, performance-analyzer]
    opportunities: 2
    estimated_duration: 2min

execution_order: parallel  # All groups run in parallel
auto_apply_count: 12       # SAFE + MEDIUM with safety=medium
review_required_count: 6   # RISKY changes

estimated_total_duration: 5min  # Max of parallel groups
```

Writes to: `execution_strategy.yaml`

## Handoff to Optimizer Agent

After baseline measurement and opportunity detection, the skill:

1. Writes `instruction.yaml` with parsed context
2. Invokes optimizer agent via Task tool
3. Passes control for orchestration

```javascript
Task({
  subagent_type: "cagents:optimizer",
  description: "Execute code optimization workflow",
  prompt: `Execute comprehensive code optimization for ${targetPath}.

  Optimization folder: ${optimizeFolder}
  Baseline metrics: ${optimizeFolder}/workflow/baseline_metrics.yaml
  Opportunities: ${optimizeFolder}/workflow/opportunities.yaml
  Execution strategy: ${optimizeFolder}/workflow/execution_strategy.yaml

  Safety level: ${safetyLevel}
  Types: ${optimizationTypes.join(', ')}

  INSTRUCTIONS:
  1. Review detected opportunities (${opportunityCount} total)
  2. Coordinate ${groupCount} optimization agent groups
  3. Auto-apply SAFE and MEDIUM optimizations (${autoApplyCount} total)
  4. Run tests after each optimization
  5. Rollback if tests fail
  6. Re-measure all metrics
  7. Calculate impact and ROI
  8. Generate comprehensive report

  Use TodoWrite to show progress through all 5 phases.`
})
```

## Example Invocations

```bash
# Optimize current directory with defaults
/optimize

# Optimize specific path
/optimize src/components

# Focus on performance only
/optimize --type performance

# Multiple types
/optimize --type performance,bundle,database

# Only safe changes
/optimize --safety safe

# Aggressive mode (auto-apply all)
/optimize --safety aggressive

# Just analyze, don't apply
/optimize --no-apply

# With benchmarking
/optimize --benchmark --profile

# Only changed files
/optimize --scope changed
```

## Integration Patterns

### Standalone Optimization
```
User: /optimize src/
  ↓
Skill: Creates Agent_Memory/optimize_20260110_001/
  ↓
Skill: Measures baseline, detects 18 opportunities
  ↓
Agent: Executes 5-phase optimization with todos
  ↓
Agent: Auto-applies 12 SAFE+MEDIUM optimizations
  ↓
Agent: Re-measures metrics, generates report
  ↓
Output: Agent_Memory/optimize_20260110_001/reports/optimization_report.md
```

### Integrated with /trigger
```
User: /trigger Optimize the application
  ↓
... trigger workflow executes ...
  ↓
Executor invokes: /optimize
  ↓
Skill: Creates Agent_Memory/inst_20260110_001/optimizations/optimize_001/
  ↓
Agent: Executes optimization, integrates with parent workflow
  ↓
Output: Results fed back to executor
```

## Safety Classification

**SAFE (auto-apply immediately)**:
- Adding React.memo, useMemo, useCallback
- Removing unused imports/dependencies
- Adding database indexes
- Fixing memory leaks (event listener cleanup)
- Enabling code splitting
- Lazy loading components/routes
- Replacing console.log with proper logging

**MEDIUM (auto-apply with tests)**:
- Algorithm optimizations (O(n²) → O(n log n))
- Refactoring for performance
- Query optimizations (N+1 fixes, batching)
- Dependency updates (minor/patch versions)
- Adding caching layers

**RISKY (review first)**:
- Architectural changes
- Major refactoring
- Breaking API changes
- Framework upgrades
- State management changes
- Database schema changes

## File Locations

- **Command**: `commands/optimize.md` - Command definition and prompts
- **Skill**: `skills/optimizer/SKILL.md` - This file (skill interface)
- **Agent**: `agents/optimizer.md` - Orchestration logic and phase management

## Success Criteria

The skill succeeds when:
- Instruction folder created in correct location (context-aware)
- Baseline metrics measured and written
- Opportunities detected across all dimensions
- Execution strategy determined
- Command arguments parsed correctly
- Optimizer agent invoked successfully
- Initial todos set up for agent to continue

---

**Version**: 1.0.0
**Partnership**: Equal collaboration with optimizer agent
**Design**: Based on reviewer skill pattern (session_20260104_102749)
