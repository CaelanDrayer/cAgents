# Rewrite Strategies

The full 4-pass humanization methodology for `rewrite` mode: per-category transformations, before/after examples, the 9-technique Human Fingerprint Toolkit, the 10 humanizer sub-signal fixes, register/persona guidance, and the 6-step self-audit. Distilled from the pre-v12.6 `ai-writing-rewriter` reference.

Rewrite is **restoration, not decoration**. Every change replaces an AI pattern with genuine human texture — never a different arrangement of generic words. Preserve the author, not a new AI: keep meaning, tone, facts, dates, and technical details exactly. The fixes here implement the six rules in `.claude/rules/quality/anti-slop.md` (the canonical registry); when they disagree, `anti-slop.md` wins.

**Targets driving all passes**: perplexity > 0.45 · burstiness > 0.50 · LIX stdev > 8.0. Apply at least 5 of the 9 Human Fingerprint techniques per rewrite.

## Pass 1 — Structural

Fix Categories 4 (structure), 6 (transitions), and the P0 section-ending-resolution / P1 essay-coda tells.

- **De-listify** lists doing the work of argument or narration (keep spec tables, step lists, data). *Benefits: - flexibility - reduced commute - work-life balance* → "Remote work gives people their commute back — two hours a day in most cities. The real shift is in hiring: a company in Boise can now recruit from Berlin."
- **Break linear argumentation** — lead with a question or conclusion, introduce a counter-argument, correct mid-thought. Perfectly linear "Research shows X. Studies prove Y. Therefore Z." reads as machine reasoning.
- **Kill performative transitions** — delete "Having established… let's now turn our attention to…"; start the next paragraph with no transition at all, or a plain "So what does this look like in practice?"
- **Shorten conclusions** — replace the long repetitive summary with one or two sentences. "The pattern is clear: plan the migration or plan to recover from it. There is no third option."
- **Strip formatting crutches** — remove bold from "key terms," remove structural emoji (✅🚀), remove false ranges.
- **Vary paragraph length** — break the 20%-of-average uniformity.

## Pass 2 — Sentence-level variation

Fix Category 10 (mechanical writing). Drive burstiness up.

- **Breath points** — insert 3–7 word sentences between dense passages. "Each step can fail. And each failure looks different."
- **Fragment injection** for emphasis/contradiction only: "Not always." / "Every single time." Never "Indeed." / "Quite." (an AI trying to sound human).
- **Creative grammar** — parenthetical asides "(well, most caching — edge cases are another story)"; dash interruptions; sentence inversions "Rarely does a single decision cascade this far"; visible self-corrections "The database handles — actually, let me rephrase. The database survives about ten thousand connections."
- **Contractions and "And/But" openers** throughout.
- **Thought markers** where humans naturally produce them (start of a hard explanation, topic shifts, caveats): "actually," "the thing is," "honestly," "wait."
- **Register-matched informalities** — 0 in a legal brief, 2–3 per 1000 words in a blog (comma splice, preposition-ending, split infinitive).

## Pass 3 — Word-level specificity

Fix Categories 1, 5, 9. This is the heart of humanization: replace abstraction with anchored detail.

- **Replace AI vocab clusters only when density warrants**: "delve into the nuanced tapestry" → "look at the details"; "testament to the resilience of" → "shows how stubborn"; "operationalize this methodology" → "put this into practice."
- **Concrete over abstract**: "the bustling city was full of quiet determination" → "Portland hummed with the stubborn energy of people who bike in the rain"; "significant improvement" → "42% faster, about 6 hours a week per analyst."
- **Calibrate hedging**: cut it on facts ("it's worth noting that water boils at 100C" → "water boils at 100C"); keep it on genuine uncertainty ("the effect size may vary across populations").

### The 10 humanizer sub-signal fixes

| # | Tell | Fix |
|---|------|-----|
| 1 | Copula avoidance | Restore direct is/are. "serves as the primary interface" → "is where you check system health." |
| 2 | Chatbot artifacts | Delete without replacement. "I hope this helps! Let me know if…" → cut entirely; restructure surrounding text. |
| 3 | Knowledge-cutoff disclaimers | Delete and state facts directly, or cite a specific date/source. |
| 4 | Significance inflation | Strip "pivotal/transformative/groundbreaking"; substitute a concrete metric. "3x faster than the previous version." |
| 5 | Promotional language | Replace each brochure adjective with a specific detail. "world-class dining" → "a ramen shop that got a Michelin nod." |
| 6 | Vague attributions | Cite the source or drop the appeal. "research suggests" → "Stanford's 2022 study of 16,000 workers found 13%." |
| 7 | Superficial -ing analyses | Replace the gesture with real cause/consequence. "underscoring the importance of X" → "X matters because costs dropped 30% in Q2." |
| 8 | False ranges | Rewrite rhetorical "from X to Y" as a direct list; keep genuine numeric ranges. |
| 9 | Synonym cycling | Pick one term, repeat it, use pronouns for variety. Human writers repeat words. |
| 10 | Boldface/emoji overuse | Emphasize through sentence structure and word position; remove structural emoji. |

## Pass 4 — Voice alignment & coherence

Fix Categories 8, 13. Confirm no new AI patterns and hit the perplexity/burstiness/LIX targets.

- **Subtext repair** — choose clarity over diplomacy. "While the team's effort was commendable, the results speak for themselves" → "The team worked hard. The results fell short of what we needed."
- **Verify a unified voice** — one person's cadence and vocabulary from start to finish; no register drift into policy-paper vocabulary.
- **Flag author-judgment passages** — mark subjective calls for human review rather than inventing an opinion.

## Human Fingerprint Toolkit (9 techniques — apply ≥ 5)

1. **Thinking out loud** — process ideas in real time. "Okay, a few ways to do this. Caching's the obvious one — then you hit invalidation and you're solving a harder problem than the original. What about read replicas? That's… actually not terrible."
2. **Register mixing** — shift formal↔informal within a passage. "Under sustained load, throughput tripled. We kept pushing and it just… kept going."
3. **Self-correction / contradiction** — "Microservices are supposed to help with maintainability — and they can, if you get boundaries right. But I've seen plenty of 'distributed monoliths with more network calls.'"
4. **Conversational asides** — register-matched: "(the edge cases are another story)" / "(and honestly, who hasn't been there)."
5. **Specific detail anchoring** — "various industries" → "logistics in Rotterdam, fintech in Singapore, a government agency in DC."
6. **Dramatic length variation** — a fragment beside a 40-word sentence.
7. **Sentence-starter quirks** — "So," "Look," "Here's what's interesting," rhetorical questions answered immediately.
8. **Minor grammatical imperfections** — placed where humans produce them, matched to register.
9. **Register-appropriate personal/specific examples** — a named, numbered, or sensory instance instead of a generic claim.

## Register-Specific Guidance

- **Academic** — preserve formal vocab; fix structural monotony, linear argumentation, missing counter-arguments. Do NOT add colloquialisms, humor, or fragments.
- **Blog/casual** — max personality: humor, opinions, fragments, 2–3 informalities/1000 words. Fix diplomatic evasion, performative transitions, generic metaphors.
- **Technical docs** — accuracy above all; keep useful lists/tables. Fix sentence variety, qualifier density, add concrete examples. Do NOT add humor to API docs.
- **Journalism** — strong voice, definitive assertions, specific sourcing, punchy ledes. Fix diplomatic evasion, vague future, generic names.
- **Creative fiction** — max burstiness/perplexity/voice; original metaphors, character-specific vocabulary. Fix emotional flatness, generic names, ornamental vocab.

## Persona Adaptation

Identify 3–5 characteristic patterns and apply them consistently but not constantly (real people are inconsistent).

- *Cynical journalist*: punchy ledes, source attributions, skeptical framing ("the company claims"), dry observations, metric-heavy.
- *Forgetful academic*: parenthetical asides longer than the main sentence, self-corrections ("or rather, to be precise…"), trailing thoughts, casual connectors before precise terms.

**Persona vs. voice profile**: when both are supplied, the voice profile controls quantitative features (sentence-length distribution, contraction frequency) and the persona controls qualitative features (humor, opinion strength, quirks). On conflict, the measured voice profile wins.

## The 6-Step Self-Audit (mandatory before reporting)

Run all six after Pass 4; record results in `rewrite_summary.yaml`.

1. **Meaning & facts intact** — no names, dates, statistics, or technical details altered.
2. **Voice consistency** — a single believable person wrote the whole document; no register drift.
3. **Burstiness real** — complexity genuinely varies (≥ 3 sentences under 6 words and ≥ 2 over 35 words per 1000).
4. **Perplexity / LIX** — genuine word-choice surprise; LIX stdev > 8.0 across sections.
5. **No new AI patterns** — the rewrite did not introduce fresh tells (re-scan target < 0.3).
6. **Fingerprints + flags** — ≥ 5 of 9 toolkit techniques applied; ≥ 1 register shift per 500 words; ≥ 1 visible self-correction per 1000 words; author-review flags present for subjective passages.

Any failed step → revise that passage before finalizing. When the detect stage returned `low_ai_likelihood` with no high-severity findings, record a skip-rewrite decision instead of forcing changes.

## Anti-Patterns

- **Overcorrection** — making formal text casual (or vice versa). Match the original register.
- **Random imperfection** — sprinkling errors instead of placing them where humans naturally produce them.
- **Fact alteration** — never change names, dates, statistics, or technical details during humanization.
- **Beige-wall removal** — stripping patterns without adding voice yields competent emptiness. Add the human fingerprint, don't just delete the AI one.
