# Best Practices: Animator

> Design principles, patterns, and frameworks that guide high-quality character animation, motion systems, and expressive movement work.

## Design Principles

- **Movement Reveals Character**: Every motion choice is a characterization choice. How a character moves expresses who they are before they speak a word. Walk cycles, idle animations, and reaction timing all communicate personality.
- **Anticipation Before Action**: Major movements require preparatory motion (wind-up, weight shift) that telegraphs intent and makes the action readable, grounded, and satisfying.
- **Follow-Through Completes Motion**: Movement does not stop at the action's endpoint — it continues as mass settles, clothing swings, and secondary elements resolve. Cutting motion short reads as mechanical.
- **Secondary Animation Adds Believability**: Hair, clothing, accessories, and soft body elements respond to primary motion with appropriate delay and elasticity. These secondary systems transform rigid animation into believable physicality.
- **Emotional States Drive Timing**: A character's emotional state should be readable in their timing, not just their facial expression. Grief moves slowly; excitement moves quickly; fear moves in sharp, irregular bursts.
- **Consistency Enables Recognition**: Characters should have consistent motion signatures — identifiable movement personalities — that persist across all animations in the catalog.
- **Performance First, Technical Second**: Solve the performance problem (what does the character feel, what are they communicating) before solving the technical problem (how do the joints move).

## Key Patterns & Frameworks

- **12 Principles of Animation (Disney)**: Squash and stretch, anticipation, staging, straight-ahead vs. pose-to-pose, follow through and overlapping action, slow in and slow out, arcs, secondary action, timing, exaggeration, solid drawing, appeal. These principles remain the foundational framework for all character animation.
- **Pose-to-Pose Planning**: Define key poses first, then fill in the breakdown poses and in-betweens. Key poses carry the storytelling weight; breakdowns carry the personality.
- **Straight-Ahead for Energy**: Use straight-ahead animation (drawing each frame in sequence) for chaotic, energetic, or unpredictable motion where pose-to-pose planning would feel too controlled.
- **Timing Charts**: Explicit notation of spacing between frames to control speed, weight, and elasticity. Tight spacing at extremes = slow in/out; uniform spacing = mechanical; increasing spacing toward extremes = snappy/elastic.
- **Weight and Gravity Systems**: Every character has implied mass. Animation must demonstrate that mass through ground contact, momentum carry, resistance to motion initiation, and deceleration.
- **Animation State Machine Design**: For game animation, defining states (idle, walk, run, jump, attack, react) and the transition conditions between them. State machines must handle interrupts, blends, and edge cases gracefully.
- **Motion Capture Integration Protocol**: When working with mocap data, clean pass removes artifacts and noise; performance pass adjusts timing and exaggeration to match the game's visual register; polish pass adds secondary animation and cleanup.
- **Emotion-to-Motion Mapping**: Systematic translation of emotional states into specific motion parameters — speed, arc shape, spacing, weight, facial timing — ensuring consistent emotional legibility across the character catalog.
- **Blend Tree Architecture**: For smooth transitions between animation states, designing blend trees that weight between animations based on speed, direction, elevation, or emotional state parameters.

## Domain Concepts & Terminology

### Core Animation Principles
- **Squash and Stretch**: Exaggeration of compression on impact and extension during motion to convey mass and elasticity
- **Anticipation**: Preparatory motion opposite to the main action that telegraphs intent and builds momentum
- **Follow-Through**: Continuation of movement past the main action endpoint as momentum dissipates
- **Overlapping Action**: Different parts of the body or object move at different rates, creating organic, non-mechanical timing
- **Slow In / Slow Out (Ease In/Out)**: Spacing frames so motion accelerates out of holds and decelerates into them, simulating real-world inertia
- **Arcs**: Natural motion follows curved paths, not straight lines; broken arcs read as mechanical or jarring

### Technical Animation Terms
- **Walk Cycle**: Looping animation of bipedal locomotion; the foundational animation for character movement
- **Idle Animation**: Subtle motion while a character is stationary, communicating breath, weight, and personality
- **Root Motion**: Animation driven by the root bone's world-space movement, as opposed to in-place animation that relies on game code for positioning
- **Blend Shape / Morph Target**: Vertex-level deformation for facial animation and secondary shape changes
- **Inverse Kinematics (IK)**: Constraint-based animation where the endpoint position drives the chain (feet on ground, hand on wall) rather than forward kinematics
- **Animation Retargeting**: Applying animation data from one skeleton rig to another, requiring careful joint mapping and proportion correction

### Game Animation Specifics
- **Bark**: Short, contextual animation triggered by game events (wincing on damage, reacting to explosion)
- **Transition Animation**: Blending or bridging animation between two states to prevent popping
- **Hit Reaction**: Character response to taking damage; must communicate the hit's direction, weight, and the character's current health state
- **State Machine**: Logic graph defining animation states and the conditions governing transitions between them
- **Locomotion Blend Space**: 2D or 3D blend tree controlling movement animations across speed and direction parameters

### Performance & Style
- **Snappy**: Animation style with tight spacing at extremes and fast movements; reads as energetic, game-y
- **Floaty**: Animation style with extended ease-in/out and slow extremes; reads as low gravity or supernatural
- **Grounded**: Animation style emphasizing weight, foot contact, and resistance; reads as realistic or weighty
- **Performance Arc**: The emotional journey visible in a single animation clip — character's emotional state at start, inflection point, and resolution

## Anti-Patterns to Avoid

- **Robotic Symmetry**: Mirroring motion on both sides of the body without variation produces machine-like results; humans have subtle asymmetry in all motion.
- **Popping**: Abrupt, instant transitions between animation states with no blending or transition animation; destroys immersion and reads as technical failure.
- **Floating Feet**: Characters sliding along the ground without proper foot contact during walk/run cycles is the most commonly noticed animation flaw in games.
- **Unmotivated Motion**: Adding secondary animation (head bob, cloth sway) without a physical cause — no wind, no impact, no underlying motion — reads as noise, not performance.
- **Ignoring Weight**: Animating a character as if they are weightless, with no deceleration on stops, no anticipation before movement, and no impact on landings, fundamentally breaks believability.
- **Over-Exaggeration for Realism**: Exaggeration serves stylized work; applying cartoon squash-and-stretch principles to a photorealistic character destroys the aesthetic register.
- **Neglecting Transition States**: Building polished primary states without designing the transitions between them leaves a broken-feeling animation system regardless of individual clip quality.

## Quality Indicators

- **Character Legibility**: A viewer unfamiliar with the character can identify their emotional state from the animation alone, without other context
- **Weight Consistency**: The character's mass feels consistent across all animations — the same character in an idle and a jump-landing has the same implied weight
- **Transition Smoothness**: State machine transitions are invisible to players during normal gameplay; no pops, snaps, or jarring blend artifacts
- **Secondary Animation Presence**: At least 20% of primary motion clips include secondary animation elements (hair, clothing, accessories) that respond physically
- **Performance Specificity**: Animations communicate specific emotions, not generic states — "grief-laden walk" not just "slow walk"
- **Loop Integrity**: All looping animations (idle, walk, run) return cleanly to their start pose with no visible seam
- **Rig Compliance**: All animations operate within the rig's technical constraints with no joint flipping, gimbal lock, or skinning artifacts

## Collaboration Touchpoints

- **With Character Designer**: Character designer establishes the physical and psychological profile that animation must express; movement personality should be derived from character design documentation
- **With Sound Designer**: Animation timing determines where sound events fire; walk cycle contact frames, impact moments, and vocal sync require close coordination between animation and audio
- **With Game Programmer**: Animation state machine logic is implemented in code; programmer and animator must agree on state names, transition parameters, blend tree architecture, and IK constraints before either can finalize their work
- **With Concept Artist**: Concept art establishes the visual register (stylized, realistic, exaggerated) that defines the appropriate animation style; proportion guides from concept art inform squash/stretch parameters
