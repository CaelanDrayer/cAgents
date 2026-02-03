# Adaptive Music Systems

## Horizontal Resequencing
Play different sections based on game state.
- Exploration → Combat → Victory
- Seamless transitions between sections
- Stingers for events

## Vertical Layering
Add/remove layers based on intensity.
- Base layer (always playing)
- Tension layer (danger nearby)
- Combat layer (full intensity)
- Mix automation for smooth transitions

## Loop Design
- Musical phrases that loop seamlessly
- Avoid obvious repeat points
- Consider loop length for gameplay timing
- Intro/outro for entry/exit

## Stingers and Cues
- Short one-shots for events
- Discovery, achievement, death
- Must cut through existing music
- Consider ducking main music

## Music States (Example)
```
Exploration (low intensity)
  ↓ Enemy detected
Tension (building)
  ↓ Combat started
Combat (full intensity)
  ↓ Last enemy
Victory stinger + Exploration
```

## Technical Considerations
- Memory for stems/variations
- Crossfade times
- Sync points for transitions
- Middleware implementation
