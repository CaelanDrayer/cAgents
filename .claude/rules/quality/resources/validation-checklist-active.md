# Active Validation Checklist (5 checks)

Phase-4 cross-cutting validation checks that are currently **enforced** by cAgents hooks. These checks run automatically throughout every workflow regardless of agent behavior, because they are wired into hook-based automation rather than agent prompts.

**Canonical validation-number statement**: Exactly **5** checks are hook-enforced (this file). The historical **29**-check framework = those **5** active + **24** aspirational checks (Phases 1-3) that never reliably ran and now live in `docs/FUTURE_VALIDATION_FRAMEWORK.md` (which does not auto-load into agent context). The aspirational checks depended on controller and validator agents voluntarily running validation logic; they shipped as agent-context bloat for behavior that did not happen, and were moved out for future graduation work. See that file for the deferred pipeline and graduation roadmap.

**Filename history**: this file was named `validation-checklist-29.md` through the v12.x honesty pass (the old name was retained for back-compat with `@resources/` references). It was renamed to `validation-checklist-active.md` in the v12.16.0 audit-remediation pass so the filename matches its actual content (the active 5 checks, not the legacy 29). All `@`-references were updated at rename time.

## Active Cross-Cutting Validation (5 checks)

Run at various points by **Multiple Agents** throughout the workflow. **Enforced by hooks.**

| # | Check | What It Validates | Who Runs It | When | Failure Action |
|---|-------|------------------|-------------|------|----------------|
| 25 | Task Cleanup | Every TaskCreate has a matching TaskUpdate(completed/deleted) | /run, /team (incl. strategic mode; pre-v12.2.0 also /org) | Before session end | CLEANUP: mark all tasks completed or deleted |
| 26 | Agent Tree Completeness | Every spawned agent in agent_tree.yaml has stopped_at and completion_summary | subagent-stop-tracker hook | On each SubagentStop | AUTO-FIX: record stop event |
| 27 | File Change Audit | All modified files logged in file_changes.log with validation status | post-write-validator hook | After each Write/Edit | AUTO-FIX: log the change |
| 28 | Context Drift Prevention | Plan objectives re-read before synthesis and major decisions | Controller | Before synthesis, before spawning | WARN: re-read plan.yaml |
| 29 | YAML/JSON Syntax | All written YAML/JSON files parse without errors | post-write-validator hook | After each Write/Edit | WARN: report syntax error to model |

---

## Severity Classification

**HIGH** (Checks 25-27, 29): Warn on failure. Continue but document the issue. Hook-enforced AUTO-FIX or CLEANUP paths apply.

**MEDIUM** (Check 28): Informational. Log and flag; controllers are reminded to re-read plan objectives.

---

## Key Principles

1. **Hooks run all 5 checks**: Every check listed here runs automatically via the relevant hook (`subagent-stop-tracker.cjs`, `post-write-validator.cjs`, `verify-completion.cjs`) regardless of agent behavior. (Goal-refresh injection moved from `attention-injection.cjs` to `post-compact-restore.cjs` in v12.7.0 — see P2-10.)
2. **Evidence-first**: All completion claims must cite specific artifacts (files, test outputs, metrics) — vague claims are rejected.
3. **Active-only here**: This file describes enforced checks only. Aspirational checks live in `docs/FUTURE_VALIDATION_FRAMEWORK.md` and should be graduated one at a time as the supporting hook or agent behavior lands.
