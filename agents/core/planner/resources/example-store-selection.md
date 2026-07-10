# Example-Store Few-Shot Selection (advisory)

The full selection procedure for the planner's advisory few-shot lookup against
the curated example store at `.claude/rules/examples/`. The SKILL.md body carries
the one-paragraph summary and points here (`See @agents/core/planner/resources/example-store-selection.md`).

**This is ADVISORY context, not a required pipeline step.** It improves work-item
shaping and delegation prompts by loading 1-3 distilled worked patterns as
few-shot guidance. When nothing matches, skip it entirely and proceed with normal
decomposition — the pipeline never fails because no example was selected.

## What the store is

`.claude/rules/examples/` holds distilled, git-tracked few-shot exemplars:

- `_index.yaml` — machine-readable catalog (the file you read).
- `ex-*.md` — one distilled worked pattern per file (`## Context` / `## Example`
  / `## Why it matters`), ≤ ~150 lines each.
- `README.md` — conventions (the store's own description of this consumption path).

The store is the curated deliverable; nothing else consumes it, so this planner
lookup is its primary consumer.

## `_index.yaml` schema

```yaml
schema_version: "1"
catalog_version: "1.0"

categories:              # the 9 valid category strings
  - review
  - verification
  - minimalism
  - skill-authoring
  - intake
  - gates
  - strategy
  - structured-io
  - security

examples:
  - id: ex-review-distrust-self-report        # == path minus .md
    category: review                          # one of `categories`
    source_repo: obra/superpowers
    applies_to: [cagents:reviewer, all-controllers]   # agents/skills this helps
    demonstrates: "One-sentence what-it-teaches."
    path: ex-review-distrust-self-report.md   # @path-loadable, relative to the store dir
```

Load a body via `@.claude/rules/examples/{path}` (e.g.
`@.claude/rules/examples/ex-review-distrust-self-report.md`).

## Selection procedure

### 1. Detect category from the request

Classify the request against the 9 store categories (from `_index.yaml`
`categories`):

| Category | Fires when the request is about… |
|----------|----------------------------------|
| `review` | code/work review, PR review, reviewer loops, blind review |
| `verification` | proving completion, evidence, claim-checking, debugging repro loops |
| `minimalism` | keeping the change small, avoiding over-abstraction, surgical diffs |
| `skill-authoring` | writing/editing agents, skills, descriptions, rule/lint catalogs |
| `intake` | vague/ambiguous requests, surfacing assumptions before building |
| `gates` | checkpoints, pre-hoc write gates, candidate selection, context budgets |
| `strategy` | product/market strategy, red-teaming, NSM, opportunity scoring |
| `structured-io` | schema/role contracts, templated variables, data-transform I/O |
| `security` | tool-permission audits, trigger-collision checks, threat surface |

Zero, one, or several categories may fire. If none fire, STOP — skip the lookup.

### 2. Filter `_index.yaml` by category AND `applies_to`

Keep an entry when BOTH hold:

- **Category match**: `entry.category` is in the detected category set.
- **`applies_to` overlap**: `entry.applies_to` intersects the set of controllers
  and execution agents you are about to assign for this request. Treat the
  wildcard tokens `all-controllers` and `all-execution-agents` as matching ANY
  controller / any execution agent respectively — an entry tagged
  `all-controllers` always overlaps once you have assigned at least one
  controller.

An entry passing the category filter but with no `applies_to` overlap is dropped
(the pattern is real but not for the agents on this job).

### 3. Rank by relevance

Order the surviving entries, best first:

1. **Specific-agent match beats wildcard** — an entry naming `cagents:reviewer`
   explicitly ranks above one that only matched via `all-controllers`.
2. **More category signal** — if several categories fired, an entry whose
   category was the strongest/primary signal ranks higher.
3. **`demonstrates` fit** — break ties by how directly the `demonstrates` line
   maps to the work items you are shaping.

### 4. `@path`-load the top 1-3 bodies

Take the top 1-3 ranked entries and `@path`-load each body via
`@.claude/rules/examples/{path}`. Use them as few-shot guidance while writing
work-item acceptance criteria and delegation prompts (e.g., under a
`## Few-Shot Guidance` note in the delegation prompt, mirroring the
`## Prior Learnings` shape from the pre-emptive `_knowledge/` scan).

### 5. Hard cap 3 + token budget

- **Hard cap: 3.** Never load more than three example bodies, even if a dozen
  match. Each body is ≤ ~150 lines (~1.5K tokens); three is the ceiling that
  keeps the advisory context bounded.
- **Skip when empty.** Zero matches after filtering → emit nothing (no empty
  header, no placeholder). The lookup adds context only when it pays for itself.
- **Prefer fewer.** One sharply-relevant example beats three loosely-related
  ones; load 2-3 only when they cover distinct facets of the request.

## Worked example

Request: *"Add a reviewer loop that catches when an agent claims a fix works but
it doesn't."*

1. **Detect category** → `review` (reviewer loop) and `verification` (claim
   proving) both fire.
2. **Planned agents** → controller `cagents:tech-lead`, plus `cagents:reviewer`
   spawned in the loop. So the assigned set includes a controller and
   `cagents:reviewer`.
3. **Filter** `_index.yaml`:
   - `ex-review-distrust-self-report` — category `review` ✓, `applies_to:
     [cagents:reviewer, all-controllers]` ✓ (both a direct `cagents:reviewer`
     match and an `all-controllers` wildcard hit). **KEEP.**
   - `ex-verification-mechanical-claim-check` — category `verification` ✓,
     `applies_to: [cagents:validator, cagents:reviewer, all-controllers]` ✓.
     **KEEP.**
   - `ex-review-blind-dual-convergence` — category `review` ✓, `applies_to`
     includes `cagents:reviewer` ✓. **KEEP.**
   - `ex-strategy-red-team-fails-if` — category `strategy` ✗ (not detected).
     **DROP.**
4. **Rank** → `ex-review-distrust-self-report` (direct reviewer + on-point
   `demonstrates`) > `ex-verification-mechanical-claim-check` > 
   `ex-review-blind-dual-convergence`.
5. **Load** the top 3 (at the cap) via
   `@.claude/rules/examples/ex-review-distrust-self-report.md`,
   `@.claude/rules/examples/ex-verification-mechanical-claim-check.md`,
   `@.claude/rules/examples/ex-review-blind-dual-convergence.md` and fold their
   patterns into the reviewer work item's acceptance criteria and delegation
   prompt.

## See also

- `.claude/rules/examples/README.md` — the store's own description of this
  consumption path (planner few-shot).
- `.claude/rules/examples/_index.yaml` — the catalog this procedure reads.
- The `## Pre-emptive Consultation` section in `../SKILL.md` — the sibling
  advisory scan against `cagents-memory/_knowledge/`, which surfaces prior
  learnings the same way this surfaces distilled examples.
