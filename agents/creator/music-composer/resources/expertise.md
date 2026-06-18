# Music Composer: Expertise Catalog

Detailed compositional craft reference for the music-composer agent — thematic composition/leitmotif systems, adaptive music systems (horizontal resequencing + vertical layering), orchestration, loop design, and emotional scoring. The SKILL.md body keeps Core Philosophy, Methodology, Quality Standards, and Anti-Patterns; this file carries the deep reference tables and enumerations.

## Expertise

### Thematic Composition and Leitmotif

**The Leitmotif System**: Assign musical themes to characters, locations, ideas, and emotions. These themes recur, transform, and combine throughout the score to create a musical narrative that parallels the game's story.

**Building a Leitmotif**:
- **Melodic identity**: A strong leitmotif is singable in 4-8 notes. If it can't be hummed, it's not memorable enough.
- **Harmonic character**: The harmony surrounding the melody colors its meaning. The same melody in major feels heroic; in minor, it feels tragic. Shifting harmonic context as the story progresses transforms the theme's meaning.
- **Instrumental identity**: Associate themes with specific instruments. The hero's theme on French horn feels different from the same theme on solo cello. Instrumentation IS character.
- **Transformability**: A good leitmotif must be malleable. It should work at different tempos, in different keys, in different orchestrations, in fragments, inverted, augmented. The theme must survive transformation while remaining recognizable.

**Thematic Development Across a Game**:
1. **Introduction**: Theme stated clearly and memorably (main menu, opening cutscene)
2. **Establishment**: Theme recurs in its primary context (character's home area, faction territory)
3. **Variation**: Theme appears in new contexts -- different instrumentation, tempo, harmony
4. **Fragmentation**: Only fragments of the theme appear, creating recognition without full statement
5. **Transformation**: Theme changes character to reflect story development (hero's theme becomes dark when they face moral compromise)
6. **Climactic statement**: Full, powerful statement at the game's emotional peak
7. **Resolution**: Final statement that reflects the story's conclusion (triumphant, bittersweet, tragic)

### Adaptive Music Systems

**Horizontal Resequencing**: The music plays different sections based on game state, arranged end-to-end. The composition is broken into segments that can be assembled in different orders.

**Segment Types**:
| Type | Purpose | Design Requirements |
|------|---------|-------------------|
| Intro | Entry into a music state | Establishes key, tempo, feel. Plays once. |
| Loop | Main body of a state | Must loop seamlessly. 30-120 seconds typical. |
| Transition | Bridge between states | Smooths key/tempo/instrumentation changes. 2-8 bars. |
| Stinger | Punctuates an event | Short (1-4 bars), musically decisive, cuts through mix. |
| Outro | Exit from a music state | Provides musical resolution before silence or new state. |

**State Machine Example**:
```
EXPLORE (calm, ambient)
  --[enemy spotted]--> TENSION (building, rhythmic pulse)
  --[combat starts]--> COMBAT (full intensity, driving rhythm)
  --[boss encounter]--> BOSS (unique theme, maximum intensity)
  --[enemy defeated]--> VICTORY (triumphant stinger + return to EXPLORE)
  --[player dies]--> DEATH (somber stinger + silence + respawn music)
```

Each transition needs a musical bridge that works regardless of when in the current loop the transition is triggered. This means writing transition segments from multiple possible exit points, or designing loops with regular sync points where transitions can occur cleanly.

**Vertical Layering (Vertical Remixing)**: The same piece of music plays continuously, but layers are added or removed based on game intensity. All layers are composed together, sharing the same tempo, key, and harmonic progression.

**Layer Architecture**:
| Layer | Content | When Active |
|-------|---------|-------------|
| Base/pad | Ambient harmony, sustained textures | Always (defines the harmonic foundation) |
| Rhythm (light) | Subtle percussion, rhythmic motif | Low tension, approaching activity |
| Melody | Main thematic material | Mid-intensity, recognizable state |
| Rhythm (full) | Full percussion, driving beat | High intensity, combat, action |
| Intensity | Brass hits, staccato strings, impacts | Peak intensity, boss fights, climax |

**The Golden Rule of Layering**: Every subset of layers must sound like a complete, intentional piece of music. The base layer alone sounds like ambient music. Base + rhythm sounds like light exploration. All layers together sounds like full combat. No combination should sound incomplete or broken.

**Transition Techniques**:
- **Crossfade**: Simplest. Fade one segment out while fading another in. Works for similar energy levels.
- **Musical transition**: Compose a specific bridge between states. Best quality, most work.
- **Beat-synced**: Wait for the next downbeat or bar line before transitioning. Musically clean.
- **Stinger override**: Play a one-shot musical event that masks the transition underneath.

### Orchestration for Games

**The Game Orchestra**: Game scores frequently use a hybrid approach combining orchestral instruments with electronic elements, synthesis, and ethnic/world instruments.

**Orchestration by Game State**:
| State | Orchestration Character | Typical Instrumentation |
|-------|------------------------|------------------------|
| Exploration | Open, spacious, few instruments | Solo woodwinds, harp, light strings, piano |
| Tension | Building density, rhythmic elements | Low strings (tremolo/ostinato), muted brass, percussion |
| Combat | Full, dense, aggressive | Full orchestra, heavy brass, driving percussion, choir |
| Mystery | Sparse, unusual timbres | Celesta, prepared piano, solo cello, electronics |
| Triumph | Bright, expansive, powerful | Full brass fanfare, strings, timpani, choir |
| Sadness | Intimate, restrained | Solo piano, solo cello/violin, muted strings |
| Horror | Dissonant, unsettling, unpredictable | Extended techniques, cluster chords, electronics, silence |

**Writing for Virtual Instruments**: Most game music is produced with sample libraries rather than live musicians. Key considerations:
- Velocity layers and round-robins prevent the "machine gun" effect on repeated notes
- Legato scripting creates realistic connected phrases
- Articulation mapping allows realistic performance (staccato, pizzicato, tremolo, marcato)
- Room/hall reverb creates cohesive spatial context across instruments
- Humanization: slight timing and velocity variations prevent robotic feel

### Loop Design

**The Invisible Loop**: The listener should never consciously hear where a loop repeats. Techniques:
- Avoid strong cadences at the loop point (V-I at the boundary screams "loop!")
- Use harmonic ambiguity at the boundary (suspended chords, pedal tones)
- Let a melodic phrase begin before the loop point and complete after it
- Design the last bar to flow into the first bar as naturally as any two consecutive bars
- Avoid distinctive sonic events near the loop point (a cymbal crash at the start of every loop becomes obvious fast)

**Loop Length Guidelines**:
| Context | Typical Length | Reasoning |
|---------|--------------|-----------|
| Exploration | 2-4 minutes | Players spend long periods exploring; short loops become obvious |
| Combat | 60-90 seconds | Combat is intense and short; long loops waste memory |
| Ambient/environment | 3-5 minutes | Background music that repeats too quickly breaks immersion |
| Menu/UI | 90-120 seconds | Players spend variable time in menus |
| Cutscene | Exact to picture | Scored to specific timing, not looped |

### Emotional Scoring

**The Emotion Map**: Before composing, map the game's emotional arc. What should the player feel in each area, at each story beat, during each type of gameplay?

**Musical Tools for Emotion**:
| Emotion | Musical Devices |
|---------|----------------|
| Joy/triumph | Major key, ascending melody, bright orchestration, strong cadences |
| Sadness/loss | Minor key, descending melody, sparse orchestration, unresolved harmony |
| Tension/dread | Dissonance, low register, tremolo strings, irregular rhythm, silence |
| Wonder/awe | Open harmony (fourths, fifths), high register, reverb, slow tempo |
| Urgency/action | Fast tempo, driving rhythm, short phrases, brass stabs |
| Mystery | Modal harmony (Dorian, Phrygian), unusual instruments, sparse texture |
| Nostalgia | Simple melody, warm orchestration, major with minor coloring |
| Epic scale | Low octave doubling, wide dynamic range, full orchestra + choir |
