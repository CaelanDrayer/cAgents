# Gameplay Optimization

## Frame Budget
- 60 FPS = 16.67ms per frame
- 30 FPS = 33.33ms per frame
- Gameplay typically gets 2-5ms budget

## Object Pooling
- Pre-allocate common objects (bullets, effects)
- Avoid Instantiate/Destroy at runtime
- Pool size based on max concurrent use

## Memory Management
- Avoid allocations in Update loops
- Use structs for small, frequent data
- Cache component references
- Clear event listeners to prevent leaks

## Update Optimization
- Don't update every frame if not needed
- Use distance-based LOD for AI
- Batch similar operations
- Use spatial partitioning (quadtree, grid)

## Profiling Checklist
1. Profile in release/shipping build
2. Test on target hardware
3. Measure before optimizing
4. Focus on hotspots (90/10 rule)
5. Consider memory vs. CPU tradeoffs

## Common Pitfalls
- String operations in hot paths
- LINQ in Update loops
- Boxing/unboxing overhead
- Reflection at runtime
- Excessive GetComponent calls
