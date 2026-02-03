# Navigation Systems

## A* Pathfinding
- Grid or NavMesh based
- Heuristic: Manhattan, Euclidean, Octile
- Optimizations: Jump Point Search, hierarchical

## NavMesh
- Runtime generation or baked
- Off-mesh links for jumps/drops
- Dynamic obstacles (carving)
- Path smoothing

## Steering Behaviors
- **Seek**: Move toward target
- **Flee**: Move away from target
- **Arrive**: Slow down at destination
- **Wander**: Random movement
- **Obstacle Avoidance**: Avoid collisions
- **Separation**: Space from neighbors
- **Cohesion**: Stay with group
- **Alignment**: Match group direction

## Crowd Simulation
- Flow fields for large groups
- Density-based avoidance
- Agent radius consideration
- Formation movement

## Performance Tips
- Hierarchical pathfinding
- Path caching
- Partial path recalculation
- Time-sliced processing
- LOD for distant AI

## Debugging
- Visualize paths
- Show perception cones
- Display AI states
- Log decision history
