# Context Window Management

How cAgents monitors and manages context budgets instead of time estimates.

---

## Core Principle

**Context, not time.** cAgents tracks token usage across workflows to ensure agents stay within their context window limits. Tasks are designed with token budgets, not time estimates.

## Why Context Budgets?

**Time is unreliable** for AI agents:
- Same task varies wildly in duration
- Parallel execution makes time meaningless
- Time doesn't reflect actual resource usage

**Context is the real constraint**:
- Agents have fixed context windows (200K tokens)
- Token usage is measurable and predictable
- Exceeding context breaks execution
- Context directly impacts agent performance

## Context Budget System

### Global Limits

```yaml
max_context_window: 200000      # Agent's total capacity
reserved_for_system: 20000      # System prompts, tools, overhead
available_for_tasks: 180000     # Available for workflow execution
```

### Tier-Based Budgets

| Tier | Complexity | Tasks | Context Budget | Buffer |
|------|-----------|-------|----------------|--------|
| 0 | Trivial | 0 | <5K tokens | 0% |
| 1 | Simple | 1 | 15K tokens | 20% |
| 2 | Moderate | 3-5 | 50K tokens | 20% |
| 3 | Complex | 5-10 | 100K tokens | 20% |
| 4 | Expert | 10+ | 150K tokens | 30% |

**Why buffers?**
- Tier 1-3: 20% buffer for normal variability
- Tier 4: 30% buffer for higher complexity and cross-domain work

### Task-Level Budgets

Each task gets a context budget based on its type:

```yaml
# Example Tier 2 plan (50K total)
tasks:
  - id: task_1
    type: read_complex
    context_budget: 15000

  - id: task_2
    type: analyze_code
    context_budget: 10000

  - id: task_3
    type: generate_code
    context_budget: 12000

  - id: task_4
    type: test_simple
    context_budget: 5000

Total: 42K tokens
Buffer: 8K tokens (19%)
Within Tier 2 budget: ✓
```

---

## Token Estimation Guidelines

### Reading Operations

| Operation | Files | Lines | Tokens |
|-----------|-------|-------|--------|
| **Simple Read** | 1-2 | <500 | 2-5K |
| **Complex Read** | 3-10 | 500-2K | 10-20K |
| **Massive Read** | 10+ | >2K | 20-40K |

### Analysis Operations

| Operation | Complexity | Tokens |
|-----------|------------|--------|
| **Code Review** | Moderate | 5-15K |
| **Data Analysis** | Moderate | 8-20K |
| **Business Analysis** | High | 10-25K |

### Generation Operations

| Operation | Output Size | Tokens |
|-----------|-------------|--------|
| **Code Generation** | 100-500 lines | 8-25K |
| **Content Writing** | 1K-5K words | 10-30K |
| **System Design** | Architecture docs | 12-30K |

### Testing/Validation

| Operation | Scope | Tokens |
|-----------|-------|--------|
| **Unit Tests** | Single module | 3-8K |
| **Integration Tests** | Multiple modules | 5-12K |
| **Quality Validation** | Full review | 4-10K |

---

## Planning with Context Budgets

### 1. Planner Workflow

```
1. Load tier assignment (e.g., Tier 2 = 50K budget)
2. Break down into tasks
3. Estimate context per task using guidelines
4. Sum total estimated context
5. Add buffer (20% for Tier 2)
6. Verify total ≤ tier budget
7. If exceeded:
   - Split tasks into smaller chunks
   - Reduce scope
   - Increase tier
   - Use recursive workflow
```

### 2. Example: Fix Bug (Tier 2)

**Requirement**: Fix authentication bug

**Tasks**:
1. Reproduce bug → read_simple (5K)
2. Diagnose root cause → analyze_code (8K)
3. Implement fix → generate_code (12K)
4. Write tests → generate_code (6K)
5. Validate fix → test_simple (4K)

**Total**: 35K tokens
**Buffer**: 15K tokens (43%)
**Tier 2 Budget**: 50K tokens ✓

### 3. Example: Write Novel Chapter (Tier 3)

**Requirement**: Write Chapter 5 with battle scene

**Tasks**:
1. Review story arc → read_complex (8K)
2. Design battle sequence → analyze_business (12K)
3. Write draft (3,500 words) → generate_content (25K)
4. Edit for pacing → analyze_code (10K)
5. Polish prose → generate_content (8K)
6. Continuity check → validate_quality (6K)

**Total**: 69K tokens
**Buffer**: 31K tokens (45%)
**Tier 3 Budget**: 100K tokens ✓

---

## Execution with Context Monitoring

### 1. Executor Workflow

```
1. Initialize context tracker
   - Load budget from plan
   - Set warning/pause/stop thresholds

2. Before each task:
   - Check remaining budget
   - Verify task budget ≤ remaining
   - If insufficient, pause and escalate

3. During task execution:
   - Pass context budget to subagent
   - Subagent monitors its own usage
   - Subagent reports actual usage

4. After each task:
   - Record actual tokens used
   - Update remaining budget
   - Check thresholds (90%, 95%, 100%)
   - Apply handling strategy if needed

5. Final reporting:
   - Total budget vs actual
   - Efficiency percentage
   - Per-task breakdown
```

### 2. Subagent Context Awareness

Every subagent receives context budget in their prompt:

```
CONTEXT BUDGET: 12,000 tokens

You have 12K tokens for this task. Monitor your usage:
- File reading: Aim for <4K tokens
- Analysis: Aim for <3K tokens
- Code generation: Aim for <5K tokens

If approaching limit (10K):
- Focus on essentials only
- Wrap up current work
- Report partial completion if needed

Report actual usage in manifest.yaml:
  actual_context_used: {tokens}
```

### 3. Context Tracking Example

```yaml
# After task completion
context_tracking:
  task_id: task_3
  budgeted: 12000
  actual: 11200
  breakdown:
    reading_files: 3800
    analysis: 2100
    generation: 4800
    validation: 500
  efficiency: 93%
  status: within_budget
```

---

## Threshold Handling

### 90% Warning (162K of 180K used)

**Actions**:
- Reduce parallelism (fewer concurrent agents)
- Prioritize critical path tasks
- Skip optional tasks
- Log warning

**Example**:
```
[WARN] Context at 90% (162K/180K). Remaining tasks:
- task_7 (10K) - critical
- task_8 (5K) - optional
- task_9 (8K) - critical

Action: Skip task_8, continue with task_7 → task_9
```

### 95% Pause (171K of 180K used)

**Actions**:
- Review remaining tasks
- Split into child workflow if feasible
- Escalate to HITL if complex
- Create continuation plan

**Example**:
```
[PAUSE] Context at 95% (171K/180K). Remaining: 9K

Remaining tasks:
- task_10 (15K) - exceeds budget
- task_11 (8K) - fits budget

Options:
1. Complete task_11 only (within budget)
2. Split task_10 into child workflow
3. Escalate both to HITL for prioritization

Selected: Option 2 (child workflow for task_10)
```

### 100% Hard Limit (180K of 180K used)

**Actions**:
- Graceful termination of current task
- Save all partial results
- Create detailed continuation plan
- Escalate to HITL with context

**Example**:
```
[STOP] Context at 100% (180K/180K). Hard limit reached.

Completed: tasks 1-9 (all critical tasks done)
Partial: task_10 (design phase complete, implementation pending)
Pending: tasks 11-12

Saved to: Agent_Memory/{instruction_id}/outputs/partial/
Continuation plan: continuation_plan.yaml
Escalated to: HITL for review and next steps
```

---

## Budget Exceeded Strategies

### Adaptive (Default)

Intelligently handles budget constraints:

1. **At 90%**: Optimize remaining work
2. **At 95%**: Restructure or split
3. **At 100%**: Graceful completion

### Strict

Stop immediately at any threshold violation. Use for:
- Critical workflows requiring full completion
- When partial results aren't useful
- When context guarantee is mandatory

### Permissive

Allow moderate overruns (up to 10%) with warnings. Use for:
- Non-critical workflows
- When slight overruns are acceptable
- When context is less constraining (smaller tasks)

---

## Context Optimization Strategies

### 1. Efficient Reading (20-40% savings)

**Instead of**:
```javascript
// Read entire codebase
Read all 50 files (40K tokens)
```

**Do this**:
```javascript
// Targeted search
Grep for "authentication" (2K tokens)
Read only 3 relevant files (8K tokens)
// Savings: 30K tokens (75%)
```

### 2. Context Reuse (10-20% savings)

**Instead of**:
```javascript
// Each task reads same files
Task 1: Read auth.js (3K)
Task 2: Read auth.js (3K)
Task 3: Read auth.js (3K)
// Total: 9K tokens
```

**Do this**:
```javascript
// Share context in same wave
Wave 1: Read auth.js once (3K)
  - Task 1 uses shared context
  - Task 2 uses shared context
  - Task 3 uses shared context
// Total: 3K tokens (66% savings)
```

### 3. Incremental Processing (15-30% savings)

**Instead of**:
```javascript
// Load all data at once
Load all metrics (25K tokens)
Analyze all at once
```

**Do this**:
```javascript
// Process in chunks, clear between waves
Wave 1: Load Q1 data (8K), analyze, clear
Wave 2: Load Q2 data (8K), analyze, clear
Wave 3: Load Q3 data (8K), analyze, clear
// Total: 24K vs 25K, but allows larger datasets
```

### 4. Smart Caching (10-15% savings)

**Instead of**:
```javascript
// Re-read common files
Every task reads config.yaml (2K each)
5 tasks = 10K tokens
```

**Do this**:
```javascript
// Cache in Agent_Memory
Cache config.yaml in _cache/ (2K once)
All tasks reference cache
// Total: 2K tokens (80% savings)
```

---

## Recursive Workflows and Context

### When to Use Recursive Workflows

Use child workflows when:
- Single workflow exceeds Tier 4 budget (150K)
- Complex task needs full context window
- Cleaner separation of concerns
- Parent approaching limit (>70%)

### Example: Write 10-Chapter Novel

**Instead of Tier 4** (would exceed 150K):
```yaml
Single workflow:
  - Outline (15K)
  - Chapter 1-10 (each 25K = 250K total)
Total: 265K tokens ❌ Exceeds Tier 4 limit
```

**Use Recursive** (stays within limits):
```yaml
Parent workflow (Tier 2, 50K):
  - Create overall outline (15K)
  - Define characters (10K)
  - Plan arc (10K)
  - Spawn 10 child workflows

Child workflow per chapter (Tier 2, 50K each):
  - Review outline (5K)
  - Write chapter (25K)
  - Edit (10K)
  - Polish (5K)

Total: 50K parent + (10 × 50K children) = 550K
But each workflow stays within Tier 2 limits ✓
```

---

## Configuration

### Default Config

Location: `core/memory/templates/_system/context_budget_config.yaml`

Key settings:
```yaml
context_limits:
  max_context_window: 200000
  available_for_tasks: 180000

tier_budgets:
  tier_1: 15000
  tier_2: 50000
  tier_3: 100000
  tier_4: 150000

monitoring:
  warn_at_percent: 90
  pause_at_percent: 95
  stop_at_percent: 100
```

### Domain Overrides

Domains can override estimates in their `executor_config.yaml`:

```yaml
# creative/executor_config.yaml
context_overrides:
  task_estimates:
    generate_content:
      typical: 25000  # Higher than default 20K
```

---

## Migration from Time-Based Planning

### Before (Time-Based)

```yaml
plan:
  summary:
    estimated_hours: 4.5

  tasks:
    - id: task_1
      estimated_hours: 1.5
    - id: task_2
      estimated_hours: 2.0
    - id: task_3
      estimated_hours: 1.0
```

### After (Context-Based)

```yaml
plan:
  summary:
    total_context_budget: 42000
    buffer_remaining: 8000

  context_management:
    max_context_window: 200000
    available_for_tasks: 180000
    budget_allocated: 42000

  tasks:
    - id: task_1
      context_budget: 15000
      context_breakdown:
        reading_files: 5000
        analysis: 4000
        generation: 6000
    - id: task_2
      context_budget: 18000
      context_breakdown:
        reading_files: 6000
        analysis: 5000
        generation: 7000
    - id: task_3
      context_budget: 9000
      context_breakdown:
        reading_files: 3000
        generation: 6000
```

---

## Best Practices

### 1. Plan Conservatively

- Use typical estimates, not minimum
- Always include buffer (20-30%)
- Round up when uncertain
- Test with smaller tasks first

### 2. Monitor Actively

- Check context after each task
- Log actual vs budgeted
- Learn from historical data
- Adjust estimates based on patterns

### 3. Optimize Early

- Use targeted searches over full reads
- Cache commonly accessed data
- Clear context between waves
- Share context in parallel tasks

### 4. Handle Gracefully

- Warn at 90%, don't panic
- Pause at 95%, assess options
- Stop at 100%, save progress
- Always create continuation plans

### 5. Report Transparently

- Include context tracking in all summaries
- Report efficiency percentages
- Highlight optimization opportunities
- Update calibration data

---

## Troubleshooting

### "Context budget exceeded at 50K"

**Cause**: Task estimated at 12K actually used 18K

**Solutions**:
1. Increase buffer for similar tasks
2. Split task into smaller subtasks
3. Optimize file reading (use Grep, not Read)
4. Update task_estimates in config

### "Approaching 90% threshold"

**Cause**: Underestimated total complexity

**Solutions**:
1. Skip optional tasks
2. Reduce parallelism
3. Focus on critical path only
4. Split remaining into child workflow

### "Agent stopped at 100%"

**Cause**: Hard limit reached

**Solutions**:
1. Review completed work (may be sufficient)
2. Create continuation workflow for remainder
3. Escalate to HITL for priority decisions
4. Consider increasing tier for retry

---

## Summary

**cAgents context management**:

✓ **Tracks tokens, not time** - Real resource constraint
✓ **Tier-based budgets** - 15K to 150K based on complexity
✓ **Task-level budgets** - Every task has token allocation
✓ **Active monitoring** - Thresholds at 90%, 95%, 100%
✓ **Adaptive handling** - Optimize, split, or escalate
✓ **Optimization strategies** - 10-40% token savings
✓ **Recursive support** - Child workflows for large tasks
✓ **Transparent reporting** - Full context tracking in summaries

**Result**: Agents stay within limits, workflows complete successfully, no context window failures.
