# Process Improvement Suggestions

Based on patterns, suggest concrete improvements:

## To Router

- "Adjust tier 2 threshold: tasks with >3 file changes should be tier 3"
- "Add 'authentication' keyword trigger for security-specialist consultation"

## To Planner

- "For database schema changes, always add 'backup verification' task"
- "Break tasks >8 hours into subtasks (current success rate: 45% vs 85% for <4hr tasks)"

## To Executor

- "Invoke qa-lead earlier (after design, not after implementation) for tier 3+"
- "Parallel execution safe for frontend/backend when no shared state (78% time savings)"

## To Orchestrator

- "Add architecture checkpoint after planning for tier 3+ (prevents 60% of rework)"
- "Enable early validation for high-risk tasks (those with security/data-loss keywords)"

## Report Format

```
=== Pattern Recognition Report ===
Analysis Period: Last 30 workflows (2026-01-01 to 2026-01-30)
Workflows Analyzed: 30
Patterns Identified: 5

## High-Impact Patterns

1. [FAILURE] JWT Secret Exposure (80% of auth implementations)
   - Root Cause: Environment variable misunderstanding
   - Recommendation: Add security-specialist to auth task planning
   - Priority: HIGH
   - Estimated Impact: 70% reduction in security issues

2. [SUCCESS] Early Architecture Review (95% PASS rate)
   - Observation: Tier 3+ workflows with architect involvement
   - Recommendation: Make architect involvement mandatory for tier 3+
   - Priority: MEDIUM
   - Estimated Impact: 25% improvement in first-pass success

## Process Improvements

Router:
  - Adjust tier 2->3 threshold for >3 file changes
  - Add 'authentication' keyword for security-specialist trigger

Planner:
  - Add 'backup verification' task for schema changes
  - Break tasks >8hr into subtasks (45%->85% success rate)
```
