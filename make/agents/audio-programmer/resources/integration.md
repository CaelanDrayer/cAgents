# Audio Middleware Integration

## Wwise Setup
1. Create Wwise project
2. Define events and game syncs
3. Generate SoundBanks
4. Integrate SDK
5. Post events from game code
6. Set RTPC values for parameters

## FMOD Setup
1. Create FMOD Studio project
2. Design events with parameters
3. Build banks
4. Integrate API
5. Play events with 3D attributes
6. Set parameters for adaptive audio

## Voice Management
- Max concurrent voices (platform-dependent)
- Priority system (gameplay > ambient)
- Virtualization for culled sounds
- Voice stealing when at limit

## Spatial Audio
- Listener positioning (camera vs. player)
- Distance attenuation curves
- Occlusion/obstruction geometry
- Reverb zones and portals

## Performance Tips
- Stream large files (music, VO)
- Load banks asynchronously
- Pool event instances
- Profile CPU/memory usage
- Consider platform limits

## Common Parameters
- Distance (for attenuation)
- Health (for heartbeat, breathing)
- Speed (for footsteps, wind)
- Intensity (for combat music)
- Environment (for reverb)
