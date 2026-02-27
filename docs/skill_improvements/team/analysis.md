# /team Skill Analysis

## Current State Summary

The /team skill implements N-wave parallel team execution using Claude Code's built-in agent teams. It decomposes requests into wave-ordered work items, creates a team via TeamCreate, spawns fresh teammates per wave via Task tool, enforces GATE sentinel quality checks between waves, and integrates results via a final controller + validator. It supports tmux split panes, in-process mode, per-wave teammate lifecycle, and mandatory /run fallback for unsuitable requests.

## Strengths

1. **N-wave model** with quality gates between waves catches issues early
2. **Per-wave teammate lifecycle** ensures clean context and resource cleanup
3. **Wave maximization philosophy** -- more waves = better quality gating
4. **GATE sentinel tasks** enforce dependency ordering via TaskUpdate blockedBy
5. **Mandatory /run fallback** ensures no request goes unhandled
6. **Strategic brief awareness** for /org integration via domain_status updates
7. **Multiple display modes** (tmux, in-process, auto) for flexibility
8. **File-based handoffs** between waves via shared session directory

## Weaknesses and Gaps

### 1. No Dynamic Wave Rebalancing
Once waves are decomposed, they are fixed. If a wave finishes early and the next wave has a bottleneck, there is no mechanism to redistribute work or merge waves.

### 2. Teammate Failure Recovery is Weak
If a teammate fails, the current approach is to "spawn a replacement teammate if needed." There is no automatic retry, no failure isolation, and no mechanism to redistribute a failed teammate's work.

### 3. No Teammate Communication Beyond Lead
Teammates communicate only with the lead via SendMessage. There is no peer-to-peer coordination between teammates within the same wave, even when their work items are related.

### 4. Wave GATE Validation is Under-Specified
The GATE validation criteria are described as "check quality gate criteria for wave K" but there is no standard for what constitutes a valid gate check. GATE validation is left to the lead's judgment.

### 5. No Partial Team Results
If the pipeline fails mid-way (e.g., wave 3 of 5), there is no mechanism to return partial results to the user. The user gets either complete results or a failure suggestion.

### 6. Resource Usage is Not Optimized
Each teammate is a full Claude Code session. For a 7-wave, 4-items-per-wave pipeline, that is 28 teammate sessions. There is no resource awareness or throttling beyond --members.

### 7. No Team Composition Optimization
The decomposer assigns controllers per work item, but there is no analysis of which work items might benefit from shared context (e.g., two backend work items could share a database connection analysis).

### 8. No Retrospective
After completion, there is no analysis of what went well vs. poorly in the team execution. No metrics on per-wave duration, gate failure rate, or inter-wave dependency satisfaction.

### 9. Wave Count May Exceed Practical Limits
The "maximize waves" philosophy can produce 8-10 waves for complex tasks. With per-wave teammate spawn/shutdown cycles, this creates significant overhead. There is no cost/benefit analysis of wave count.

### 10. Teammate Prompt Context is Large
Each teammate receives a prompt with full work item description, session dir, acceptance criteria, and instructions. For complex work items, this prompt may consume a significant portion of the teammate's context window before they even start working.
