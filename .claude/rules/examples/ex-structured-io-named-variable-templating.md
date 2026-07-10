---
name: ex-structured-io-named-variable-templating
description: "Example: self-documenting ${Name:default} inline variables (with comma-separated enum defaults) as a readable superset of positional $0/$1 substitution — a UI or human can render a fill-in-the-blank form with no external schema. Load when authoring a multi-argument skill or delegation template."
license: MIT
compatibility: "Claude Code 2.x, cAgents 12.x"
metadata:
  id: ex-structured-io-named-variable-templating
  category: structured-io
  source_repo: f/prompts.chat
  source_url: "https://github.com/f/prompts.chat"
  applies_to:
    - cagents:planner
    - cagents:technical-writer
  demonstrates: "Self-documenting ${Name:default} inline variables (with comma-enum defaults) as a readable superset of positional $0/$1 args."
  added: "2026-07-10"
---

# Example: Named-and-Defaulted Variable Templating

## Context
cAgents skill substitution (`$ARGUMENTS`, `$0`, `$1`) is positional and undocumented
for named args — a multi-argument skill can't self-describe what each slot means. The
prompts.chat corpus (28% of 2,006 prompts) independently converged on `${Name:default}`
inline templating, which is self-documenting.

## Example

Positional (opaque — what is `$1`?):

```
Act as a $0. Review the $1 for a $2 audience.
```

Named + defaulted (the variable name and a sensible default/enum are inline, so the
template documents itself):

```
Act as a ${Role:Software Developer}.
Review the ${Artifact:pull request} for a ${Audience:senior engineers} audience.
Target genre: ${Genre:fantasy, sci-fi, mystery, romance, horror}   # comma-list = enum of choices
```

Properties worth adopting as an *authoring convention* (no new substitution engine
required):
- `${Name:default}` — a named slot with a fallback if the user omits it.
- `${Name:a, b, c}` — the default reads as an enum; a UI can render a dropdown, a human
  can see the valid options inline.
- The template is renderable as a fill-in-the-blank form with zero external schema —
  the schema *is* the prompt text.

cAgents use: a delegation-prompt or `/designer` question template with several slots
becomes self-documenting, the way `/designer`'s interactive Q&A does procedurally today.

## Why it matters
A readable superset of positional args for multi-argument skills — documented as an
authoring convention in `skill-format.md`, it makes delegation/question templates
self-describing. Distilled from f/prompts.chat (`${Var:default}` pattern, e.g.
`Devops Engineer`, `Story Generator`).
