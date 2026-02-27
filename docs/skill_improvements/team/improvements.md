# /team Improvement Recommendations

## Priority 1: High Impact, Moderate Effort

### 1.1 Automatic Teammate Failure Recovery

**Current**: Manual recovery ("spawn a replacement teammate if needed").
**Proposed**: Automatic retry with progressive fallback.

```
Teammate failure detected (WI-003 in Wave 2):

Recovery chain:
1. Retry: Spawn new teammate with same work item + error context
   "Previous attempt failed with: {error}. Avoid: {failure cause}."
2. Simplify: If retry fails, break WI-003 into sub-items
   WI-003a: Core implementation
   WI-003b: Edge cases + testing
3. Escalate: If simplify fails, mark WI-003 as blocked
   Continue with remaining wave items
   Report partial results to user
```

**Implementation**:
- Add retry logic after teammate completion check
- If TaskUpdate shows incomplete after timeout, spawn replacement
- Track retry count per work item (max 2 retries)
- After max retries, mark as blocked and continue

### 1.2 GATE Validation Standards

**Current**: GATE validation is ad-hoc.
**Proposed**: Define standard GATE validation criteria per wave type.

```yaml
gate_standards:
  research_wave:
    criteria:
      - "All research outputs exist in outputs/wi-{N}/"
      - "Each output has a summary section"
      - "Key findings are documented"
    validation: file_exists + content_check

  implementation_wave:
    criteria:
      - "All implementation files created/modified"
      - "No syntax errors in modified files"
      - "Acceptance criteria references addressed"
    validation: file_exists + syntax_check + grep_for_criteria

  testing_wave:
    criteria:
      - "Test files created for each implemented feature"
      - "Test execution attempted (pass or documented failure)"
    validation: file_exists + test_run

  documentation_wave:
    criteria:
      - "Documentation files updated"
      - "API changes reflected in docs"
    validation: file_exists + content_check
```

### 1.3 Team Execution Retrospective

**Current**: No post-execution analysis.
**Proposed**: Automatic retrospective after team completion.

```yaml
# workflow/team_retrospective.yaml
retrospective:
  total_waves: 6
  total_work_items: 15
  total_teammates_spawned: 18
  completion_rate: 0.93 (14/15)
  avg_wave_duration: 120s

  per_wave_metrics:
    wave_1: {items: 3, duration: 95s, gate_result: PASS, retries: 0}
    wave_2: {items: 4, duration: 180s, gate_result: PASS, retries: 1}
    wave_3: {items: 3, duration: 150s, gate_result: FAIL_THEN_PASS, retries: 0}
    wave_4: {items: 2, duration: 90s, gate_result: PASS, retries: 0}
    wave_5: {items: 2, duration: 80s, gate_result: PASS, retries: 0}

  bottlenecks:
    - wave_2: "WI-005 took 150s (3x average), blocked by slow API analysis"

  improvements_for_next_time:
    - "WI-005 could be split into separate API analysis and implementation items"
    - "Wave 3 gate failure was due to missing test file -- add to acceptance criteria"
```

### 1.4 Optimized Teammate Prompts

**Current**: Large prompts with full context.
**Proposed**: Tiered prompt strategy based on work item complexity.

```
Simple work items (< 500 chars description):
  Prompt: "Execute WI-{N}: {description}. Session: {dir}. Write outputs to outputs/wi-{N}/."
  (~100 tokens)

Medium work items (500-2000 chars):
  Prompt: Include acceptance criteria + dependency refs
  (~300 tokens)

Complex work items (> 2000 chars):
  Prompt: Include full context + previous wave summaries
  Reference session files instead of inlining content
  (~500 tokens, with file refs)
```

## Priority 2: Medium Impact, Lower Effort

### 2.1 Partial Results on Failure

**Current**: All-or-nothing outcome.
**Proposed**: Return completed wave results even if later waves fail.

```
Team execution partially complete:
  Wave 1 (Research): COMPLETE - 3/3 items done
  Wave 2 (Implementation): COMPLETE - 4/4 items done
  Wave 3 (Testing): PARTIAL - 2/3 items done, 1 failed
  Wave 4 (Documentation): NOT STARTED (blocked by Wave 3)

Completed outputs: Agent_Memory/sessions/{id}/outputs/
  - wi-001/ through wi-007/ (complete)
  - wi-008/ and wi-009/ (complete)
  - wi-010/ (failed: test framework incompatibility)
  - wi-011/ through wi-012/ (not started)

To complete remaining:
  /team --resume {session_id}
```

### 2.2 Wave Cost/Benefit Analysis

**Current**: Maximize waves unconditionally.
**Proposed**: Analyze wave overhead vs. quality benefit.

```
Wave analysis for this request:
  Decomposed: 15 work items across 8 waves

  Overhead calculation:
    Per-wave overhead: ~30s (spawn + gate validation + shutdown)
    8 waves = 240s overhead
    Estimated parallel savings: 600s (vs sequential)
    Net benefit: 360s (60% improvement)

  Recommendation: 8 waves is optimal for this request.
  Alternative: 5 waves would save 90s overhead but lose 2 quality gates.
```

If wave overhead exceeds 50% of parallel savings, suggest fewer waves.

### 2.3 Shared Context Optimization

**Current**: Each teammate starts with independent context.
**Proposed**: Identify work items that share context and provide shared analysis.

```
Wave 2 has 4 work items:
  WI-003: Implement user API endpoints
  WI-004: Implement admin API endpoints
  WI-005: Implement auth middleware
  WI-006: Implement rate limiting

Shared context: All 4 touch src/api/ and share database models.

Pre-wave context preparation:
  Lead creates shared_context_wave_2.yaml with:
    - Database model summary
    - Existing API patterns
    - Auth flow diagram
  Teammates read this shared context instead of each discovering it independently.
```

### 2.4 Dynamic Wave Merging

**Current**: Waves are fixed once decomposed.
**Proposed**: If a wave completes with only 1 item remaining, merge with next wave.

```
Wave 3: 3 items assigned
  WI-008: Complete (45s)
  WI-009: Complete (60s)
  WI-010: Complete (30s)

Wave 4: 1 item assigned
  WI-011: Pending

Decision: Merge WI-011 into Wave 3 (spawn immediately, no wave boundary)
Saves: 30s overhead (spawn + gate + shutdown cycle)
```

## Priority 3: Nice-to-Have Enhancements

### 3.1 Teammate Peer Communication

Allow optional peer messaging within a wave for related work items:
```
WI-003 teammate: "I'm defining the user API schema. WI-004, do you need specific fields?"
WI-004 teammate: "Yes, include admin_level in the user model."
```

### 3.2 Wave Visualization

Real-time wave progress visualization:
```
Wave 0: [====] Lead enrichment COMPLETE
Wave 1: [===-] 3/4 items | WI-003 in progress
Wave 2: [----] Blocked by GATE-1
Wave 3: [----] Blocked by GATE-2
Wave N: [----] Integration pending
```

### 3.3 Resource-Aware Scheduling

Track system resources and adjust teammate count per wave:
```
System load: High (CPU > 80%)
Original plan: 5 teammates in Wave 2
Adjusted: 3 teammates in Wave 2 (stagger remaining 2)
```

### 3.4 Team Templates

Reusable team configurations for common patterns:
```bash
/team Build feature --template fullstack
# Pre-defined: Wave 0 (setup), Wave 1 (backend), Wave 2 (frontend), Wave 3 (tests), Wave 4 (docs)
```
