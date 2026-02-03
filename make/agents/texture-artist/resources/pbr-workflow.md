# PBR Texturing Workflow

## Standard Maps
- **Albedo**: Base color (no lighting info)
- **Normal**: Surface detail
- **Roughness**: Micro-surface (0=mirror, 1=rough)
- **Metallic**: Metal vs non-metal (0 or 1)
- **AO**: Ambient occlusion (baked shadows)
- **Height**: Displacement/parallax

## Workflow Steps
1. **Bake** - High to low poly bakes
2. **Base Materials** - Smart materials
3. **Wear/Damage** - Edge wear, scratches
4. **Details** - Decals, unique details
5. **Polish** - Final adjustments

## Substance Painter Tips
- Work in layers
- Use generators for wear
- Add painted details last
- Check in-engine early
- Export with correct settings

## Common Issues
- Albedo too dark/light
- Roughness too uniform
- Missing cavity detail
- Seam visibility
- Resolution mismatch

## Resolution Guidelines
- Hero character: 4K
- Secondary character: 2K
- Props (large): 2K
- Props (small): 1K
- Tileables: 1K-2K

## Channel Packing
```
R: Metallic
G: Roughness
B: AO
A: Height (optional)
```
