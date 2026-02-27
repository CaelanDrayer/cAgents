# /org Skill Analysis

## Current State Summary

The /org skill implements corporate hierarchy orchestration with CEO inline logic, C-suite parallel analysis, two-phase deliberation, strategic brief generation, and sequential /team delegation per domain. It uses a 6-state pipeline (INIT -> ANALYZED -> DELIBERATED -> BRIEFED -> EXECUTED -> INTEGRATED -> COMPLETE) and supports routing shortcuts for single-domain requests (direct to /run or /team) while reserving the full hierarchy for multi-domain instructions. Communication flows exclusively through the CEO (hub-and-spoke), with file-based handoffs between C-suite agents and no direct peer messaging.

## Strengths

1. **Three-tier routing** (single_run, single_team, full_hierarchy) avoids unnecessary overhead for simple requests
2. **Two-phase deliberation** (draft brief + objection round) catches cross-domain conflicts before execution
3. **Strategic brief schema** provides a rich, structured contract between planning and execution phases
4. **File-based cross-domain dependencies** with blocks/informs types enable explicit dependency tracking
5. **Escalation protocol** with 4-level chain (execution -> controller -> C-suite -> CEO -> user) and timeouts
6. **Domain status tracking** allows CEO to monitor sequential /team executions in real-time
7. **Forced domain override** via --domains flag gives users control over scope
8. **TodoWrite at every state transition** ensures user visibility into pipeline progress
9. **Integration with /team and /run** via Skill forks for execution, maintaining nesting level resets

## Weaknesses and Gaps

### 1. No Learning Across Orchestrations

The /org skill does not retain any knowledge from past orchestrations. If the same multi-domain request pattern appears repeatedly (e.g., "launch product" always touches make_eng + grow + operate_fin), the CEO must re-derive this from scratch each time. There is no historical analysis of which C-suite combinations produced the best outcomes, which deliberation objections recurred, or which cross-domain dependencies are frequently encountered.

### 2. Deliberation is Fixed at One Round

The two-phase deliberation (CEO draft -> C-suite objections -> CEO resolves) is always exactly one round. For complex multi-domain initiatives with deeply conflicting priorities (e.g., engineering timeline vs. budget constraints vs. hiring feasibility), a single objection round may not surface all issues. The CEO resolves conflicts after one pass, with no mechanism for follow-up rounds when objections reveal new information.

### 3. No Cost Estimation or Budget Awareness

The /org skill makes no attempt to estimate the cost of orchestration in terms of agent spawns, token consumption, or execution time. A full hierarchy orchestration with 5 C-suite agents each spawned twice (analysis + objection) plus 5 sequential /team invocations is a substantial resource commitment. There is no mechanism to warn users about expected cost or to suggest a lighter-weight approach when the task does not warrant full hierarchy.

### 4. Keyword-Based Domain Detection is Fragile

Domain detection relies on keyword matching against a static word list (e.g., "budget" -> operate_fin, "hire" -> people). This approach fails for ambiguous keywords (e.g., "scale" could mean make_eng or operate_ops), novel domain-crossing phrases, or requests stated in indirect language. The multi-domain detection patterns are hardcoded (e.g., "launch product" -> make_eng + grow + operate_fin) and cannot adapt to project-specific vocabulary.

### 5. C-Suite Agents Have No Domain Memory

C-suite agents are spawned as fresh subagents with no access to previous domain analyses, past deliberation outcomes, or accumulated organizational knowledge. Each C-suite agent starts from zero context about the project's history, architecture, or constraints. This means they may produce analyses that contradict earlier strategic decisions or fail to account for ongoing initiatives in their domain.

### 6. No Partial Execution Recovery

If one /team domain execution fails while others succeed, there is no mechanism to resume only the failed domain. The --resume flag exists but restarts from the last checkpoint, which may re-execute already-completed domains. There is no domain-level granularity for retry or selective re-execution.

### 7. Integration Phase is Under-Specified

The integration step (EXECUTED -> INTEGRATED) reads all domain outputs and checks cross-domain dependencies, but there is no structured methodology for resolving conflicts in overlapping outputs. If both make_eng and make_cre modified the same files, the current approach is to "merge overlapping outputs" without defining how conflicts are detected or resolved.

### 8. No Dry-Run Cost Preview

The --dry-run flag shows routing decision and planned C-suite engagement but does not estimate execution cost, expected duration, or resource consumption. Users cannot make an informed decision about whether to proceed with full hierarchy vs. a simpler approach based on the dry-run output.

### 9. Strategic Brief is Not Versioned

The strategic_brief.yaml is written once (BRIEFED state) and then mutated during execution (domain_status updates, directives). There is no versioning or change log for the brief, making it impossible to audit what changed during execution vs. what was planned originally. If escalation resolutions modify priorities or add work items, the original brief is overwritten.

### 10. No Cross-Org Retrospective

After completion, /org produces a completion summary with basic counts (domains executed, C-suite spawned, escalations handled). There is no retrospective analysis of deliberation quality, cross-domain dependency accuracy, escalation effectiveness, or domain execution parity. This means the system cannot improve its orchestration strategy over time.
