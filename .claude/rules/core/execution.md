---
paths:
  - "**/agents/**/*.md"
  - ".claude/skills/**"
  - "cagents-memory/sessions/**/workflow/work_items.yaml"
---

# Execution Agent Patterns

Guidelines for tier 3 execution agents.

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

**Controller Agent**:
```yaml
---
name: tech-lead
tier: controller
domain: engineering
coordination_style: question_based
typical_questions: [...]
---
```

**Execution Agent**:
```yaml
---
name: backend-developer
tier: execution
domain: engineering
capabilities:
  - backend_development
  - api_design
  - database_management
related-agents: ["architect", "dba", "qa-tester"]
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

> **Note**: This rule is an aspirational best practice, not a mandatory requirement. It was designed to prevent information loss during context compaction but is not enforced or consistently followed in practice. Agents SHOULD capture findings when practical but are not required to follow the strict 2-action cadence.

Inspired by the attention-injection pattern for context engineering: execution agents should persist findings to session files periodically to prevent information loss during context compaction.

### Recommended Practice

> When performing multiple research operations, periodically save key findings to session files to guard against context compaction.

### Why

- Visual/multimodal content (images, browser results, PDFs) does not persist across context compaction
- Research findings discovered early in a session fade from attention after many tool calls
- Writing findings to disk creates a persistent external memory that survives any context event

### When to Capture

| After 2 of these operations | Write findings to |
|------------------------------|-------------------|
| Grep, Glob, Read (research) | `findings.md` or `workflow/enriched_context.yaml` |
| WebFetch, WebSearch | `findings.md` (CRITICAL - web content is ephemeral) |
| Read of images/PDFs | `findings.md` (multimodal content must be captured as text) |
| Any tool that discovers facts | Session workflow files |

### What to Capture

```markdown
## Key Discoveries
- Finding 1: {concrete fact with file path or source}
- Finding 2: {specific detail, not vague summary}
```

### Anti-Patterns

| Don't | Do Instead |
|-------|------------|
| Read 5 files then try to remember all | Write findings after every 2 reads |
| View image and keep details in context | Immediately describe image content in findings.md |
| Search web and assume results persist | Write key results to disk before next operation |
| Rely on context for discovered facts | Treat filesystem as your persistent memory |

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

**Nesting model (v12.17.0+).** Claude Code ≥ 2.1.172 lets subagents spawn their own subagents up to 5 levels deep. Execution agents spawned at depth 2 **retain the `Agent` tool** and CAN spawn their own sub-agents within the 5-level ceiling when a work item genuinely warrants it. (Historically, before v12.17.0, the harness stripped `Agent`, `TodoWrite`, and `TaskUpdate` at depth ≥ 1, which made direct execution the expected behavior; that limitation is obsolete as default behavior.)

**Graceful degradation is a DEFENSIVE FALLBACK**, not the expected behavior. It triggers ONLY when a needed tool is genuinely absent — at the actual nesting ceiling (a subagent at depth 5 cannot spawn a depth-6 child) or if a future/older harness regresses the capability. Before reporting `BLOCKED` for a missing tool, an execution agent MUST check whether the missing tool is actually absent — do not assume stripping. When `Agent`, `TodoWrite`, or `TaskUpdate` is verifiably absent, complete the work item via the tools you do have and write self-validation YAML in place of `TaskUpdate` calls. The tool-inventory-check-before-BLOCKED rule and the TaskUpdate-substitution rule remain the canonical fallback guidance.

See @.claude/rules/playbooks/pat-graceful-degradation-depth1.md for the canonical fallback pattern (including the tool-inventory-check-before-BLOCKED rule, the TaskUpdate-substitution rule, and the no-reviewer-call rule for execution agents).

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
