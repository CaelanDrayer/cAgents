# Workaround Analysis Report: Upstream Bug Fix Impact

**Date**: 2026-03-25
**Analysis Scope**: 4 cAgents hook files
**Upstream Fixes Evaluated**:
- CC 2.1.74: SessionEnd hook timeout extension
- CC 2.1.83: Background agent task state fix + subagent visibility after compaction

---

## Hook: team-stop.cjs
### Upstream Fix: CC 2.1.74 — Extended SessionEnd hook timeout via `CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS`

#### Workaround 1: Individual try-catch guards on all writeFileSync calls
- **File:line**: team-stop.cjs:64, 86, 96
- **Classification**: **SIMPLIFY**
- **Rationale**:
  - The original workaround was designed to handle premature hook termination when CC killed SessionEnd hooks after 1.5 seconds
  - CC 2.1.74 allows configurable timeout via `CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS` environment variable
  - While the try-catch guards are still prudent (defensive programming for partial failure states), they are no longer a critical mitigation
  - **Simplification opportunity**: Remove the comment at lines 8-11 mentioning hook cancellation, as it's now configurable. Keep try-catch guards for data corruption resilience (separate concern from timeout urgency)
  - Consider consolidating writes into a single batch operation with one try-catch if order doesn't matter, or wrap entire write sequence in a try-catch with partial rollback
  - Cost/benefit still favors keeping individual guards — they're lightweight and provide per-file failure isolation

#### Workaround 2: Manual duration computation with NaN/negative guards
- **File:line**: team-stop.cjs:46-49
- **Classification**: **KEEP**
- **Rationale**:
  - Guards against malformed or missing `started_at` timestamp in timing.yaml
  - Not addressed by CC 2.1.74 timeout fix — this is data validation, not a timeout issue
  - Protects against corrupted state from previous runs or partial writes
  - Minimal cost; keeps metrics from being corrupted by invalid timestamps

#### Workaround 3: Defensive structure validation before overwriting timing file
- **File:line**: team-stop.cjs:52-62
- **Classification**: **KEEP**
- **Rationale**:
  - Validates timing.yaml structure before updating (applies defaults for missing fields)
  - Not addressed by CC timeout fix — this is about resilient file mutation, not execution time
  - Prevents overwriting valid data when fields are missing
  - Important for session recovery after partial failures

---

## Hook: team-task-complete.cjs
### Upstream Fix: CC 2.1.83 — Fixed background agent tasks stuck in 'running' state

#### Workaround 1: Three-tier ID extraction fallback
- **File:line**: team-task-complete.cjs:15-29
- **Classification**: **SIMPLIFY**
- **Rationale**:
  - **Primary extraction (lines 17-18)** uses official TaskCompleted schema field `task_id`
    - CC 2.1.83 ensures background agent Task tool calls complete properly with correct metadata
    - This tier remains reliable with the bug fix applied
    - **Keep this tier**
  - **Fallback 1 (lines 20-22)** parses WI-xxx/TASK-xxx from task_subject/description
    - Workaround for race condition where `task_id` field was unreliable in malformed TaskCompleted events
    - CC 2.1.83 fixes the underlying state tracking, making this less critical
    - **Simplification opportunity**: Move to Fallback 2 (check only tool_input fields), removing the regex parse from subject/description
    - This reduces parsing overhead while keeping recovery path for very old sessions
  - **Fallback 2 (lines 24-28)** checks tool_input fields from the original Task call
    - Still valuable for recovery from corrupted task_list.yaml or missing task_id
    - **Keep this tier**
  - **Recommendation**: Remove Fallback 1 string parsing, consolidate to primary + single fallback (check tool_input only)
    - Saves regex compilation + execution on every TaskCompleted event
    - Reduces complexity (2 parsing paths -> 1)
    - Keeps safety net for genuinely missing task_id

#### Workaround 2: Manual count of completed/in_progress/available items
- **File:line**: team-task-complete.cjs:59-62
- **Classification**: **KEEP**
- **Rationale**:
  - Counts work item statuses by regex matching in task_list.yaml instead of trusting summary fields
  - CC 2.1.83 fixes background agent task state tracking, but doesn't guarantee task_list.yaml summary fields are always in sync
  - Manual counting is defensive against race conditions in task list updates
  - Important for accurately detecting "all items complete" condition (line 109)
  - No upstream fix addresses this particular concern

#### Workaround 3: Check dependencies manually with parseTaskList + areDependenciesMet
- **File:line**: team-task-complete.cjs:93-98
- **Classification**: **KEEP**
- **Rationale**:
  - Re-parses task_list.yaml to detect newly unblocked items
  - CC 2.1.83 fixes background agent state, but doesn't change dependency management
  - Not a workaround for a CC bug — it's a core feature (dependency tracking)
  - Keep as-is

---

## Hook: teammate-idle-handler.cjs
### Upstream Fix: CC 2.1.83 — Fixed background subagents becoming invisible after context compaction

#### Workaround 1: Wave detection from teammate name pattern
- **File:line**: teammate-idle-handler.cjs:19-36
- **Classification**: **SIMPLIFY**
- **Rationale**:
  - **Primary extraction (lines 21-22)** parses wave number from teammate name (`w{K}-task-{N}-{controller}`)
    - CC 2.1.83 ensures subagents don't disappear after compaction, so name parsing remains reliable
    - **Keep this tier**
  - **Fallback (lines 24-33)** scans task_list.yaml for wave metadata in in_progress items
    - Workaround for teammate name being unavailable or malformed
    - Still valuable for resilience, but less critical with CC 2.1.83 (subagent visibility improved)
    - **Keep this tier** — doesn't add much cost, provides recovery path
  - **Recommendation**: Keep both tiers as-is. The fallback is lightweight and provides genuine resilience

#### Workaround 2: Wave-based filtering to prevent cross-wave item suggestions
- **File:line**: teammate-idle-handler.cjs:48-64 (H-10 comment)
- **Classification**: **KEEP**
- **Rationale**:
  - Filters available work to only items from current wave
  - Not a workaround for CC bug — it's a business logic constraint (ensuring wave ordering)
  - Important for maintaining GATE sentinel quality checks between waves
  - CC 2.1.83 doesn't change wave management
  - **Keep as-is**

#### Workaround 3: All-items-completed detection with explicit status check
- **File:line**: teammate-idle-handler.cjs:81-92
- **Classification**: **KEEP**
- **Rationale**:
  - Parses task_list.yaml and checks that all items have status `completed`
  - CC 2.1.83 fixes subagent visibility, but doesn't guarantee task_list.yaml is perfectly synchronized
  - Defensive check ensures teammate doesn't stop prematurely when task list is out of sync
  - Minimal cost; important for correctness
  - **Keep as-is**

---

## Hook: pre-compact-save.cjs
### Upstream Fix: CC 2.1.83 — Fixed subagents becoming invisible after context compaction

#### Workaround 1: Phase inference from workflow artifacts when status.yaml lacks phase
- **File:line**: pre-compact-save.cjs:75-89
- **Classification**: **KEEP**
- **Rationale**:
  - Infers phase from coordination_log.yaml, plan.yaml, decomposition.yaml, instruction.yaml if status.yaml is incomplete
  - Not a workaround for CC 2.1.83 — it's defensive against corrupted or incomplete status.yaml
  - CC fix ensures subagents don't disappear, but doesn't guarantee status.yaml always has phase field
  - Important for session recovery after partial failures
  - **Keep as-is**

#### Workaround 2: Manual team state extraction via parseTaskList
- **File:line**: pre-compact-save.cjs:99-106
- **Classification**: **KEEP**
- **Rationale**:
  - Parses task_list.yaml and counts items by status instead of reading summary fields
  - Not a workaround for CC 2.1.83 — it's about state resilience, not subagent visibility
  - Similar to team-task-complete.cjs, provides defense against race conditions in task list updates
  - Important for accurate team state in waypoint files
  - **Keep as-is**

#### Workaround 3: 5-Question Reboot Check with findings.md and progress.md existence checks
- **File:line**: pre-compact-save.cjs:128-147
- **Classification**: **KEEP**
- **Rationale**:
  - Checks for findings.md and progress.md existence before reporting "See findings.md"
  - Guards against dangling references in waypoint file
  - Not a workaround for CC 2.1.83 — it's defensive against incomplete session state
  - Important for post-compaction session recovery
  - **Keep as-is**

#### Workaround 4: Defensive 5-question population with fallback values
- **File:line**: pre-compact-save.cjs:130-147
- **Classification**: **KEEP**
- **Rationale**:
  - Provides sensible defaults when files/fields are missing (e.g., "No plan.yaml found")
  - Not a workaround for CC bug — it's about graceful degradation
  - Important for session recovery when state is partial
  - **Keep as-is**

---

## Summary Table

| Hook | Workaround | Classification | Upstream Fix | Recommendation |
|------|-----------|-----------------|--------------|-----------------|
| **team-stop.cjs** | Individual try-catch guards on writeFileSync | SIMPLIFY | CC 2.1.74 | Remove timeout comment (lines 8-11), keep guards for resilience |
| **team-stop.cjs** | Duration computation with NaN/negative guards | KEEP | CC 2.1.74 | No change |
| **team-stop.cjs** | Structure validation before overwriting timing | KEEP | CC 2.1.74 | No change |
| **team-task-complete.cjs** | Three-tier ID extraction fallback | SIMPLIFY | CC 2.1.83 | Remove Fallback 1 string parsing (lines 20-22), keep primary + tool_input only |
| **team-task-complete.cjs** | Manual status count via regex | KEEP | CC 2.1.83 | No change |
| **team-task-complete.cjs** | Dependency tracking via parseTaskList | KEEP | CC 2.1.83 | No change |
| **teammate-idle-handler.cjs** | Wave detection from teammate name | KEEP | CC 2.1.83 | No change |
| **teammate-idle-handler.cjs** | Wave filtering for cross-wave prevention | KEEP | CC 2.1.83 | No change |
| **teammate-idle-handler.cjs** | All-completed status check | KEEP | CC 2.1.83 | No change |
| **pre-compact-save.cjs** | Phase inference from artifacts | KEEP | CC 2.1.83 | No change |
| **pre-compact-save.cjs** | Manual team state extraction | KEEP | CC 2.1.83 | No change |
| **pre-compact-save.cjs** | 5-Question Reboot Check w/ file existence | KEEP | CC 2.1.83 | No change |
| **pre-compact-save.cjs** | Defensive 5-question population | KEEP | CC 2.1.83 | No change |

---

## Findings Summary

**Total Workarounds Analyzed**: 13
**REMOVE**: 0
**SIMPLIFY**: 2
**KEEP**: 11

### High-Impact Simplifications

#### 1. **team-stop.cjs (lines 8-11)**
Remove the "hook cancellation" comment. It's no longer the primary threat — CC 2.1.74 allows configurable timeouts. The code is still correct (try-catch guards remain), but the rationale needs updating.

**Before**:
```javascript
/**
 * NOTE: When a user cancels a session, Claude Code may terminate this hook
 * before it completes, producing "Hook cancelled" in the output. This is
 * expected behavior — no data is lost or corrupted. All writeFileSync calls
 * are individually try-catch guarded to handle partial teardown gracefully.
 */
```

**After**:
```javascript
/**
 * NOTE: SessionEnd hooks have configurable timeout via CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS.
 * All writeFileSync calls are individually try-catch guarded for resilience
 * against partial failures or context truncation.
 */
```

#### 2. **team-task-complete.cjs (lines 20-22)**
Remove the regex-based fallback that parses WI-xxx from task_subject. Keep the tool_input fallback.

**Impact**:
- Eliminates one regex compilation + execution per TaskCompleted event
- Reduces code complexity (removes 3 lines)
- Keeps recovery path for genuinely missing task_id via tool_input fallback
- Safe because CC 2.1.83 ensures background Task calls complete with proper metadata

**Change**:
```javascript
function extractWorkItemId(input) {
  // Primary: use task_id directly from official TaskCompleted schema
  if (input.task_id) return input.task_id;

  // Fallback: check tool_input fields (for recovery from corrupted state)
  const legacyCombined = `${input.tool_input?.description || ''} ${input.tool_input?.prompt || ''}`;
  const legacyMatch = legacyCombined.match(/(?:WI|TASK)-(\d+)/i);
  if (legacyMatch) return `${legacyMatch[0].split('-')[0].toUpperCase()}-${legacyMatch[1]}`;

  return null;
}
```

### Why Workarounds Were Necessary (and Why They Stay)

The remaining 11 KEEP workarounds address concerns **orthogonal to the upstream CC bug fixes**:

1. **Data resilience** (team-stop.cjs, pre-compact-save.cjs): Defensive checks for corrupted state
2. **Race conditions** (team-task-complete.cjs, teammate-idle-handler.cjs): Defensive against async task list mutations
3. **Business logic** (teammate-idle-handler.cjs): Wave ordering constraints independent of CC behavior
4. **Recovery paths** (all hooks): Fallbacks for genuinely missing data (not timeout-related)

---

## Testing Recommendations

After simplification:

1. **team-stop.cjs**: Test SessionEnd during long-running sessions. Verify metrics finalize correctly. Test with timeout env var set to low value (e.g., 2000ms) and high value (10000ms).

2. **team-task-complete.cjs**: Test with malformed TaskCompleted events (missing task_id field). Verify task_id extraction falls back to tool_input. Test background agent task completion in quick succession.

3. **No testing needed for KEEP workarounds**: They address data resilience and race conditions that are independent of upstream CC fixes.

---

## Conclusion

**Overall Risk**: LOW
**Recommended Action**: Perform the 2 simplifications (comment update + fallback removal)

The codebase is well-defended against data corruption and is not over-reliant on CC bug fixes. The 2 simplifications are low-risk cleanups that reduce cognitive load without sacrificing safety.
