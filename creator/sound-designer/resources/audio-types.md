# Audio Types and Technical Reference

Detailed sound categories, technical specifications, implementation patterns, and production standards for game audio.

## Combat Audio

### Weapon Sounds

Every weapon has a sonic identity built from attack, contact, and aftermath:

**Melee weapons**:
- **Sword**: Metallic ring on draw, whoosh on swing (frequency varies with speed), distinct impacts per target material. Light swords: high-pitched, quick. Heavy swords: lower, with wind-up audible
- **Blunt weapons**: No ring on draw. Low-frequency thud on impact with sub-bass for weight. The "meat" of the impact is in the 100-300Hz range
- **Fists**: Skin-on-skin snap for light hits, bone-crack layer for heavy hits. Close-mic recorded punches sound nothing like movie punches -- real punches are quiet; game punches are designed for impact

**Ranged weapons**:
- **Bows**: String tension creak on draw, snap on release, whoosh in flight, distinct impact per material. Arrow flight should have subtle Doppler if passing the listener
- **Firearms**: Mechanical action (bolt, trigger), propellant crack, bullet travel (supersonic crack separate from muzzle blast), reflection off nearby surfaces. A gunshot in an alley sounds fundamentally different from a gunshot in a field
- **Magic**: No real-world reference, so the sound communicates the spell's nature through metaphor. Fire magic: crackle and roar. Ice magic: crystalline shatter and wind. Lightning: electric crack with ozone sizzle. Healing: warm, tonal, ascending

### Impact System

Build impacts from component layers that combine based on collision parameters:

| Layer | Purpose | Examples |
|-------|---------|---------|
| Transient | Initial contact crack | Click, snap, clang, slap |
| Body | Material resonance | Metal ring, wood crunch, flesh thud |
| Sweetener | Contextual detail | Debris scatter, spark, blood splatter |
| Sub | Weight/force | Sub-bass rumble scaled by impact force |
| Tail | Environmental response | Reverb, rattle, echo |

Impact severity scales: light contact (transient only), medium hit (transient + body), heavy hit (all layers + camera shake trigger), critical hit (all layers amplified + special sweetener).

### Death and Damage Audio

**Hit reactions**: Brief vocal (grunt, gasp) layered with impact. The vocal sells the pain; the impact sells the physics. Pitch and duration scale with damage severity.

**Death sounds**: Multiple variations essential (5-8 for player character, 3-5 for common enemies). Combine: final vocal, body impact with surface, equipment settle (armor clatter, weapon drop), and silence. The silence after a death is as designed as the sounds before it.

**Shield/armor feedback**: Blocked hits need distinct audio confirming "you blocked." Higher pitch, more metallic, shorter than flesh hits. The player should know from sound alone whether their block worked.

## Movement Audio

### Footstep System Architecture

**Surface types and characteristics**:
| Surface | Transient | Body | Character |
|---------|-----------|------|-----------|
| Stone | Sharp, bright click | Hard, resonant | Cold, deliberate |
| Wood | Softer click, creak | Hollow resonance | Warm, organic |
| Metal | Bright, ringing tap | Metallic ping | Industrial, exposed |
| Grass | Soft swish | Muted, natural | Quiet, organic |
| Gravel | Crunchy, multi-point | Shifting, gritty | Uneven, exposed |
| Water | Splash, displaced liquid | Ripple, drip | Wet, vulnerable |
| Sand | Very soft compression | Shifting, dry | Hot, exhausting |
| Snow | Compression crunch | Muffled, dense | Cold, isolated |
| Carpet | Nearly silent | Muffled, absorbed | Interior, civilized |
| Mud | Suction, squelch | Wet compression | Slow, difficult |

**Variation requirements**: 4-6 per surface per locomotion state (walk, run, sprint). With 10 surfaces and 3 states, that is 120-180 individual samples. Additional for: landing (short/medium/high fall), shuffling, scuffing, pivoting.

**Randomization**: Each playback applies random pitch offset (+-50-100 cents) and volume offset (+-1-2dB). Range narrow enough that footsteps still sound like the same character on the same surface.

### Character Foley

Continuous incidental sounds selling character physicality:

- **Armor/gear**: Metal plates clink, leather creaks, cloth rustles. Heavier armor = more Foley. Each gear type has distinct frequency content
- **Breath**: Intensity scales with movement speed and stamina. Idle: slow, quiet. Running: deep, rhythmic. Exhausted: ragged, gasping. Combat: sharp intakes between strikes
- **Equipment**: Weapon clinks against leg, backpack shifts, keys jingle. Very low volume, but their absence makes characters feel weightless

## Environmental Audio

### Soundscape Templates by Biome

**Forest (Daytime)**:
```
Bed: Wind through canopy (stereo, 3-5 min loop)
Detail: Bird calls (6-10 species, randomized, 3D positioned), insect buzz,
        branch creaks, leaf rustles, distant water
Event: Animal scurry, bird taking flight, distant branch snap
```

**Forest (Night)**:
```
Bed: Night ambience (quieter, different insects)
Detail: Owl hoots, cricket/frog chorus, underbrush rustling, prominent wind
Event: Wolf howl (distant), twig snap (tension), night bird call
```

**Dungeon/Cave**:
```
Bed: Deep room tone (very subtle low-frequency hum)
Detail: Dripping water (multiple positions, random timing), distant echoes,
        stone settling, air through passages
Event: Structural rumble, deep creature sounds, player echo return
```

**Urban**:
```
Bed: Traffic hum, crowd murmur (density varies by area)
Detail: Vehicle passes (3D, Doppler), distant horns/sirens,
        pedestrian snippets, pigeons
Event: Car alarm, distant shouting, construction, bells
```

**Desert**:
```
Bed: Wind with sand grain texture (intensity varies)
Detail: Heat haze hum (subtle low-frequency), distant wildlife (sparse),
        rock creak from thermal expansion
Event: Sand devils, distant animal calls, rock slide
```

**Ocean/Coastal**:
```
Bed: Waves (rhythm varies with weather, sub-bass in large waves)
Detail: Wind (constant, sea-salt quality), seabirds (distance-varied)
Event: Wave crash on rocks, boat creak, foghorn
```

### Weather Audio Systems

**Rain**: Intensity layers from drizzle to downpour. Surface-dependent (puddles splash, leaves patter, metal pings, stone runs). Indoor rain is muffled on roof and windows. Thunder distance = sound delay (3-second delay = 1km). Provide 6-10 thunder variations.

**Wind**: Continuous with intensity parameter. Low wind: gentle movement. High wind: howling, buffeting, debris. Interacts with geometry -- narrow passages whistle, open areas gust.

**Snow**: The quietest weather. Snow absorbs sound, reducing ambient range. Footsteps become primary. Falling snow is nearly silent -- the atmosphere is muffled isolation.

## UI and Feedback Audio

### Design Principles

UI sounds must be: instant (zero perceived latency), distinctive (confirm ≠ cancel ≠ navigate), non-fatiguing (pleasant after 500+ plays), consistent (same family), and informative (success/failure/blocked conveyed by sound).

**Positive actions**: Bright, affirming. Menu select: clean click (< 100ms). Confirm: ascending tone with resolution. Item pickup: brief, satisfying. Achievement: celebratory but not intrusive.

**Negative actions**: Discordant, shorter than confirmations. Error: low buzz or dull thud, not harsh. Cancel: descending tone. Warnings: rhythmic pulse with increasing urgency.

**Navigation**: Hover: very subtle tick. Scroll: light aggregate sound (not per-item in long lists). Tab switch: slightly more substantial. Menu open/close: spatial sound from menu direction.

### Notification Hierarchy

| Priority | Example | Design |
|----------|---------|--------|
| Critical | Incoming attack, system failure | Cuts through any mix, reserved frequency space |
| Important | Quest complete, level up | Audible but not alarming |
| Informational | New item available | Can be missed without consequence |
| Ambient | Friend online, timer tick | Barely perceptible |

## Creature Vocalization Design

### Emotional State Communication

| State | Vocal Characteristics |
|-------|----------------------|
| Idle | Low energy, relaxed breathing, occasional soft sounds |
| Alert | Sharp intake, low growl or chirp, elevated pitch |
| Aggressive | Loud, sustained, low-frequency roar or hiss |
| Attacking | Short explosive burst, synchronized with action |
| Pain | High pitch shift, interrupted pattern, reduced volume |
| Dying | Descending pitch, irregular rhythm, trailing to silence |
| Communicating | Patterned, repeating, tonal (implies intelligence) |

### Scale Communication Through Sound

- **Frequency**: Larger = lower fundamental. Mouse squeak: 2-4kHz. Dragon roar: 60-200Hz
- **Duration**: Larger vocalizations are longer. Small creature bark: 0.1s. Massive creature roar: 2-5s
- **Sub-bass**: Creatures above a certain size produce ground-shake frequencies felt more than heard
- **Environmental reaction**: Large footsteps produce secondary sounds: dust falling, objects rattling, structural creaks

### Creature Voice Construction

Non-human vocalizations built from layered organic sources, processed for alien but emotionally readable results:

- **Base**: Animal recordings (lions, tigers, elephants, whales) for organic foundation
- **Texture**: Human voice elements (breaths, growls, screams) pitched and processed
- **Sweetener**: Synthetic elements (distortion, granular synthesis, extreme pitch shifting)
- **Result must communicate emotion**: threat, pain, curiosity, satisfaction -- recognizable without language

## Technical Specifications

### Recording and Delivery Standards

| Spec | Source Recording | Game Delivery |
|------|-----------------|---------------|
| Sample rate | 96 kHz | 48 kHz |
| Bit depth | 24-bit | 16-bit |
| Format | WAV (uncompressed) | Platform-dependent (Vorbis/Opus/ADPCM) |
| Channels | Mono (3D), Stereo (UI/ambience) | Same |
| Normalization | Peak at -1dBFS | Per-asset, relative to mix |
| Silence | Remove before/after | Leave 10ms fade-in/out for click prevention |

### File Naming Convention

`{category}_{subcategory}_{detail}_{variation}.wav`

Examples: `footstep_run_concrete_01`, `weapon_sword_impact_metal_03`, `ambient_forest_bird_robin_02`, `ui_menu_confirm_01`, `creature_dragon_roar_aggressive_01`

### Memory Budget Guidelines

| Category | Typical Budget | Strategy |
|----------|---------------|----------|
| Footsteps (all surfaces) | 15-30MB | Uncompressed in memory |
| Combat SFX | 10-20MB | Compressed in memory |
| Ambient beds | 5-10MB loaded | Streamed from disk |
| Music | 0MB resident | Fully streamed |
| UI sounds | 2-5MB | Uncompressed in memory |
| Creature vocals | 10-20MB | Compressed, priority-loaded |
| **Total typical** | **50-100MB** | Mix of memory + streaming |

### Voice Priority System

When at maximum concurrent voices (32-64), cull by priority:

1. **Player sounds**: Never culled (weapons, footsteps, UI, damage)
2. **Dialogue**: Rarely culled (active speech)
3. **Nearby combat**: Important feedback
4. **Music**: Background but essential
5. **Close ambient detail**: Immersion
6. **Distant combat/ambient**: First candidates for culling

Voice stealing should be imperceptible -- only cull sounds below conscious attention.

### Middleware Integration

**Wwise/FMOD common patterns**:
- Events/cues rather than direct file playback
- RTPC (Real-Time Parameter Control) for dynamic parameters (distance, health, speed)
- Switch containers for material-based variations (footstep surface switching)
- Blend containers for layered sounds (weapon fire = multiple layers)
- Sound banks per area/level for memory management
- Auxiliary sends for environmental reverb (not per-sound)

## Production Checklist

- [ ] Asset list complete with priority ranking
- [ ] Hero sounds (player character, primary weapons) have original recordings
- [ ] Footstep system covers all gameplay surfaces with 4-6+ variations each
- [ ] Combat impacts layer correctly across material combinations
- [ ] Ambient soundscapes have bed, detail, and event layers per environment
- [ ] UI sounds are instant, distinctive, and non-fatiguing after 500+ plays
- [ ] Spatial audio: attenuation curves per sound type, occlusion configured
- [ ] Reverb zones match environment geometry and materials
- [ ] Mix hierarchy: player feedback > combat > dialogue > ambient > music
- [ ] Memory budget within platform allocation
- [ ] Voice limit configured with priority-based stealing
- [ ] All sounds named per convention and organized in middleware project
