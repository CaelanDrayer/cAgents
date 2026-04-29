# Game Writing Guidelines

Comprehensive reference for interactive narrative writing — from dialogue trees to item descriptions, from combat barks to cinematic scripts. These guidelines cover the craft of writing for games at every scale.

## Dialogue Writing: Deep Techniques

### Character Voice in Interactive Contexts
In a novel, the writer controls every word a character speaks. In a game, the player may take a character through hundreds of conversations over dozens of hours, in any order, at any pace. Voice consistency under these conditions requires rigorous characterization.

**The voice profile**: For every speaking character, define:
- **Vocabulary range**: Education level, regional dialect, professional jargon, slang usage
- **Sentence structure tendency**: Short and direct? Complex and subordinate? Fragmented?
- **Verbal tics**: Repeated phrases, filler words, characteristic expressions (used sparingly to avoid annoyance)
- **What they avoid saying**: Just as distinctive as what they say. A soldier who never mentions fear. A scholar who never uses simple words. A politician who never gives a straight answer.
- **How they handle silence**: Do they fill it? Sit with it? Become uncomfortable?

**Voice sheet example**:
```
CHARACTER: Commander Vasek
VOCABULARY: Military precise. Technical terms without explanation. Never uses profanity (considers it unprofessional). Formal address to superiors, first names to peers, ranks to subordinates.
STRUCTURE: Declarative sentences. Subject-verb-object. Minimal modifiers. Questions are orders in disguise.
TICS: "Understood" as acknowledgment. "Explain" as a one-word question. Starts briefings with "Here's what we know."
AVOIDS: Emotional language. Uncertainty markers ("maybe," "I think"). First person plural ("we" implies shared responsibility he doesn't trust).
EXAMPLE LINES:
  - Calm: "Two hostiles. North corridor. Take them quiet."
  - Angry: "That position cost us three people. Do not lose it."
  - Grief: "...Understood. Mark their location. We recover them after."
```

### Branching Dialogue Architecture

**The node structure**:
```
[NPC LINE]
  ├── [Player Choice A] → [NPC Response A] → continues...
  ├── [Player Choice B] → [NPC Response B] → continues...
  ├── [Player Choice C (conditional: high charisma)] → [NPC Response C] → continues...
  └── [Exit: "I need to go."] → [NPC farewell]
```

**Writing for the node**: Each NPC line must work as a response to ANY of the player choices that lead to it. This means NPC lines at convergence points must be broad enough to follow multiple player tones without feeling like a non sequitur.

**Conditional dialogue**: Dialogue that unlocks based on game state (skills, previous choices, items, quest progress). Conditional lines are the premium content — they reward player investment and create the "the game noticed what I did" feeling that players treasure.

**Player choice wording**: The player choice text and what the character actually says don't have to match exactly (the Mass Effect/BioWare convention), but there should be no betrayal. If the choice says "I'll help you," the character shouldn't respond with sarcasm. The Fallout 4 problem — choice says one thing, character says another — destroys player trust.

### Writing Reactive Dialogue
Dialogue that acknowledges the player's previous actions, choices, and status:

**Levels of reactivity** (from cheapest to most expensive):
1. **Flag acknowledgment**: A single line referencing a binary state. "I heard you helped the refugees." Cheapest, most impactful per-word.
2. **Tonal variation**: Same information, different delivery based on relationship. A friendly NPC vs. a hostile one giving the same quest.
3. **Content variation**: Different conversations based on player history. The NPC who knows you're a thief has a different quest than the one who thinks you're a paladin.
4. **Full branch variation**: Entirely different conversation trees based on major story choices. Most expensive, reserved for critical moments.

**Cost-effective reactivity**: You don't need full branch variation for every conversation. A single reactive line ("I see you're carrying the Cursed Blade — be careful with that") costs minimal production effort but creates disproportionate player satisfaction.

## Bark Writing: The Complete Guide

### Bark Categories and Requirements

| Category | Trigger | Length | Variations Needed | Priority |
|----------|---------|--------|-------------------|----------|
| Combat — enemy spotted | See hostile | 1-5 words | 15-20 | High |
| Combat — attacking | Initiating attack | 1-3 words | 10-15 | High |
| Combat — hit taken | Receiving damage | 1-3 words | 10-15 | High |
| Combat — kill | Defeating enemy | 2-5 words | 10-15 | Medium |
| Combat — low health | Health critical | 2-6 words | 8-10 | High |
| Combat — ally down | Companion incapacitated | 3-8 words | 8-10 | Medium |
| Exploration — observation | See interesting thing | 5-15 words | Varies | Low |
| Exploration — reaction | Enter new area | 5-15 words | Per area | Low |
| Idle — ambient | Nothing happening | 5-20 words | 10-20 | Low |
| System — level up | Gain level/ability | 5-10 words | 5-8 | Medium |
| Emotional — success | Complete objective | 5-10 words | 5-8 | Medium |
| Emotional — failure | Fail objective | 5-10 words | 5-8 | Medium |

### Writing Bark Variations
The key is to vary along multiple axes simultaneously:

**Same information, different expression**:
- "Hostile!" (direct, terse)
- "Eyes up — we've got company" (measured, veteran)
- "Oh no. Oh no no no." (nervous, panicked)
- "There you are, you ugly—" (aggressive, confrontational)
- "Contact, bearing north" (professional, tactical)

**Character-specific barks**: Each character should have barks that ONLY they would say. Generic barks ("Look out!") work for any character and feel anonymous. Character barks ("This reminds me of Kellan Ridge — and that didn't end well either") create personality.

### The Repetition Survival Guide
Lines the player will hear hundreds of times need special care:

- **Avoid specificity that becomes false**: "Three hostiles ahead!" works once. After hearing it when there are clearly five enemies, it becomes immersion-breaking.
- **Avoid humor that wears thin**: A joke bark is funny the first time, annoying the tenth time, and maddening the hundredth time. Humor in barks should be wry, not punchline-based.
- **Use ambient delivery**: Lines spoken to no one in particular (muttering, thinking aloud) feel less repetitive than lines directed at the player because they don't demand attention.
- **Include rare variants**: A 1-in-50 chance bark that the player has never heard is a delight. Easter egg barks that reference obscure lore, other games, or the absurdity of the situation reward long-term players.

## Environmental Storytelling: Craft Guide

### The Visual Sentence
Think of each environmental storytelling setup as a sentence: it has a subject (what happened), a verb (the action), and an object (the evidence). The player reads the "sentence" by observing the space.

**Example**: A dining table set for a family meal, chairs overturned, one wall scorched. *Subject*: a family. *Verb*: attacked during dinner. *Evidence*: overturned chairs (sudden violence), scorch marks (fire-based attack), set table (they didn't expect it).

**The gap**: Leave a gap for the player to fill. Don't show the attack itself — show its aftermath and let the player's imagination supply the horror. The gap is where the player becomes a co-author.

### Environmental Storytelling Techniques

**The breadcrumb trail**: A sequence of environmental details that the player follows through a space, each one adding to the emerging story. A trail of blood leading from a locked door to a window. A sequence of increasingly frantic journal entries.

**The contrast**: Two adjacent spaces that tell the story through their difference. A pristine room next to a destroyed one. A wealthy district bordering a slum. The contrast tells the story without words.

**The timeline**: Environmental details that show change over time. Cobwebs on an unused tool. Dust patterns showing where objects were recently moved. Growth rings on a tree planted at a specific date. The environment as historical record.

**The unreliable environment**: Environmental storytelling that lies or misleads. The scene looks like a suicide, but details don't add up. The abandoned camp looks recent, but the dates on documents say otherwise. The player must read the environment critically, not just observationally.

## Quest Writing: Structure and Voice

### Quest Log Writing
The quest log is the player's reference document. It must be:
- **Clear about the objective**: What does the player need to do next?
- **Characterful in delivery**: Written in a voice that matches the game's world
- **Updated on progress**: Reflecting what the player has accomplished and learned
- **Navigable**: Easy to scan for the essential information

**Style spectrum**:
- **Functional**: "Find the three sacred stones. 2/3 collected." (Clear, impersonal)
- **Diegetic**: "The hermit spoke of three sacred stones, hidden in the old temple, the drowned cave, and the peak of Mount Arran. I've found two — the mountain stone remains." (In-character, immersive, longer)
- **Hybrid**: "Collect the Sacred Stones (2/3). The hermit mentioned a third stone atop Mount Arran." (Clear objective with narrative color)

### Quest Reward as Narrative
The reward for completing a quest should feel narratively appropriate, not just mechanically satisfying. A quest about helping a blacksmith should reward a weapon from that blacksmith — one with a name, a description, and maybe a small story of its own. Generic gold rewards for emotional quests feel hollow.

## In-World Writing: Templates and Techniques

### Item Descriptions
**The From Software template**: Two sentences. First sentence: what the item IS. Second sentence: what the item MEANS.
- "A sword with a blade of pale crystal. The knights who carried these were forbidden from drawing them until their vows were broken — few survived the breaking."

**The functional-flavor template**: Mechanical information + one detail of character.
- "Iron Longsword. Damage: 45-52. Unremarkable in every way, which is precisely what makes it trustworthy."

### Books and Documents
In-world books should feel like they were written by someone in that world with their own perspective, biases, and limitations.

**The biased historian**: "The Conquest of the Eastern Reaches was, by all accounts, a necessary campaign. The barbarian tribes had threatened our borders for generations. (One notes that the term 'barbarian' appears only in our records. Their own accounts, where they survive, use rather different language.)"

**The personal letter**: Reveals character, relationships, and world simultaneously. A letter from a soldier to their family tells you about the war, the army's morale, the society's values, and one person's inner life — all in a single page.

**The unreliable document**: A propaganda poster, a redacted report, an official history that contradicts other sources. These teach the player to read critically and reward those who cross-reference.

## Cinematic Writing: Script Format

### Scene Heading
```
INT. THRONE ROOM — NIGHT
The throne room is vast and cold. Moonlight cuts through shattered windows.
The QUEEN stands before her throne, not sitting. She hasn't sat on it since the siege.
```

### Dialogue with Direction
```
QUEEN
(quietly, looking at the broken windows, not at the player)
They told me the walls would hold.

[PLAYER CHOICE]
A) "The walls held long enough." (Compassionate)
B) "Your advisors failed you." (Direct)
C) "What matters now is what comes next." (Pragmatic)

QUEEN (Response to A)
(a pause. She almost smiles.)
Long enough. Yes. I suppose they did.

QUEEN (Response to B)
(turns sharply, eyes hard)
My advisors are dead. Choose your next words carefully.

QUEEN (Response to C)
(nods, straightening)
You're right. Grief is a luxury for after.
```

### Voice Direction Notes
```
VOICE DIRECTION — Queen Elysia
Age: Late 40s. Voice: Measured, controlled, with an underlying exhaustion she refuses to show.
The Queen speaks in complete sentences. She does not use contractions except in moments of extreme emotion.
She addresses the player formally until trust is established (mid-Act 2), then shifts to a warmer but still dignified register.
Pronunciation: "Elysia" = eh-LIZ-ee-ah. "Aldenmere" = ALL-den-meer.
Key emotional note: She is not fragile. She is tired. There is a difference. Her grief is not weakness — it is the cost of caring about her people, and she would not trade it.
```

## Localization Considerations

### Writing for Translation
- **Avoid idioms**: "Break a leg" doesn't translate. Use clear, literal language for critical information.
- **Leave text expansion room**: German text is typically 30% longer than English. French 20%. Design text boxes and UI accordingly.
- **No text in images**: All text must be extractable for translation. Never bake text into textures, sprites, or video.
- **Gender and number variables**: Use tag systems for gendered/numbered text: "{player_name} drew {possessive} sword" where {possessive} is set by player gender selection.
- **Provide context for translators**: "BARK: Said during combat when spotting an enemy at long range. Tone: alert but not panicked." Translators need to know the context to choose the right register.
- **Avoid concatenated strings**: "You found " + item_name + " in " + location_name → Fails in languages with different word order. Use full template strings with placeholders.

### Cultural Sensitivity in Global Games
- Test humor across cultures (what's funny in one culture may be offensive in another)
- Avoid culturally specific references in core narrative (fine for optional flavor text)
- Consider reading direction and UI layout for RTL languages
- Religious and political content requires region-specific review
- Color symbolism varies by culture (white = purity in West, mourning in parts of Asia)
