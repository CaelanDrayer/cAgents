# /run Improvement Recommendations

## Priority 1: High Impact, Moderate Effort

### 1.1 Adaptive Pipeline (Skip Unnecessary States)

**Current**: All 7 states execute for every request.
**Proposed**: Dynamically skip states based on tier and request analysis.

```yaml
# pipeline_config.yaml -- enhanced with skip conditions
states:
  INIT:
    agent: cagents:orchestrator
    skip_if:
      tier: 2
      condition: "simple request with clear domain"
    fallback: "inline enrichment"  # /run does basic enrichment inline

  DECOMPOSED:
    agent: cagents:task-decomposer
    skip_if:
      tier: 2
      condition: "single work item"
    fallback: "single work item from plan.yaml"

  DECOMPOSED:
    agent: cagents:prompt-engineer
    skip_if:
      tier: 2
      condition: "standard controller delegation"
    fallback: "use default delegation prompt template"
```

**Tier 2 fast path** (simple requests):
```
/run -> inline routing/planning -> controller -> validator -> DONE
```
Saves 3 agent spawns (orchestrator, decomposer, prompt-engineer) for simple tasks.

**Tier 3-4 full path** (complex requests):
```
/run -> orchestrator -> planner -> decomposer -> prompt-engineer -> controller -> validator
```
Full pipeline for complex tasks where each stage adds value.

### 1.2 Rich Progress Feedback

**Current**: TodoWrite shows state-level progress only.
**Proposed**: Stream sub-state progress from agents.

```
[/run] Pipeline: PROMPTS_READY (coordinating)
  [engineering-manager] Asking 4 questions to specialists...
  [engineering-manager] Q1/4: "What is current auth?" -> backend-developer (in progress)
  [engineering-manager] Q1/4: Complete. Q2/4: "Security risks?" -> security-specialist
  [engineering-manager] Q2/4: Complete. Q3/4: "Test strategy?" -> qa-lead
  [engineering-manager] Q3/4: Complete. Q4/4: "Migration path?" -> architect
  [engineering-manager] All questions answered. Synthesizing solution...
  [engineering-manager] Coordination complete. Writing coordination_log.yaml.
```

**Implementation**:
- Controllers write interim progress to `workflow/coordination_progress.yaml`
- /run polls this file every 15 seconds during PROMPTS_READY state
- Update TodoWrite with sub-state detail

### 1.3 Execution Analytics

**Current**: No cross-session metrics.
**Proposed**: Track pipeline performance metrics.

```yaml
# Agent_Memory/_system/metrics/pipeline_analytics.yaml
metrics:
  total_sessions: 142
  success_rate: 0.87
  avg_duration_seconds: 180
  by_domain:
    make_engineering: {count: 85, success: 0.91, avg_time: 150s}
    make_creative: {count: 20, success: 0.85, avg_time: 210s}
    grow: {count: 15, success: 0.80, avg_time: 240s}
  by_tier:
    tier_2: {count: 90, success: 0.93, avg_time: 120s}
    tier_3: {count: 42, success: 0.81, avg_time: 220s}
    tier_4: {count: 10, success: 0.70, avg_time: 450s}
  revision_rounds:
    avg: 0.3
    max: 3
    by_domain: {make_engineering: 0.2, grow: 0.5}
  bottlenecks:
    slowest_state: PROMPTS_READY (avg: 90s)
    most_revisions: COORDINATED -> PROMPTS_READY (23 occurrences)
```

**Flags**:
```bash
/run --analytics        # Show pipeline analytics dashboard
/run --analytics domain # Show per-domain analytics
```

### 1.4 Intelligent Error Recovery

**Current**: Retry once, then suggest --resume.
**Proposed**: Context-aware error recovery strategies.

```
Error: Controller failed with "File not found: src/auth/middleware.ts"

Recovery strategies:
1. Search codebase for similar files -> found src/middleware/auth.ts
2. Re-spawn controller with corrected file path
3. If still fails: try alternative controller (architect instead of engineering-manager)
4. If still fails: save progress, suggest --resume with guidance
```

**Implementation**:
- Catalog common failure patterns (file not found, timeout, context exhaustion)
- For each pattern, define recovery strategy in pipeline_config.yaml
- Attempt recovery before falling back to --resume suggestion

## Priority 2: Medium Impact, Lower Effort

### 2.1 Domain/Tier Confirmation

**Current**: Silent classification.
**Proposed**: Show classification with override opportunity.

```
Detected: Domain=Make (Engineering), Tier=2, Controller=engineering-manager

If this seems wrong, re-run with:
  /run Fix auth bug --domain grow --tier 3
```

For `--interactive` mode, ask for confirmation:
```
I detected this as an Engineering task (Tier 2). Is that right?
1. Yes, proceed
2. Different domain: [specify]
3. Higher complexity: Tier 3 or 4
```

### 2.2 Partial Pipeline Execution

**Current**: All-or-nothing execution.
**Proposed**: Add pipeline control flags.

```bash
/run Fix auth bug --plan-only       # Stop after PLANNED (save plan.yaml)
/run Fix auth bug --no-validate     # Skip validation state
/run --resume run_20260220 --from PROMPTS_READY  # Resume from specific state
```

### 2.3 Multi-Request Batching

**Current**: One request per invocation.
**Proposed**: Support multiple related requests.

```bash
/run "1. Fix auth timeout bug 2. Add session refresh 3. Update auth docs"
```

**Behavior**:
- Parse numbered list into separate requests
- Run shared enrichment (orchestrator, planner) once for all
- Decompose into combined work items with inter-request dependencies
- Execute with awareness of shared context

### 2.4 Delegation Prompt Transparency

**Current**: Prompt-engineer's output is internal.
**Proposed**: Make delegation prompts visible and editable.

```bash
/run Fix auth bug --show-prompts    # Display delegation prompts before execution
/run Fix auth bug --edit-prompts    # Allow editing delegation prompts in interactive mode
```

## Priority 3: Nice-to-Have Enhancements

### 3.1 Pipeline Plugins

Allow users to add custom pipeline states:
```yaml
# custom_pipeline_states.yaml
custom_states:
  SECURITY_REVIEW:
    after: COORDINATED
    before: VALIDATED
    agent: cagents:security-specialist
    condition: "domain == make_engineering AND tier >= 3"
```

### 3.2 Dry-Run with Saved Plan

Enhance --dry-run to save the plan so it can be executed later:
```bash
/run Implement OAuth2 --dry-run --save-plan
# Later:
/run --execute-plan run_20260220_plan
```

### 3.3 Request Clarification

When the request is ambiguous, instead of guessing domain/tier, ask:
```
"Fix auth" could mean:
1. Fix an authentication bug (Engineering, Tier 2)
2. Fix authentication architecture (Engineering, Tier 3)
3. Fix auth content/docs (Make Creative, Tier 2)

Which do you mean?
```

### 3.4 Pipeline Observability Dashboard

Real-time visualization of pipeline execution:
- State machine diagram with current state highlighted
- Agent spawn/completion timeline
- Token usage per state
- Event file contents browser
