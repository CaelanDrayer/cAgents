# Optimization Phase Details

## Phase 1: Detection

### Auto-Detection (Default)

When user runs `/optimize` without explicit type:

1. **Scan project structure** for optimization indicators
2. **Detect frameworks** from project files
3. **Parse natural language** if user provides a goal:
   - Load `Agent_Memory/_system/optimize/intent_patterns.yaml`
   - Match keywords to intent categories (performance, cost, quality, SEO, efficiency, engagement, scalability, reliability)
   - Support multi-intent: "Make the app faster and more scalable" -> [performance, scalability]
   - If confidence < 30%: default to comprehensive scan

### Interactive Mode

When `--interactive` flag is set, ask user preferences:
- Question 1: What to optimize (Performance, Cost, Quality, Everything)
- Question 2: Safety level (Safe only, Low risk, Medium risk, All)
- Question 3: Apply mode (Auto-apply safe, Show each, Dry-run, Plan for /run)

### Detection Output

Write to `workflow/detection_report.yaml`:
```yaml
session_id: optimize_20260204_143022
optimization_types: [code]
frameworks: [nextjs, react]
intent: performance
confidence: 0.92
targets: ["src/"]
```

## Phase 2: Analysis

### Baseline Measurement

Measure metrics relevant to the optimization type:
- **Code**: Bundle size, FCP, LCP, query times, memory usage, test count, lint errors, coverage %
- **Content**: Readability score, word count, heading structure, SEO score, keyword density
- **Process**: Cycle time, manual step count, automation %, error rate
- **Infrastructure**: Monthly cost, CPU %, memory %, uptime %, response time
- **Data**: Query execution time, ETL duration, data completeness %, duplicate rate

Write to `workflow/baseline_metrics.yaml`.

### Opportunity Detection

Delegate analysis to specialists via Agent tool. For each opportunity record:
- Pattern name and category
- Current state (what was found)
- Proposed solution
- Impact, risk, and confidence scores
- Affected files and dependencies

Config files to load:
- `Agent_Memory/_system/optimize/scan_patterns.yaml`
- `Agent_Memory/_system/optimize/framework_patterns.yaml`
- `Agent_Memory/_system/optimize/cross_file_patterns.yaml`

## Phase 3: Planning

1. Score and prioritize opportunities by ROI
2. Group by file independence for parallel execution
3. Select controller + specialists
4. Define measurable success criteria
5. If CRITICAL: generate plan for `/run` handoff
6. If `--plan-only`: display plan, trigger `/run`, stop

Write to `workflow/plan.yaml`.

## Phase 4: Execution

### Atomic Execution Pattern

For each optimization in each parallel group:

1. **Snapshot**: Create git stash/branch before changes
2. **Apply**: Delegate to specialist agent via Agent tool:
   ```
   Agent tool -> specialist agent
     Prompt: "Apply optimization {id}: {name}
       Target: {file}
       Solution: {solution}
       Acceptance criteria: {criteria}
       Apply atomically with rollback on failure."
   ```
3. **Validate**: Run validation appropriate to risk level
4. **Keep or rollback**: If validation passes, keep. If fails, rollback immediately.

### Parallel Execution

Launch independent optimizations simultaneously via Agent tool. Wait for each group to complete before starting the next.

### Progress Tracking

Update TodoWrite as each optimization completes. Track: `{completed}/{total} optimizations applied`.

Write incremental results to `workflow/execution_summary.yaml`.

## Phase 5: Validation

### Post-Optimization Comparison

```
Baseline -> Final:
  Bundle Size:   2.8 MB -> 1.9 MB (down 32%)
  FCP:           1.8s -> 0.9s (down 50%)
  LCP:           3.2s -> 1.5s (down 53%)
  DB Queries:    850ms -> 8ms (down 99%)
```

### Final Report

```
Optimization Complete

Session ID:      optimize_20260204_143022
Type:            Code (Next.js + React)
Target:          src/
Success Rate:    85% (17/20 optimizations)

Applied: 17 (12 SAFE, 5 MEDIUM)
Failed:  2 (rolled back automatically)
Skipped: 1 (CRITICAL -- use /run to implement)

Remaining Opportunities:
1. [CRITICAL] Migrate to React Server Components
   -> Run: /run implement RSC migration from optimize_20260204_143022
2. [HIGH] Fix circular dependencies
   -> Run: /optimize --cross-file-only

Full report: Agent_Memory/sessions/optimize_20260204_143022/outputs/optimization_report.md
```

### Learning & History

After completion, record optimization outcomes:
- Write to `Agent_Memory/_system/optimize/learning/`
- Track: pattern_id, predicted_impact, actual_impact, confidence, success/failure
- Update pattern accuracy scores over time
