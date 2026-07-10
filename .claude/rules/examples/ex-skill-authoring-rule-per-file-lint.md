---
name: ex-skill-authoring-rule-per-file-lint
description: "Example: structure a review/lint ruleset as atomic one-rule-per-file docs with a strict schema (title + impact enum + mandatory incorrect/correct pair), impact-prioritized and prefix-namespaced, compiled and schema-validated by a build step that also extracts the code examples as test cases. Load when authoring or refactoring a standards/review skill or a large rule catalog."
license: MIT
compatibility: "Claude Code 2.x, cAgents 12.x"
metadata:
  id: ex-skill-authoring-rule-per-file-lint
  category: skill-authoring
  source_repo: vercel-labs/agent-skills
  source_url: "https://github.com/vercel-labs/agent-skills"
  applies_to:
    - cagents:technical-writer
    - cagents:qa-lead
    - cagents:reviewer
  demonstrates: "One rule per file with title/impact/incorrect-correct schema, a _template stencil + _sections index, impact-prioritized prefix namespacing, and a build+validate step that rejects rules missing a valid impact or a bad+good example pair."
  added: "2026-07-10"
allowed-tools: Read Grep Glob
---

# Example: Rule-Per-File Lint Skill with Build + Validate

## Context
cAgents ships review/standards guidance as prose inside big SKILL.md/rules files. This example
distills how Vercel structures a *lint ruleset* so it stays reviewable, testable, and
progressively disclosed: each rule is one small file, machine-validated, with its code examples
doubling as test cases. Use it when authoring a standards-audit skill (`qa-lead` standards mode),
a large playbook set, or any catalog where "every entry must show a before/after" matters.

## Example

Directory shape (react-best-practices — 70 rules):

```
react-best-practices/
├── SKILL.md                 # quick-reference index only (categories + one-liners)
└── rules/
    ├── _sections.md         # section order + impact + prefix grouping (the taxonomy)
    ├── _template.md         # authoring stencil every rule copies
    ├── async-parallel.md    # ONE rule per file, prefix = section
    ├── bundle-barrel-imports.md
    └── rerender-memo.md
```

Every rule file has the same strict schema (`_template.md`):

```markdown
---
title: Extract to Memoized Components
impact: MEDIUM            # enum: CRITICAL | HIGH | MEDIUM-HIGH | MEDIUM | LOW-MEDIUM | LOW
impactDescription: enables early returns
tags: rerender, memo, optimization
---
## <title>
<one-paragraph why-it-matters>

**Incorrect (what's wrong):**
```tsx
// bad example
```
**Correct (what's right):**
```tsx
// good example
```
Reference: <doc URL>
```

Two conventions make the catalog navigable at scale:
- **Impact-prioritized**: sections are ordered CRITICAL → LOW so the reader/agent hits the
  highest-leverage rules first.
- **Prefix-namespaced**: the filename prefix (`async-`, `bundle-`, `rerender-`) is the section
  id, so a rule id is self-locating.

The load-bearing part — a real **build + validate** step (`packages/react-best-practices-build`),
not just prose discipline. `src/validate.ts` mechanically rejects a rule that:

```
- has no title, or no explanation, or
- has zero code examples, or
- lacks BOTH a bad/incorrect AND a good/correct labeled example, or
- has an impact outside the allowed enum.
```

`build.ts` compiles all rule files into one `AGENTS.md` (the full expanded guide), and
`extract-tests.ts` pulls every incorrect/correct code block into `test-cases.json` — so the
examples are not decorative, they are a dataset the skill can be tested against.

cAgents mapping:
- `validate-agents.sh` already lints frontmatter; add a rule-catalog check that every
  standards/lint rule ships a labeled before/after pair (the way the example store's own README
  requires `## Context / ## Example / ## Why it matters`).
- A `qa-lead` standards-audit skill authored this way stays under the `skill-size-monitor`
  thresholds because the index SKILL.md is thin and each rule loads on demand (Tier-3).

## Why it matters
Makes a large review ruleset diff-able, individually loadable (progressive disclosure), and
CI-enforceable — every rule provably ships a worked before/after, mirroring cAgents' own
"examples must show a distilled pattern" rule. Distilled from vercel-labs/agent-skills
`skills/react-best-practices/` (`rules/_template.md`, `rules/_sections.md`) +
`packages/react-best-practices-build/src/validate.ts`.
