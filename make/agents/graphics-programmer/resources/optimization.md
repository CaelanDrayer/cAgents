# GPU Optimization

## Frame Analysis
1. Capture with RenderDoc/PIX/NSight
2. Identify GPU-bound vs CPU-bound
3. Find most expensive passes
4. Check overdraw
5. Analyze shader complexity

## Draw Call Optimization
- Instancing for repeated objects
- Batching similar materials
- GPU-driven rendering
- Indirect draw calls

## Shader Optimization
- Minimize register pressure
- Avoid dynamic branching
- Use half precision where possible
- Reduce texture fetches
- Consider ALU vs bandwidth tradeoffs

## Memory Bandwidth
- Texture compression (BC, ASTC)
- Streaming and mipmaps
- G-buffer format optimization
- Render target pooling

## Common GPU Bottlenecks
- Vertex shading (too many verts)
- Geometry throughput (dense meshes)
- Pixel shading (complex shaders)
- ROP (overdraw, blending)
- Texture bandwidth (large textures)
- Memory latency (cache misses)

## Profiling Tools
- RenderDoc (cross-platform)
- PIX (Windows/Xbox)
- NSight (NVIDIA)
- Radeon GPU Profiler (AMD)
- Xcode GPU Profiler (Apple)
