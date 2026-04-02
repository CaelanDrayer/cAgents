# 29-Check Comprehensive Validation Framework (Aspirational)

Four-phase validation covering the entire workflow lifecycle from planning to final validation.

> **Status: ASPIRATIONAL TARGET** — This framework describes the intended validation architecture, not current enforcement. See [Current Enforcement Status](#current-enforcement-status) and [Graduation Roadmap](#graduation-roadmap) below.

## Current Enforcement Status

| Phase | Checks | Status | Enforcement Mechanism |
|-------|--------|--------|----------------------|
| **Phase 4: Cross-Cutting** | 25-29 | **ACTIVE** | Enforced by existing hooks (`subagent-stop-tracker.cjs`, `post-write-validator.cjs`, `attention-injection.cjs`, `verify-completion.cjs`) |
| **Phase 1: Pre-Execution** | 1-8 | ASPIRATIONAL | Requires controller agents to run checks before spawning executors — not yet enforced |
| **Phase 2: Mid-Execution** | 9-15 | ASPIRATIONAL | Requires controller agents to run checks after every 3 completions — not yet enforced |
| **Phase 3: Post-Execution** | 16-24 | ASPIRATIONAL | Requires universal-validator agent to run checks after completion — not yet enforced |

Phase 4 checks are active because they are implemented as hook-based automation that runs regardless of agent behavior. Phases 1-3 depend on agents voluntarily executing validation logic, which does not yet happen in practice.

## Graduation Roadmap

Priority order for graduating aspirational checks to enforced status:

| Priority | Check(s) | Description | Enforcement Path |
|----------|----------|-------------|-----------------|
| **P1 (next)** | 16 | All Items Complete | Add to `verify-completion.cjs` — check work_items.yaml status before allowing session stop |
| **P2** | 20 | Coordination Log Complete | Schema validation in `post-write-validator.cjs` when coordination_log.yaml is written |
| **P3** | 17, 21, 22 | Evidence chain, no red flag language, fresh evidence | Enhance universal-validator agent prompts to enforce these checks |
| **P4** | 1-3, 6-7 | Plan completeness, work item criteria, dependency acyclicity, schema, session structure | Add pre-execution validation hook or gate in `session-init-gate.cjs` |
| **Future** | 4-5, 8-15, 18-19, 23-24 | Remaining agent-dependent checks | Graduate as agent reliability improves and patterns stabilize |

Each check should be graduated only when it can be reliably enforced without false positives that block legitimate workflows.

## Phase 1: Pre-Execution Validation (8 checks) — ASPIRATIONAL

Run by **Controller** BEFORE spawning any execution agents. *Not yet enforced — see [Graduation Roadmap](#graduation-roadmap).*

| # | Check | What It Validates | When | Failure Action |
|---|-------|------------------|------|----------------|
| 1 | Plan Completeness | plan.yaml has all required fields (plan_id, tier, domain, mission, objectives, controller_assignment, success_criteria) | Before first executor spawn | BLOCKED: report missing field |
| 2 | Work Item Criteria | Every work_items.yaml entry has non-empty acceptance_criteria (len >= 1, each > 5 chars) | Before first executor spawn | BLOCKED: request re-decomposition |
| 3 | Dependency Acyclicity | No circular dependencies in work item dependency graph | Before creating execution order | BLOCKED: fix dependency graph |
| 4 | Agent Existence | SKILL.md exists for every unique assigned_to agent | Before first executor spawn | WARN: flag potential spawn failure |
| 5 | Referenced File Existence | Files referenced in work item descriptions actually exist on disk | Before first executor spawn | WARN: executor may encounter missing files |
| 6 | Coordination Log Schema | Planned coordination_log.yaml output has all required fields | Before writing coordination_log | AUTO-FIX: add missing fields |
| 7 | Session Directory Structure | Session directory and workflow/ subdirectory exist and are writable | Before first executor spawn | BLOCKED: create missing directories |
| 8 | Delegation Prompt Quality | Each executor prompt has task_id, acceptance_criteria, and context from dependencies | Before each executor spawn | AUTO-FIX: enrich prompt before sending |

---

## Phase 2: Mid-Execution Validation (7 checks) — ASPIRATIONAL

Run by **Controller** AFTER EVERY 3 COMPLETED WORK ITEMS. *Not yet enforced — see [Graduation Roadmap](#graduation-roadmap).*

| # | Check | What It Validates | When | Failure Action |
|---|-------|------------------|------|----------------|
| 9 | Evidence Capture | Every completed work item has non-null, non-empty evidence | After every 3 completions | WARN: request re-verification from agent |
| 10 | Stuck Item Detection | No work item has been in_progress for more than 10 minutes | After every 3 completions | ESCALATE: re-spawn agent or report to user |
| 11 | Timestamp Monotonicity | completed_at timestamps are monotonically increasing for sequential items | After every 3 completions | WARN: flag for validator review |
| 12 | Evidence Spot-Check | Randomly selected completed item's evidence verifies against actual files | After every 3 completions | BLOCKED: halt, escalate potential fabrication |
| 13 | Dependency Satisfaction | No pending item has unmet dependencies (all deps completed) | Before starting each item | HOLD: wait for blocking dependencies |
| 14 | Review Round Budget | No work item has exceeded max 3 reviewer rounds | After each review round | DEAD_LETTER: mark and continue with other items |
| 15 | Subagent Status Protocol | Every completed executor reported DONE/DONE_WITH_CONCERNS/NEEDS_CONTEXT/BLOCKED | After each executor completes | WARN: request standardized status from agent |

---

## Phase 3: Post-Execution Validation (9 checks) — ASPIRATIONAL

Run by **Universal-Validator** AFTER all work items are complete. *Not yet enforced — see [Graduation Roadmap](#graduation-roadmap).*

| # | Check | What It Validates | When | Failure Action |
|---|-------|------------------|------|----------------|
| 16 | All Items Complete | Every work item in work_items.yaml has status completed or dead_letter | After controller signals done | FAIL: list incomplete items |
| 17 | Evidence Chain | Every completed item has evidence linking criterion to file:line or test output | After controller signals done | FIXABLE: request missing evidence |
| 18 | Objective Traceability | Every plan objective's derived_from work items are all completed | After controller signals done | FAIL: list unmet objectives |
| 19 | Success Criteria Met | Each plan success_criterion verified using its verification_method | After controller signals done | FAIL: list unmet criteria |
| 20 | Coordination Log Complete | coordination_log.yaml has schema_version, controller, objectives, implementation_tasks, status | After controller signals done | FIXABLE: request controller to complete log |
| 21 | No Red Flag Language | Completion claims do not contain "should work", "probably", "seems to", etc. | When reading evidence | REVISE: reject claim, request fresh evidence |
| 22 | Fresh Evidence | Verification was run in current session, not cited from memory or prior run | When reading evidence | REVISE: re-run verification commands |
| 23 | Guard Command Results | Guard commands (tests, lint, type check) were run and passed where applicable | After controller signals done | REVISE: run missing guards |
| 24 | Dead Letter Accounting | Any dead_letter items are documented with blocker reason and escalation attempt | After controller signals done | FIXABLE: document dead letter reasons |

---

## Phase 4: Cross-Cutting Validation (5 checks) — ACTIVE

Run at various points by **Multiple Agents** throughout the workflow. **These checks are currently enforced by hooks.**

| # | Check | What It Validates | Who Runs It | When | Failure Action |
|---|-------|------------------|-------------|------|----------------|
| 25 | Task Cleanup | Every TaskCreate has a matching TaskUpdate(completed/deleted) | /run, /team, /org | Before session end | CLEANUP: mark all tasks completed or deleted |
| 26 | Agent Tree Completeness | Every spawned agent in agent_tree.yaml has stopped_at and completion_summary | subagent-stop-tracker hook | On each SubagentStop | AUTO-FIX: record stop event |
| 27 | File Change Audit | All modified files logged in file_changes.log with validation status | post-write-validator hook | After each Write/Edit | AUTO-FIX: log the change |
| 28 | Context Drift Prevention | Plan objectives re-read before synthesis and major decisions | Controller | Before synthesis, before spawning | WARN: re-read plan.yaml |
| 29 | YAML/JSON Syntax | All written YAML/JSON files parse without errors | post-write-validator hook | After each Write/Edit | WARN: report syntax error to model |

---

## Summary Table

| Phase | Count | Check IDs | Run By | Timing |
|-------|-------|-----------|--------|--------|
| **Pre-Execution** | 8 | 1-8 | Controller | Before first executor spawn |
| **Mid-Execution** | 7 | 9-15 | Controller | After every 3 completions |
| **Post-Execution** | 9 | 16-24 | Validator | After all items complete |
| **Cross-Cutting** | 5 | 25-29 | Multiple | Throughout workflow |
| **TOTAL** | **29** | **1-29** | | |

---

## Severity Classification

**CRITICAL** (Checks 1-3, 6-7, 12, 16, 18-19, 21-23): Block workflow on failure. Must be resolved before proceeding.

**HIGH** (Checks 4-5, 8-11, 13-15, 20, 24-29): Warn on failure. Continue but document the issue.

**MEDIUM** (All others): Informational. Log and flag for later review.

---

## Key Principles

1. **Hooks run Phase 4** (ACTIVE): Cross-cutting checks run continuously throughout the workflow to catch file changes, syntax errors, and context drift
2. **Controller runs Phases 1-2** (ASPIRATIONAL): Pre-execution and mid-execution validation would ensure correct setup and early detection of issues
3. **Validator runs Phase 3** (ASPIRATIONAL): Post-execution validation would ensure completeness and correctness before marking workflow done
4. **Fail fast**: Critical checks block workflow; high checks warn but allow continuation; medium checks log only
5. **Evidence-first**: All completion claims must cite specific artifacts (files, test outputs, metrics) — vague claims are rejected
6. **Graduate incrementally**: Checks should be promoted from aspirational to enforced one at a time, with false-positive risk assessed before each graduation
