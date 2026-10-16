---
name: ex-verification-assert-vs-say-grounding
description: "Example: split a deliverable into what it asserts (names, numbers, capabilities, quotes) and how it says it. Every assertion must trace to a source input. Framing, hooks, and connective text are free. Load when you review copy, a brief, a SOW, or any prose deliverable that a structural check already passed."
license: MIT
compatibility: "Claude Code 2.x, cAgents 12.x"
metadata:
  id: ex-verification-assert-vs-say-grounding
  category: verification
  source_repo: latent-spaces/brag
  source_url: "https://github.com/latent-spaces/brag"
  source_commit: "069432cac935ed1895859df201c31436c07fb74e"
  reviewed: "2026-10-15"
  applies_to:
    - cagents:editor
    - cagents:ai-writing-editor
    - cagents:marketing-strategist
  demonstrates: "Assert-vs-say grounding read: each factual claim in a deliverable cites a source input; invented framing is allowed; a structural PASS says nothing about the claims."
  added: "2026-10-15"
allowed-tools: Read Grep Glob
---

# Example: Assert-vs-Say Grounding

## Context
Many cAgents deliverables are prose, not code. Examples are launch copy, a
campaign brief, a SOW, a C-suite brief, and a story pitch. A structural gate
checks the shape of such a file: sections, length, and format. A structural
gate does not check whether a sentence is true. A deliverable can pass every
structural check and still contain a claim that no input supports. Use this
pattern in the reviewer loop or the validator gate for a prose work item.

## Example

**Rule.** Read the deliverable once with one question: "Does this line assert
something about the subject?" Sort each line into one of two groups.

| Group | What it holds | Rule |
|-------|---------------|------|
| **Assert** | Names, numbers, dates, prices, capabilities, feature claims, quotes, anything shown as the subject's own words | Must trace to a source input |
| **Say** | Tone, framing, hooks, jokes, transitions, connective text | Free to invent |

A source input is anything the work item received: the request, the files the
planner listed, the research outputs, or the user's own text. A change of case,
a trim, or a split of a sourced line is acceptable. An invented claim is not.

**Worked check.** The work item asks for three headline options for a product
launch. The only inputs are the product README and a pricing page.

```
Draft headline                          Group    Source               Verdict
"Ships 10x faster"                      Assert   none                 FAIL
"Free for teams up to 5"                Assert   pricing.md:12        PASS
"Finally, a planner that plans"         Say      n/a (framing)        PASS
"Trusted by 2,000 companies"            Assert   none                 FAIL
"Exports to CSV, PDF, and Markdown"     Assert   README.md:40         PASS
```

**Fix for a FAIL.** Do not make the claim vaguer. Replace it with what the
source does say. In most cases, the real claim is more specific than the invented
one. "Ships 10x faster" becomes the actual benchmark line from the README. If
the README has no benchmark, remove the claim.

**Reviewer output shape.**

```yaml
grounding_check:
  claims_total: 4
  grounded: 2
  ungrounded:
    - line: "Ships 10x faster"
      fix: "Replace with README.md:22 'Builds in 40s on a 2-core runner', or remove"
    - line: "Trusted by 2,000 companies"
      fix: "No customer count in inputs. Remove, or ask the user for a source"
  verdict: REVISE   # any ungrounded assertion -> REVISE
```

**Why a separate read.** The structural gate gives a clean PASS on this draft.
No other gate in the pipeline asks the grounding question. So the reviewer
must ask it on purpose, as its own step.

**Scope limit.** This check does not judge style or quality. A dull but
grounded line passes. A sharp line passes if it only frames. This keeps the
check cheap and keeps creative room for the writer.

## Why it matters
cAgents is domain-agnostic. Non-code output can pass the structural gates
even when it holds invented claims. This rule gives the editor and validator a
cheap test that works in every domain and leaves creative latitude intact. It
complements `ex-verification-mechanical-claim-check`, which checks numeric and
file claims in a report with grep and arithmetic. Distilled from
latent-spaces/brag `skills/brag/references/step-3-compose.md`, section
"Grounding factual claims" (MIT).
