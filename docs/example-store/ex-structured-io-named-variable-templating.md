---
name: ex-structured-io-named-variable-templating
description: "Example: self-documenting ${Name:default} inline variables, with comma-separated enum defaults, as a readable superset of positional $0/$1 substitution. A UI or a human can render a fill-in form with no external schema. Load when you author a multi-argument skill or delegation template."
license: CC0-1.0
compatibility: "Claude Code 2.x, cAgents 12.x"
metadata:
  id: ex-structured-io-named-variable-templating
  category: structured-io
  source_repo: f/prompts.chat
  source_url: "https://github.com/f/prompts.chat"
  source_commit: bbd0529530d99fa76ab2f51809b6184ea4b625b8
  reviewed: "2026-10-15"
  applies_to:
    - cagents:planner
    - cagents:technical-writer
  demonstrates: "Self-documenting ${Name:default} inline variables (with comma-enum defaults) as a readable superset of positional $0/$1 args."
  added: "2026-07-10"
---

# Example: Named-and-Defaulted Variable Templating

## Context
cAgents skill substitution (`$ARGUMENTS`, `$0`, `$1`) is positional. A
multi-argument skill cannot describe what each slot means. The prompts.chat
corpus uses `${Name:default}` inline templating, which documents itself. At
upstream commit `bbd05295`, 636 of 2,452 prompts (25.9%) contain a `${...}`
variable, and 304 of them use the `${Name:default}` form.

## Example

Positional. It is opaque, because nothing says what `$1` is:

```
Act as a $0. Review the $1 for a $2 audience.
```

Named and defaulted. The variable name and a default or an enum are inline, so
the template documents itself:

```
Act as a ${Role:Software Developer}.
Review the ${Artifact:pull request} for a ${Audience:senior engineers} audience.
Target genre: ${Genre:fantasy, sci-fi, mystery, romance, horror}   # comma-list = enum of choices
```

Adopt these properties as an authoring convention. You do not need a new
substitution engine:

- `${Name:default}` is a named slot. The default applies if the user gives no
  value.
- `${Name:a, b, c}` reads as an enum. A UI can show a dropdown, and a human can
  see the valid options inline.
- A UI can render the template as a fill-in form with no external schema. The
  prompt text is the schema.

Use in cAgents: a delegation prompt or a `/designer` question template with many
slots documents itself. `/designer` gets the same result today through its
interactive questions.

## Why it matters
This is a readable superset of positional arguments for multi-argument skills.
If `skill-format.md` documents it as an authoring convention, delegation and
question templates describe themselves. Distilled from f/prompts.chat
`prompts.csv` (CC0-1.0 prompt data), for example the `Devops Engineer`
(`${Title:Senior}`) and `Story Generator` rows.
