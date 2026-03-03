# Animation Types and Technical Reference

Detailed animation categories, timing data, state machine patterns, and production specifications.

## Locomotion Systems

### Walk Cycles

The walk cycle is the most frequently seen animation in most games. It reveals more about character personality than any other single animation.

**The mechanics of walking**: Walking is controlled falling. The body tips forward, one leg catches the fall, weight transfers, the other leg swings through. The pelvis rotates, the spine counter-rotates, the arms swing opposite to the legs. The head stays relatively level -- the body does the work of keeping the eyes stable.

**Personality through walk**:
| Character Type | Walk Characteristics |
|---------------|---------------------|
| Confident leader | Upright posture, long stride, minimal head movement, arms swinging freely |
| Nervous scholar | Hunched shoulders, short stride, frequent head turns, hands clasped or fidgeting |
| Weary soldier | Heavy footfalls, slight lean forward, arms hanging, head down |
| Agile rogue | Light footfalls, fluid weight shifts, head scanning, low center of gravity |
| Armored knight | Wide stance, deliberate steps, torso rotation from armor weight, restricted arm swing |

**Walk cycle timing**: At 30fps, a standard walk cycle is 24-30 frames per full step (both feet). Contact-down-pass-up for each foot. At 60fps, double frame counts. Faster walks reduce frame counts; slower walks (encumbered, elderly) increase them.

**Directional walks**: Forward walk, backward walk, left/right strafe, and 45-degree diagonal variants. Backward walk should feel different -- shorter stride, more tentative, frequent head turns. Strafe should show the character maintaining facing while moving laterally.

### Run Cycles

Running differs from walking fundamentally: there is a flight phase where both feet leave the ground. This flight phase is what makes running feel energetic -- it communicates effort and urgency.

**Run vs sprint**: A run is sustainable locomotion. A sprint is explosive, unsustainable speed. The sprint has a more extreme forward lean, longer stride, more aggressive arm pump, and a visible effort in the face and breathing.

**Transition animations**: The transitions between locomotion states are as important as the states themselves:
- Walk-to-run: 8-12 frames, the body leans forward and pushes off harder
- Run-to-walk: 8-12 frames, the body straightens and strides shorten
- Run-to-stop: 12-20 frames, deceleration with weight shift backward, potential skid on slippery surfaces
- Idle-to-run: 10-16 frames, the acceleration phase showing effort

### Quadruped Locomotion

Quadrupeds have fundamentally different gaits:

**Walk**: Diagonal pairs move together (front-left with rear-right). The body stays level. Four distinct footfalls per cycle.

**Trot**: Faster diagonal-pair movement with a brief flight phase between pairs.

**Canter**: Asymmetric three-beat gait. One rear leg pushes off, both front legs reach, the other rear leg lands. Has a rocking motion.

**Gallop**: Full extension and full compression. Both front legs reach forward, both rear legs push off. Two distinct flight phases per cycle. The fastest gait.

**Creature-specific**: A spider's eight legs move in alternating groups of four. A serpent's body follows a sine wave. A bird walks with bobbing head motion (the head stays still while the body moves forward, then the head snaps forward). Each creature type has biomechanical logic that must be understood.

### Environmental Locomotion

**Slopes**: Walking uphill, the body leans forward, stride shortens, effort increases. Walking downhill, the body leans back, knees bend more on impact, the character brakes with each step. The angle of lean should match the slope angle.

**Stairs**: Ascending stairs, the leading knee rises higher than in flat walking. Descending stairs, the character lowers their center of gravity with each step. Stair animations must match the step height of the level geometry.

**Swimming**: Underwater locomotion has no ground contact. The body moves in three dimensions with the head tracking the camera. Surface swimming differs from diving. Treading water is an idle state with rhythmic leg and arm movements.

**Climbing**: Ledge climbing uses a hand-over-hand pattern with the body close to the surface. Ladder climbing has a rhythmic hand-foot-hand-foot pattern. Rope climbing uses arm pull and leg push. Each climbing surface type needs its own animation set.

## Combat Animation

### Attack Readability

Every attack animation has three phases, and each serves a different gameplay purpose:

**Telegraph (anticipation)**: The wind-up that warns the player or opponent what is coming. Duration defines how readable the attack is. Fast telegraphs (4-8 frames) are hard to react to. Slow telegraphs (12-24 frames) are readable and blockable. Boss attacks have the longest telegraphs because the player needs time to read and react.

**Action (the hit)**: The strike itself. Should be fast -- the fastest part of the animation. Visual impact happens here: motion blur, hit-stop (freezing 2-3 frames on impact), camera shake. The action frame count is typically 2-6 frames for fast attacks, 8-12 for heavy attacks.

**Recovery**: The follow-through and return to ready position. Defines the attack's commitment -- a long recovery window (16-30 frames) punishes missed attacks and creates counterattack opportunities. Recovery is where the game's combat balance lives: shorten recovery to make attacks safer, lengthen it to make them riskier.

### Combat Timing Reference

| Attack Type | Telegraph | Action | Recovery | Total |
|------------|-----------|--------|----------|-------|
| Light jab | 4-6 frames | 2-3 frames | 8-12 frames | 14-21 frames |
| Medium slash | 8-12 frames | 3-5 frames | 12-18 frames | 23-35 frames |
| Heavy overhead | 16-24 frames | 4-8 frames | 20-30 frames | 40-62 frames |
| Boss sweep | 24-36 frames | 6-10 frames | 24-36 frames | 54-82 frames |

(At 30fps. Double for 60fps.)

### Hit Reactions

Hit reactions communicate damage severity and direction. The reaction must match the force of the impact:

- **Light hit**: Head snap and shoulder flinch, 6-10 frames, character recovers quickly
- **Medium hit**: Torso recoil, stagger step backward, 12-18 frames
- **Heavy hit**: Full-body knockback, potential stumble, 18-30 frames
- **Directional**: Front hits push the body backward. Side hits twist the torso. Back hits pitch the body forward. The direction of the reaction must match the direction of the incoming attack

### Death Animations

Death is the most dramatic animation a character performs. Multiple death variations prevent repetition:

- **Standard death**: Collapse based on hit direction (forward fall, backward fall, side fall)
- **Dramatic death**: Stagger, grasp wound, attempt to stay standing, collapse. For important NPCs
- **Ragdoll transition**: Hand-keyed death that blends into physics-driven ragdoll at the right moment. The blend point is critical -- too early and the character goes limp unconvincingly; too late and the ragdoll snap is visible

### Combo Systems

Combo attacks chain together with each subsequent attack beginning from the recovery pose of the previous one:

- **Chain windows**: The frames during which the player can input the next attack in a combo (typically 6-12 frames during late action or early recovery)
- **Branch points**: Where different inputs lead to different combo paths (light-light-heavy vs light-heavy-light)
- **Escalation**: Later combo attacks should feel more powerful -- longer telegraph, bigger motion, more screen effect
- **Reset**: The final attack in a combo has extended recovery, returning the character to neutral stance

## Cinematic Animation

### Camera-Aware Performance

In-game cinematics differ from gameplay animation in one critical way: the animator controls the camera. This means:

- **Performance can be subtle**: Facial twitches, finger movements, eye darts. Things invisible during gameplay become powerful in close-up
- **Staging matters**: Characters should be positioned and posed for the camera angle, not for the game camera
- **Cheating is expected**: Adjusting character positions, eye lines, and body angles to read better on camera even if they would look wrong from another angle

### Facial Animation

The face communicates emotion through micro-expressions that last 1-5 frames:

**The six universal emotions** (Ekman): happiness (raised cheeks, lip corners up), sadness (inner brow raise, lip corners down), anger (brow lower, lip tightener), fear (brow raise, lip stretch), surprise (brow raise, jaw drop), disgust (nose wrinkle, upper lip raise).

**Lip sync**: Phoneme-based lip sync maps speech sounds to mouth shapes. The key visemes: closed (M/B/P), open (A/E), rounded (O/U), wide (E/I), teeth-on-lip (F/V), tongue (L/N/T/D). Lip sync does not need to be perfect -- the brain fills in gaps if the major visemes hit at the right time.

**Eye animation**: The eyes are the most important element of facial animation. Blink rate (every 2-4 seconds in conversation, faster when nervous), eye darts (small, fast shifts in gaze direction between saccades), pupil dilation (impossible to animate subtly but important for extreme emotions in close-up).

### The Uncanny Valley

The uncanny valley is deepest in facial animation for near-realistic characters. Mitigation strategies:

- **Stylize slightly**: Even "realistic" characters benefit from slightly enlarged eyes and exaggerated brow movement
- **Keep eyes alive**: Dead eyes (no micro-movements, no blink variation, no moisture) are the fastest path into the valley
- **Asymmetry**: Real faces are asymmetric in expression. One eyebrow raises more than the other. One lip corner moves first. Symmetric expressions read as masks
- **Breathing**: Characters who are not breathing look dead. Subtle chest and shoulder movement during dialogue keeps them alive

## State Machine Patterns

### Basic Locomotion State Machine

```
Idle <-> Walk <-> Run <-> Sprint
  |        |        |        |
  +------- Jump ----+--------+
  |                           |
  +------- Fall --------------+
  |                           |
  +------- Land --------------+
```

Every transition between states needs a blend animation. The blend duration depends on how different the states are: idle-to-walk blends in 4-8 frames; sprint-to-idle needs 12-20 frames of deceleration.

### Combat State Machine

```
Ready <-> Light Attack -> Light Attack -> Light Attack -> Recovery -> Ready
  |                         |                               |
  +----> Heavy Attack ------+----> Heavy Attack -> Recovery -+
  |                                                          |
  +----> Block/Parry --------> Counter Attack -> Recovery ---+
  |                                                          |
  +----> Dodge Roll -----------------------------------------+
  |                                                          |
  +----> Hit Reaction ------------> Stagger ---------> Ready +
                                      |
                                      +----> Death
```

### Root Motion vs In-Place

**Root motion**: The animation drives the character's position. The walk animation physically moves the character through space. Advantages: precise foot placement, no foot sliding. Disadvantages: harder to blend, less responsive to input changes.

**In-place animation**: The animation plays in place; the game code drives movement. The walk cycle loops without translation; the game moves the character at the appropriate speed. Advantages: responsive, easy to blend. Disadvantages: foot sliding if speed does not match animation.

**Hybrid**: Use root motion for committed actions (attacks, rolls, climbs) and in-place for responsive movement (locomotion, strafing). This gives precise control during important moments and responsiveness during moment-to-moment gameplay.

## Motion Design Principles

### Weight Communication

- **Heavy**: Slow acceleration, slow deceleration, minimal bounce, visible effort on the character's body, ground impact effects, camera shake on landing
- **Light**: Fast acceleration, fast deceleration, bouncy, effortless movement, no ground impact, no camera reaction
- **Massive**: Everything about heavy but more extreme, plus environmental reaction (floor cracks, walls shake, objects rattle)

### Momentum and Inertia

Objects in motion resist changes in direction. A running character cannot instantly turn 180 degrees -- they must decelerate, shift weight, and accelerate in the new direction. The heavier the character, the wider the turning radius and the longer the direction change takes.

### The Physics of Falling

- Free fall: acceleration due to gravity (9.8 m/s/s). The character should not fall at constant speed
- Terminal velocity: after falling for long enough, air resistance balances gravity. The falling pose transitions from arms-reaching to arms-trailing
- Impact: proportional to fall distance. Short falls: knee bend absorption. Medium falls: roll or heavy landing. Long falls: full-body impact with recovery time or death

### Additive Animation Layers

Additive layers modify a base animation without replacing it:

- **Upper body override**: Aiming a weapon while running (base: run cycle, additive: aim pose on spine and arms)
- **Facial layer**: Emotional expression on top of any body animation
- **Breathing layer**: Chest and shoulder movement additive to all body states
- **Hit flinch**: Brief additive flinch that plays on top of whatever the character is doing

Additive layers are cheaper than full-body animation variants and allow combinatorial complexity (any emotion + any locomotion + any upper-body action).
