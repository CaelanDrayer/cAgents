# Best Practices: Game Writer

> Design principles, patterns, and frameworks that guide high-quality game narrative design, branching dialogue, quest writing, and interactive storytelling work.

## Design Principles

- **Narrative Must Serve Gameplay**: In games, story and mechanics are co-dependent. The best game writing makes the player feel their gameplay choices matter narratively, and the narrative gives players emotional reasons to engage with the mechanics.
- **Player Agency Is Sacred**: The player's sense of meaningful choice is the game's most important narrative contract. Writing that contradicts player choices, ignores player history, or delivers identical outcomes regardless of choice breaks this contract.
- **Environmental Storytelling Outperforms Exposition**: Show the world's history through objects, architecture, NPC behavior, and environmental detail rather than through cutscenes, codex entries, or dialogue dumps. The player who discovers a story feels ownership of it.
- **Barks Must Earn Their Space**: Contextual voice lines (barks) should add atmospheric information, character personality, or tactical context — never be filler. Every bark script is expensive; every unfired bark is wasted budget.
- **Ludonarrative Harmony Requires Coordination**: When the story says the character is cautious but the mechanics let the player be reckless, the dissonance undermines both. Game writers must flag and resolve ludonarrative contradictions.
- **State Awareness Is a Writing Skill**: Game writing requires tracking what the player has done, seen, and chosen, then writing to that state. Generic content that ignores player history reads as narrative failure.
- **Voice Lines Are Performance Directions**: Game dialogue is written for voice actors to perform. Write with prosody in mind — rhythm, stress, emotional tone — and indicate performance direction clearly.

## Key Patterns & Frameworks

- **Branching Dialogue Tree Architecture**: Design dialogue as trees with clear branch labels, state-aware conditions, and converging "funnel" points. Trees must be readable and maintainable; deeply nested branches produce unmanageable content.
- **Quest Beat Structure**: Every quest has five beats — Hook (why does the player care?), Investigation (player gathers information/explores), Complication (the situation is more complex than it appeared), Climax (decisive action or choice), Resolution (outcome and reflection). Map all quests to this structure.
- **State Variable Tracking System**: Define which player decisions, achievements, and relationship scores affect dialogue availability and content. State variable naming conventions should be human-readable (COMPANION_TRUST_HIGH rather than CT > 7).
- **Environmental Storytelling Toolkit**: Three techniques — (1) Archaeological layering (what happened here, evidenced by the remains), (2) Contrast and rupture (something is wrong; the normal pattern has been disrupted), (3) Protagonist traces (the player can see evidence of earlier events).
- **Bark Writing Protocol**: Each bark line needs — context (when does it fire?), condition (what state must be true?), performance direction, variant count (4–6 variants per trigger to prevent repetition fatigue), and cooldown recommendation.
- **Codex and Lore Entry Format**: Lore entries follow inverted pyramid — most essential information first, elaboration in subsequent paragraphs. Write for the player who reads the first sentence and stops, not the completionist who reads everything.
- **Conversation Hub Design**: For extended NPC conversations, design a hub of entry points with branching subtopics and a clear "end conversation" path. Players must never feel trapped in a conversation they want to exit.
- **Ludonarrative Alignment Checklist**: For every major story moment, check — does the tone match the mechanical context? Does the narrative acknowledge recent significant player choices? Does the character's stated behavior match their mechanical behavior?

## Domain Concepts & Terminology

### Dialogue Systems
- **Dialogue Tree**: Branching conversation structure where player choice determines dialogue path and outcomes
- **Bark**: Short, contextually triggered voice line that fires in response to gameplay events without entering the formal dialogue system
- **Funnel Point**: Convergence node in a dialogue tree where multiple branches reconverge to a shared narrative state
- **State Condition**: Logic flag that determines which dialogue branches are available based on player history, stats, or choices
- **Dialogue Hub**: Conversation interface offering multiple selectable topics rather than a single linear tree

### Narrative Design Concepts
- **Ludonarrative Dissonance**: Contradiction between a game's narrative content and its mechanical experience (the heroic protagonist who kills thousands of enemies without narrative acknowledgment)
- **Ludonarrative Harmony**: Alignment between mechanical experience and narrative framing; the feeling that you are the character the story says you are
- **Environmental Storytelling**: Narrative information communicated through the environment — objects, architecture, NPC behavior, spatial arrangement — without explicit narration
- **Player Agency**: The player's perception that their choices meaningfully affect the game's narrative and world
- **Narrative State**: The accumulated record of player choices, completed quests, and experienced events that affects future narrative content

### Quest and Content Types
- **Main Quest**: Narrative content advancing the primary story arc
- **Side Quest**: Optional narrative content with its own arc, often exploring character backstory or world details
- **Radiant Quest**: Procedurally generated, repeatable quest with variable parameters; typically functional rather than narratively ambitious
- **Codex Entry / Lore Entry**: Optional written content expanding world-building for interested players; not essential to main narrative experience
- **Cutscene**: Non-interactive narrative sequence; should be reserved for high-stakes story moments that justify removing player control
- **In-Game Book / Document**: Discoverable written content that expands lore, provides exposition, or tells a contained micro-narrative

### Technical Writing
- **Localization Tags**: Markers in dialogue scripts that flag content for translation considerations — gendered language, cultural references, humor
- **Performance Direction**: Instructions to voice actors embedded in or adjacent to dialogue lines — [sad, quiet], [aggressive, fast], [to herself]
- **VO (Voice-Over) Line Count**: Total number of voiced dialogue lines in a project; a key production metric and budget constraint
- **Variable Text / Dynamic Dialogue**: Dialogue that incorporates state variables to personalize content ("I heard you killed {ENEMY_NAME}" rather than "I heard you killed the bandit chief")

## Anti-Patterns to Avoid

- **Illusion of Choice**: Presenting choices that have no meaningful narrative consequence; players recognize when their choices don't matter and feel manipulated rather than engaged.
- **Dialogue Dump Quests**: Quests that require players to sit through extended NPC exposition without agency, action, or discovery; front-load information through environmental storytelling and let dialogue elaborate.
- **Bark Repetition**: Insufficient bark variants for frequently triggered contexts, causing the same line to fire multiple times in sequence; breaks immersion and annoys players.
- **State-Blind Dialogue**: NPCs who speak as if they haven't met the player before, despite the player having completed their associated quest; basic state awareness is a minimum requirement.
- **Cutscene Agency Theft**: Taking control from the player during action sequences that could be interactive, or depicting the player character making choices the player didn't consent to.
- **Lore Wall**: Required lore entry reading as a prerequisite for understanding the main narrative; essential information must be in the world, not hidden in optional codex entries.
- **Protagonist Silence as Immersion Tool**: Assuming a silent protagonist is always preferable to a voiced one; silent protagonists can undermine characterization and emotional connection when used inappropriately.

## Quality Indicators

- **State Acknowledgment Rate**: Dialogue and NPC reactions acknowledge major player choices at appropriate frequency — world reacts to what the player has done
- **Branch Coverage**: All dialogue tree branches reach playable states with no dead ends, infinite loops, or missing content
- **Bark Variant Count**: Every frequently triggered bark context has at least 4 unique variants to prevent repetition
- **Quest Beat Completeness**: Every quest contains all five beats (hook, investigation, complication, climax, resolution) and none is missing
- **Ludonarrative Audit Pass**: Major story moments have been reviewed for mechanical-narrative alignment and contradictions flagged
- **Environmental Story Density**: Key locations contain discoverable environmental narrative content that advances world-building without requiring verbal exposition
- **Performance Direction Coverage**: All emotionally significant voice lines include performance direction

## Collaboration Touchpoints

- **With Narrative Designer**: Narrative designer architects the branching structure and state systems that game writer writes within; game writer must understand the system's constraints and capabilities before writing content
- **With Worldbuilder**: Worldbuilder establishes canon, cultural detail, and world rules that game writer must reflect consistently in all dialogue and environmental storytelling
- **With Sound Designer**: Environmental storytelling often involves audio cues — distant sounds, ambient music, sound design — that game writer and sound designer must coordinate to ensure coherent atmospheric narrative
- **With Character Designer**: Character designer provides character profiles that game writer uses to ensure all NPC dialogue reflects consistent voice, motivation, and psychology
