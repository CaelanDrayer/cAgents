---
name: ex-verification-mechanical-claim-check
description: "Example: mechanically re-verify every numeric/file/snippet/citation claim in a completed report with grep+fs+math instead of asking the LLM to grade its own output; compute a passRate and auto re-run when it drops below threshold. Load when validating a work item's evidence or reviewing an agent-authored recommendation/report."
license: MIT
compatibility: "Claude Code 2.x, cAgents 12.x"
metadata:
  id: ex-verification-mechanical-claim-check
  category: verification
  source_repo: vercel-labs/agent-skills
  source_url: "https://github.com/vercel-labs/agent-skills"
  applies_to:
    - cagents:validator
    - cagents:reviewer
    - all-controllers
  demonstrates: "Extract each numeric/file/snippet/citation claim from a completed report and check it with grep+fs+math; passRate = verified/(verified+failed); passRate<0.8 with >=2 checkable claims triggers a re-gen with the failures fed back."
  added: "2026-07-10"
allowed-tools: Read Grep Glob Bash
---

# Example: Mechanical Claim Verification (don't let the LLM grade itself)

## Context
cAgents' `validator-evidence-recheck.cjs` already re-runs cited verification methods after a
write, and `pat-evidence-first-execution` demands file:line evidence. This example distills the
stronger vercel-optimize design: treat the *whole completed report* as a set of extractable
claims, disposition each mechanically, and gate acceptance on a computed pass rate. Use it in
the validator/reviewer loop when an agent hands back a recommendation, audit, or finding set.

## Example

Doctrine (vercel-optimize `verification.md`): *"The recommender is an LLM. LLMs hallucinate
counts, miscount file occurrences, and confuse snippets between similar files... The LLM is not
asked to judge whether its own output is correct."* Verification is pure — grep + `fs` + math,
no network, no model.

Extract claims from the report's `why / fix / current / desired / verify` prose, then run each
through a typed handler:

```
| Claim type          | Example in report                | Mechanical check                     |
|---------------------|----------------------------------|--------------------------------------|
| pattern_count       | "3 fetch() calls in route.ts"    | grep -c in that file, exact match    |
| pattern_exists      | "uses JSON.parse(JSON.stringify)"| grep, boolean                        |
| pattern_absent      | "no Cache-Control header"        | grep, verify absence (guarded)       |
| file_exists         | "app/not-found.tsx exists"       | fs.access                            |
| code_snippet        | fenced "Before:" block           | substring search in the CITED file   |
| arithmetic          | "20% of 100K = 20K"              | recompute                            |
| citation_in_library | any URL cited                    | URL is in the allow-list             |
| contradiction       | claim A vs claim B               | substring conflict check             |
```

Four dispositions, and the ones you can't check don't get to lie either way:

```
verified     — matches reality            (counts as pass)
failed       — contradicts reality        (counts as fail)
unsupported  — can't be checked (guarded) (counts neither)
unverifiable — out of scope (runtime-only)(counts neither)

passRate = verified / (verified + failed)
```

Guards stop the checker from producing its own false negatives:
- `snippet_in_wrong_file` — snippet found, but in a different file than cited → `unsupported`
  (the claim is close; don't fail it, but the file ref is wrong).
- `prose-of-absence` — "no cache headers" with no explicit grep → `unsupported` (absence needs
  evidence).
- `line-number-as-count` — `foo.ts:42` matched against a count claim → skip; it's a line, not
  a count.

Accept / re-run gate:

```
passRate < 0.8  AND  checkable_claims >= 2   -> re-run the author with topFailures fed back
hard-safety claim failed (e.g. cache-safety) -> hold the item back until fixed or abstained
passRate >= 0.8  OR  checkable_claims < 2    -> accept
```

cAgents mapping: in the reviewer loop (Stage-1 spec compliance), disposition each acceptance-
criterion evidence line mechanically; if `passRate < 0.8`, return REVISE with the exact failed
claims instead of a vague "looks off." The validator writes the pass rate into
`validation_report.yaml`; a FAIL routes back to PLANNED just like the existing revision loop.

## Why it matters
Turns "agent said success" into a checkable number and a bounded re-run, closing the phantom-
completion gap that `pat-evidence-first-execution` warns about. Directly upgrades
`validator-evidence-recheck.cjs` (which already re-runs cited methods) with a claim taxonomy,
guards, and a `passRate`-driven re-gen trigger. Distilled from vercel-labs/agent-skills
`skills/vercel-optimize/references/verification.md` + `doctrine.md` Rule 4.
