# Dialogue Anti-Slop Standards, Anti-Patterns, and AI Slop Detection

Cross-cutting quality reference for the dialogue specialist. The SKILL.md body keeps a short anti-slop summary and a pointer here; this file carries the full dialogue-specific anti-slop rules, anti-patterns, and the DO / DON'T AI slop detection list.

## Anti-Slop Writing Standards

All dialogue output must avoid predictable AI writing patterns. See `.claude/rules/quality/anti-slop.md` for the full framework. Rules specific to dialogue craft:

1. **No throat-clearing in dialogue** -- characters who open with "Look," or "Listen," or "Here's the thing" sound like AI, not people. Real speakers start mid-thought.
2. **No false agency in stage directions** -- "the silence spoke volumes" and "the tension was palpable" are empty. Name what the characters do: "she set her glass down without drinking."
3. **No vague declaratives about dialogue quality** -- "the exchange reveals character depth" says nothing. Specify: "Maria deflects the question three times before answering, showing she knows the answer but does not want to give it."
4. **No business jargon in character mouths** -- unless the character is a person who speaks that way, and the jargon is a characterization choice, not a writing default.
5. **Active voice in stage directions** -- "a look was exchanged" hides who looked at whom. "David glanced at Maria. She did not look back."

## Anti-Patterns

- **The ventriloquist**: All characters sound like the author -- same vocabulary, same rhythm, same perspective
- **The information pipeline**: Using dialogue primarily to deliver plot information to the reader
- **The monologue disease**: Characters delivering speeches instead of having conversations
- **The agreement conversation**: Characters who agree with each other. Agreement is not dramatic. Conflict is dramatic
- **The pleasantry trap**: "Hello." "Hi, how are you?" "Fine, thanks. You?" Real conversation starts this way; fiction should not (unless the pleasantries carry subtext)
- **Dialect as mockery**: Using exaggerated dialect to signal that a character is uneducated or comic

## DO / DON'T -- Dialogue AI Slop Detection (V10.17.0)

### DON'T
- Characters who explain their feelings: "I'm angry because you lied to me about the money"
- Perfectly grammatical speech -- real people use fragments, interruptions, and false starts
- Every character responding directly to what was just said (real conversations have tangents and non-sequiturs)
- Dialogue that reads like a debate: thesis, antithesis, synthesis, conclusion
- Said-bookisms: "she exclaimed," "he retorted," "she mused" -- use "said" or action beats
- Exposition through dialogue: "As you know, Bob, our company was founded in 1987..."
- Characters who take turns speaking in equal-length paragraphs
- Giving every character a verbal tic to differentiate them (lazy voice work)
- Perfectly witty banter where every line is a zinger (exhausting, not entertaining)

### DO
- Let characters talk past each other -- people often respond to what they want to hear, not what was said
- Use interruptions, trailing off, subject changes, and silence as dialogue tools
- Write dialogue where the real conversation is happening beneath the words
- Give characters speech patterns that emerge from their background, not from a tic catalog
- Let important things go unsaid -- the reader should feel the weight of the unspoken
- Use action beats to reveal what dialogue conceals: "I'm fine," she said, gripping the edge of the table
- End conversations without resolution -- real conversations rarely have neat endings
