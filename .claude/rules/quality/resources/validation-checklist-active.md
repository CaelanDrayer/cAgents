---
paths:
  - ".claude/rules/quality/resources/validation-checklist-active.md"
  - ".claude/rules/quality/completion.md"
  - ".claude/rules/quality/validation-framework.md"
  - ".claude/rules/core/controllers.md"
  - "agents/validator/**"
  - "agents/reviewer/**"
  - "agents/wave-reviewer/**"
  - "agents/planner/**"
  - ".claude/skills/act/**"
  - ".claude/skills/team/**"
  - ".claude/hooks/subagent-stop-tracker.cjs"
  - ".claude/hooks/post-write-validator.cjs"
  - ".claude/hooks/verify-completion.cjs"
  - ".claude/hooks/post-compact-restore.cjs"
  - "cagents-memory/sessions/**/workflow/agent_tree.yaml"
  - "cagents-memory/sessions/**/workflow/file_changes.log"
  - "cagents-memory/sessions/**/workflow/coordination_log.yaml"
  - "tests/regressions/validation-checklist-active.test.js"
  - "tests/v12/validation-layers-consistent.test.js"
---

# Active Validation Checklist (5 checks)

Phase-4 cross-cutting validation checks that are currently **enforced** by cAgents hooks. These checks run automatically in every workflow. The behavior of an agent does not change that. Each check sits in hook-based automation, not in an agent prompt.

**Canonical validation-number statement**: Exactly **5** checks are hook-enforced, and this file lists them. The historical **29**-check framework = those **5** active + **24** aspirational checks (Phases 1-3). The aspirational checks never ran reliably. They now live in `docs/FUTURE_VALIDATION_FRAMEWORK.md`, which does not auto-load into agent context.

The aspirational checks depended on controller agents and validator agents that ran the validation logic voluntarily. They shipped as agent-context bloat for behavior that did not happen. We moved them out for future graduation work. See that file for the deferred pipeline and the graduation roadmap.

**Filename history**: this file was named `validation-checklist-29.md` through the v12.x honesty pass. The old name stayed for back-compat with `@resources/` references. The v12.16.0 audit-remediation pass renamed the file to `validation-checklist-active.md`, so that the filename matches its content. The content is the active 5 checks, not the legacy 29. The rename pass updated all `@`-references at the same time.

## Active Cross-Cutting Validation (5 checks)

Run at various points by **Multiple Agents** throughout the workflow. **Enforced by hooks.**

| # | Check | What It Validates | Who Runs It | When | Failure Action |
|---|-------|------------------|-------------|------|----------------|
| 25 | Task Cleanup | Every TaskCreate has a matching TaskUpdate(completed/deleted) | /act, /team (incl. strategic mode; pre-v12.2.0 also /org) | Before session end | CLEANUP: mark all tasks completed or deleted |
| 26 | Agent Tree Completeness | Every spawned agent in agent_tree.yaml has stopped_at and completion_summary | subagent-stop-tracker hook | On each SubagentStop | AUTO-FIX: record stop event |
| 27 | File Change Audit | All modified files logged in file_changes.log with validation status | post-write-validator hook | After each Write/Edit | AUTO-FIX: log the change |
| 28 | Context Drift Prevention | Plan objectives re-read before synthesis and major decisions | Controller | Before synthesis, before spawning | WARN: re-read plan.yaml |
| 29 | YAML/JSON Syntax | All written YAML/JSON files parse without errors | post-write-validator hook | After each Write/Edit | WARN: report syntax error to model |

---

## Severity Classification

**HIGH** (Checks 25-27, 29): Warn on failure. Continue but document the issue. Hook-enforced AUTO-FIX or CLEANUP paths apply.

**MEDIUM** (Check 28): Informational. Log it and flag it. The hook reminds each controller to re-read the plan objectives.

---

## Key Principles

1. **Hooks run all 5 checks**: Every check listed here runs automatically through its hook. The hooks are `subagent-stop-tracker.cjs`, `post-write-validator.cjs`, and `verify-completion.cjs`. The behavior of an agent does not change this. Goal-refresh injection moved from `attention-injection.cjs` to `post-compact-restore.cjs` in v12.7.0. See P2-10.
2. **Evidence-first**: Every completion claim must cite specific artifacts, such as files, test outputs, and metrics. The validator rejects a vague claim.
3. **Active-only here**: This file describes enforced checks only. Aspirational checks live in `docs/FUTURE_VALIDATION_FRAMEWORK.md`. Graduate them one at a time, as the supporting hook or the supporting agent behavior lands.
