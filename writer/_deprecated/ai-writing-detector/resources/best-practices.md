# Best Practices: AI Writing Detector

> Design principles, patterns, and frameworks that guide high-quality AI writing detection and text authenticity analysis work.

## Design Principles

- **Evidence Over Intuition**: Every detection claim must cite specific patterns in the text — quoted passages, identified structures, measurable frequencies — never vague impressions.
- **Convergence Across Categories**: Single-category signals are weak; genuine AI text shows convergence across multiple pattern categories simultaneously. Triangulate before concluding.
- **Calibrate for Context**: Academic writing, technical documentation, and marketing copy have different baseline characteristics. Apply genre-appropriate calibration to avoid false positives.
- **Distinguish Markers from Proof**: Detection reports identify probability and pattern clusters, not certainty. Language about likelihood is more honest and defensible than language about fact.
- **Preserve Analytical Distance**: Do not frame AI text as inherently inferior or deceptive; the goal is identification, not moral judgment.
- **Report Actionably**: Detection reports must tell a reader not just what was found but where, at what confidence, and what the implications are for their specific use case.
- **Separate Structural from Stylistic**: Structural AI markers (paragraph cadence, sentence length uniformity) are distinct from stylistic markers (word choice, hedging). Track both separately.

## Key Patterns & Frameworks

- **14-Category Forensic Framework**: Systematic analysis across vocabulary uniformity, sentence complexity variance, paragraph cadence, hedging frequency, transitional phrase patterns, emotional flatness, specificity deficits, factual hallucination signatures, structural predictability, register consistency, idiomatic naturalness, metaphor originality, perspective stability, and temporal coherence.
- **Cross-Category Signal Analysis**: Five meta-signals that emerge when multiple categories co-occur: mechanical competence (high quality, low surprise), uniform elevation (consistently formal), subject avoidance (systematic evasion of specifics), omnidirectional hedging (hedges regardless of certainty), and uncanny smoothness (no rough edges, no personality).
- **Burstiness Scoring**: Human writing shows irregular sentence length distribution (high burstiness); AI text tends toward normalized distributions. Measure standard deviation of sentence lengths across passages.
- **Perplexity Proxy Analysis**: Evaluate how predictable word choices are given surrounding context — AI text favors high-probability completions, human writing introduces lexical surprises.
- **False Positive Taxonomy**: Catalog known false positive triggers by genre (legal writing, academic abstracts, corporate communications) and adjust confidence thresholds accordingly.
- **Confidence Tiering**: Report findings at four confidence levels — Strong (3+ converging categories), Moderate (2 categories), Weak (1 category, ambiguous), Inconclusive — to avoid binary misrepresentation.
- **Passage-Level vs. Document-Level Analysis**: Some AI signals are distributed globally (document-level); others cluster in specific passages. Map both for a complete picture.
- **Baseline Comparison Method**: When possible, compare the target text against known human samples from the same author or genre to establish a personal/genre baseline before applying general AI markers.

## Domain Concepts & Terminology

### Pattern Categories
- **Vocabulary Uniformity**: Tendency to use a narrow, consistent set of high-frequency words without the idiosyncratic lexical choices that characterize individual voice
- **Sentence Complexity Variance**: The degree of variation in syntactic complexity across consecutive sentences; AI text often shows low variance
- **Hedging Frequency**: Overuse of epistemic hedges ("it is worth noting," "it may be said") regardless of the certainty of the claim
- **Transitional Phrase Patterns**: Formulaic connectives ("Furthermore," "In conclusion," "It is important to note") that appear at predictable intervals
- **Specificity Deficits**: Reliance on general statements where human writers would cite concrete examples, names, dates, or particulars

### Statistical Signals
- **Burstiness**: Statistical measure of sentence length irregularity; high burstiness suggests human writing
- **Perplexity**: Measure of how surprising word choices are given context; low perplexity suggests AI generation
- **Type-Token Ratio (TTR)**: Ratio of unique words to total words; low TTR may indicate limited vocabulary range
- **Syntactic Fingerprint**: The characteristic distribution of clause types, modifier placement, and sentence structures unique to a writer

### Authenticity Markers
- **Lived Specificity**: References to concrete sensory, personal, or contextual details that would require actual experience or research
- **Voice Inconsistency**: Natural human writing contains micro-inconsistencies in register, formality, and vocabulary that AI text lacks
- **Emotional Particularity**: Human emotional expression is specific and often contradictory; AI emotional expression tends to be smooth and appropriate
- **Idiomatic Naturalness**: Idiomatic phrases used in non-standard ways, regional expressions, or personal coinages that diverge from training data norms

### Report Terminology
- **Detection Confidence Score**: Aggregate probability estimate (0–100%) of AI generation, derived from category analysis
- **Category Convergence Count**: Number of detection categories showing positive signals; higher convergence = higher confidence
- **Flagged Passages**: Specific text excerpts identified as containing the highest concentration of AI markers
- **Calibration Adjustment**: Modification to baseline thresholds applied for genre, audience, or style context

## Anti-Patterns to Avoid

- **Single-Signal Verdicts**: Concluding AI authorship based on one detected pattern invites false positives; always require category convergence.
- **Genre-Blind Analysis**: Applying fiction detection thresholds to academic or legal writing produces meaningless results; calibrate for context first.
- **Binary Reporting**: Labeling text as simply "AI" or "human" obscures the gradient reality; use confidence ranges and evidence summaries.
- **Cherry-Picking Flagged Passages**: Selecting only the most suspicious passages for the report while ignoring contrary evidence misrepresents the overall document.
- **Treating Detection as Punishment**: Framing the detection report as accusatory rather than analytical damages trust and may be legally or ethically problematic in professional contexts.
- **Ignoring Human-AI Collaboration**: Edited AI text, AI-assisted drafts, and human-polished AI output exist on a continuum; detection must acknowledge hybrid authorship scenarios.
- **Overconfidence Without Baseline**: Claiming high confidence without genre-specific calibration or comparative baseline data is epistemically dishonest.

## Quality Indicators

- **Category Coverage**: Analysis addresses all 14 pattern categories, even if most return negative signals
- **Passage Citation Density**: Flagged claims are supported by direct textual evidence with quotes and locations
- **Confidence Granularity**: Report uses four-tier confidence scale, not binary verdicts
- **Genre Calibration Note**: Report explicitly states which calibration profile was applied and why
- **Actionability**: Report concludes with specific implications for the requester's use case (publishing, academic, legal, etc.)
- **Negative Evidence Inclusion**: Report notes which categories showed no AI signals, demonstrating comprehensive analysis
- **Revision Sensitivity**: For edited AI text, report distinguishes between residual AI patterns and humanized passages

## Collaboration Touchpoints

- **With AI Writing Rewriter**: Detector output feeds directly into rewriter's targeted humanization work; detection_report.yaml must specify exact passages and pattern types for efficient rewriting
- **With Copy Editor**: Copy editor may encounter suspected AI text during grammar/style review; detector provides the systematic analysis that copy editor's intuition flags but cannot formally document
- **With Sensitivity Reader**: AI-generated content about marginalized communities raises authenticity concerns beyond pattern detection; sensitivity reader evaluates whether detected AI text contains problematic generalizations typical of training data biases
- **With Literary Critic**: Literary critic may commission detector analysis when evaluating voice authenticity in manuscript submissions; detection report informs critical assessment of authorial presence
