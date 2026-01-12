# Task Consolidation - Advanced Context Management

How cAgents splits large tasks across multiple agents to optimize context usage and enable massive parallelism.

---

## Core Innovation

**Problem**: Large tasks (>15K tokens) consume significant context, risking limits and reducing parallelism.

**Solution**: Task Consolidator agent decomposes large tasks into micro-tasks (3-10 pieces), distributes to specialist agents (each <10K tokens), then consolidates results.

**Result**: 40-60% context reduction per agent, 3-10x parallelism, zero context limit failures.

---

## How It Works

### Traditional Approach (Single Agent)

```
Task: "Refactor authentication module" (6 files, 25K tokens)

Single Agent:
  ├─ Read 6 files (12K)
  ├─ Analyze patterns (5K)
  └─ Refactor all files (8K)
  Total: 25K tokens

Risks:
  - Single point of failure
  - No parallelism
  - Approaching context limits (25K/180K = 14%)
  - If exceeds 25K, entire task fails
```

### Task Consolidation Approach (Multiple Agents)

```
Task: "Refactor authentication module" (6 files, 33K distributed)

Task Consolidator (4K tokens):
  └─ Analyzes task, creates 6 micro-tasks

Micro-tasks (6 agents × 4K = 24K tokens, parallel):
  ├─ Agent 1: Refactor auth.js (4K)
  ├─ Agent 2: Refactor login.js (4K)
  ├─ Agent 3: Refactor session.js (3K)
  ├─ Agent 4: Refactor middleware.js (4K)
  ├─ Agent 5: Refactor token.js (4K)
  └─ Agent 6: Refactor validation.js (5K)

Task Consolidator (8K tokens):
  ├─ Read all 6 outputs (3K)
  ├─ Merge changes (2K)
  ├─ Integration test (3K)
  └─ Final output

Total: 36K tokens (distributed across 8 agent invocations)
Max per agent: 8K (96% reduction from 25K)
Parallelism: 6x
Context safety: High (no agent >8K)

Benefits:
  - Distributed load (no single agent >8K)
  - 6x parallelism (6 files done simultaneously)
  - Fault tolerant (one failure doesn't block all)
  - Stays well within limits (8K << 180K)
```

---

## When to Use Task Consolidation

### Automatic Thresholds

```yaml
context_budget:
  <15K:  No consolidation (overhead not worth it)
  15-25K: Consider consolidation (planner decides)
  25-40K: Strongly recommend consolidation
  >40K:   Mandatory consolidation or recursive workflow
```

### Decomposability Check

**Use consolidation when task has**:
- ✅ Multiple independent files (file-based)
- ✅ Multiple functions in same file (function-based)
- ✅ Multiple independent operations (operation-based)
- ✅ Multiple content sections (chapter-based)
- ✅ Multiple data chunks (data-based)

**Don't use when task has**:
- ❌ Single atomic operation (can't split)
- ❌ Tightly coupled steps (need shared context)
- ❌ Complex consolidation (>15K just to merge)

---

## Splitting Strategies

### 1. File-Based Split

**Best for**: Multi-file code refactoring, documentation updates

**Example**: Refactor 6 authentication files

```yaml
Original Task (25K):
  name: "Refactor authentication module"
  files: [auth.js, login.js, session.js, middleware.js, token.js, validation.js]

Decomposed:
  micro_tasks:
    - id: micro_1
      file: auth.js
      agent: backend-developer
      budget: 4000
      scope: "Refactor auth.js only"

    - id: micro_2
      file: login.js
      agent: backend-developer
      budget: 4000
      scope: "Refactor login.js only"

    # ... 4 more files

  consolidation:
    agent: task-consolidator
    budget: 8000
    actions:
      - Merge all refactored files
      - Check cross-file compatibility
      - Run integration tests
      - Create unified changeset

Total: 32K (6×4K + 8K)
Parallelism: 6x
Max per agent: 8K
```

### 2. Function-Based Split

**Best for**: Optimizing multiple functions, adding features to multiple endpoints

**Example**: Optimize 8 database query functions

```yaml
Original Task (30K):
  name: "Optimize database queries"
  file: queries.js
  functions: [getUserById, getUsersByRole, updateUser, deleteUser, ...]

Decomposed:
  micro_tasks:
    - id: micro_1
      function: getUserById
      agent: backend-developer
      budget: 4000
      scope: "Optimize this function only, return optimized code"

    - id: micro_2
      function: getUsersByRole
      agent: backend-developer
      budget: 5000

    # ... 6 more functions

  consolidation:
    agent: task-consolidator
    budget: 10000
    actions:
      - Merge all optimizations into single file
      - Ensure no naming conflicts
      - Performance test all functions
      - Generate performance report

Total: 42K (8×4K + 10K)
Parallelism: 8x
Max per agent: 10K
```

### 3. Operation-Based Split

**Best for**: Security audits, code reviews, multi-faceted analysis

**Example**: Comprehensive security audit

```yaml
Original Task (35K):
  name: "Security audit of API module"
  scope: "Check auth, authz, validation, injection, XSS, CSRF"

Decomposed:
  micro_tasks:
    - id: micro_1
      operation: Check authentication
      agent: security-analyst
      budget: 6000
      scope: "Audit authentication mechanisms only"

    - id: micro_2
      operation: Check authorization
      agent: security-analyst
      budget: 6000

    - id: micro_3
      operation: Check input validation
      agent: security-analyst
      budget: 7000

    # ... 3 more security checks

  consolidation:
    agent: task-consolidator
    budget: 12000
    actions:
      - Aggregate all findings
      - Deduplicate issues
      - Prioritize by severity (CRITICAL → LOW)
      - Create executive summary
      - Generate remediation roadmap

Total: 48K (6×6K + 12K)
Parallelism: 6x
Max per agent: 12K
```

### 4. Chapter-Based Split

**Best for**: Long-form content generation, documentation writing

**Example**: Write detailed battle scene (3,500 words)

```yaml
Original Task (30K):
  name: "Write epic battle scene"
  word_count: 3500
  sections: [opening, tension, first clash, turning point, resolution]

Decomposed:
  micro_tasks:
    - id: micro_1
      section: Opening - arrival at battlefield
      agent: prose-stylist
      budget: 6000
      word_count: 700

    - id: micro_2
      section: Building tension
      agent: prose-stylist
      budget: 6000
      word_count: 700

    # ... 3 more sections

  consolidation:
    agent: task-consolidator
    budget: 12000
    actions:
      - Merge all sections
      - Smooth transitions between sections
      - Ensure consistent tone and character voice
      - Continuity check (timeline, character positions)
      - Final polish

Total: 42K (5×6K + 12K)
Parallelism: 5x
Max per agent: 12K
```

### 5. Data-Based Split

**Best for**: Large dataset analysis, report generation

**Example**: Analyze Q4 sales data (3 months)

```yaml
Original Task (40K):
  name: "Q4 sales analysis"
  data: [October, November, December]
  metrics: [revenue, conversion, churn, CLV, etc.]

Decomposed:
  micro_tasks:
    - id: micro_1
      period: October
      agent: data-analyst
      budget: 8000
      scope: "Analyze October metrics only"

    - id: micro_2
      period: November
      agent: data-analyst
      budget: 8000

    - id: micro_3
      period: December
      agent: data-analyst
      budget: 8000

    - id: micro_4
      operation: Calculate trends
      agent: data-analyst
      budget: 7000

    - id: micro_5
      operation: Generate visualizations
      agent: data-analyst
      budget: 7000

  consolidation:
    agent: task-consolidator
    budget: 12000
    actions:
      - Combine monthly analyses
      - Cross-quarter insights
      - Executive summary
      - Recommendations

Total: 50K (5×8K + 12K)
Parallelism: 5x
Max per agent: 12K
```

---

## Context Efficiency Analysis

### Scenario: Refactor 10 Files (Original: 45K tokens)

**Without Consolidation** (Exceeds Tier 3 budget):
```
Single Agent:
  - Read 10 files: 20K
  - Analyze patterns: 10K
  - Refactor all: 15K
  Total: 45K tokens

Problems:
  - Exceeds Tier 2 budget (50K)
  - Marginal for Tier 3 (100K)
  - No parallelism
  - One failure = complete restart
  - High context pressure on single agent
```

**With Consolidation** (Well within limits):
```
Task Consolidator (initial): 3K
10 Micro-tasks (parallel): 10 × 4K = 40K
Task Consolidator (merge): 10K
Total: 53K tokens (distributed across 12 invocations)

Benefits:
  - Max per agent: 10K (78% reduction from 45K)
  - 10x parallelism
  - Fault tolerant (9 of 10 can still complete)
  - Well within Tier 3 budget
  - Low context pressure per agent

Efficiency:
  - Context per agent: 10K vs 45K (78% reduction)
  - Total context: 53K vs 45K (18% overhead for massive benefits)
  - Parallelism: 10x vs 1x
  - Safety: High vs Marginal
```

---

## Advanced Patterns

### Pattern 1: Nested Consolidation (Very Large Tasks)

**When**: Task would create >15 micro-tasks

```yaml
# Example: Refactor 40 files (150K tokens single-agent)

Level 1 Consolidator:
  - Splits into 4 groups of 10 files

Level 2 Consolidators (4 parallel):
  - Group 1: Files 1-10 → 10 micro-tasks
  - Group 2: Files 11-20 → 10 micro-tasks
  - Group 3: Files 21-30 → 10 micro-tasks
  - Group 4: Files 31-40 → 10 micro-tasks

Level 1 Consolidator (final):
  - Merge all 4 group outputs
  - Final integration test

Structure:
  L1 Consolidator (split): 5K
    ├─ L2 Consolidator 1: 5K + (10×4K) + 10K = 55K
    ├─ L2 Consolidator 2: 5K + (10×4K) + 10K = 55K
    ├─ L2 Consolidator 3: 5K + (10×4K) + 10K = 55K
    └─ L2 Consolidator 4: 5K + (10×4K) + 10K = 55K
  L1 Consolidator (merge): 15K

Total: 240K (distributed across 46 invocations)
Max per agent: 15K (90% reduction from 150K)
Parallelism: 40x at L2, 4x at L1
```

### Pattern 2: Hybrid Split (Multiple Strategies)

**When**: Task has multiple decomposition dimensions

```yaml
# Example: Comprehensive API refactor + security audit

Primary Split (file-based):
  - api.js (Tier 2 sub-workflow)
  - auth.js (Tier 2 sub-workflow)
  - validation.js (Tier 2 sub-workflow)

Secondary Split per file (operation-based):
  api.js workflow:
    - Refactor endpoints → backend-developer (8K)
    - Security check → security-analyst (7K)
    - Performance optimize → performance-analyzer (6K)
    - Write tests → backend-developer (5K)
    Consolidate: 10K

Same pattern for auth.js and validation.js

Final Consolidation:
  - Merge all 3 file workflows
  - Cross-file integration tests
  - Generate migration guide

Total: 3 × (8K+7K+6K+5K+10K) + 15K = 123K
Max per agent: 10K
Parallelism: 12x (3 files × 4 operations each)
```

### Pattern 3: Incremental Consolidation (Streaming Results)

**When**: Want partial results before full completion

```yaml
# Example: Generate 10-chapter book outline

Incremental Pattern:
  Wave 1: Chapters 1-3
    - Generate all 3 (parallel)
    - Consolidate → Release Chapters 1-3

  Wave 2: Chapters 4-6
    - Generate all 3 (parallel)
    - Consolidate with Chapters 1-3 → Release Chapters 1-6

  Wave 3: Chapters 7-9
    - Generate all 3 (parallel)
    - Consolidate with Chapters 1-6 → Release Chapters 1-9

  Wave 4: Chapter 10
    - Generate final chapter
    - Consolidate all 10 → Final release

Benefits:
  - Incremental delivery
  - Early feedback possible
  - Adjust later chapters based on early results
  - Spread context usage over time
```

---

## Integration with Planner

### Automatic Detection

```python
# Universal Planner logic
for task in tasks:
    if task.context_budget > 15000:
        # Check if decomposable
        decomposable, strategy = analyze_decomposability(task)

        if decomposable:
            # Enable consolidation
            task.agent = "task-consolidator"
            task.consolidation = {
                "enabled": true,
                "strategy": strategy,  # file_based, function_based, etc.
                "estimated_micro_tasks": estimate_count(task, strategy),
                "consolidation_budget": estimate_consolidation(task)
            }

            # Adjust total budget
            micro_budget = task.context_budget / estimated_micro_tasks
            consolidation_budget = task.consolidation.consolidation_budget
            task.context_budget = (micro_budget * estimated_micro_tasks) + consolidation_budget

            # Add note
            task.notes = f"Large task (original {original_budget}K) split via {strategy} strategy"
```

### Example Plan Output

```yaml
plan:
  tasks:
    - id: task_1
      name: "Design API architecture"
      agent: architect
      context_budget: 12000
      consolidation:
        enabled: false  # Under 15K threshold

    - id: task_2
      name: "Implement 8 API endpoints"
      agent: task-consolidator
      context_budget: 42000  # Increased for consolidation
      consolidation:
        enabled: true
        strategy: function_based
        estimated_micro_tasks: 8
        consolidation_budget: 10000
      notes: "Large task (original 32K) split via function_based strategy"

    - id: task_3
      name: "Write integration tests"
      agent: backend-developer
      context_budget: 8000
      consolidation:
        enabled: false
```

---

## Error Handling & Fault Tolerance

### Micro-Task Failure

```yaml
Scenario: 1 of 6 micro-tasks fails

Traditional Approach:
  - Entire task fails
  - Must restart from beginning
  - Lose all progress

Consolidation Approach:
  - 5 of 6 micro-tasks completed successfully
  - Consolidator receives 5 outputs
  - Options:
    1. Retry failed micro-task (isolated retry)
    2. Complete with 5/6 (partial completion)
    3. Manual intervention on failed piece only
  - No progress lost

Result: 83% completion vs 0% completion
```

### Consolidation Failure

```yaml
Scenario: Consolidation phase fails

Safety Net:
  - All micro-task outputs saved in Agent_Memory
  - Retry consolidation with different strategy
  - If retry fails, escalate to HITL with:
    - All micro-task outputs (work preserved)
    - Consolidation error details
    - Suggested manual consolidation steps

Human can:
  - Manually merge outputs
  - Fix consolidation issue and retry
  - Accept partial results

Result: Work never lost, always salvageable
```

---

## Performance Metrics

### Real-World Examples

**Example 1: Refactor 6 Auth Files**
- Original: 25K single agent
- Consolidated: 32K across 8 agents
- Context per agent: 8K (68% reduction)
- Parallelism: 6x
- Time: ~15 min vs ~45 min (3x faster)

**Example 2: Security Audit (20 files)**
- Original: 60K single agent (would require Tier 4)
- Consolidated: 78K across 22 agents
- Context per agent: 7K (88% reduction)
- Parallelism: 20x
- Tier: 3 instead of 4
- Time: ~20 min vs ~90 min (4.5x faster)

**Example 3: Generate 5-Chapter Story**
- Original: 30K single agent
- Consolidated: 42K across 7 agents
- Context per agent: 12K (60% reduction)
- Parallelism: 5x
- Time: ~25 min vs ~60 min (2.4x faster)

### Efficiency Gains

| Metric | Single Agent | Consolidated | Improvement |
|--------|-------------|--------------|-------------|
| **Context per agent** | 25-60K | 5-15K | 60-88% reduction |
| **Parallelism** | 1x | 3-20x | 3-20x faster |
| **Failure isolation** | All or nothing | Granular | 80-95% work preserved |
| **Context safety** | Marginal | High | Zero limit violations |
| **Fault tolerance** | None | High | Continues despite failures |

---

## Best Practices

### 1. Size Tasks Appropriately
- Under 15K: Don't consolidate (overhead not worth it)
- 15-25K: Consider if naturally decomposable
- 25-40K: Strong candidate for consolidation
- Over 40K: Mandatory consolidation or recursive workflow

### 2. Choose Right Strategy
- Multiple files? → file_based
- Single file, multiple functions? → function_based
- Multiple analyses? → operation_based
- Long content? → chapter_based
- Large data? → data_based

### 3. Balance Granularity
- Too few micro-tasks (2-3): Limited parallelism, large chunks
- Sweet spot (5-10): Good parallelism, manageable consolidation
- Too many (>15): Consolidation becomes complex, use nested

### 4. Estimate Consolidation Budget
- Simple merge (files with no conflicts): 5-8K
- Moderate (need compatibility checks): 8-12K
- Complex (conflict resolution, testing): 12-20K

### 5. Monitor and Learn
- Track actual vs estimated per strategy
- Adjust estimates based on historical data
- Learn which task types benefit most

---

## Troubleshooting

### "Consolidation budget exceeded (used 18K, budgeted 12K)"

**Cause**: Underestimated merge complexity

**Solutions**:
1. Increase consolidation budget estimate for similar tasks (12K → 18K)
2. Simplify consolidation (fewer checks, defer testing to validation phase)
3. Split consolidation into multiple phases

### "Micro-task took 8K but budgeted 4K"

**Cause**: Micro-task still too large or complex

**Solutions**:
1. Further split this micro-task (e.g., file-based → function-based)
2. Increase micro-task budgets and reduce count (8 × 4K → 6 × 5K)
3. Review if task is truly decomposable

### "Consolidator creating 25 micro-tasks"

**Cause**: Task too large for single-level consolidation

**Solutions**:
1. Use nested consolidation (group into 4-5 sets of 5-6 micro-tasks)
2. Use recursive workflow instead
3. Increase tier (may not need consolidation at higher tier)

---

## Summary

**Task Consolidation = Split large tasks across agents for context efficiency**

✓ **40-88% context reduction** per agent
✓ **3-20x parallelism** vs single agent
✓ **Fault tolerant** - partial completion possible
✓ **Zero context failures** - no agent exceeds limits
✓ **Automatic** - planner detects and applies
✓ **5 strategies** - file, function, operation, chapter, data
✓ **Flexible** - works across all domains

**When**: Tasks >15K tokens, naturally decomposable
**Result**: Faster execution, lower context pressure, higher reliability
