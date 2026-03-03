# Rewrite Strategies: Per-Category Transformation Guide

Deep reference for category-aware rewriting with before/after examples and register-specific guidance.

## Pass 1: Structural Transformations

### Converting Lists to Prose

Not all lists should be converted -- technical specifications, step-by-step instructions, and data tables are naturally list-form. Convert lists that are performing the work of argumentation, narration, or analysis.

**Before** (AI list-as-argument):
```
Benefits of remote work:
- Increased flexibility
- Reduced commute time
- Better work-life balance
- Access to global talent
```

**After** (prose):
```
Remote work gives people their commute back -- two hours a day in most cities. That alone changes the calculus. But the real shift is in hiring: a company in Boise can now recruit from Berlin, and the best candidate doesn't have to relocate.
```

### Breaking Linear Argumentation

Human reasoning is not purely linear. People start with questions, lead with conclusions, introduce counter-arguments, and correct themselves mid-thought.

**Before** (perfectly linear):
```
Research shows that exercise improves cognitive function. Studies at Harvard demonstrated a 20% improvement in memory tests. Therefore, regular exercise should be part of every knowledge worker's routine.
```

**After** (human reasoning):
```
Here's what's strange: we've known for decades that exercise sharpens thinking -- Harvard's memory studies showed a 20% boost -- and yet most knowledge workers treat it as optional. You'd think a guaranteed cognitive upgrade would be non-negotiable. It should be.
```

### Removing Performative Transitions

**Before**: "Having established the importance of data security, let's now turn our attention to the specific measures that organizations can implement."

**After**: "So what does data security look like in practice?"

Or simply: start the next paragraph without any transition at all. Humans do this constantly.

### Shortening Conclusions

AI conclusions are long, repetitive summaries. Human conclusions are often one or two sentences.

**Before**: "In conclusion, we have explored the various aspects of cloud migration, including cost considerations, security implications, and organizational readiness. These factors collectively demonstrate that a well-planned migration strategy is essential for success."

**After**: "The pattern is clear: plan the migration or plan to recover from the migration. There is no third option."

## Pass 2: Sentence-Level Variation

### The Breath Point Technique

Insert short sentences (3-7 words) between dense passages to create the "breathing" rhythm of human prose.

**Before**: "The system processes incoming requests through a multi-stage pipeline that validates authentication tokens, checks rate limits, routes to the appropriate service handler, and returns formatted responses to the client."

**After**: "The system processes incoming requests through a multi-stage pipeline: auth validation, rate limiting, service routing, response formatting. Each step can fail. And each failure looks different."

### Fragment Injection

Fragments work best for emphasis, contradiction, or emotional punctuation. Never use them randomly.

**Effective fragments**: "Not always." / "Done." / "Exactly the wrong approach." / "Every single time."

**Ineffective fragments**: "Very much so." / "Indeed." / "Quite." (These sound like an AI trying to sound human.)

### Creative Grammar Devices

**Parenthetical asides**: "The framework handles caching (well, most caching -- edge cases are another story) through a two-tier strategy."

**Dash interruptions**: "The migration took six months -- longer than anyone predicted, shorter than it should have -- and cost twice the estimate."

**Sentence inversions**: "Rarely does a single architectural decision cascade through this many systems." "Gone are the days of manual deployment."

**Self-corrections**: "The database handles -- actually, let me rephrase. The database survives about ten thousand concurrent connections."

### Grammatical Informalities

These must match the document's register. A legal brief gets zero informalities. A blog post gets 2-3 per 1000 words.

| Informality | Example | Register Appropriate? |
|-------------|---------|----------------------|
| Comma splice | "The test passed, the build was green" | Casual, blog, narrative |
| Preposition ending | "That's the team I was working with" | Most registers except formal legal |
| Split infinitive | "to actually understand the architecture" | Most registers |
| "Who" for "whom" | "the developer who we hired" | All registers (natural) |

### Thought Process Markers

Humans leave traces of their thinking in text. Their complete absence across 1000+ words is an AI signal.

**Hesitation markers**: "actually," "sort of," "kind of," "I suppose," "honestly"
**Self-corrections**: "wait, that's not quite right," "let me rephrase," "actually, no"
**Filler in long passages**: "well," "so," "look," "the thing is"

Place these where humans naturally produce them: at the start of complex explanations, when shifting topics, when introducing caveats.

## Pass 3: Word-Level Specificity

### Replacing AI Vocabulary Clusters

Only replace when density warrants -- individual AI-favored words are normal English.

| AI Cluster | Human Alternative |
|-----------|-------------------|
| "delve into the nuanced tapestry" | "look at the details" |
| "comprehensive exploration illuminates the multifaceted landscape" | "this covers the topic from several angles" |
| "testament to the resilience of" | "shows how stubborn/persistent" |
| "the implications of this paradigm shift are profound" | "this change matters" |
| "operationalize this methodology to facilitate outcomes" | "put this approach into practice" |

### Concrete Details Over Abstractions

The most powerful humanization technique: replace abstract language with specific, sensory, anchored detail.

**Before**: "The bustling city was full of quiet determination"
**After**: "Portland hummed with the stubborn energy of people who bike in the rain"

**Before**: "The application provides comprehensive functionality for data management"
**After**: "The app handles data management -- whether you're a three-person startup in Austin or a sprawling government agency"

**Before**: "The meeting was productive and outcomes were achieved"
**After**: "We walked out with three decisions, two action items, and for once, no unresolved arguments"

### Removing Performative Empathy

Replace with genuine engagement or nothing at all.

**Before**: "We understand your frustration during this exciting transition"
**After**: "We know this transition has been frustrating. Here's what we're doing about it."

Or simply remove the sentence. Better to say nothing than to perform empathy.

### Hedging Calibration

Preserve hedging on genuinely uncertain claims. Remove hedging on facts and strong evidence.

**Remove**: "It's worth noting that water boils at 100C at sea level"
**Keep**: "The effect size may vary across populations with different baseline health"

**Remove**: "It could potentially have a significant impact on future outcomes"
**Replace**: "It will change how this works"

## Pass 4: Voice Alignment & Coherence

### Subtext Repair

When surface meaning contradicts implied meaning, choose clarity over diplomacy.

**Before**: "While the team's effort was commendable, the results speak for themselves"
**After**: "The team worked hard. The results fell short of what we needed."

**Before**: "Although this is an impressive achievement, it merely scratches the surface"
**After**: "This is a real achievement. There's more to do, but this is a strong start."

### The Meta Self-Review

After all passes, read the entire document as if you were a human author reviewing your own draft. Ask:

1. Does any passage still sound "too smooth"? Too perfect?
2. Is the complexity uniform, or does it genuinely vary?
3. Are there any passages where every sentence is the same length?
4. Does the document have personality, or just competence?
5. Would I believe a specific person wrote this?

If any passage fails these checks, revise it before finalizing.

## Register-Specific Guidance

### Academic Writing
- Preserve formal vocabulary where domain-appropriate
- Allow fewer contractions, fewer fragments
- Focus on: breaking structural monotony, adding counter-arguments, varying sentence length
- Do NOT: add colloquialisms, inject humor, use fragments
- Key signals to fix: uniform paragraph length, linear argumentation, absence of counter-arguments

### Blog/Casual Writing
- Maximum personality injection: humor, colloquialisms, opinions, fragments
- Allow grammatical informalities freely (2-3 per 1000 words)
- Focus on: voice, burstiness, thought markers, concrete details
- Key signals to fix: diplomatic evasion, performative transitions, generic metaphors

### Technical Documentation
- Preserve technical accuracy above all else
- Keep useful lists and structured formats
- Focus on: sentence variety, reducing qualifier density, adding concrete examples
- Do NOT: add humor to API docs, convert spec tables to prose
- Key signals to fix: uniform complexity, AI phrases, unnecessary hedging

### Journalism
- Strong voice, definitive assertions, specific sourcing
- Punchy ledes, short paragraphs, inverted pyramid where appropriate
- Focus on: proper nouns, concrete details, opinion strength, burstiness
- Key signals to fix: diplomatic evasion, vague future references, generic names

### Creative Fiction
- Maximum burstiness, maximum perplexity, maximum voice
- Literary devices, sensory language, emotional authenticity
- Focus on: original metaphors, character-specific vocabulary, rhythm variation
- Key signals to fix: emotional flatness, generic names, ornamental vocabulary

## Persona Application Guide

### Building a Persona

Identify 3-5 characteristic patterns. Apply them consistently but not constantly (real people are inconsistent).

**Example: Cynical Journalist**
1. Punchy, short ledes
2. Source attributions ("according to," "per the report")
3. Skeptical framing ("the company claims," "supposedly")
4. Dry observations ("surprisingly, no one was surprised")
5. Metric-heavy ("a 300% increase in exactly the wrong direction")

**Example: Forgetful Academic**
1. Parenthetical asides that grow longer than the main sentence
2. Self-corrections ("or rather, to be precise...")
3. Precise terminology mixed with casual connectors ("so, the ontological implications...")
4. Trailing thoughts ("but that's a question for another paper...")
5. Citation-style references even in casual prose

### Persona-Voice Profile Interaction

If both persona and voice profile are provided:
- **Voice profile** controls quantitative features: sentence length distribution, contraction frequency, paragraph length
- **Persona** controls qualitative features: humor style, opinion strength, quirks, emotional engagement
- When they conflict, the voice profile's metrics take precedence (it represents the actual author's measured patterns)

## Quality Checklist

Before finalizing any rewrite:
- [ ] Original meaning fully preserved
- [ ] No facts, dates, or technical details altered
- [ ] Voice consistent across entire document
- [ ] Burstiness genuinely varies (not uniformly "humanized")
- [ ] Perplexity shows genuine word-choice surprise
- [ ] LIX variance across sections exceeds stdev 8.0
- [ ] Author review flags present for subjective judgment calls
- [ ] Meta self-review completed
- [ ] No new AI patterns introduced by the rewriting
