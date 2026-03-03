# Detection Categories: Detailed Pattern Definitions

Deep reference for all 14 detection categories, cross-category signals, and named composite patterns.

## Category 1: Vocabulary Tells (Weight: 0.04)

AI language models have token frequency biases -- certain words appear disproportionately in generated text because they are high-probability completions in instruction-tuned models.

**Common AI-favored words**: delve, tapestry, multifaceted, nuanced, landscape, pivotal, testament, resilience, paradigm, synergy, cornerstone, underpinning, realm, myriad, plethora, intricate, encompass, underscore, illuminate, forge

**Flagging rules**: Only flag when 3+ appear in a single paragraph OR density exceeds 5 per 1000 words across the document. Individual occurrences are normal English.

**Why this works**: Instruction-tuned models repeatedly select these tokens because they score highly in the "helpful, elaborate response" distribution. Human writers have personal vocabulary biases, but they differ per person. AI vocabulary biases are consistent across generations.

**False positive watch**: Academic writers legitimately use "paradigm", "nuanced", "multifaceted." Flag the cluster, not the individual word.

## Category 2: Analytical/Academic Language (Weight: 0.08)

Three sub-signals: formal connective density, domain-inappropriate jargon, and complex clause stacking.

**Formal connectives**: furthermore, moreover, consequently, subsequently, thereby, wherein, hitherto, notwithstanding. Normal academic density: 1-2 per 1000 words. AI density: 5+ per 1000 words.

**Domain-inappropriate jargon**: "utilize" in a blog post, "facilitate" in casual prose, "operationalize" outside management literature. The word itself is not the signal -- its *contextual appropriateness* is.

**Complex clause stacking**: Sentences with 3+ subordinate clauses where the grammatical complexity exceeds the conceptual complexity. Average clause count above 2.5 per sentence is a flag.

**The Technical Jargon composite pattern** fires when all three co-occur: complex structures (avg clause count > 2.5) + jargon density (> 5/1000) + advanced vocabulary density (> 8/1000). This signals AI using grammatical complexity as a vehicle for generic information.

## Category 3: Punctuation/Style Tics (Weight: 0.08)

AI has consistent punctuation habits that diverge from human variation:

- **Em dash overuse**: > 2 per 500 words. AI loves the em dash as a parenthetical device
- **Perfect Oxford commas**: 100% consistent usage. Most human writers are inconsistent
- **Semicolon absence**: AI rarely uses semicolons. Human writers who use em dashes typically also use semicolons
- **Zero creative punctuation**: No fragments, no ellipses, no unconventional uses. The punctuation is "correct" but lifeless
- **Colon-list patterns**: "Here are the key points:" followed by a list. AI's favorite structural move

**Why punctuation matters**: Punctuation is deeply personal. A writer's punctuation habits are almost as distinctive as their vocabulary. AI's punctuation is grammatically perfect but characterless.

## Category 4: Structural Patterns (Weight: 0.12)

AI imposes template structure regardless of content:

- **Formulaic headers**: "Introduction," "Key Takeaways," "Conclusion" -- templates, not organic structure
- **List-to-prose ratio**: > 40% content in bulleted/numbered lists signals generation. Humans default to prose
- **Three-point pattern**: Everything in groups of three. AI finds three-point structure irresistible
- **Conclusion inflation**: AI conclusions are long, repetitive summaries. Human conclusions are typically brief or surprising
- **Paragraph length uniformity**: If all paragraphs are within 20% of the average length, the variation is too low for human writing
- **Mid-essay bullets**: Bullet lists appearing where flowing prose would be natural

## Category 5: AI Phrases (Weight: 0.06)

Characteristic phrasings that appear frequently in AI output:

"It's important to note," "it's worth mentioning," "this comprehensive exploration," "in today's rapidly evolving landscape," "a testament to," "the intricate tapestry of," "plays a crucial role in," "has the potential to revolutionize," "at the heart of," "serves as a powerful reminder"

Flag when 5+ appear per 1000 words. These phrases are AI's equivalent of verbal tics -- high-probability completions that fill space without adding meaning.

## Category 6: Transitions (Weight: 0.06)

Two sub-signals: performative navigation and mechanical subordinate-clause bridges.

**Performative navigation**: "Let's dive in," "Let's explore," "Moving on to," "Having established." These phrases narrate the document's structure rather than advancing the argument. Human writers just start the next point.

**Mechanical bridges**: "In light of the fact that," "In consideration of," "With regard to." Also: 3+ paragraphs opening with the same subordinate-clause pattern ("While X...", "Although Y...", "Given that Z...").

## Category 7: Qualifiers & Softening (Weight: 0.06)

AI hedges reflexively, even on straightforward claims:

"It's worth noting that," "it's important to remember," "while this may vary," "to some extent," "one could argue," "generally speaking." Also: over-explaining obvious statements and unnecessary "of course" insertions.

**Distinguishing genuine uncertainty from reflexive hedging**: Hedging on genuinely uncertain claims ("the effect size may vary across populations") is appropriate. Hedging on facts ("it's worth noting that water boils at 100C") is an AI tell.

## Category 8: Tone/Voice (Weight: 0.12)

The absence of personality is the signal:

- **Diplomatic evasion**: Never taking a strong position. Balanced to the point of saying nothing
- **Impersonal authority**: "Research suggests," "experts agree" without naming research or experts
- **Formality uniformity**: No tonal variation across sections. Same register beginning to end
- **Absence of humor**: No wit, sarcasm, irony, or playful register shifts
- **Excessive balance**: "On one hand...on the other hand" in every section
- **Overly positive tone**: Relentless optimism without criticism or skepticism

## Category 9: Creativity Deficit (Weight: 0.12)

The most diagnostic category for creative and analytical writing:

- **Generic metaphors**: From the common cliche pool. No surprising comparisons
- **Low proper noun density**: AI avoids real names, places, brands (< 0.5 per 1000 words)
- **Generic names**: If names appear, they are Emily, Sarah, Alex, James -- not Kenji, Olamide, or Ramona
- **Ornamental vocabulary**: "myriad of," "plethora of," "constellation of" -- impressive-sounding but imprecise
- **Emotional flatness**: Sophisticated vocabulary with no joy, frustration, surprise, or anger expressed
- **Zero spontaneous language**: No colloquialisms, no informal interjections, no visceral reactions

**Named patterns**:
- **Lacks Creativity**: High abstraction + zero literary devices + predictable adjective-noun pairings + low proper nouns + zero cultural references (3+ co-occurring)
- **Rich Yet Shallow**: High lexical diversity (TTR > 0.70) + low emotional words (< 2/1000) + zero colloquialisms + ornamental vocabulary (2+ co-occurring)

## Category 10: Mechanical Writing (Weight: 0.12)

The most complex category, with multiple sub-signals:

**Sentence uniformity**: Length variance within 20% of average. Human sentences vary wildly -- 3-word fragments next to 40-word constructions.

**Grammar perfection**: Zero fragments, zero "And"/"But" openers, zero split infinitives, zero comma splices across 1000+ words. Humans who write well still leave grammatical fingerprints.

**Zero thought markers**: No hesitation ("actually," "sort of"), no self-corrections ("wait, that's not right"), no filler words, no mid-thought pivots. In 2000+ words, their total absence signals generation.

**Predictable syntax**: > 85% declarative sentences, no rhetorical questions, no exclamatory/imperative sentences, fewer than 10% non-standard openers.

**Named patterns**:
- **Predictable Rhythm**: Declarative > 80% + clause variance < 25% + short sentences < 10% + same cadence 3+ times
- **Lacks Creative Grammar**: Perfect grammar (> 0.95) + zero creative deviations (no fragments, no asides, no inversions)
- **Perfect Grammar + Zero Thought Markers**: Grammar > 0.95 AND zero hesitations AND zero self-corrections AND zero informalities. One of the strongest signals

## Category 11: Repetitive Phrasing (Weight: 0.08)

- **"Not only...but also" overuse**: AI loves this construction
- **Semantic redundancy**: Adjacent sentences/paragraphs saying the same thing differently
- **Echo phrasing**: Paragraph ending with a variant of its opening
- **Parallel structure overuse**: Every point in the same grammatical form
- **Conclusion-body overlap**: Conclusion repeating body content nearly verbatim

## Category 12: Speculative Focus (Weight: 0.06)

AI defaults to future-oriented, hypothetical framing:

- **Hedging words**: might, could potentially, may, perhaps, arguably
- **Vague future**: "time will tell," "remains to be seen"
- **Excessive future-orientation**: > 30% future-oriented sentences. "Has the potential to," "could revolutionize," "is poised to"
- **Conditional chains**: "If implemented correctly...if leveraged properly...if harnessed effectively..."

## Category 13: Conflicting Subtext (Weight: 0.10)

Surface meaning contradicts implied meaning -- often unintentionally:

- **Backhanded praise**: "While impressive, this falls short..." -- the qualifier negates the complement
- **Tone-content mismatch**: Enthusiastic language about negative outcomes, or neutral language about important achievements
- **Compliment-criticism sandwiches**: Ambiguous passages where the reader cannot determine the author's actual position
- **Adjacent contradiction**: Consecutive paragraphs implying opposite conclusions

## Category 14: Detached Warmth (Weight: 0.06)

Performative emotional engagement without genuine connection:

- **Performative empathy**: "understandably," "it makes sense that," "and that's okay"
- **False intimacy**: "we all know," "as we can all agree"
- **Hollow encouragement**: "keep pushing forward," "you've got this"
- **Generic warm closings**: Encouraging sign-offs with no specific content
- **Zero personal anecdotes**: No genuine emotional disclosure

## Cross-Category Signals: Deep Dive

### Perplexity (Weight: 0.08)

Perplexity measures how predictable the text is at the token level. AI models select high-probability tokens, producing low perplexity. Humans make unexpected choices -- the slightly odd synonym, the idiomatic expression, the personal vocabulary quirk.

**Measurement**: Vocabulary surprise score (proportion of low-frequency word choices), n-gram novelty (proportion of 3-grams not in common corpora), transition unpredictability (semantic distance variance between consecutive sentences).

**Threshold**: Document perplexity < 0.30 on 0-1 scale flags AI. Human text typically scores 0.40-0.70.

### Burstiness (Weight: 0.08)

Burstiness measures the *variation in complexity* across the document. Humans are "bursty" -- some passages are simple and direct, others are dense and elaborate. AI maintains uniform complexity.

**Measurement**: Sentence complexity variance across 500-word windows, Flesch-Kincaid variance across paragraphs, perplexity standard deviation across document sections.

**Threshold**: Burstiness < 0.25 flags AI. Human text typically scores 0.40-0.70. High burstiness (> 0.50) is a strong human signal.

### LIX Variance (Weight: 0.06)

LIX = (words/sentences) + (long_words * 100 / words), where long_words have 7+ characters.

AI produces moderate, uniform LIX (typically 40-50 across sections). Humans vary: easy introductions (LIX 25-35), complex analysis (LIX 50-60+).

**Threshold**: LIX standard deviation < 5.0 across 3+ sections flags AI.

### The Perplexity-Burstiness Composite

Low perplexity + low burstiness is the single strongest AI signal. Text that is both individually predictable (every word is the obvious next word) and globally uniform (no complexity variation) is almost certainly generated. This combination is rare in human writing because humans naturally produce both surprising individual choices and uneven complexity.

### Linear Argumentation

Every argument follows claim-evidence-conclusion without counter-arguments, self-corrections, or non-linear reasoning. 3+ perfectly linear arguments in a document is a strong AI signal. Even the most structured human thinkers occasionally acknowledge complexity.

### Analogy Originality

Score all metaphors and analogies from 0.0 (all from common cliche pool) to 1.0 (all original). Flag if < 0.20 with analogies present. AI draws from a small pool of "safe" comparisons; human analogies cross domains unexpectedly.

## Scoring and Interpretation

### Score Calculation
1. Raw score 0.0 (human) to 1.0 (AI) per category
2. Normalize weights (divide each by sum of all weights including cross-category)
3. Weighted sum across all categories and cross-category signals
4. Verdict: low (< 0.3), moderate (0.3-0.6), high (> 0.6)

### Confidence Calibration
- Single strong category: moderate confidence at best
- 3+ weak categories converging: higher confidence than 1 strong
- Named composite pattern: high confidence (multiple independent signals)
- Genre-calibrated + composite pattern: highest confidence

### Mixed Authorship Detection
Style-shift boundaries within a document may indicate human/AI mixing. Watch for: sudden formality changes, vocabulary diversity shifts, burstiness discontinuities. Flag these boundaries explicitly in the report.

## Sensitivity Profiles

| Level | Behavior | Use Case |
|-------|----------|----------|
| off | Category skipped | Known false-positive category for this genre |
| low | Only high-confidence, high-severity | Quick scan, minimize false positives |
| medium | Standard thresholds | Default for most documents |
| high | Aggressive, flags borderline | When detection accuracy is critical |

Per-category sensitivity overrides allow fine-tuning for specific genres and contexts.
