# Detection Categories

The full per-category pattern definitions for `detect` mode: 14 categories, 5 cross-category signals, named composite patterns, genre calibration, and false-positive guidance. Distilled from the pre-v12.6 `ai-writing-detector` reference.

This file maps its categories back onto the six rules in `.claude/rules/quality/anti-slop.md`, which is the single canonical tell registry. Categories here are diagnostic *detection* patterns; anti-slop rules are the *fix* contract. When the two disagree, `anti-slop.md` wins.

## Scoring

- Per-category score: 0.0 (human) to 1.0 (AI), weighted sum normalized across categories + cross-signals.
- **Verdicts**: `low_ai_likelihood` (< 0.3) · `moderate_ai_likelihood` (0.3–0.6) · `high_ai_likelihood` (> 0.6).
- **No single indicator is conclusive.** The signal lives in convergence across categories, not one flagged word. Calibrate for genre/audience before classifying.
- Every finding carries a line number and matched text. Confidence reflects real pattern strength, never inflated certainty.

## The 14 Categories

### 1. Vocabulary Tells (weight 0.04, signal: low)

AI-favored token clusters: delve, tapestry, multifaceted, nuanced, landscape, pivotal, testament, resilience, paradigm, cornerstone, realm, myriad, plethora, intricate, underscore, illuminate, foster, harness.
**Flag rule**: 3+ in one paragraph OR density > 5 per 1000 words. Individual use is normal English.

- **Significance inflation** (density > 3/1000): "pivotal moment," "testament to," "transformative shift," "cannot be overstated," "groundbreaking," "watershed moment."
- **Promotional language** (3+ clustered in non-marketing text): "vibrant," "nestled," "breathtaking," "world-class," "cutting-edge," "state-of-the-art," "bustling."
- **False positive**: academic, political, and marketing prose use these legitimately. Flag the cluster, not the word.
- **anti-slop map**: Rule 5 (jargon), Rule 4 (specificity over inflation).

### 2. Analytical/Academic Language (weight 0.08, signal: medium)

- **Formal connectives**: furthermore, moreover, consequently, thereby, wherein, notwithstanding. Human density 1–2/1000; AI density 5+/1000.
- **Domain-inappropriate jargon**: "utilize" in a blog, "operationalize" outside management writing. The word's *contextual fit* is the signal.
- **Clause stacking**: 3+ subordinate clauses where grammatical complexity exceeds conceptual complexity (avg > 2.5 clauses/sentence).
- **Composite — Technical Jargon**: clause count > 2.5 + jargon > 5/1000 + advanced vocab > 8/1000 co-occurring.
- **anti-slop map**: Rule 5 (plain language).

### 3. Punctuation/Style Tics (weight 0.08, signal: medium)

- Em dash overuse (> 2 per 500 words), 100%-consistent Oxford commas, semicolon absence, zero creative punctuation (no fragments/ellipses), colon-then-list ("Here are the key points:").
- **Boldface/emoji overuse**: bolded words > 5% of total, or any emoji in formal/semi-formal text; formatting used as an emphasis crutch instead of prose.
- **False positive**: technical docs bold function names; chat/marketing use emoji intentionally.
- **anti-slop map**: Rule 6 (trust the reader).

### 4. Structural Patterns (weight 0.12, signal: strong)

Formulaic headers ("Introduction/Key Takeaways/Conclusion"), list-to-prose ratio > 40%, three-point-pattern reflex, conclusion inflation (long repetitive summaries), paragraph-length uniformity (all within 20% of average), mid-essay bullets where prose is natural.
**anti-slop map**: P0 section-ending resolution, P1 essay coda.

### 5. AI Phrases (weight 0.06, signal: medium)

"It's important to note," "it's worth mentioning," "in today's rapidly evolving landscape," "plays a crucial role in," "at the heart of," "serves as a powerful reminder." Flag 5+ per 1000 words. Sub-signals:

- **Copula avoidance** (3+/1000): "serves as," "stands as," "acts as," "functions as," "represents a" — systematic avoidance of "is/are."
- **Knowledge-cutoff disclaimers** (flag ANY): "as of my last update," "I don't have access to real-time data," "based on my training." Conclusive AI provenance outside quoted dialogue.
- **Superficial -ing analyses** (3+/1000): "highlighting the importance of," "underscoring the significance of," "demonstrating the value of" — gestures at analysis without performing it.
- **False ranges** (2+/1000): "from sustainability to innovation," "from theory to practice" — rhetorical "from X to Y" that denotes no real range. Numerical/temporal ranges are fine.
- **anti-slop map**: Rule 1 (filler), Rule 6 (hedging).

### 6. Transitions (weight 0.06, signal: weak)

- **Performative navigation**: "Let's dive in," "Let's explore," "Moving on to," "Having established," "With that in mind" — narrating structure instead of advancing the argument.
- **Mechanical bridges**: "In light of the fact that," "With regard to," "For the purpose of"; 3+ paragraphs opening with the same subordinate-clause pattern ("While X…," "Although Y…," "Given that Z…").
- **anti-slop map**: P1 "which meant" cause-effect opener, Rule 1.

### 7. Qualifiers & Softening (weight 0.06, signal: weak)

"It's worth noting," "while this may vary," "to some extent," "one could argue," "generally speaking," "of course," "needless to say," over-explaining the obvious. Hedging genuine uncertainty is fine; hedging facts is a tell.
**anti-slop map**: Rule 6 (banned hedging), B9 (hedging boilerplate).

### 8. Tone/Voice (weight 0.12, signal: strong)

Diplomatic evasion (never a strong position), impersonal authority ("research suggests," "experts agree" unnamed), formality uniformity, absence of humor/wit, excessive both-sides balance, relentless optimism.

- **Vague attributions** (3+ without specific sourcing): "experts argue," "many believe," "studies show," "scholars note." Journalism may lead with "experts say" before naming — check the next 1–2 sentences.
- **anti-slop map**: Rule 2 (false agency), Rule 4 (specificity), P0 voice bleed.

### 9. Creativity Deficit (weight 0.12, signal: strong)

Generic cliché metaphors, low proper-noun density (< 0.5/1000), generic names (Emily/Sarah/Alex not Kenji/Olamide), ornamental vocab ("myriad of," "plethora of"), emotional flatness, zero colloquialisms.

- **Composite — Lacks Creativity**: high abstraction + zero literary devices + predictable adjective-noun pairings + low proper nouns + zero cultural references (3+ co-occurring).
- **Composite — Rich Yet Shallow**: lexical diversity (TTR > 0.70) + low emotion words (< 2/1000) + zero colloquialisms + ornamental vocab (2+ co-occurring).
- **Synonym cycling** (4+ synonyms for one referent within 500 words): "the framework"/"the system"/"the platform"/"the solution." Distinguishing genuinely different things is not cycling.
- **anti-slop map**: Rule 4 (specificity), Rule 5.

### 10. Mechanical Writing (weight 0.12, signal: strong)

- **Sentence uniformity**: length variance within 20% of average. Humans vary wildly — 3-word fragments beside 40-word constructions.
- **Grammar perfection**: zero fragments, zero "And/But" openers, zero comma splices across 1000+ words.
- **Zero thought markers**: no "actually," no self-corrections, no filler across 2000+ words.
- **Predictable syntax**: > 85% declarative, no rhetorical questions, < 10% non-standard openers.
- **Composites**: Predictable Rhythm; Lacks Creative Grammar; **Perfect Grammar + Zero Thought Markers** (one of the strongest single signals).
- **anti-slop map**: Rule 3 (active voice), positive-signals protection in anti-slop.md P3.

### 11. Repetitive Phrasing (weight 0.08, signal: medium)

"Not only…but also" overuse, semantic redundancy in adjacent sentences, echo phrasing (paragraph ends on a variant of its opening), parallel-structure overuse, conclusion-body verbatim overlap.
**anti-slop map**: B7 (tricolon/anaphora clusters), P1 thesis recursion.

### 12. Speculative Focus (weight 0.06, signal: weak)

Hedging words (might, could potentially, perhaps, arguably), vague future ("time will tell," "remains to be seen"), > 30% future-oriented sentences ("has the potential to," "is poised to"), conditional chains ("if implemented correctly… if leveraged properly…").
**anti-slop map**: Rule 4, Rule 6.

### 13. Conflicting Subtext (weight 0.10, signal: strong)

Backhanded praise ("while impressive, this falls short"), tone-content mismatch, compliment-criticism sandwiches where the reader cannot locate the author's position, adjacent contradiction.
**anti-slop map**: Rule 4 (state the actual assessment), B4 ("it's not X, it's Y").

### 14. Detached Warmth (weight 0.06, signal: medium)

Performative empathy ("understandably," "it makes sense that," "and that's okay"), false intimacy ("we all know," "as we can all agree"), hollow encouragement ("keep pushing forward," "you've got this"), generic warm closings.

- **Chatbot artifacts** (flag ANY outside quoted dialogue): "I hope this helps!," "Let me know if you need anything," "Great question!," "Let me walk you through," "Does that make sense?" Direct conversational-fine-tuning leakage.
- **anti-slop map**: Rule 1, Rule 6.

## The 5 Cross-Category Signals

Strongest diagnostic evidence — measured across the whole document, not per line.

| Signal | Weight | What it measures | AI threshold | Human range |
|--------|-------:|------------------|--------------|-------------|
| **Perplexity** | 0.08 | Token-level predictability (vocab surprise, n-gram novelty, transition unpredictability) | < 0.30 | 0.40–0.70 |
| **Burstiness** | 0.08 | Variance in complexity across sections (FK variance, perplexity stdev) | < 0.25 | 0.40–0.70 (> 0.50 strong human) |
| **LIX Variance** | 0.06 | Readability spread across sections (stdev) | low | stdev > 8.0 |
| **Linear Argumentation** | — | Absence of counter-arguments, self-corrections, questions | zero deviations | present |
| **Analogy Originality** | — | Cliché-pool metaphors vs. idiosyncratic comparisons | all-cliché | idiosyncratic |

**Named composite** — *Low Perplexity + Low Burstiness*: uniform, predictable prose with no complexity variation. The single most reliable statistical fingerprint of generation.

## Detection Workflow

1. **Ingest** — read the document, compute baseline metrics (word/sentence/paragraph counts, TTR, averages).
2. **Profile** — load sensitivity (default medium), check for genre calibration needs.
3. **Scan** — run all 14 categories with per-finding location tracking (line, matched text, pattern name).
4. **Cross-analyze** — compute the 5 cross-signals; check named composites.
5. **Score** — weighted normalized sum → overall verdict.
6. **Report** — write `detection_report.yaml`.

## Genre Calibration

Genre, audience, and author background shift every threshold. Detection without calibration is accusation without evidence.

| Genre | Loosen | Tighten |
|-------|--------|---------|
| **Academic** | formal connectives, jargon, clause stacking, structural headers | still flag linear argumentation, zero counter-arguments |
| **Technical docs** | lists, structure, bold function names, copula in specs | AI phrases, uniform complexity, unnecessary hedging |
| **Marketing** | promotional vocab, significance emphasis, emoji | vague attributions, generic metaphors |
| **Journalism** | "experts say" leads (if named soon after) | diplomatic evasion, generic names, vague future |
| **ESL authors** | burstiness/perplexity profiles differ | do not treat non-native rhythm as an AI signal |

## False-Positive Discipline

- **Absence of imperfection is itself a signal** — perfect grammar across 2000 words with zero self-corrections is machine, not excellence.
- **Measure variation, not level** — ask "how much does formality vary?" not "how formal is this?" AI writes at a constant register.
- Never flag AI on one vocabulary word (single-signal conclusion).
- Never apply blog thresholds to academic papers (genre-blind detection).
- Never report 0.95 confidence on a medium-strength pattern (confidence inflation).
- Flag mixed-authorship boundaries rather than scoring the whole document as one voice.
