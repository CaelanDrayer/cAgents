# Game Audio Types

## Combat Sounds
- Weapon fire/swing
- Impacts and hits
- Reloads and actions
- Death sounds

## Movement Sounds
- Footsteps (surface-based)
- Cloth and gear
- Jumps and lands
- Climbing

## UI Sounds
- Menu navigation
- Confirmations
- Errors
- Notifications
- Achievements

## Ambient
- Environmental loops
- Weather effects
- Crowd/activity
- Time of day

## Creature/Character
- Vocalizations
- Attacks
- Idle sounds
- Death

## Production Notes
- Record at 96kHz, deliver at 48kHz
- Mono for 3D, stereo for UI/music
- Variations: 3-5 per common sound
- Naming: category_subcategory_variation

## Optimization
- Compress ambient loops
- Short sounds: stream from memory
- Long sounds: stream from disk
- Prioritize gameplay feedback
