# 3D Modeling Workflows

## Character Pipeline
1. Block out proportions (low poly)
2. Sculpt high poly in ZBrush
3. Retopologize for game mesh
4. UV unwrap
5. Bake normal/AO maps
6. Create LODs
7. Export and validate

## Hard Surface Pipeline
1. Model in sub-d or box modeling
2. Add bevel/chamfer details
3. UV unwrap (hard edge splits)
4. Bake from high poly if needed
5. Create LODs
6. Export with proper pivots

## Environment Pipeline
1. Plan modular pieces
2. Model kit pieces
3. UV with texture atlasing
4. Optimize for instancing
5. Test in engine

## Polygon Budgets (Typical)
- Hero character: 20-50K tris
- NPC: 5-15K tris
- Prop (small): 100-500 tris
- Prop (large): 1K-5K tris
- Environment piece: 500-5K tris

## Common Issues
- N-gons (triangulate before export)
- Flipped normals
- Non-manifold geometry
- Poor UV seam placement
- Insufficient LOD reduction
