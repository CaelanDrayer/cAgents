# Netcode Patterns

## Client-Server Model
- Server is authoritative
- Client sends inputs
- Server simulates and broadcasts
- Good for: Most games

## Peer-to-Peer
- No central server
- Direct connections
- Good for: Small player counts

## Synchronization Techniques

### Client Prediction
1. Client simulates locally
2. Server sends authoritative state
3. Client corrects if mismatch
4. Smooth correction over frames

### Server Reconciliation
1. Client sends input with timestamp
2. Server processes in order
3. Client replays from correction point

### Rollback Netcode
1. Save game state each frame
2. On late input, rollback
3. Resimulate with new input
4. Good for: Fighting games

## Lag Compensation

### Rewind System
1. Store past game states
2. On attack, rewind to attacker's view
3. Check hit detection
4. Apply result in present

### Favor Shooter vs Victim
- Shooter sees hit = hit (favor shooter)
- Or: Victim sees miss = miss (favor victim)
- Choose based on game genre

## Performance Tips
- Delta compression
- Prioritize important data
- Reduce tick rate when possible
- Cull distant entities
- Batch small updates
