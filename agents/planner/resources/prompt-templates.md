# Delegation Prompt Templates

> **Absorption note (v12.0.0)**: This resource was absorbed from the
> pre-v12.0.0 standalone prompt-engineer agent in v12.0.0 when the pipeline
> collapsed 7 -> 5 states. The planner now crafts delegation prompts
> inline as part of decomposition; there is no separate prompt-crafting
> agent in v12. Prompt crafting is OPTIONAL — the adaptive pipeline path
> (V9.27 tier 2 fast path) skipped this stage entirely, and v12 inherits
> that optionality. Controllers fall back to a standard prompt template
> when the planner does not produce per-WI prompts.

Crafts optimized delegation prompts for controller agents by analyzing work items, reading relevant codebase files, and assembling context packages.

## Purpose

In v12.0.0 the planner sits between enrichment and the controller in the
collapsed 5-state pipeline. When the request warrants context-rich
prompts (tier 3+ work, complex codebases, ambiguous acceptance criteria),
the planner transforms work items with acceptance criteria into rich,
context-aware delegation prompts that give controllers everything they
need to coordinate effectively. For tier 2 fast paths the planner skips
this stage and controllers use standard prompts.

## Pipeline Position (v12.0.0)

```
planner (PLANNED state)
   |
   +-- writes plan.yaml + work_items.yaml
   |
   +-- (optional, tier 3+) writes delegation_prompts.yaml
            |
            +-> per-WI prompts with code snippets,
                constraints, examples, anti-patterns
            |
            +-> controller (next state) consumes prompts
```

The planner crafts delegation prompts when context-rich delegation
improves first-try success. It does NOT coordinate execution -- that is
the controller's job.

## Workflow

### Step 1: Read Inputs

1. Read `workflow/work_items.yaml` (or `workflow/decomposition.yaml`) for work item descriptions and acceptance criteria
2. Read `workflow/plan.yaml` for objectives and controller assignment
3. Read `workflow/enriched_context.yaml` for domain, constraints, project context

### Step 2: Codebase Analysis (per work item)

For each work item:
1. Identify relevant files via Grep/Glob based on the work item's domain and keywords
2. Read key code sections (keep snippets under 50 lines each)
3. Identify existing patterns the controller should follow
4. Identify anti-patterns to avoid (common mistakes in similar code)

### Step 3: Prompt Assembly (per work item)

For each work item, create a delegation prompt containing:
1. **Role**: Controller identity and responsibility
2. **Request**: Work item description with full context
3. **Relevant code**: Key snippets with file paths and line numbers
4. **Acceptance criteria**: Specific, measurable, with verification methods
5. **Constraints**: Technical limitations, patterns to follow
6. **Anti-patterns**: What NOT to do, common mistakes to avoid
7. **Cross-references**: Related work items, dependencies
8. **Prior learnings** (LP-21): `@`-references to relevant `cagents-memory/_knowledge/*.md` notes surfaced by the pre-emptive consultation scan (see § Pre-emptive Consultation below)

### Pre-emptive Consultation (LP-21)

After Step 2 codebase analysis and before assembling each prompt in Step 3, scan `cagents-memory/_knowledge/*.md` for notes relevant to this work item and append the top 1-3 matches as `@`-references in a `## Prior Learnings` section of the delegation prompt.

**Matching heuristic**:
- Build haystack: lowercased `wi.title + " " + wi.description`.
- For each knowledge file, score by:
  - **Filename tokens**: split `<name>.md` minus `.md` on `-` and `_`, drop tokens shorter than 3 chars. Any token appearing in the haystack scores +1.
  - **Frontmatter `keywords:` array** (optional): if the note declares `keywords: [a, b, c]` in YAML frontmatter, each keyword appearing in the haystack scores +2 (weighted higher because frontmatter keywords are author-curated).
- **Threshold**: include files with score >= 1. Sort by score descending; cap to top 3 to bound prompt bloat.

**Example**:

```
WI: { title: "Implement graceful degradation for depth-1 agents",
      description: "Defensive fallback: when the Agent tool is verifiably absent (nesting ceiling or regressed harness), agents must self-validate." }

Candidate: agent-tool-depth1-stripping.md
  filename tokens: [agent, tool, depth1, stripping]
  matches in haystack: "agent" (yes), "tool" (yes), "depth1" (yes), "stripping" (yes)
  score: 4
  -> include as @cagents-memory/_knowledge/agent-tool-depth1-stripping.md
```

**Assembly**: append to the prompt:

```
## Prior Learnings (auto-surfaced by planner)

See @cagents-memory/_knowledge/<filename>.md for <one-line summary from note's first paragraph or frontmatter description>.
```

**Skip conditions**:
- No `cagents-memory/_knowledge/` directory present.
- Work item description shorter than 10 chars (insufficient haystack).
- No file scores >= 1 (no relevant notes — omit the section entirely; do NOT emit an empty header).

**Token budget**: each `@`-reference + summary is ~30-60 tokens. With the top-3 cap, the Prior Learnings section adds at most ~180 tokens per prompt — well within the 300-600 token budget per work item.

**Integration with the 5-check rubric**: the Pre-emptive Consultation does NOT add a 6th rubric check. Its surfaced references implicitly improve Check 1 (Context Sufficiency) because controllers receive prior-learning context without re-searching.

### Step 4: Write Output

Write `workflow/delegation_prompts.yaml` with one entry per work item:

```yaml
prompts:
  TASK-01:
    controller: cagents:{controller_name}
    prompt: |
      <assembled prompt>
    context_files:
      - path/to/file1.ts
      - path/to/file2.ts
    estimated_tokens: 450
  TASK-02:
    controller: cagents:{controller_name}
    prompt: |
      <assembled prompt>
    context_files:
      - path/to/file3.ts
    estimated_tokens: 380
```

### Step 5: Write Event

Write completion event to `workflow/events/`:

```yaml
event_id: EVT-{N}
state: PLANNED   # v12: prompt crafting is no longer a separate state
agent: cagents:planner
timestamp: "{ISO_TIMESTAMP}"
duration_seconds: {elapsed}
inputs_consumed:
  - workflow/work_items.yaml
  - workflow/plan.yaml
  - workflow/enriched_context.yaml
outputs_produced:
  - workflow/delegation_prompts.yaml
next_state: PLANNED
metadata:
  work_items_processed: {count}
  total_prompt_tokens: {sum}
```

## Pre-Execution Confidence Scoring

Before writing delegation_prompts.yaml, score each prompt against a 5-check rubric. If any prompt scores below the threshold, revise it before outputting.

### 5-Check Rubric

For each delegation prompt, evaluate:

| Check | Question | Weight | Scoring |
|-------|----------|--------|---------|
| 1. **Context Sufficiency** | Does the prompt include enough codebase context for the controller to act without re-searching? | 0.25 | 0.0 = no context, 0.5 = partial, 1.0 = complete |
| 2. **Criteria Clarity** | Are acceptance criteria specific and measurable (not vague)? | 0.25 | 0.0 = vague, 0.5 = partially measurable, 1.0 = fully measurable |
| 3. **Anti-Pattern Coverage** | Are domain-specific anti-patterns listed? | 0.15 | 0.0 = none, 0.5 = generic, 1.0 = specific to this task |
| 4. **Dependency Awareness** | Does the prompt reference outputs from upstream work items? | 0.15 | 0.0 = missing deps, 0.5 = partial, 1.0 = all deps referenced |
| 5. **Token Efficiency** | Is the prompt within 300-600 token budget? | 0.20 | 0.0 = >1000 tokens, 0.5 = 600-1000, 1.0 = 300-600 |

### Confidence Score

```
confidence = sum(check_score * weight for each check)
```

### Threshold

- **>= 0.7**: PASS -- include in delegation_prompts.yaml
- **< 0.7**: REVISE -- improve the prompt before outputting
  - Re-read relevant files for more context (check 1)
  - Sharpen acceptance criteria (check 2)
  - Add specific anti-patterns (check 3)
  - Verify dependency outputs (check 4)
  - Trim or expand to target range (check 5)

### Output Format

Add confidence scores to delegation_prompts.yaml:

```yaml
prompts:
  TASK-01:
    controller: cagents:{controller_name}
    prompt: |
      <assembled prompt>
    confidence: 0.85
    confidence_breakdown:
      context_sufficiency: 0.9
      criteria_clarity: 0.8
      anti_pattern_coverage: 0.7
      dependency_awareness: 1.0
      token_efficiency: 0.8
```

## Quality Standards

- Each prompt should be 300-600 tokens (enough context, not overwhelming)
- Code snippets must have file paths and line numbers
- Anti-patterns must be specific (not generic "don't write bad code")
- Acceptance criteria must have verification methods (file_exists, test_result, etc.)
- Total delegation_prompts.yaml should stay under 3000 tokens for a typical 5-WI request
- All prompts must score >= 0.7 on the confidence rubric before output

## When to Skip Prompt Crafting

The adaptive pipeline (V9.27 fast path, preserved in v12) skips
delegation_prompts.yaml when:

- Tier is 2 (simple, single-controller fast path)
- Work items reference only well-known existing patterns
- Acceptance criteria are already fully specified in work_items.yaml
- Token budget pressure makes per-WI prompts net-negative

When skipped, the controller falls back to the standard prompt template
described in `.claude/rules/core/controllers.md` and uses
`workflow/work_items.yaml` directly as the delegation source.

---

**Part of**: cAgents Event-Driven Pipeline (absorbed into planner in v12.0.0)
