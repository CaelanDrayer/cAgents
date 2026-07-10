---
paths:
  - "**/agents/**/*.md"
  - ".claude/skills/**"
  - "cagents-memory/sessions/**/workflow/work_items.yaml"
---

# Execution Agent Patterns

Guidelines for tier 3 execution agents.

## Enforced vs Advisory Ledger

The table below tells you at a glance which execution protocols in this file are mechanically enforced (a hook, CI check, or test blocks or rewrites on violation) versus advisory. Advisory = the model is asked to follow it; no hook verifies it yet.

| Protocol | Enforced by | Status |
|----------|-------------|--------|
| File writes audited + JSON/YAML syntax-checked | `post-write-validator.cjs` — PostToolUse[Write\|Edit] logs to `file_changes.log` and reports syntax errors | Enforced |
| Evidence-first file:line citations (self-validation Check 5) | `validator-evidence-recheck.cjs` re-runs cited methods after a write and downgrades PASS→FAIL | Partial (post-write recheck) |
| 5-check self-validation protocol | agent-self-reported; the verifier hook is deferred (the protocol doc states no hook runs these checks yet) | Advisory |
| Subagent status protocol (DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED) | controller routing by convention; no hook verifies the reported status | Advisory |
| Commit-before-verify pattern | agent-self-reported | Advisory |
| Minimal-solution ladder | reviewer judgment (Stage-2 lens); no hook | Advisory |
| Graceful degradation when `Agent` is genuinely absent | agent-self-reported; `verify-completion.cjs` keys on the sentinel sentence but does not verify the behavior | Advisory |

For the cross-cutting checks that ARE hook-enforced (exactly 5), see @.claude/rules/quality/resources/validation-checklist-active.md.

## Execution Agent Role

Execution agents are specialists that:
- Answer questions from controllers with expertise
- Execute implementation tasks assigned by controllers
- Provide concrete, specific answers
- Focus on their domain of expertise

## Agent Tier Designation

### Tier 2: Controllers
- Coordinate work via question-based delegation
- Synthesize answers from multiple specialists
- Examples: tech-lead, architect, marketing-strategist

### Tier 3: Execution
- Answer questions with domain expertise
- Execute specific implementation tasks
- Examples: backend-developer, copywriter, financial-analyst

### Tier 4: Support
- Foundational services (scribe, data-extractor)
- Utility functions across domains

## Frontmatter Requirements

Per the v11.1.0 schema (`skill-format.md`): `archetype:` (and `branch:` for 3-level archetypes) are top-level; `tier:` and the controller/capability fields live inside `metadata:`. The top-level `domain:` field was removed in v11.1.0 — `validate-agents.sh` rejects it.

**Controller Agent**:
```yaml
---
name: tech-lead
archetype: developer
branch: fullstack
description: "Coordinates engineering work via question-based delegation."
metadata:
  tier: controller
  coordination_style: question_based
  typical_questions: [...]
---
```

**Execution Agent**:
```yaml
---
name: backend-developer
archetype: developer
branch: backend
description: "Implements backend services, APIs, and database operations."
metadata:
  tier: execution
  capabilities:
    - backend_development
    - api_design
    - database_management
related-agents: ["architect", "dba", "qa-lead"]
not-my-scope: ["Frontend work", "DevOps", "Design"]
---
```

## Subagent Architecture

Agents delegate to specialists, don't execute directly:

```
Pattern: "Use {subagent} to {task}"
Example: Controller → backend-developer (question) → answer → synthesis
```

Benefits: Modularity, specialization, parallelization (up to 50 concurrent)

## Minimal-Solution Ladder

Before writing new code for a work item, walk the minimal-solution ladder (YAGNI -> stdlib -> native platform feature -> existing dependency -> one-liner -> minimum viable change) and only write new code when every cheaper rung fails. cAgents biases toward aggressive decomposition; the ladder is the implementation-side counterweight.

See @.claude/rules/playbooks/pat-minimal-solution-ladder.md for the full ladder, the when-it-does-NOT-apply cases, and the `ponytail:` deliberate-shortcut comment convention.

## 2-Action Findings Capture Rule

Aspirational best practice (persist findings to session files after every ~2
research operations to survive context compaction) — not runtime-enforced. See
docs/DESIGN_NOTES.md.

## Subagent Status Protocol (V10.22.0)

Execution agents MUST report completion via one of four standardized statuses (DONE, DONE_WITH_CONCERNS, NEEDS_CONTEXT, BLOCKED), with controller routing per status. Free-form completion messages are not acceptable.

See @.claude/rules/playbooks/pat-subagent-status-protocol.md for the canonical pattern: the four statuses, reporting format, controller response per status, BLOCKED escalation ladder, and never-ignore-an-escalation anti-patterns.

## Commit-Before-Verify Pattern (V10.18.0)

When implementing work items that modify existing code, use the commit-before-verify pattern for clean rollback on failure.

### Pattern

```
1. Make the change
2. git add <changed files>
3. git commit -m "WI-{N}: {description}"
4. Run verification (tests, lint, type check)
5a. If PASS: Done - commit stays
5b. If FAIL: git reset HEAD~1 (undo commit, keep changes staged)
    -> Fix the issue
    -> Repeat from step 3
```

### Why This Works

- **Clean rollback**: `git reset HEAD~1` undoes the commit but keeps changes, allowing targeted fixes
- **Atomic changes**: Each work item is a single commit, making it easy to identify what broke what
- **Safe experimentation**: You can try aggressive changes knowing rollback is one command away
- **Bisect-friendly**: Each commit is a testable unit if regressions surface later

### When to Use

- Code changes that have test suites (`npm test`, `pytest`, etc.)
- Refactoring where regressions are possible
- Multi-file changes where partial application could break things

### When NOT to Use

- New file creation (nothing to roll back to)
- Documentation-only changes
- Configuration changes without automated validation
- When working in a worktree (use worktree merge flow instead)

### Anti-Patterns

| Don't | Do Instead |
|-------|------------|
| Make 10 changes then test once | Commit-verify after each logical change |
| `git reset --hard` on failure | `git reset HEAD~1` preserves your staged changes |
| Skip verification for "obvious" fixes | Always verify - obvious fixes break production |

## Nesting Model and Graceful Degradation Under Nesting-Ceiling / Tool Absence (repositioned in v12.17.0)

**Nesting model (v12.17.0+).** Claude Code ≥ 2.1.172 lets subagents spawn their own subagents up to 5 levels deep. Execution agents spawned at depth 2 **retain the `Agent` tool** and CAN spawn their own sub-agents within the 5-level ceiling when a work item genuinely warrants it.

**Graceful degradation is a DEFENSIVE FALLBACK**, not the expected behavior. It triggers ONLY when a needed tool is genuinely absent — at the actual nesting ceiling (a subagent at depth 5 cannot spawn a depth-6 child) or if a future/older harness regresses the capability. Before reporting `BLOCKED` for a missing tool, an execution agent MUST check whether the missing tool is actually absent. When `Agent`, `TodoWrite`, or `TaskUpdate` is verifiably absent, complete the work item via the tools you do have and write self-validation YAML in place of `TaskUpdate` calls. The tool-inventory-check-before-BLOCKED rule and the TaskUpdate-substitution rule remain the canonical fallback guidance.

See @.claude/rules/playbooks/pat-graceful-degradation-depth1.md for the canonical fallback pattern (the tool-inventory-check-before-BLOCKED rule, the TaskUpdate-substitution rule, the no-reviewer-call rule for execution agents, and the historical pre-v12.17.0 depth-1 stripping context).

## Self-Validation Protocol (V12.0.0)

Before reporting any status (DONE, DONE_WITH_CONCERNS), execution agents should complete a 5-check self-validation. Any 1 of the 5 checks failing changes DONE to DONE_WITH_CONCERNS with the failing check listed as a concern. This is an agent-self-reported protocol by convention — the verifier hook that would mechanically enforce it is deferred to a future bump, so the checks are advisory in practice.

**5 mechanically-checkable checks**: evidence freshness, file existence, guard exit codes, git state, file:line accuracy.

See @resources/execution-self-validation.md for the full check list, YAML template, integration with the subagent status protocol, and auto-downgrade rule. The canonical contract lives in that file — do not duplicate the check list here.

---

## See Also

- **controllers.md** - Controller coordination patterns (tier 2)
- **orchestration.md** - Workflow phases and transitions
- **skill-format.md** - SKILL.md agent format specification
- **subagent-alignment.md** - Agent tool alignment patterns
