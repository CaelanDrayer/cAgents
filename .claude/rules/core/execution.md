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
- Examples: engineering-manager, architect, campaign-manager

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
name: engineering-manager
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

Execution agents MUST report their completion status using one of four standardized statuses. Controllers MUST handle each status appropriately. Free-form completion messages are no longer acceptable.

### The Four Statuses

| Status | Meaning | When to Use |
|--------|---------|-------------|
| **DONE** | Work item fully complete, all acceptance criteria met with evidence | Clean completion, ready for review |
| **DONE_WITH_CONCERNS** | Work item complete, but agent identified potential issues | Implementation works but has caveats the controller should assess |
| **NEEDS_CONTEXT** | Cannot complete without additional information | Missing requirements, ambiguous criteria, need access to undiscovered resources |
| **BLOCKED** | Cannot proceed due to external dependency or infrastructure issue | Dependency unavailable, permission denied, environment broken |

### Reporting Format

Execution agents MUST include status in their completion response:

```yaml
status: DONE                    # One of: DONE, DONE_WITH_CONCERNS, NEEDS_CONTEXT, BLOCKED
summary: "Implemented JWT auth middleware with bcrypt hashing"
evidence:
  - criterion: "Auth middleware validates tokens"
    result: "src/middleware/auth.ts:15 - validateToken() checks expiry, signature, and issuer"
  - criterion: "Tests pass"
    result: "npm test: 23/23 passed"
concerns: []                    # For DONE_WITH_CONCERNS: list specific concerns
missing_context: []             # For NEEDS_CONTEXT: list what is needed
blocker: null                   # For BLOCKED: describe the blocking factor
```

### Controller Response by Status

| Status | Controller Action |
|--------|-------------------|
| **DONE** | Proceed to reviewer loop (Stage 1: spec compliance) |
| **DONE_WITH_CONCERNS** | Read concerns. If concerns affect acceptance criteria: request clarification. If concerns are informational: note in coordination_log and proceed to review. Never silently ignore concerns. |
| **NEEDS_CONTEXT** | Provide the requested context and re-dispatch the agent. If context is unavailable: escalate to user or mark as BLOCKED. Never force retry without providing the missing context. |
| **BLOCKED** | Assess the blocker. If resolvable: resolve and re-dispatch. If not resolvable: mark work item as blocked in coordination_log, document the blocker, and continue with other work items. |

### Escalation Ladder for BLOCKED Status

```
1. Controller attempts to resolve the blocker (5 min max)
2. If unresolvable: check if another execution agent can work around it
3. If no workaround: escalate to lead/user with:
   - What is blocked
   - Why it is blocked
   - What was tried to unblock it
   - Impact on remaining work items
4. If user provides resolution: re-dispatch agent
5. If user cannot resolve: mark work item as blocked, continue with others
```

### CRITICAL: Never Ignore an Escalation

**Never ignore an escalation or force retry without changes.** If an execution agent reports NEEDS_CONTEXT or BLOCKED, the controller MUST address the specific issue before re-dispatching. Sending the same prompt again without new information is a violation of the status protocol.

| Anti-Pattern | Correct Approach |
|-------------|------------------|
| Re-dispatch with same prompt after NEEDS_CONTEXT | Provide the missing context, then re-dispatch |
| Ignore DONE_WITH_CONCERNS and proceed | Read concerns, assess impact, document decision |
| Force retry after BLOCKED without resolving blocker | Attempt resolution or escalate |
| Treat BLOCKED as DONE and skip the work item silently | Document blocker in coordination_log, mark item status |

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

## Mandatory Self-Validation Protocol (V10.23.0)

Before reporting ANY status (DONE, DONE_WITH_CONCERNS), execution agents MUST complete a self-validation checklist. A failed check automatically changes DONE to DONE_WITH_CONCERNS with failed checks listed as concerns.

**15 checks across 5 categories**: Acceptance Criteria (3), Side Effects (3), Completeness (3), Evidence Freshness (3), Regression (3).

Key checks:
- Every criterion has specific file:line or command output evidence
- Evidence was gathered AFTER implementation (fresh, not recycled)
- All claimed output files exist on disk
- No broken imports or test regressions introduced
- Code compiles/parses cleanly, no TODO/FIXME/HACK in new code

**Auto-downgrade rule**: If 1+ acceptance criteria check fails OR 4+ total checks fail → DONE becomes DONE_WITH_CONCERNS with failed checks listed.

See @resources/execution-self-validation.md for the full 15-check checklist and YAML template.

---

## See Also

- **controllers.md** - Controller coordination patterns (tier 2)
- **orchestration.md** - Workflow phases and transitions
- **skill-format.md** - SKILL.md agent format specification
- **subagent-alignment.md** - Agent tool alignment patterns
