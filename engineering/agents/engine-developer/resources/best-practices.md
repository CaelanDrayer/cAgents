# Best Practices: Engine Developer

> Design principles, patterns, and frameworks that guide high-quality game engine systems development, rendering pipelines, and core infrastructure.

## Design Principles

- **Performance is a Feature**: Engine systems run every frame at 16ms (60 fps) or 33ms (30 fps) — every allocation, branch misprediction, and cache miss has a direct cost to the player.
- **Data-Oriented Design First**: Organize data for cache efficiency rather than for object-oriented elegance — separate hot data from cold data, prefer SoA over AoS for batch processing.
- **Determinism for Reliability**: Physics simulation and gameplay logic should be deterministic given the same inputs — enables reproducible bugs, replay, and networking.
- **Platform Abstraction from Day One**: Abstract platform-specific APIs (graphics, audio, file I/O) behind interfaces — enables multi-platform support without rewrites.
- **Memory is the Bottleneck**: In modern hardware, CPU stalls waiting for memory dominate performance — design data layouts and allocation patterns to minimize cache misses.
- **Debug Instrumentation Always On**: Profiling hooks, memory trackers, and assertion systems must be available in all build configurations, not just debug builds.
- **Fail Loudly in Development**: Assert aggressively in development builds to catch contract violations early; use safe fallbacks only where a crash would harm players.

## Key Patterns & Frameworks

- **Entity-Component-System (ECS)**: Separate entities (IDs), components (data), and systems (logic) — enables data-oriented batch processing and cache-friendly iteration.
- **Game Loop (Fixed-Step with Variable Render)**: Fixed physics/logic update step (e.g., 20ms) decoupled from variable render step — separates simulation determinism from frame rate.
- **Data-Oriented Design (DoD)**: Organize data by access pattern rather than by object — SoA (Structure of Arrays) for SIMD and cache efficiency.
- **Object Pool (Memory Pool)**: Pre-allocate fixed blocks for frequently created/destroyed objects — eliminates heap fragmentation and allocation overhead.
- **Handle System**: Objects referenced via handles (index + generation) rather than pointers — enables safe invalidation, serialization, and defragmentation.
- **Render Queue with Sorting**: Collect all draw calls, sort by material/shader/depth, then submit in batches — minimizes state changes and draw calls.
- **Retained Mode Scene Graph**: Hierarchical scene representation that the engine traverses each frame; dirty flags minimize redundant transforms.
- **Job System / Task Graph**: Parallel task execution with dependency-ordered scheduling — distributes frame work across CPU cores.
- **Double Buffering / Triple Buffering**: GPU and CPU work on different frame buffers simultaneously — eliminates GPU stalls waiting for CPU data.
- **Spatial Partitioning**: Organize scene objects into spatial structures (BVH, octree, grid) to accelerate visibility culling and physics queries.
- **LOD (Level of Detail)**: Swap lower-fidelity meshes and textures at distance — maintains frame budget without visible quality loss.

## Domain Concepts & Terminology

### Rendering Pipeline
- **Vertex Shader**: GPU program that transforms vertex positions from model space to clip space
- **Fragment Shader (Pixel Shader)**: GPU program that computes the color of each pixel
- **Rasterization**: Converting vector geometry to raster pixels for the fragment shader
- **Z-Buffer (Depth Buffer)**: Per-pixel depth values used for hidden surface removal
- **Draw Call**: Command submitted to the GPU to render a mesh — minimize count via batching and instancing
- **State Change**: Changing GPU state (shader, texture, render target) between draw calls — expensive; sort draw calls to minimize
- **PBR (Physically Based Rendering)**: Material system based on real-world light behavior (albedo, metallic, roughness, normal)
- **Shadow Map**: Texture rendered from the light's point of view; used to determine which pixels are in shadow

### Memory & Performance
- **Cache Line**: 64 bytes of contiguous memory transferred between RAM and CPU cache in one operation
- **Cache Miss**: Accessing data not in cache; costs ~100 CPU cycles vs. ~4 cycles for L1 cache hit
- **SIMD (Single Instruction, Multiple Data)**: CPU instruction set for processing multiple data values simultaneously (SSE, AVX, NEON)
- **SoA vs. AoS**: Structure of Arrays (positions[], colors[]) vs. Array of Structures ([{position, color}, ...]) — SoA enables SIMD and avoids unused field cache pollution
- **Hot Path**: Code executed every frame by many objects — must be profiled and optimized
- **Allocator**: Custom memory allocator (linear/bump, stack, pool) designed for specific allocation patterns

### Physics Engine Concepts
- **Broad Phase**: Fast spatial query to find potentially colliding pairs (BVH, AABB sweep)
- **Narrow Phase**: Precise collision detection between specific pairs
- **Impulse Resolution**: Computing velocity changes to resolve collision — preserves momentum
- **Constraint Solver**: Iterative solver for joints, contacts, and constraints (Gauss-Seidel, PBD)
- **Fixed Timestep Integration**: Physics updates at a fixed rate (e.g., 50 Hz) regardless of frame rate — ensures determinism

### Engine Architecture
- **Subsystem**: A distinct engine domain (rendering, physics, audio, input, networking) with a clear API boundary
- **Event Bus**: Decoupled publish-subscribe system for inter-subsystem communication
- **Asset Pipeline**: The process of converting raw assets (FBX, PNG, WAV) to engine-optimized binary formats
- **Hot Reload**: Reloading assets or scripts at runtime without stopping the game — critical for artist and designer iteration speed

## Anti-Patterns to Avoid

- **Heap Allocation in the Hot Path**: Calling `new`/`malloc` during gameplay updates — causes unpredictable spikes from allocator and GC overhead.
- **Virtual Function Calls on Large Batches**: Calling virtual functions on thousands of objects per frame — defeats branch prediction and causes cache misses on vtable lookups.
- **Pointer-Heavy Object Graphs**: Interconnected objects via raw pointers in the hot path — forces random memory access patterns that thrash the cache.
- **Polling Everything Every Frame**: Checking every object's state every frame regardless of whether it changed — wastes CPU on idle objects; use dirty flags and event-driven updates.
- **Single-Threaded Rendering**: Preparing all render data on the main thread before submitting — leaves GPU cores idle while CPU catches up.
- **Untracked Asset Memory**: Loading assets without tracking ownership and reference counts — leads to memory leaks and use-after-free on level transitions.
- **Magic Numbers in Physics**: Hardcoded gravity, friction, and mass values scattered through code — makes tuning and platform-specific adjustments painful.

## Quality Indicators

- **Frame Budget Adherence**: Engine overhead (without game logic) consumes < 20% of the frame time budget (e.g., < 3ms on a 16ms budget).
- **Zero Per-Frame Heap Allocations in Gameplay**: Memory profiler shows no dynamic allocations during steady-state gameplay.
- **Cache Miss Rate < 5%**: Performance profiler shows low cache miss rate in critical hot-path systems.
- **Draw Call Count Within Budget**: Frame render submits fewer than the target draw call count (platform-dependent; often < 2000 for mobile, < 10000 for PC).
- **Physics Determinism Verified**: Replaying the same input sequence produces identical game state on all target platforms.
- **Platform Abstraction Layer Coverage**: All platform-specific code is behind a platform abstraction interface — zero direct platform API calls in generic engine code.
- **Asset Load Time Within Budget**: All assets load within the agreed time limit to prevent hitches during gameplay.

## Collaboration Touchpoints

- **With Game Programmer**: Provide stable, documented APIs for gameplay systems to consume — the engine team enables gameplay engineers to work without needing to understand engine internals.
- **With Engineering Manager**: Report frame budget utilization and performance trends per milestone — engine performance is a measurable deliverable.
- **With Architect**: Align on subsystem boundaries and data flow between engine systems — engine architecture decisions have long-tail maintenance consequences.
- **With DevOps Engineer**: Coordinate on automated performance regression testing in CI — frame time regressions should be caught by automation, not by a player.
