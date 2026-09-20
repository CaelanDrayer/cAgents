---
paths:
  - "tests/**"
---

# Clean STE-100 Fixture

This file obeys the STE-100 standard. `scripts/ci/validate-ste100.sh` must
report 0 violations for it, and must exit 0.

## Why this fixture exists

A gate that only fails is half a gate. This file is the negative control. It
proves the checker can return a clean result on real prose. It pairs with
`violating.md`, which trips every prose check.

## Procedural text

Each step below is an imperative sentence of 20 words or less.

1. Read the work item and its acceptance criteria.
2. Run the guard command, and record the exit code.
3. If the guard fails, stop and report the failure.
4. Write the evidence with a file path and a line number.
5. Report the status as DONE only when each criterion has evidence.

## Descriptive text

The gate reads a file at a time. It skips a fenced code block, an inline code
span, the YAML frontmatter, a heading, a table row and a horizontal rule. For a
`.cjs` file it reads the comment lines and nothing else, so a string literal in
the code can never make the gate fail.

Each paragraph holds 6 sentences or less. Each descriptive sentence holds 25
words or less. Each procedural sentence holds 20 words or less. No paragraph
holds a noun cluster of more than 3 nouns. The file holds 0 em dashes.

## A fenced block the gate must skip

The block below holds a very long line, an em dash and a large noun pile. The
gate skips all of it, because a fence hides code and not prose.

```text
This line inside the fence is a deliberately long descriptive sentence that runs
well past twenty five words in total, and it also carries an em dash — plus a
runway light approach system control panel indicator lamp assembly noun pile.
```

## An inline span the gate must skip

The gate masks an inline code span before it counts anything. The span
`runway light approach system control panel indicator lamp` holds 8 nouns. The
span `a — b` holds an em dash. Neither span trips a check.

## A table the gate must skip

| Check | Cap | Applies to |
|---|---|---|
| Procedural sentence | 20 words | an instruction, a step or a command |
| Descriptive sentence | 25 words | an explanation or reference prose |

## Quick check

- [ ] Each procedural sentence has 20 words or less.
- [ ] Each descriptive sentence has 25 words or less.
- [ ] Each paragraph has 6 sentences or less.
- [ ] No noun cluster has more than 3 nouns.
- [ ] The file has 0 em dashes.
