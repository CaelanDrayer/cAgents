# /optimize Command - Quick Start Guide

## What is /optimize?

The `/optimize` command automatically finds and fixes code optimization opportunities across your project. Unlike `/reviewer` which just reports issues, `/optimize` actually applies the fixes automatically.

## Quick Start

```bash
# Optimize entire project
/optimize

# Optimize specific path
/optimize src/components

# Focus on specific type
/optimize --type performance

# Only apply safe changes
/optimize --safety safe
```

## What Gets Optimized?

### 8 Optimization Dimensions

1. **Performance**: React.memo, useMemo, useCallback, virtualization, lazy loading
2. **Bundle Size**: Remove unused deps, code splitting, tree-shaking
3. **Algorithms**: O(n²) → O(n log n), efficient data structures
4. **Memory**: Fix leaks, cleanup event listeners, optimize closures
5. **Database**: Add indexes, fix N+1 queries, batching
6. **Network**: Request batching, compression, caching
7. **Build**: Parallel builds, caching, incremental compilation
8. **Patterns**: Anti-patterns, best practices, modern syntax

## Safety Levels

### SAFE (auto-applied immediately)
- React.memo, useMemo, useCallback
- Removing unused imports/dependencies
- Database index creation
- Event listener cleanup
- Code splitting, lazy loading

### MEDIUM (auto-applied with tests)
- Algorithm optimizations
- N+1 query fixes
- Component refactoring
- Query batching

### RISKY (asks first)
- Architectural changes
- Major refactoring
- Framework upgrades
- State management changes

## Command Options

```bash
/optimize [target_path] [options]

Arguments:
  target_path          Path to optimize (default: current directory)

Options:
  --type <types>       Optimization types (comma-separated)
                       performance, bundle, algorithms, memory,
                       database, network, build, patterns

  --safety <level>     Safety level (default: medium)
                       safe      - Only 100% safe changes
                       medium    - Safe + tested changes (default)
                       aggressive - Apply all including risky

  --scope <value>      Scope filter
                       all       - All files (default)
                       changed   - Only changed files
                       staged    - Only staged files

  --benchmark          Run performance benchmarks
  --profile            Generate detailed profiling data
  --no-apply           Identify opportunities only, don't apply
```

## Examples

### Basic Usage
```bash
# Optimize everything with default safety (medium)
/optimize

# Optimize specific folder
/optimize src/components

# Optimize specific file
/optimize src/components/ProductList.tsx
```

### Focus on Specific Types
```bash
# Performance only
/optimize --type performance

# Bundle size only
/optimize --type bundle

# Multiple types
/optimize --type performance,bundle,database
```

### Control Safety
```bash
# Only 100% safe changes
/optimize --safety safe

# Safe + tested changes (default)
/optimize --safety medium

# Apply everything including risky changes
/optimize --safety aggressive
```

### Analyze Without Applying
```bash
# Just show what would be optimized
/optimize --no-apply

# With detailed profiling
/optimize --no-apply --profile --benchmark
```

### Scope Filters
```bash
# Only changed files
/optimize --scope changed

# Only staged files
/optimize --scope staged
```

## What to Expect

### 1. Baseline Measurement
The command measures current state:
- Bundle size
- Performance metrics (FCP, LCP, TTI)
- Memory usage
- Database query times
- Build times

### 2. Opportunity Detection
Scans for issues:
- 12 performance issues found
- 5 bundle size issues found
- 3 database issues found
- 2 memory leaks found

### 3. Auto-Apply Optimizations
Applies safe changes automatically:
- ✓ Added React.memo to 12 components
- ✓ Removed 8 unused dependencies
- ✓ Fixed 3 N+1 database queries
- ✓ Added index on users.email

### 4. Test & Verify
Runs tests after changes:
- Tests passing ✓
- Rollback failed changes automatically

### 5. Impact Report
Shows before/after metrics:
- Bundle size: 2.8 MB → 1.9 MB (↓ 32%)
- FCP: 1.8s → 0.9s (↓ 50%)
- Memory: 45 MB → 32 MB (↓ 29%)

## Example Output

```
✓ Code Optimization Complete

Optimization ID:  optimize_20260110_001
Target:           src/
Type:             performance, bundle
Safety Level:     medium
Duration:         ~8 minutes

Baseline Metrics:
  Bundle Size:        2.8 MB
  FCP:                1.8s
  LCP:                3.2s
  Memory (avg):       45 MB
  Build Time:         42s

Applied Optimizations:
  ✓ Added React.memo to 12 components         [SAFE]
  ✓ Implemented virtual scrolling in 2 lists  [MEDIUM]
  ✓ Removed 8 unused dependencies             [SAFE]
  ✓ Enabled code splitting for routes         [SAFE]
  ✓ Fixed 3 N+1 database queries              [MEDIUM]

Final Metrics:
  Bundle Size:        1.9 MB  (↓ 32%)
  FCP:                0.9s    (↓ 50%)
  LCP:                1.5s    (↓ 53%)
  Memory (avg):       32 MB   (↓ 29%)
  Build Time:         28s     (↓ 33%)

Impact:
  - 18 optimizations applied automatically
  - All tests passing ✓
  - 2x faster page load
  - 32% smaller bundle

Full report: Agent_Memory/optimize_20260110_001/reports/optimization_report.md
```

## When to Use /optimize

### Good Times to Optimize
- After adding new features
- Before major releases
- When performance degrades
- Monthly optimization sprints
- After dependency updates
- When bundle size grows

### Optimization Workflow
1. Run `/optimize --no-apply` to see opportunities
2. Review the findings
3. Run `/optimize --safety safe` for guaranteed safe changes
4. Run `/optimize --safety medium` for tested changes
5. Review RISKY optimizations and apply manually if desired

## Integration with /trigger

The optimizer can be invoked as part of workflows:

```bash
# Trigger will invoke /optimize automatically when needed
/trigger Optimize the application for production
```

## Comparison with /reviewer

| Feature | /reviewer | /optimize |
|---------|----------|----------|
| Purpose | Find issues | Find + fix issues |
| Action | Report only | Auto-apply fixes |
| Safety | N/A | SAFE/MEDIUM/RISKY classification |
| Testing | N/A | Runs tests after changes |
| Impact | None | Shows before/after metrics |
| Use Case | Code review | Code optimization |

## Tips & Best Practices

1. **Start Safe**: Use `--safety safe` first, then progress to medium
2. **Test Often**: The command runs tests automatically, but verify manually too
3. **Commit First**: Commit your work before running optimizations
4. **Review Changes**: Check what was changed using git diff
5. **Measure Impact**: Use `--benchmark --profile` for detailed metrics
6. **Run Regularly**: Monthly optimization keeps codebase healthy
7. **Focus Areas**: Use `--type` to focus on specific concerns

## Troubleshooting

### Tests Fail After Optimization
The command auto-rolls back failed changes, but if issues persist:
```bash
# Check what changed
git diff

# Revert specific optimizations
git checkout path/to/file

# Run tests
npm test
```

### Too Aggressive
```bash
# Use safer mode
/optimize --safety safe

# Or analyze first
/optimize --no-apply
```

### Want More Control
```bash
# Just analyze
/optimize --no-apply

# Review opportunities
# Apply manually or with higher safety level
```

## Files and Folders

All optimization data is stored in:
```
Agent_Memory/optimize_{id}/
├── workflow/
│   ├── baseline_metrics.yaml
│   ├── opportunities.yaml
│   └── execution_strategy.yaml
├── optimizations/
│   ├── performance/
│   ├── bundle/
│   ├── algorithms/
│   ├── database/
│   ├── memory/
│   └── build/
└── reports/
    ├── applied_optimizations.yaml
    ├── impact_analysis.yaml
    └── optimization_report.md
```

## Architecture

The `/optimize` command uses:
- **Command**: Defines workflow and arguments
- **Skill**: Parses args, measures baseline, detects opportunities
- **Agent**: Orchestrates 6 optimization groups in parallel
- **Team Agents**: performance-analyzer, frontend-developer, dba, devops, etc.

## Next Steps

Try it now:
```bash
/optimize --no-apply
```

Review the opportunities, then apply them:
```bash
/optimize --safety medium
```

---

**Ready to make your code faster, smaller, and better!**
