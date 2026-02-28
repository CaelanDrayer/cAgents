# /optimize - Universal Optimizer

## Usage
```bash
/optimize <target>
/optimize src/                       # Optimize source code
/optimize --benchmark                # Include benchmarks
/optimize --history                  # Show optimization history
```

## 5-Phase Workflow
1. **Detect**: Scan for optimization opportunities
2. **Measure**: Baseline metrics
3. **Plan**: Optimization strategy
4. **Execute**: Atomic rollback-safe changes
5. **Validate**: Before/after comparison

## 8 Optimization Types
Performance, bundle size, memory, network, database, security, accessibility, SEO.

## Options
- `--benchmark`: Run benchmarks before/after
- `--history`: Show past optimization results
- `--type <type>`: Focus on specific optimization type

## Context Mode
`context: fork` -- parallel execution with atomic rollback.

## Output
- `outputs/optimization_report.md`
- `workflow/detection_report.yaml`
- `workflow/opportunities.yaml`
