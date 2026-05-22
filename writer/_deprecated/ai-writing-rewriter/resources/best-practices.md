# Best Practices: AI Writing Rewriter

> Design principles, patterns, and frameworks that guide high-quality AI writing humanization and voice authenticity transformation work.

## Design Principles

- **Transform, Don't Polish**: The goal is not to improve the AI text but to replace its synthetic markers with genuine human voice characteristics — a fundamentally different operation from editing.
- **Preserve the Payload**: Content, facts, arguments, and structure should survive the rewrite intact; only the voice and texture change.
- **Target What the Detector Found**: Rewriting should be surgical, focused on the specific pattern categories flagged in the detection report rather than wholesale rewriting.
- **Inject Authentic Specificity**: The most effective humanization technique is replacing abstract generalities with concrete particulars — real-sounding details, specific numbers, named examples.
- **Introduce Controlled Irregularity**: Human writing contains purposeful imperfections — em-dash interruptions, sentence fragments, tonal shifts, unexpected word choices. These are features, not bugs.
- **Match the Human Register**: Humanization must target a consistent human register (casual, formal, academic, conversational) rather than randomly mixing registers.
- **Track What Changed**: Maintain a rewrite log that maps each transformation to the detection pattern it addresses, enabling quality verification.

## Key Patterns & Frameworks

- **Voice Injection Protocol**: Five-step process — (1) identify the target human register, (2) audit the detection report for flagged categories, (3) apply category-specific rewrite techniques, (4) introduce burstiness through sentence length variation, (5) add lived specificity in at least 20% of paragraphs.
- **Burstiness Engineering**: Deliberately vary sentence lengths to create the irregular distribution characteristic of human writing. Follow a long complex sentence with a short one. Then a medium one. Then very long, subordinate-heavy, qualification-rich.
- **Specificity Injection**: Replace AI-typical generalizations ("many researchers have found," "studies show") with concrete stand-ins ("a 2019 MIT study of 847 patients," "researchers at Stanford's NLP lab").
- **Hedge Pruning**: Identify and remove or replace formulaic epistemic hedges. Replace "It is worth noting that" with no introduction — just the point. Replace "It may be argued that" with "The argument is" or simply the argument itself.
- **Idiomatic Naturalness Technique**: Introduce idioms, colloquialisms, and non-standard phrase constructions appropriate to the target register and implied author persona.
- **Perspective Anchoring**: Ground abstract passages in a specific perspective — "From a product manager's standpoint," "Standing in the rain outside the conference," — to simulate the situated knowledge of human authors.
- **Rhythmic Disruption**: Break predictable paragraph cadence by inserting one-sentence paragraphs, mid-paragraph pivots, or parenthetical asides at irregular intervals.
- **Emotional Particularity Insertion**: Replace AI's smooth, appropriate emotional language with specific, sometimes contradictory emotional texture that reflects human ambivalence.
- **Transitional Phrase Replacement**: Systematically replace formulaic connectives with varied alternatives or structural reorganization that eliminates the need for the connective entirely.

## Domain Concepts & Terminology

### Humanization Techniques
- **Lived Specificity**: Concrete sensory, experiential, or contextual detail that implies a human perspective — numbers, names, places, times, sensory observations
- **Burstiness Injection**: Deliberate variation of sentence length distribution to produce the statistical signature of human prose
- **Voice Anchoring**: Establishing and maintaining a consistent implied human persona throughout the rewritten text
- **Register Consistency**: The degree to which the rewritten text maintains a coherent formality level appropriate to its context
- **Lexical Surprise**: Unexpected word choices that interrupt the predictability signature of AI-generated text

### AI Pattern Targets
- **Formulaic Hedging**: Epistemic hedges used at AI-typical frequency and placement ("It is important to note," "It is worth mentioning")
- **Uniform Elevation**: AI tendency to maintain a consistent, formal register without the register shifts that characterize human writing
- **Structural Predictability**: Consistent three-point paragraph structure, symmetrical argument organization, and predictable section transitions
- **Mechanical Competence**: High surface quality without personality — correct, smooth, but empty of individual voice
- **Omnidirectional Hedging**: Hedging that occurs even when the claim is certain, a symptom of AI training to express uncertainty

### Quality Metrics
- **Residual AI Score**: Post-rewrite detection confidence score; effective humanization reduces this score significantly
- **Content Preservation Rate**: Percentage of original factual content and argument structure retained through the rewrite
- **Register Coherence**: How consistently the rewritten text maintains its target human register
- **Burstiness Delta**: Change in sentence length standard deviation from pre- to post-rewrite; higher delta indicates more effective humanization
- **Specificity Density**: Number of concrete, specific details per 100 words; higher density signals more authentic human texture

### Rewrite Taxonomy
- **Surface Rewrite**: Vocabulary and phrasing changes only; structure preserved
- **Rhythmic Rewrite**: Sentence-level restructuring to alter length distribution and cadence
- **Structural Rewrite**: Paragraph and section reorganization to break predictable architecture
- **Persona Rewrite**: Full voice transformation targeting an implied human author persona
- **Targeted Rewrite**: Category-specific interventions based on detection report findings

## Anti-Patterns to Avoid

- **Synonym Substitution**: Replacing AI words with synonyms without addressing structural or rhythmic patterns produces text that reads identically to the original at any level of analysis above vocabulary.
- **Over-Colloquialization**: Inserting casual language into formally-registered text creates register inconsistency that reads as artificial in a different way.
- **Stripping Content for Brevity**: Removing hedges and filler phrases is correct, but removing actual information or argument steps corrupts the payload.
- **Uniform Burstiness**: Attempting to create sentence length variation by following a formula (short-long-short-long) produces a different but equally detectable pattern.
- **Hallucinating Specifics**: Inventing concrete details — fabricating a study, making up a statistic — is more harmful than the AI generality it replaces. Placeholders or sourcing instructions are preferable.
- **Ignoring the Detection Report**: Rewriting without reference to the specific flagged categories wastes effort on passages that weren't problematic and may leave the genuine AI markers untouched.
- **Persona Inconsistency**: Switching between voice registers or implied author perspectives mid-document creates a jarring, obviously edited quality.

## Quality Indicators

- **Reduced Detection Score**: Post-rewrite AI detection confidence drops by at least 30 percentage points from the pre-rewrite baseline
- **Content Audit Pass**: A factual comparison of pre- and post-rewrite text shows all key claims, arguments, and data points preserved
- **Burstiness Improvement**: Sentence length standard deviation increases measurably from pre- to post-rewrite
- **Zero Formulaic Hedges**: Flagged hedging phrases from the detection report are absent from the rewritten text
- **Register Coherence**: The rewritten text maintains a consistent register throughout without unexplained formality shifts
- **Specificity Count**: Concrete detail density (specific numbers, names, examples) is higher in the rewrite than the original
- **Rewrite Log Completeness**: Every category-specific intervention is documented with before/after passage comparison

## Collaboration Touchpoints

- **With AI Writing Detector**: Detection report is the essential input; rewriter should not begin without a completed detection report specifying flagged categories, passages, and confidence scores
- **With Prose Stylist**: For high-stakes humanization requiring genuine voice development (not just pattern removal), prose stylist refines the rewritten text's rhythmic and stylistic qualities
- **With Copy Editor**: Copy editor reviews the rewritten text for grammar, style consistency, and accidental errors introduced during humanization
- **With Voice Coach**: When the target is a specific author's voice or a well-defined persona, voice coach provides the voice profile that guides humanization choices
