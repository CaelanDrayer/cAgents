---
paths:
  - ".claude/rules/quality/resources/ste100-word-choices.md"
  - ".claude/rules/quality/ste100-technical-writing.md"
  - ".claude/rules/**/*.md"
  - "agents/**/*.md"
  - ".claude/skills/**/*.md"
  - "docs/**/*.md"
  - "CLAUDE.md"
  - "README.md"
---

# STE-100 Word Choices

This file gives the banned words and the approved words for cAgents prose. It is
tier 3 of `.claude/rules/quality/ste100-technical-writing.md`. Read it when you
rewrite text. Do not load it for every edit.

## C8: the copyright limit

ASD owns the copyright of the ASD-STE100 specification and of the full
Dictionary. This file is NOT the Dictionary, and it does not reproduce the
Dictionary. It holds the small set of example word choices that the public rule
summary publishes, plus the rows that cAgents adds for its own prose. Get the
specification at no cost from <https://asd-ste100.org>.

A word that this file does not list needs a human check against the official
Dictionary before you call it approved. If you cannot do that check, you have
two options. Use a word that this file lists, or tell the user that the word
needs a check.

## Row count

| Group | Rows |
|---|---|
| ASD rows: verbs | 29 |
| ASD rows: nouns | 12 |
| ASD rows: adjectives and adverbs | 11 |
| ASD rows: phrases | 14 |
| cAgents-local rows | 33 |
| **Total** | **99** |

3 cAgents-local rows repeat an ASD row, so the file holds 96 distinct terms. The
table of words with one approved meaning has 3 columns, so its 10 rows are not
in the count above.

## ASD rows: verbs

| Do not use | Use |
|---|---|
| accomplish, execute, perform | do |
| acquire, obtain, procure | get |
| adhere to, comply with | obey |
| ascertain, determine | find, make sure |
| assist, aid | help |
| attempt | try |
| cease, terminate, discontinue | stop |
| commence, initiate | start |
| conduct (a test) | do (a test) |
| depress (a button) | push |
| desire | want |
| endeavor | try |
| ensure | make sure |
| examine, inspect | do a check of |
| facilitate | help, make easy |
| illuminate | come on, light |
| indicate | show |
| locate | find |
| modify | change |
| observe | look at, see |
| permit | let |
| purchase | buy |
| rectify, remedy | correct, repair |
| replenish | fill |
| require | need |
| retain | keep |
| transmit | send |
| utilize | use |
| verify | make sure, do a check of |

## ASD rows: nouns

| Do not use | Use |
|---|---|
| aperture | hole |
| assistance | help |
| commencement | start |
| illumination | light |
| malfunction | fault |
| personnel | persons |
| portion | part |
| remainder | the other part |
| requirement | need |
| termination | end |
| utilization | use |
| vicinity | area |

## ASD rows: adjectives and adverbs

| Do not use | Use |
|---|---|
| adequate, sufficient | enough |
| adjacent | near, next to |
| approximately | about |
| additional | more |
| initial | first |
| numerous, multiple | many |
| optimum | best |
| previous | before, earlier |
| principal | main |
| rapidly | quickly |
| subsequent | after, next |

## ASD rows: phrases

| Do not use | Use |
|---|---|
| a number of | some, many |
| at this time | now |
| due to the fact that | because |
| for the purpose of | to, for |
| in accordance with | as in, follow |
| in conjunction with | with |
| in order to | to |
| in the event that | if |
| in the vicinity of | near |
| is capable of | can |
| it is necessary to | you must |
| prior to | before |
| subsequent to | after |
| with regard to | about |

## cAgents-local rows

Every row below this heading is cAgents-local. It is NOT an ASD row. These rows
come from the hedge and jargon pattern that `scripts/ste100/metrics.sh` counts
as `hedge_hits`. Run that script on a surface to get its current count. Use
these rows on cAgents prose. Do not present them as ASD-STE100 rules.

3 rows repeat an ASD row, because the word is both a banned ASD word and a
measured cAgents hedge. Each one carries the note "ASD row too".

A "delete it" cell is not a breach of M6. M6 forbids the deletion of articles
and of words that carry meaning. A filler adverb carries no meaning, so its
removal is simplification.

| Do not use | Use |
|---|---|
| basically | delete it |
| essentially | delete it |
| simply | delete it |
| just | delete it |
| actually | delete it |
| really | delete it |
| very | delete it, or use a stronger word |
| quite | delete it |
| somewhat | delete it, or give the number |
| fairly | delete it, or give the number |
| rather | delete it |
| generally | say when it is true |
| typically | say when it is true |
| usually | say when it is true |
| often | give the count or the rate |
| might | can, or state the condition |
| could potentially | can |
| in order to | to (ASD row too) |
| it is important to note | delete it, and state the point |
| note that | delete it, and state the point |
| please note | delete it, and state the point |
| as needed | state the condition |
| as required | state the condition |
| where appropriate | state the condition |
| leverage | use |
| utilize | use (ASD row too) |
| facilitate | help, make easy (ASD row too) |
| robust | say what it resists |
| seamless | say what the user does not do |
| comprehensive | say what it covers |
| holistic | say what it covers |
| delve | look at, study |
| tapestry | delete it, and name the thing |

## ASD rows: words with one approved meaning

Each word below is approved, but only with one meaning.

| Word | Approved meaning | Do not use it for |
|---|---|---|
| follow | to come after | to obey |
| clear | to remove an obstruction | free of, easy to understand |
| about | approximately | on the subject of |
| close | to shut | near |
| fit | to install a part | correct size |
| free | to release | at no cost |
| like | the same as | to want |
| only | no more than | alone |
| right | the opposite of left | correct |
| test | a noun (do a test) | a verb (test the pump) |
