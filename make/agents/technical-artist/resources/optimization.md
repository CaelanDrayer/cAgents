# Art Optimization Guidelines

## Texture Optimization
- Use appropriate resolution (2K for hero, 512 for background)
- Compress textures (BC, ASTC)
- Channel packing (mask maps)
- Mip-map generation
- Streaming for large textures

## Mesh Optimization
- LOD levels (100%, 50%, 25%, 10%)
- Draw call batching
- Mesh instancing
- Occlusion geometry
- Proxy meshes for physics

## Shader Optimization
- Minimize texture fetches
- Use half precision
- Avoid branching
- Bake when possible
- Profile GPU cost

## Memory Budgets (Example)
```
Character: 64MB (mesh + textures)
Weapon: 8MB
Environment tile: 4MB
VFX: 2MB
UI: 16MB total
```

## DCC Scripting Uses
- Batch export
- Naming convention enforcement
- LOD generation
- Collision mesh creation
- Texture resizing
- Pivot adjustment

## Common Issues
- Too many draw calls
- Overdraw in particles
- Unoptimized shaders
- Missing LODs
- Huge textures on small objects
