# Workflow Evaluation and Fixes

**Date**: 2026-01-12
**Version**: 1.1
**Status**: FIXED

## Evaluation Summary

Conducted comprehensive evaluation of complex task workflows (tier 3-4) with the new mandatory task completion protocol. Identified 6 critical issues that would cause workflow failures and implemented fixes.

## Issues Identified and Fixed

### Issue 1: Planner Unaware of Verification Requirements ✓ FIXED

**Problem**: Universal-planner creates acceptance criteria but doesn't account for manifest.yaml requirement or verification overhead.

**Impact**: Tasks fail because agents don't know to create verification records.

**Fix**:
- Updated `core/agents/universal-planner.md` with mandatory verification section
- Added verification requirement to every task's acceptance criteria
- Added manifest.yaml to outputs_expected for every task
- Adjusted context budgets: +2K tokens per task for verification
- Updated tier budgets to include verification overhead

**Files Modified**:
- `core/agents/universal-planner.md` (+65 lines)

### Issue 2: Missing Manifest Template ✓ FIXED

**Problem**: Subagents receive completion protocol in prompt but don't know the exact YAML structure for manifest.yaml.

**Impact**: Agents create incomplete or incorrectly formatted manifests.

**Fix**:
- Created comprehensive manifest template: `Agent_Memory/_system/templates/task_manifest_template.yaml`
- Includes all required sections with examples
- Shows GOOD vs BAD evidence examples
- Provides completion checklist

**Files Created**:
- `Agent_Memory/_system/templates/task_manifest_template.yaml` (150+ lines)

### Issue 3: Context Budget Underestimation ✓ FIXED

**Problem**: New protocol adds overhead not accounted for in original context budgets.

**Impact**: Tasks exceed budget and get cut off before completing verification.

**Fix**:
- Added 2K tokens per task for verification overhead
- Updated tier budget tables in planner
- Adjusted context breakdown to include verification

**Context Budget Updates**:
```
Tier 1: <13K base + 2K verification = <15K total
Tier 2: 15-45K base + 5-10K verification = 20-55K total
Tier 3: 50-90K base + 10-20K verification = 60-110K total
Tier 4: 100-130K base + 20-30K verification = 120-160K total
```

### Issue 4: Validator Too Strict ✓ FIXED

**Problem**: Validator did fail-fast on ANY missing manifest, even if work was complete.

**Impact**: False failures where work is done but manifest is missing, all work wasted.

**Fix**:
- Implemented severity levels: CRITICAL, MAJOR, MINOR
- CRITICAL: Work is actually incomplete (BLOCKED)
- MAJOR: Manifest missing but work complete (FIXABLE - generate manifest)
- MINOR: Formatting issues (FIXABLE - auto-fix)
- Added recovery logic for missing manifests
- Self-correct can generate synthetic manifest from available evidence

**Files Modified**:
- `core/agents/universal-validator.md` (+25 lines)

### Issue 5: Executor Prompt Lacked Template Reference ✓ FIXED

**Problem**: Executor spawns subagents with completion requirements but no concrete example.

**Impact**: Each agent invents their own format, causing consistency issues.

**Fix**:
- Updated executor subagent prompt to reference template file
- Included exact path: `Agent_Memory/_system/templates/task_manifest_template.yaml`
- Listed required sections explicitly
- Referenced template's good vs bad evidence examples

**Files Modified**:
- `core/agents/universal-executor.md` (+10 lines)

### Issue 6: Documentation Gap ✓ FIXED

**Problem**: CLAUDE.md didn't mention template or context overhead.

**Impact**: Users and agents unaware of new requirements.

**Fix**:
- Added template file reference to CLAUDE.md
- Documented 2K per-task context overhead
- Added to Quick Reference section

**Files Modified**:
- `CLAUDE.md` (+3 lines)

## Summary of Changes

### Files Created (1)
1. `Agent_Memory/_system/templates/task_manifest_template.yaml` (150+ lines)
   - Comprehensive template with all required sections
   - Examples of good vs bad evidence
   - Completion checklist

### Files Modified (4)
1. `core/agents/universal-planner.md` (+65 lines)
   - Added mandatory verification requirements section
   - Updated workflow to include verification step
   - Adjusted tier context budgets
   - Added verification-aware planning example

2. `core/agents/universal-executor.md` (+10 lines)
   - Updated subagent prompt with template reference
   - Listed required manifest sections explicitly

3. `core/agents/universal-validator.md` (+25 lines)
   - Added severity levels for verification failures
   - Implemented graceful failure handling
   - Added recovery logic for missing manifests

4. `CLAUDE.md` (+3 lines)
   - Added template file reference
   - Documented context overhead
   - Updated Quick Reference

## New Workflow Flow

### Planning Phase (Planner)
1. Load instruction and domain config
2. Generate tasks with acceptance criteria
3. **Add manifest requirement** to every task
4. **Add manifest.yaml** to outputs_expected
5. **Calculate context budget** with +2K verification per task
6. Write plan with verification requirements

### Execution Phase (Executor)
1. Read plan with verification requirements
2. Spawn subagent with:
   - Task description and criteria
   - **Template reference**: `task_manifest_template.yaml`
   - Required manifest sections
   - Examples of good evidence
3. Verify manifest exists before marking complete
4. Check manifest has all required sections

### Validation Phase (Validator)
1. Check each task has manifest.yaml
2. **Assess severity** if manifest missing/incomplete:
   - CRITICAL: Work incomplete → BLOCKED → HITL
   - MAJOR: Work complete, manifest missing → FIXABLE → Generate manifest
   - MINOR: Format issues → FIXABLE → Auto-fix
3. Continue to quality gates if work is actually complete
4. Classify based on work quality, not just manifest presence

## Benefits

1. **No False Failures**: Work completion checked before manifest presence
2. **Clear Guidance**: Template shows agents exactly what to create
3. **Adequate Budget**: Context budgets account for verification overhead
4. **Graceful Degradation**: Missing manifest can be recovered if work is done
5. **Consistency**: All agents use same template format

## Testing Recommendations

1. **Test missing manifest with complete work**: Should classify as FIXABLE, not BLOCKED
2. **Test context budget**: Verify 2K overhead is sufficient for verification
3. **Test template reference**: Subagents should successfully create manifest using template
4. **Test severity levels**: Critical failures block, major failures fixable
5. **Test planner**: All tasks should include manifest requirement automatically

## Monitoring

**Success Metrics**:
- % of tasks with properly formatted manifests (target: 95%+)
- False failure rate (work complete but blocked) (target: <5%)
- Context budget overruns (target: <10%)
- FIXABLE rate for manifest issues (target: >80% recovered)

## Version History

- **v1.0** (2026-01-12): Initial mandatory completion protocol
- **v1.1** (2026-01-12): Workflow evaluation fixes (this update)
  - Template created
  - Planner updated with verification awareness
  - Context budgets adjusted
  - Validator made less strict with severity levels
  - Executor prompt enhanced with template reference

---

## Files in This Update

**Created**:
- `Agent_Memory/_system/templates/task_manifest_template.yaml`
- `WORKFLOW_EVALUATION_FIXES.md` (this file)

**Modified**:
- `core/agents/universal-planner.md`
- `core/agents/universal-executor.md`
- `core/agents/universal-validator.md`
- `CLAUDE.md`

Total: +168 lines added, addressing all 6 critical issues identified in workflow evaluation.
