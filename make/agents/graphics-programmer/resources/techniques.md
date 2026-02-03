# Rendering Techniques

## PBR Pipeline
- Albedo/Base Color
- Normal mapping
- Metallic/Roughness or Specular/Glossiness
- Ambient occlusion
- Emission
- Energy conservation

## Shadow Techniques
- **CSM**: Cascaded Shadow Maps for large scenes
- **VSM**: Variance Shadow Maps for soft shadows
- **PCSS**: Percentage Closer Soft Shadows
- **Contact hardening**: Distance-based softness

## Post-Processing Stack
1. HDR rendering
2. Bloom extraction and blur
3. Auto-exposure/eye adaptation
4. Tone mapping
5. Color grading
6. Anti-aliasing
7. Gamma correction

## Anti-Aliasing Comparison
- **MSAA**: Hardware, quality, expensive
- **TAA**: Temporal, good quality, ghosting
- **FXAA**: Fast, blurry edges
- **SMAA**: Balanced, morphological

## Volumetric Effects
- Ray marching in shaders
- Froxel-based for performance
- Temporal reprojection
- Light scattering integration
