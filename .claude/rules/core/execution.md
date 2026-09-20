---
paths:
  - ".claude/rules/core/execution.md"
  - ".claude/rules/core/resources/execution-self-validation.md"
  - ".claude/rules/playbooks/pat-subagent-status-protocol.md"
  - ".claude/rules/playbooks/pat-minimal-solution-ladder.md"
  - ".claude/rules/playbooks/pat-graceful-degradation-depth1.md"
  - "agents/data-scientist.md"
  - "agents/data-scientist/**"
  - "agents/market-research-analyst.md"
  - "agents/market-research-analyst/**"
  - "agents/scholar.md"
  - "agents/scholar/**"
  - "agents/social-scientist.md"
  - "agents/social-scientist/**"
  - "agents/translator.md"
  - "agents/composer.md"
  - "agents/composer/**"
  - "agents/film-director.md"
  - "agents/film-director/**"
  - "agents/visual-artist.md"
  - "agents/visual-artist/**"
  - "agents/academic-advisor.md"
  - "agents/academic-advisor/**"
  - "agents/medical-advisor.md"
  - "agents/medical-advisor/**"
  - "agents/life-coach.md"
  - "agents/life-coach/**"
  - "agents/backend-developer.md"
  - "agents/backend-developer/**"
  - "agents/frontend-developer.md"
  - "agents/frontend-developer/**"
  - "agents/devops-engineer/**"
  - "agents/marketing-analyst/**"
  - "agents/technical-writer/**"
  - "agents/game-designer/**"
  - "agents/ai-writing-editor/**"
  - "agents/worldbuilder/**"
  - "agents/reviewer/**"
  - "agents/wave-reviewer/**"
  - "agents/coord-log-writer.md"
  - "cagents-memory/sessions/**/workflow/work_items.yaml"
---

# Execution Agent Patterns

Guidelines for tier 3 execution agents.

## Enforced vs Advisory Ledger

The table below shows which execution protocols in this file are enforced
mechanically. A protocol is enforced when a hook, a CI check, or a test blocks or
rewrites the work on a violation. A protocol is advisory when the model is asked to
follow it and no hook checks it yet.

| Protocol | Enforced by | Status |
|----------|-------------|--------|
| File writes audited + JSON/YAML syntax-checked | `post-write-validator.cjs`: PostToolUse[Write\|Edit] logs to `file_changes.log` and reports syntax errors | Enforced |
| Evidence-first file:line citations (self-validation Check 5) | `validator-evidence-recheck.cjs` re-runs cited methods after a write and downgrades PASS→FAIL | Partial (post-write recheck) |
| Self-validation Check 2 (file existence) + Check 3 (guard exit codes) | `verify-completion.cjs` WARN-rechecks at Stop (C1): re-runs `fs.existsSync` on claimed paths + inspects `guard_results[].exit_code` from coordination_log + `outputs/**/self-validation.yaml`; logs mismatches to `workflow/self_validation_recheck.yaml`. Warns, does NOT block or change the Stop decision | Partial (WARN-rechecked at Stop) |
| 5-check self-validation protocol (Check 1 evidence-freshness, Check 4 git-state) | agent-self-reported; the verifier hook is deferred (the protocol doc states no hook runs these two checks yet) | Advisory |
| Subagent status protocol (DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED) | controller routing by convention; no hook verifies the reported status | Advisory |
| Commit-before-verify pattern | agent-self-reported | Advisory |
| Minimal-solution ladder | reviewer judgment (Stage-2 lens); no hook | Advisory |
| Graceful degradation when `Agent` is genuinely absent | agent-self-reported; `verify-completion.cjs` keys on the sentinel sentence but does not verify the behavior | Advisory |

For the 5 cross-cutting checks that hooks do enforce, see
@.claude/rules/quality/resources/validation-checklist-active.md.

## Execution Agent Role

Execution agents are specialists:

- They answer questions from controllers with expertise.
- They do the implementation tasks that controllers assign.
- They give concrete, specific answers.
- They keep to their own domain of expertise.

## Agent Tier Designation

### Tier 2: Controllers

- They coordinate work by question-based delegation.
- They synthesize the answers of many specialists.
- Examples: tech-lead, architect, marketing-strategist.

### Tier 3: Execution

- They answer questions with domain expertise.
- They do specific implementation tasks.
- Examples: backend-developer, copywriter, financial-analyst.

### Tier 4: Support

- They give foundational services, such as scribe and data-extractor.
- They give utility functions across domains.

## Frontmatter Requirements

The v11.1.0 schema is in `skill-format.md`. The `archetype:` field is top-level, and
so is `branch:` for a 3-level archetype. The `tier:` field, the controller fields,
and the capability fields live inside `metadata:`. v11.1.0 removed the top-level
`domain:` field, and `validate-agents.sh` rejects it.

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

Agents delegate to specialists. They do not do the work themselves:

```
Pattern: "Use {subagent} to {task}"
Example: Controller → backend-developer (question) → answer → synthesis
```

Benefits: Modularity, specialization, parallelization (up to 50 concurrent)

## Write Your Output to Disk, Return a Pointer

Before returning, write your work product to disk and return its path. Pass file
paths, not contents.

**This is crash tolerance before it is token thrift.** Your summary can be lost,
because a parent can yield, compact, or die before it ever collects you. **Your file
cannot be lost.**

In session `act_subagent-token-budget_260909_001` two children wrote artifacts of
4194 bytes and of 32690 bytes. Each artifact survived the death of its parent, and
neither child needed a re-run. The parent concluded "nothing landed". The parent was
wrong, because the work was already on disk.

A lost parent destroys the *collection*, which is the hand-back summary. It never
destroys the artifact you wrote down. Anything you did not persist exists in exactly
one place: a return value that nobody is sure to read.

**Corollary when you are the parent.** If the hand-back of a child is missing, read
the session `outputs/` directory before you re-spawn that child. The work can
already be complete, and a re-run pays for it twice. A stalled parent recovers from
the artifacts of its children, not from zero. See
@.claude/rules/playbooks/pat-gate-taxonomy.md § Stall-detection rule (a parent that
has spawned children).

Full statement of this lever: @.claude/rules/playbooks/pat-context-budget-tiers.md
§ Lever 2 is crash tolerance, not thrift.

## Minimal-Solution Ladder

Before you write new code for a work item, walk the minimal-solution ladder. Its
rungs are YAGNI, then stdlib, then a native platform feature, then an existing
dependency, then a one-liner, then the minimum viable change. Write new code only
when every cheaper rung fails. cAgents biases toward aggressive decomposition, and
the ladder is the counterweight on the implementation side.

See @.claude/rules/playbooks/pat-minimal-solution-ladder.md for the full ladder, the
cases where it does not apply, and the `ponytail:` comment convention for a
deliberate shortcut.

## 2-Action Findings Capture Rule

This is an aspirational best practice, and nothing enforces it at run time. Write
your findings to session files after about every 2 research operations, so that the
findings survive context compaction. See docs/DESIGN_NOTES.md.

## Subagent Status Protocol (V10.22.0)

> **Advisory, not hook-enforced.** The steps below are agent-self-reported. No hook
> checks them now. See docs/FUTURE_VALIDATION_FRAMEWORK.md for the
> deferred-enforcement roadmap.

Execution agents MUST report completion with one of four standard statuses: DONE,
DONE_WITH_CONCERNS, NEEDS_CONTEXT, or BLOCKED. The controller routes the work item
by the status it gets. A free-form completion message is not acceptable.

See @.claude/rules/playbooks/pat-subagent-status-protocol.md for the canonical
pattern. It holds the four statuses, the reporting format, the controller response
per status, the BLOCKED escalation ladder, and the anti-patterns that ignore an
escalation.

## Commit-Before-Verify Pattern (V10.18.0)

> **Advisory, not hook-enforced.** The steps below are agent-self-reported. No hook
> checks them now. See docs/FUTURE_VALIDATION_FRAMEWORK.md for the
> deferred-enforcement roadmap.

When a work item changes existing code, use the commit-before-verify pattern. It
gives you a clean rollback on failure.

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

- **Clean rollback**: `git reset HEAD~1` undoes the commit but keeps your changes,
  so you can make a targeted fix.
- **Atomic changes**: each work item is one commit, so you can find what broke what.
- **Safe experimentation**: you can try a large change, because the rollback is one
  command away.
- **Bisect-friendly**: each commit is a unit you can test if a regression appears
  later.

### When to Use

- A code change that has a test suite, such as `npm test` or `pytest`.
- A refactor where a regression is possible.
- A change across many files, where a partial application can break the build.

### When NOT to Use

- A new file, because there is nothing to roll back to.
- A change to documentation alone.
- A change to configuration that has no automated validation.
- Work inside a worktree. Use the worktree merge flow instead.

### Anti-Patterns

| Don't | Do Instead |
|-------|------------|
| Make 10 changes then test once | Commit-verify after each logical change |
| `git reset --hard` on failure | `git reset HEAD~1` preserves your staged changes |
| Skip the check for an "obvious" fix | Always run the check. An obvious fix breaks production. |

## Nesting Model and Graceful Degradation Under Nesting-Ceiling / Tool Absence (repositioned in v12.17.0)

**Nesting model (v12.17.0+).** Claude Code 2.1.172 and later lets a subagent spawn
its own subagents up to 5 levels deep. An execution agent spawned at depth 2 **keeps
the `Agent` tool**. It can spawn its own sub-agents inside the 5-level ceiling when
a work item needs them.

**Graceful degradation is a defensive fallback**, not the expected behavior. It
triggers only when a needed tool is genuinely absent. That happens at the real
nesting ceiling, where a subagent at depth 5 cannot spawn a depth-6 child. It also
happens if an older harness or a future harness loses the capability.

Before you report `BLOCKED` for a missing tool, make sure that the tool is absent.
When `Agent`, `TodoWrite`, or `TaskUpdate` is verifiably absent, finish the work item
with the tools you do have. Write self-validation YAML in place of the `TaskUpdate`
calls. The tool-inventory-check-before-BLOCKED rule and the TaskUpdate-substitution
rule stay the canonical fallback guidance.

See @.claude/rules/playbooks/pat-graceful-degradation-depth1.md for the canonical
fallback pattern. That playbook holds:

- the tool-inventory-check-before-BLOCKED rule;
- the TaskUpdate-substitution rule;
- the no-reviewer-call rule for execution agents;
- the depth-1 stripping context from before v12.17.0.

## Self-Validation Protocol (V12.0.0)

> **Advisory, not hook-enforced.** The steps below are agent-self-reported. No hook
> checks them now. See docs/FUTURE_VALIDATION_FRAMEWORK.md for the
> deferred-enforcement roadmap.

Before you report DONE or DONE_WITH_CONCERNS, complete the 5-check self-validation.
If any 1 of the 5 checks fails, report DONE_WITH_CONCERNS in place of DONE, and list
the failed check as a concern. The protocol is agent-self-reported by convention.
The verifier hook that would enforce it is deferred to a future bump, so the checks
are advisory in practice.

**5 mechanically-checkable checks**: evidence freshness, file existence, guard exit codes, git state, file:line accuracy.

See @resources/execution-self-validation.md for the full check list, the YAML
template, the integration with the subagent status protocol, and the auto-downgrade
rule. The canonical contract lives in that file. Do not copy the check list here.

---

## See Also

- **controllers.md**: controller coordination patterns (tier 2).
- **orchestration.md**: workflow phases and transitions.
- **skill-format.md**: the SKILL.md agent format specification.
- **subagent-alignment.md**: Agent tool alignment patterns.
