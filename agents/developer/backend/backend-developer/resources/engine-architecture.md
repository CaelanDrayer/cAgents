# Engine Architecture Patterns

## Subsystem Lifecycle
```
Init -> Configure -> Start -> Update -> Shutdown
Dependencies: Explicit ordering
Hot reload: Preserve state, reinit code
```

## Memory Architecture
- **Frame Allocator**: Reset each frame
- **Pool Allocator**: Fixed-size objects
- **Stack Allocator**: Nested allocations
- **Custom Allocators**: Per-subsystem

## Job System Design
```
Main Thread: Game logic, rendering commands
Worker Threads: Parallel tasks
Job Graph: Dependencies between tasks
Fiber-based: Lightweight switching
```

## Asset Pipeline
1. Source assets (FBX, PSD, WAV)
2. Import/conversion step
3. Cooking for target platform
4. Runtime loading (sync/async)
5. Hot reload during development

## Plugin Architecture
- Interface-based design
- Version compatibility
- Sandboxing considerations
- Load/unload lifecycle

## Build System Integration
- Incremental builds
- Asset cook times
- CI/CD pipeline
- Multiple configurations (Debug, Dev, Shipping)
