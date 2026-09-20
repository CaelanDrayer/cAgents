---
paths:
  - "agents/**"
  - ".claude/rules/**"
  - ".claude/skills/**"
  - ".claude/hooks/**"
  - "docs/**"
  - "tests/**"
  - "CLAUDE.md"
  - "README.md"
---

# STE-100 Technical Writing Standard

cAgents writes its instructional prose in ASD-STE100 Simplified Technical
English. STE-100 is a controlled language. It keeps text short, clear, and easy
to translate.

This standard summarizes the public ASD-STE100 rule set. ASD owns the copyright
of the specification and of the Dictionary. Get the specification at no cost
from <https://asd-ste100.org>.

## Tier 1: The mandates

Obey these ten rules in every file that this standard governs.

**M1. Use the approved word.** Replace each banned word with its approved
equivalent. Technical names and technical verbs are the only exceptions. The
substitution table is in Tier 3.

**M2. One term for one thing.** Use one term for each concept in all the
text. Do not use synonyms. Use each word with one meaning and one part of
speech.

**M3. Keep sentences short.** A procedural sentence has 20 words or less. A
descriptive sentence has 25 words or less. Write one topic in one sentence.

**M4. Use the active voice and the imperative.** Start each instruction with the
verb: "Read the file." Use the passive voice only in descriptive text, and only
when the active voice is unclear.

**M5. Use simple tenses.** Use the present tense, the past tense, and the future
tense. Do not write "has been removed". Write "was removed".

**M6. Shorten by SIMPLIFYING, never by deleting.** Keep ALL articles: "a", "an",
"the". NEVER compress text by deletion. NEVER write in telegraph style. If an
instruction asks for shorter text, make the words simpler.
M6 wins over any instruction that asks for "tight" or "limited" prose.

**M7. Do not use the banned constructions.** These are banned: the em dash, the
slash, a gerund used as a noun or an adjective, and parentheses that add a
second idea. The form "and/or" is the one permitted slash.

**M8. Put the condition first, and the warning before the step.** Write "If the
test fails, stop the run." Put each warning or each caution before the step that
it applies to.

**M9. Keep the structure flat.** Write 6 sentences or less in a paragraph. Write
one topic in one paragraph. Use a table or a list for more than 3 related items.

**M10. Accuracy wins.** Never change a technical name, a path, a number, a
command, or a code sample to obey a rule. If a rule and the technical accuracy
have a conflict, keep the accuracy and tell the user.

## Tier 2: Numeric caps and jurisdiction

### Caps

| Cap | Limit | Applies to |
|---|---|---|
| Procedural sentence | 20 words | instructions, steps, commands |
| Descriptive sentence | 25 words | explanations, reference prose |
| Paragraph | 6 sentences | descriptive text |
| Noun cluster | 3 nouns | all prose in scope |
| Em dashes | 0 | all prose in scope |

Break a noun cluster of more than 3 nouns with prepositions. Change "runway
light approach system control panel" to "the control panel of the approach
system for the runway lights".

Measure with `scripts/ste100/metrics.sh`. It reports `long_lines_20`,
`long_lines_25`, `em_dashes`, and `noun_cluster_gt3`.

### Jurisdiction

This standard governs INSTRUCTIONAL AND REFERENCE PROSE. It does not govern
RUNTIME-GENERATED USER-FACING OUTPUT.

| Surface | The file that wins |
|---|---|
| `agents/**` bodies and agent `resources/` | this standard |
| `.claude/rules/**` | this standard |
| `.claude/skills/**` | this standard |
| Code comments in `.claude/hooks/**` and `tests/**` | this standard |
| `docs/**`, `CLAUDE.md`, `README.md` | this standard |
| Text an agent writes for a user at run time | `.claude/rules/quality/anti-slop.md` |
| Creative copy, marketing copy, chat replies | `.claude/rules/quality/anti-slop.md` |

`.claude/rules/quality/anti-slop.md` wins on every runtime output surface. This
standard wins on every repository file that the table lists.

### The em dash rule is not a conflict

`.claude/rules/quality/anti-slop.md` section P3 protects the em dash. It does so
for generated output, where a count of 0 em dashes is a signal of AI authorship.
This standard bans the em dash in instructional prose. Both rules are correct,
because they govern different surfaces.

A repository file takes 0 em dashes. A reply that an agent writes for a user
keeps its em dashes. Do not apply one rule to the other surface.

The same split applies to short prose. Where a request for "tight" or "limited"
text meets M6, M6 wins. Keep all articles.

## Tier 3: The substitution table

The table of banned words and approved words is a separate file. Read it when
you rewrite text. Do not load it for every edit.

@.claude/rules/quality/resources/ste100-word-choices.md

## Quick check before you save

- [ ] Each procedural sentence has 20 words or less.
- [ ] Each descriptive sentence has 25 words or less.
- [ ] Each paragraph has 6 sentences or less.
- [ ] No noun cluster has more than 3 nouns.
- [ ] The file has 0 em dashes.
- [ ] Each article is in place. No word was deleted to make the text short.
- [ ] Each instruction is in the imperative and in the active voice.
- [ ] Each banned word has its approved replacement.
- [ ] Each technical name, path, number, and code sample did not change.
