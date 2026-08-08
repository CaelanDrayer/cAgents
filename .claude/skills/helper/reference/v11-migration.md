# V11.0 Migration Catalog

V11.0.0 removed `/review`, `/optimize`, `/context`, and `/debug` after a 10-patch deprecation window. See [`docs/MIGRATION-V11.md`](../../../../docs/MIGRATION-V11.md) for the full migration guide.

## Quick Lookup

| V10 invocation | V11 replacement |
|----------------|-----------------|
| `/review <target>` | `/improve --mode review <target>` (or `/improve <target>`; `review` is the default mode) |
| `/optimize <target>` | `/improve --mode optimize <target>` |
| `/optimize <target> --review-after` | `/improve --mode full --scope <target>` |
| `/context init\|show\|update\|clear` | `/act context init\|show\|update\|clear` |
| `/debug <bug>` | `/act --mode debug <bug>` |

## Passthroughs (handled inside /act)

| Form | Replaces | Landed in |
|------|----------|-----------|
| `/act context show\|init\|update\|clear` | `/context` | V10.26.9 |
| `/act --mode debug` | `/debug` | V10.26.11 |

## Dynamic SKILL.md Reading

When answering questions about specific skills, **Read the actual SKILL.md file at runtime** rather than relying solely on static reference docs.

### Skill File Paths

| Skill | SKILL.md Path |
|-------|---------------|
| /act | `.claude/skills/act/SKILL.md` |
| /designer | `.claude/skills/designer/SKILL.md` |
| /improve | folded into `/act` via keyword router (v12.1.2; no separate SKILL.md) |
| /team | `.claude/skills/team/SKILL.md` (includes strategic mode for cross-domain work in v12.2.0+) |
| /org | REMOVED in v12.2.0 (absorbed into /team strategic mode; no SKILL.md) |
| /helper | `.claude/skills/helper/SKILL.md` |

### What to Extract by Query Type

| Query Type | Where to Look | What to Extract |
|------------|--------------|-----------------|
| Flags / options | frontmatter `argument-hint` + "Argument Handling" / "Key flags" sections | Flag names, descriptions, examples |
| Capabilities | "Key Capabilities", "What it does", workflow sections | Feature list, capabilities |
| When to use | "When to use" / "When NOT to use" sections | Decision criteria |
| Examples | "Examples" sections + `reference/examples.md` if present | Concrete usage examples |
| Workflow | "Workflow", state machine diagrams, phase descriptions | Step-by-step process |

### Response Format

- State "Read live from `{path}`" at the top of flag/capability answers
- Format 3+ flags as a table: Flag | Description | Example
- For fallback: state "Using static reference (SKILL.md not found at `{path}`)"

### Fallback Behavior

If a SKILL.md cannot be read:
1. Fall back to `reference/flag-summaries.md` for flags
2. Fall back to `reference/command-summaries.md` for capabilities/examples
3. Always note when using fallback: "(static reference -- may not reflect latest version)"
