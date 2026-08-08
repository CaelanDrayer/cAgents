# Example Store

A first-class, git-tracked, **distilled** library of teachable patterns harvested
from external Claude-Code / Agent-Skills repositories and re-expressed in cAgents'
own vocabulary (work items, controllers, acceptance criteria, the minimal-solution
ladder). Each example is a small, context-sized worked pattern — NOT a vendored
copy of a whole repo.

This store is the *curated, shipped* counterpart to the raw research corpus that
lived at `_archive/repo_root_scratch/` (git-ignored). The corpus was the
extraction *source*; this directory is the extracted, distilled *deliverable*.
(The 4.2GB corpus was pruned from the working tree in v12.52.0 once the last
test depending on it was decoupled via a vendored fixture — REC-18; re-clone the
upstream repos if a fresh extraction pass is needed.)

## What lives here

```
docs/example-store/
├── README.md          # this file (conventions + how to add/consume)
├── _index.yaml        # machine-readable catalog (planner few-shot selection)
└── ex-{category}-{slug}.md   # one distilled example per file
```

Naming: `ex-{category}-{slug}.md`, flat-with-prefix (mirrors `playbooks/pat-*`).
Categories in use: `review`, `verification`, `minimalism`, `skill-authoring`,
`intake`, `gates`, `strategy`, `structured-io`, `security`.

## File schema (spec-compliant: exactly 6 top-level frontmatter keys)

```yaml
---
name: ex-review-distrust-self-report        # kebab-case, == filename minus .md
description: "Example: … one-sentence what + why-load-it."
license: MIT
compatibility: "Claude Code 2.x, cAgents 12.x"
metadata:
  id: ex-review-distrust-self-report
  category: review                          # one of the categories above
  source_repo: obra/superpowers
  source_url: "https://github.com/obra/superpowers"
  applies_to:                               # real cagents agents/skills
    - cagents:reviewer
    - all-controllers
  demonstrates: "Reviewer treats the implementer's self-report as an unverified claim."
  added: "2026-07-10"
allowed-tools: Read Grep Glob               # OPTIONAL — only if the example prescribes tools
---

# Example: <Title>

## Context
When this pattern applies inside cAgents (1–3 sentences).

## Example
The distilled worked pattern — a before/after, a template, or a short excerpt.
Keep the whole body ≤ ~150 lines so it fits Tier-3 progressive disclosure.

## Why it matters
1–2 lines mapping the pattern to a concrete cAgents surface, attributing the source.
```

Only `name`, `description`, `license`, `compatibility`, `metadata`, `allowed-tools`
are permitted at the top level (Agent Skills 6-field cap). Everything else nests
under `metadata`. This is the same rule `tests/v12/playbook-frontmatter-valid.test.js`
enforces for playbooks.

## How to add a new example

1. Identify a teachable pattern — from the raw corpus (`_archive/repo_root_scratch/`)
   or a Wave-1 analysis report.
2. Create `ex-{category}-{slug}.md` with the 6-field frontmatter above.
3. **Distill** the pattern into a ≤ ~150-line body (excerpt/template + why-it-matters).
   Do NOT paste whole files — the store ships in git.
4. Pin provenance: fill `source_repo` + `source_url`.
5. Append a matching entry to `_index.yaml`.
6. (Optional) Add a Tier-3 `@path` reference from the SKILL.md of every agent in
   `applies_to`, e.g. `See @docs/example-store/ex-review-distrust-self-report.md`.

## How it is intended to be consumed (two paths)

1. **Planner few-shot (primary, automated).** The `planner` reads `_index.yaml`,
   filters by the request's detected `category` and by `applies_to`, and
   `@path`-loads the top 1–3 matching example bodies as few-shot context during
   decomposition / delegation-prompt assembly.
2. **Agent progressive disclosure (secondary, on-demand).** A consuming agent adds
   a Tier-3 `@path` line in its SKILL.md body, loaded only when the pattern is
   needed — per the existing progressive-disclosure model.

## Provenance

Every example attributes the external repo it was distilled from. Content is
re-expressed for cAgents, not copied verbatim; the source repos are MIT/Apache-2.0
except where noted. The `source_url` lets any example be re-verified against its
origin.

## A note on the word "examples"

"Examples" is overloaded across cAgents, so it helps to name the three distinct
things. First, an agent's own `resources/examples.md` — tier-3 material bundled
inside a single SKILL.md, loaded on demand to show that one agent how to do its
job. Second, a skill's usage examples — the `/act Fix auth bug`-style lines in a
SKILL.md body or `_MODE_REGISTRY.md` that tell a human how to invoke the skill.
Third, this directory: a curated, cross-agent **few-shot example store**, indexed
by `_index.yaml` and selected by the planner to seed decomposition. The first two
are authored for one consumer and travel with it; this store is a shared, indexed
library any agent or the planner can draw from. When a doc or commit says
"examples," it's worth checking which of the three it means.

## See also

- `.claude/rules/playbooks/README.md` — the sibling flat-with-prefix convention.
- `cagents-memory/_system/templates/teams/_index.yaml` — the machine-readable index this mirrors.
- `.claude/rules/core/skill-format.md` — the 6-field frontmatter spec.
