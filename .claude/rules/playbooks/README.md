---
paths:
  - ".claude/rules/playbooks/**"
  - "scripts/audit-agents.mjs"
  - "tests/v12/playbook-frontmatter-valid.test.js"
  - "tests/v12/playbook-extraction-cohesion.test.js"
  - "cagents-memory/_knowledge/agent-audit-*.md"
name: playbooks-index
description: "Index and conventions for reusable agent guidance playbooks. Playbooks extract duplicated guidance blocks out of agent SKILL.md files so multiple agents can share a single canonical source."
license: MIT
compatibility: "Claude Code 2.x, cAgents 12.4.0+"
metadata:
  author: cagents
  version: "1.0.0"
  purpose: "playbook-index"
---

# Playbooks

Playbooks are reusable guidance documents. An agent reads a playbook through the `@path` syntax. For example, an agent SKILL.md body holds a line like `See @.claude/rules/playbooks/<playbook-name>.md for the canonical pattern`. The `<playbook-name>` portion is a placeholder. It shows you how to construct the reference, and it is not a real file on disk.

Playbooks keep each `SKILL.md` file small, at 200 lines or less. They do this because they move the guidance that two or more agents share into a single canonical source.

## Current state (v12.4.0)

The v12.4.0 audit found **0 agents** with more than 100 lines of duplicated paragraph-blocks across the 240-agent catalog. That audit ran `scripts/audit-agents.mjs` on 2026-05-21, and it wrote its report to `cagents-memory/_knowledge/agent-audit-260521.md`. Earlier v12.x consolidation work already extracted the largest duplication clusters. In v12.0.0, that work absorbed `engineering-manager` into `tech-lead`. Also in v12.0.0, it collapsed `architecture-reviewer` into `architect --review`.

This README and the `playbooks/` directory exist as the **forward-looking landing zone** for future extractions:
- When a future agent is added whose guidance overlaps an existing agent by >100 lines, the shared block gets extracted here.
- When a future audit run flags new extract candidates, the playbook conventions below apply.

The directory is currently empty by design. The v12.4.0 audit found no qualifying candidates, so that release performed no extractions.

## Structure

Flat directory, prefix-based naming. We use **flat-with-prefix** instead of nested categories because:

1. The audit found no extraction candidates yet. We therefore have zero data on the right subdirectory names. We do not know whether `frameworks/`, `domains/`, `patterns/`, or `personas/` would carve cleanly.
2. A flat directory lets the first ~10 playbooks accumulate on their own. If the names show a clear category cluster, we can promote them to subdirectories. We make that move in a later minor bump.
3. Prefix discipline gives the same searchability without committing to a rigid taxonomy.

### Naming convention

`{prefix}-{topic}.md` where `{prefix}` is one of:

| Prefix | Meaning | Example |
|--------|---------|---------|
| `fw-` | Framework-specific guidance | `fw-react-component-patterns.md` |
| `dom-` | Domain conventions | `dom-medical-disclaimer.md` |
| `pat-` | Cross-cutting patterns | `pat-evidence-first-execution.md` |
| `per-` | Persona / behavioral | `per-skeptical-reviewer.md` |

If a candidate doesn't fit a prefix, propose a new one in this README before creating the playbook.

## Playbook frontmatter schema

Playbooks MUST conform to the [Agent Skills spec](https://agentskills.io). The spec allows exactly 6 top-level frontmatter fields. Claude Code extensions live inside `metadata`.

```yaml
---
name: pat-evidence-first-execution      # kebab-case, must match filename minus .md
description: "Pattern: how execution agents capture specific, verifiable evidence (file paths, line numbers, test output) instead of vague claims like 'looks correct'."
license: MIT
compatibility: "Claude Code 2.x, cAgents 12.4.0+"
metadata:
  author: cagents
  version: "1.0.0"
  applies_to:                            # agents that reference this playbook
    - cagents:backend-developer
    - cagents:frontend-developer
allowed-tools: Read Grep Glob              # OPTIONAL — only if the playbook prescribes tool usage
---

# Pattern: Evidence-First Execution

(body — the actual guidance content)
```

**Spec-allowed top-level fields (6 only)**: `name`, `description`, `license`, `compatibility`, `metadata`, `allowed-tools`. Any other field at the top level fails `skills-ref validate`. The `tests/v12/playbook-frontmatter-valid.test.js` test already enforces this rule.

## How agents reference playbooks

In a SKILL.md body, reference a playbook with the `@path` syntax. Claude Code resolves the `@path` lazily when the playbook's content is needed:

```markdown
## Evidence Requirements

See @.claude/rules/playbooks/pat-evidence-first-execution.md for the canonical evidence-first pattern.
```

The reference MUST resolve to an existing file. The `tests/v12/playbook-frontmatter-valid.test.js` test catches dangling references inside the playbooks themselves. The `tests/v12/no-orphaned-cagents-refs.test.js` test catches the wider class of broken agent references.

## Adding a new playbook

1. **Verify candidacy**: the block must appear in 2 or more SKILL.md files. A block of more than 100 lines of guidance also qualifies, when it needs its own canonical source.
2. **Pick a prefix** from the table above (or propose one in this README first).
3. **Write the playbook** with valid spec frontmatter.
4. **Replace** the duplicated block in every consumer SKILL.md. Put a reference in its place, in this form: `See .claude/rules/playbooks/<prefix>-<topic>.md for <topic>.` Prepend the `@` sigil to make the reference a live import. The `<prefix>-<topic>` portion is a placeholder for the actual playbook filename. The literal text shown here is inert on purpose, so the doc-sweep does not follow it.
5. **Verify** that every consumer SKILL.md file still passes `bash scripts/ci/validate-agents.sh`. Make sure that each file has 200 lines or less.
6. **Run** `tests/v12/playbook-frontmatter-valid.test.js` to confirm the new playbook's frontmatter is spec-compliant.

## Removing a playbook

If a playbook becomes obsolete (all consumers removed or absorbed):

1. Verify no agent SKILL.md still references it: `grep -rn "playbooks/{name}" .`
2. Delete the file.
3. Update this README if the prefix table needs maintenance.

## See also

- `.claude/rules/core/skill-format.md` gives the SKILL.md frontmatter spec.
- `scripts/audit-agents.mjs` is the audit script that flags new extract candidates.
- `cagents-memory/_knowledge/agent-audit-{date}.md` is the most recent audit report.
