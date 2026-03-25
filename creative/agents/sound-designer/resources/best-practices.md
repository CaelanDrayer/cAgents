# Best Practices: Sound Designer

> Design principles, patterns, and frameworks that guide high-quality game sound design, Foley creation, spatial audio systems, interactive soundscapes, and emotional audio work.

## Design Principles

- **Sound Completes the World**: Visuals establish what is seen; sound design establishes what is real. A scene without appropriate sound is incomplete regardless of visual quality. Sound design is not support for visuals — it is an equal partner.
- **Diegetic Sound Is Narrative**: Sound that exists within the game world (footsteps, voices, ambient noise) tells its own story about the world's physical properties, its population, its history. Every environmental sound is a world-building opportunity.
- **Contrast Creates Impact**: A sound is only loud relative to quiet; a jump scare works because silence precedes it; a victory fanfare lands because struggle preceded it. Sound design is as much about what you don't hear as what you do.
- **Player Feedback Is Dialogue**: Audio feedback for player actions (weapon fire, successful hit, item pickup) is a conversation between the game and the player. This feedback should feel satisfying, informative, and consistent with the action's visual weight.
- **Emotional Audio Precedes Conscious Awareness**: Music and sound design affect emotion before players consciously register them. Use this to prime emotional states in advance of narrative events, not just to respond to them.
- **Spatial Audio Creates Embodiment**: Binaural and spatial audio techniques create a sense of physical presence in the game world. When sound responds accurately to space and movement, the player's sense of embodiment intensifies.
- **Dynamic Audio Systems Scale With Experience**: The best sound designs respond dynamically to game state — louder in crisis, quieter in safety; denser in chaos, sparser in calm. Dynamic systems that adapt to gameplay create authentic experiential audio.

## Key Patterns & Frameworks

- **Diegetic/Non-Diegetic Design Distinction**: Systematically categorize every audio element as diegetic (exists in game world: NPC conversations, footsteps, ambient noise) or non-diegetic (exists only for player: score, UI audio, intentional design). Design them with different tools and different intentions.
- **Acoustic Environment Design**: Define the acoustic properties of every major environment — reverb character, reflection patterns, frequency filtering, ambience density — before designing specific sounds for those environments. Sounds must fit their acoustic context.
- **Foley Design Protocol**: For character movement and interaction, design layered Foley systems — footstep material variants, clothing movement, object interaction. Foley requires surface/material tagging in the game engine and per-material audio variant sets.
- **Sound Design Trinity**: Three elements of every significant game sound — (1) Source recording (the real-world acoustic foundation), (2) Processing (transformation to fit the game's audio register), (3) Mixing (placement in the frequency and dynamic hierarchy). Each element requires separate attention.
- **Audio Feedback Quality Hierarchy**: Tier audio feedback sounds by player frequency and importance — frequently repeated feedback sounds (UI, footsteps) must avoid fatigue while remaining satisfying; infrequent feedback sounds (death, major achievement) can be more elaborate.
- **Emotional Soundscape Architecture**: For each game zone, design an emotional sound architecture — ambient music layer, environmental sound density, audio event frequency — that communicates the zone's emotional character before the player encounters any narrative content.
- **Dynamic Audio State Machine**: Define audio states (exploration, combat, danger, safe) with specific audio characteristics for each, and design transition rules between states. Audio state machines must handle interrupts, blends, and edge cases.
- **Psychoacoustics Application**: Use psychoacoustic principles — the equal-loudness contour, masking effects, binaural localization cues, the precedence effect — to design audio that achieves its emotional and informational goals within the constraints of consumer hardware.

## Domain Concepts & Terminology

### Diegetic/Non-Diegetic Audio
- **Diegetic Sound**: Sound that exists within the game world and can theoretically be heard by characters — footsteps, voices, ambient environment, physical interactions
- **Non-Diegetic Sound**: Sound that exists only for the player and doesn't exist within the game world — musical score, narrator voice-over, UI audio
- **Acousmatic Sound**: Sound whose source is not visible; creates mystery, threat, and spatial imagination
- **Source Ambiguity**: Deliberately uncertain diegetic/non-diegetic status; horror games frequently exploit this for unease

### Sound Design Elements
- **Foley**: Sound effects created in studio to match on-screen action; named after pioneer Jack Foley
- **Ambience / Room Tone**: The baseline sound of a space when no specific events are occurring; establishes acoustic environment and emotional register
- **Stinger**: Short, sharp sound effect used for emphasis or punctuation of a dramatic event
- **Audio Sweetener**: Sound effects layered on top of primary effects to add fullness, impact, or character
- **Impulse Response (IR)**: Recording of an acoustic environment's reverberation character; used for convolution reverb to place sounds convincingly in acoustic spaces

### Technical Audio
- **Reverb**: The persistence of sound after the sound source has stopped; characterized by early reflections and reverb tail; communicates space size and material composition
- **Attenuation**: Reduction of sound intensity with distance; must be calibrated to convey appropriate spatial scale
- **Occlusion/Obstruction**: Filtering of sound when passing through or around physical obstacles; gives spatial audio depth and realism
- **Binaural Audio**: Spatialized audio using head-related transfer functions (HRTFs) to simulate 3D sound positioning with headphones
- **Audio Middleware**: Software systems (Wwise, FMOD) managing dynamic audio playback, state-based mixing, and interactive audio systems

### Emotional Audio
- **Emotional Audio Architecture**: The combination of music, ambient sound, and event audio designed to produce a specific emotional state
- **Tension Build**: Progressive audio technique increasing density, pitch, or dynamic level to build anticipation
- **Jump Scare Audio**: Sudden high-amplitude, high-frequency sound paired with visual surprise; effective when preceded by silence or low-level audio
- **Leitmotif (Audio)**: Recurring musical or sound design motif associated with a character, location, or concept

## Anti-Patterns to Avoid

- **Sound Design as Afterthought**: Designing all audio after visual and mechanical design are finalized, without early involvement in production; sound design requires early access to game systems, environments, and narrative events to design effectively.
- **Volume Dependence**: Achieving audio impact through volume rather than contrast; audio that is simply loud throughout is not impactful — it's fatiguing.
- **Asset Repetition Without Variants**: Using single audio assets for frequently triggered events (footsteps, UI clicks, minor impacts) without variant sets; repetition is one of the most immediately noticed audio quality problems.
- **Acoustic Environment Neglect**: Designing sounds without considering the acoustic environment they'll play in; a sound that works in an outdoor environment will sound wrong in an indoor reverberant space without acoustic processing.
- **Non-Diegetic Volume Domination**: Music and non-diegetic audio overwhelming gameplay audio (footsteps, NPC dialogue, environmental sound); players need to hear the game world as a primary acoustic environment.
- **Static Ambience Loops**: Short ambient sound loops (under 2 minutes) for extended zones; players notice loop points and the repetition undermines immersion.
- **Ignoring Psychoacoustics**: Designing audio without knowledge of masking effects, equal-loudness curves, and binaural localization; technically correct audio that violates psychoacoustic principles can be fatiguing, unclear, or spatially unconvincing.

## Quality Indicators

- **Diegetic Completeness**: All major interactive objects, environments, and character movement types have appropriate diegetic sound
- **Acoustic Consistency**: Sounds are processed to match the acoustic environment they play in — indoor reverb, outdoor dryness, material reflection variations
- **Variant Density**: Frequently triggered sound events (footsteps, UI, common impacts) have minimum 4 variants to prevent repetition
- **Dynamic Audio Response**: Audio measurably changes between high-tension and low-tension gameplay states — density, dynamics, and frequency content differ
- **Audio Feedback Satisfaction**: Playtest feedback indicates that major player action feedback sounds (weapon fire, hit confirmation, ability activation) feel satisfying and weight-appropriate
- **Spatial Accuracy**: Players can accurately locate off-screen events by audio cue alone at least 75% of the time in controlled testing
- **Mix Legibility**: The full audio mix allows simultaneous critical audio elements (dialogue, player feedback, threat indicators) to be heard without masking each other

## Collaboration Touchpoints

- **With Music Composer**: Sound design and music share the frequency spectrum; sound designer and composer must coordinate frequency allocation, dynamic range, and mixing priorities. Sound design occupies frequencies that music cannot mask; combat sound design must not obscure musical leitmotifs.
- **With Animator**: Sound events for character animations (impact frames, footfall contacts, ability activations) must be synchronized; animator and sound designer must align on the timing events that trigger audio cues.
- **With Game Writer**: Environmental storytelling through sound — ambient dialogue, distant sounds, overheard conversations — requires coordination between game writer (what should be communicated) and sound designer (how to communicate it through audio).
- **With Narrative Director**: Director's emotional roadmap defines the atmospheric and emotional targets for each game zone and narrative moment; sound designer designs audio systems that deliver those emotional states within technical constraints.
