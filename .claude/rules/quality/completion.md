# Task Completion Protocol

**MANDATORY**: All tasks must be fully completed before marking as done.

## Core Rule

**100% completion with verified evidence, or it's not complete.**

## Enforcement Points

### Controllers
- Verify ALL acceptance criteria in coordination_log before marking complete
- Provide concrete evidence for each objective met
- No partial completion - 100% or in_progress

### universal-executor
- Verifies coordination_log completeness before phase transition
- Checks all tasks have `status: completed`
- Validates evidence exists for each task

### universal-validator
- Checks coordination quality + output quality
- Verifies no regressions
- Validates all success criteria met

### orchestrator
- Validates coordination_log exists and is complete
- Checks phase transitions have evidence
- Ensures no phase skipped

## Requirements

1. **All objectives met** with concrete evidence
2. **All outputs exist** and are production-quality
3. **coordination_log.yaml** with all Q&A exchanges, synthesis, completed tasks
4. **Evidence must be specific** (file paths, test outputs, metrics)
5. **NO partial completion** - 100% or in_progress

## Evidence Examples

Good evidence:
- ✅ "Tests passing: pytest output shows 45/45 passed"
- ✅ "File created: src/auth/oauth2.ts (247 lines)"
- ✅ "Metrics improved: Bundle 2.8MB → 1.8MB (-36%)"

Bad evidence:
- ❌ "Tests probably pass"
- ❌ "File mostly done"
- ❌ "Should be faster now"

## Context Overhead

Add 3K tokens per coordination cycle for Q&A tracking (included in planning).

## Protocol Location

`Agent_Memory/_system/task_completion_protocol.yaml`
