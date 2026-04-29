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

## Humanizer-Derived Pattern Strategies (10 New Sub-Signals)

### Fixing Copula Avoidance

AI avoids "is/are" in favor of circumlocutions. The fix is simple: restore the direct copula.

**Before**: "The dashboard serves as the primary interface for monitoring system health."
**After**: "The dashboard is where you check system health."

**Before**: "This framework acts as the backbone of the entire application."
**After**: "This framework is the backbone of the application."

**Before**: "The study stands as a landmark in the field of genetics."
**After**: "The study is a landmark in genetics."

**Rule**: Replace "serves as," "stands as," "acts as," "functions as," "represents a" with direct "is/are" constructions. The result is shorter, clearer, and more human.

### Removing Chatbot Artifacts

Delete entirely. Do not replace. These phrases are conversational scaffolding that should never appear in written documents.

**Before**: "I hope this helps you understand the key differences between the two approaches. Let me know if you have any questions!"
**After**: (Second sentence deleted entirely. First sentence rewritten:) "Those are the key differences between the two approaches."

**Before**: "Great question! The answer involves several factors."
**After**: "The answer involves several factors." (Or better: lead with the factors.)

**Rule**: "I hope this helps," "Let me know if," "Happy to help," "Great question," "Feel free to ask" -- all deleted without replacement. If the surrounding text needs restructuring after deletion, restructure it.

### Removing Knowledge-Cutoff Disclaimers

Delete and restructure. State facts directly.

**Before**: "As of my last update in 2024, the framework supports three deployment modes."
**After**: "The framework supports three deployment modes."

**Before**: "I don't have access to real-time data, but based on recent trends, the market appears to be growing."
**After**: "The market has been growing." (Or cite a specific source.)

**Rule**: Remove all temporal hedges about training data. State facts directly or cite specific sources. If the claim genuinely needs a date qualifier, use a specific date, not "as of my last update."

### Deflating Significance Inflation

Replace superlatives with proportionate language. Let facts speak for themselves.

**Before**: "This represents a pivotal moment in the evolution of cloud computing, marking a transformative shift that cannot be overstated."
**After**: "This changes how companies deploy cloud infrastructure."

**Before**: "The framework is a testament to the team's dedication, delivering a truly groundbreaking approach to data processing."
**After**: "The team built a framework that processes data 3x faster than the previous version."

**Rule**: Strip "pivotal," "transformative," "groundbreaking," "testament to," "cannot be overstated." Replace with concrete facts, specific metrics, or simple direct statements. If the fact is genuinely significant, it will speak for itself without inflation.

### Concretizing Promotional Language

Replace brochure adjectives with specific, sensory, concrete details.

**Before**: "The vibrant, bustling neighborhood offers a stunning array of world-class dining options."
**After**: "The neighborhood has three new restaurants -- a Thai place with a line out the door, a wine bar that does flights, and a ramen shop that somehow got a Michelin nod."

**Before**: "This cutting-edge, state-of-the-art platform delivers unparalleled performance."
**After**: "The platform handles 10,000 requests per second with sub-50ms latency."

**Rule**: "Vibrant," "stunning," "breathtaking," "world-class," "cutting-edge," "state-of-the-art" -- replace every one with a concrete detail. What makes it vibrant? What makes it world-class? Specifics are more vivid than superlatives.

### Strengthening Vague Attributions

Either cite a specific source or remove the authority claim entirely.

**Before**: "Research suggests that remote work increases productivity, and many experts believe this trend will continue."
**After**: "Stanford's 2022 study of 16,000 workers found a 13% productivity increase for remote workers."

**Before**: "According to experts, the market is expected to grow significantly over the next decade."
**After**: "The market will grow. How much depends on regulation -- if the EU framework passes, estimates range from 15% to 40% annual growth."

**Rule**: "Experts argue," "many believe," "research suggests," "studies show" -- if you can cite a specific source, cite it. If not, drop the appeal to authority and state the claim directly. A confident direct assertion is more credible than a vague appeal to unnamed experts.

### Replacing Superficial -ing Analyses

Replace gestural analysis with actual analysis that explains causes and consequences.

**Before**: "This data highlighting the growing trend underscores the importance of proactive measures, showcasing the need for comprehensive planning."
**After**: "The trend is growing because manufacturing costs dropped 30% in Q2. Companies that wait to adapt will lose market share -- the ones that moved early already captured 15% more revenue."

**Before**: "The report emphasizing the challenges illustrates the complexity of the issue."
**After**: "The report identifies three challenges: regulatory uncertainty, supply chain fragility, and a 40% talent gap in key technical roles."

**Rule**: "Highlighting," "showcasing," "underscoring," "demonstrating," "illustrating" -- replace each with an actual explanation of WHY something matters, with specific facts and consequences.

### Eliminating False Ranges

Replace rhetorical "from X to Y" with direct statements or actual specifics.

**Before**: "The platform addresses everything from sustainability to innovation, covering the full spectrum from theory to practice."
**After**: "The platform handles sustainability reporting and R&D tracking. It works for both planning and deployment."

**Before**: "Our approach spans from ideation to implementation, covering from research to application."
**After**: "We handle the full process: research, design, build, and ship."

**Rule**: "From X to Y" used rhetorically (not as an actual range) -- rewrite as a direct list or statement. If the "range" is genuinely useful (e.g., "from $100 to $500"), keep it.

### Fixing Synonym Cycling

Allow natural word repetition. Pick one term and use it consistently.

**Before**: "The framework provides robust capabilities. The platform supports multiple use cases. The system scales horizontally. The solution integrates with existing tools."
**After**: "The system provides robust capabilities and supports multiple use cases. It scales horizontally and integrates with existing tools."

**Before**: "The company announced its new strategy. The organization plans to implement changes gradually. The firm expects results within six months. The enterprise will invest heavily."
**After**: "The company announced its new strategy. It plans to implement changes gradually and expects results within six months. The investment will be significant."

**Rule**: Identify cases where 3+ synonyms refer to the same referent within a passage. Pick the most natural term, use it consistently, and use pronouns ("it," "they") for variety. Human writers repeat words -- it is natural and clear.

### Reducing Boldface/Emoji Overuse

Replace formatting-as-emphasis with prose emphasis. Remove emoji from non-chat text.

**Before**: "The **key advantage** of this approach is **scalability**. By leveraging **cloud infrastructure**, teams can achieve **significant improvements** in **performance**."
**After**: "The main advantage is scalability. Cloud infrastructure lets teams improve performance substantially."

**Before**: "Key features: ✅ Fast deployment ✅ Easy configuration ✅ Built-in monitoring 🚀"
**After**: "It deploys fast, configures easily, and includes built-in monitoring."

**Rule**: Remove bold from "key terms" in body text. Use sentence structure and word position for emphasis instead. Remove all emoji from formal and semi-formal text. In casual text, retain only genuinely expressive emoji (not structural emoji like checkmarks and rockets).

## Human Fingerprint Toolkit: Cross-Pass Techniques

These 9 techniques span all passes and represent the core of humanization. Apply at least 5 per rewrite.

### Thinking-Out-Loud Mode

The strongest humanization technique. Write as someone processing ideas in real time.

**Before**: "There are several approaches to this problem. Each has distinct advantages and trade-offs that should be carefully evaluated."

**After**: "Okay so there are a few ways to do this. The obvious one is caching -- fast, simple, everyone's first instinct. But then you hit invalidation and suddenly you're solving a harder problem than the original one. What about just throwing hardware at it? Read replicas, maybe. That's... actually not terrible. Let me think about this. Yeah, replicas with a short lag tolerance. Not sexy, but it works."

**Markers to inject**: "So," "Let me think about this," "Actually," "Wait," "Hmm," "The thing is," "Here's what's interesting," rhetorical questions answered immediately, arriving at conclusions through visible reasoning.

### Register Mixing

Shift between formal and informal within a single passage. Humans do this reflexively.

**Before**: "The architecture demonstrates significant scalability improvements. Throughput metrics indicate a 3x improvement under sustained load conditions."

**After**: "The architecture scales -- and not in the hand-wavy way that marketing materials usually mean. Under sustained load, throughput tripled. We kept pushing and it just... kept going. The engineering team was honestly a little surprised."

**Break points for register shift**: After technical fact (shift to casual interpretation), after dense paragraph (shift to simple summary), when adding opinion to analysis, when something is genuinely surprising.

### Self-Correction and Contradiction

Allow the visible process of refining thought.

**Patterns**:
- "Well, 'X' is too strong. What I mean is..."
- "Actually, that's not quite right. The real issue is..."
- "I said X above, but having thought about it more..."
- "Okay I oversimplified -- here's what's really going on..."

**Before**: "Microservices provide significant benefits for maintainability and scalability."
**After**: "Microservices are supposed to help with maintainability -- and they can, if you get service boundaries right. But I've seen plenty of teams where 'microservices' just meant 'a distributed monolith with more network calls.' So: benefits yes, but very conditional ones."

### Conversational Aside Patterns

Types of asides by register:
- **Casual/blog**: "(and honestly, who hasn't been there)" / "-- which, let's be real, nobody actually does --"
- **Technical**: "(the edge cases are another story)" / "-- assuming your deployment pipeline doesn't have opinions about this --"
- **Semi-formal**: "(a point often overlooked in the literature)" / "-- though the implications deserve their own discussion --"

### Specific Detail Anchoring

Replace every abstraction you can with something sensory, named, or numbered.

| Abstract | Anchored |
|----------|----------|
| "various industries" | "logistics in Rotterdam, fintech in Singapore, a government agency in DC" |
| "significant improvement" | "42% faster, which saved about 6 hours per week per analyst" |
| "the team worked hard" | "the team shipped three releases in two weeks, including one on a Saturday" |
| "a large company" | "a Fortune 500 retailer with 40,000 employees" |

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
- [ ] At least 5 of 9 Human Fingerprint Toolkit techniques applied
- [ ] At least 3 sentences under 6 words per 1000 words
- [ ] At least 2 sentences over 35 words per 1000 words
- [ ] At least 1 register shift per 500 words
- [ ] At least 1 visible self-correction or contradiction per 1000 words
