# Best Practices: Game Programmer

> Design principles, patterns, and frameworks that guide high-quality gameplay programming, game logic, and interactive system development.

## Design Principles

- **Feel Over Fidelity**: Game feel — how controls respond, how actions give feedback — is more important than technical accuracy. A "wrong" physics response that feels right is correct.
- **Iterate with Playable Builds**: Get the core loop playable as early as possible and iterate based on feel, not theory — assumptions about fun are almost always wrong.
- **Data-Driven Design**: Expose gameplay parameters (speed, damage, timing, AI thresholds) as data, not constants — designers need to tune without code changes.
- **State is the Enemy of Clarity**: Every piece of hidden state is a potential bug; make game state explicit, inspectable, and serializable.
- **Frame Budget Awareness**: Game logic runs every frame — avoid heavy computation in the main update loop; use time-slicing, background threads, or event-driven patterns.
- **Fail Gracefully**: Games must keep running even when edge cases occur — prefer safe defaults over crashes for gameplay-affecting non-critical errors.
- **Decouple AI from Animation**: Separate what an AI wants to do (behavior) from how it looks doing it (animation) — enables independent iteration on each system.

## Key Patterns & Frameworks

- **Finite State Machine (FSM)**: Model character and AI behavior as discrete states (Idle, Walking, Jumping, Attacking) with defined transition conditions — clear, debuggable, and serializable.
- **Behavior Trees**: Hierarchical task decomposition for AI — nodes are Selectors (try in order), Sequences (must all succeed), and Leaves (atomic actions/conditions).
- **Game Loop Pattern**: `Input → Update → Render` cycle; separate fixed-timestep physics updates from variable-rate rendering.
- **Component Pattern (Unity/Godot Style)**: Compose game object behavior from modular components (Health, Movement, Inventory) — each component focuses on one concern.
- **Entity-Component-System (ECS)**: Full separation of entities (IDs), components (data structs), and systems (logic) — enables cache-friendly batch processing for many objects.
- **Observer / Event System**: Decoupled communication between game systems via events (OnPlayerDeath, OnPickupCollected) — avoids tight coupling between systems.
- **Object Pool**: Pre-allocate bullets, particles, and enemies at scene start; recycle rather than create/destroy — eliminates garbage collection hitches.
- **Command Pattern (Input Replay)**: Encode player actions as command objects that can be stored, replayed, and undone — enables replay systems and undo functionality.
- **Spatial Partitioning**: Divide game world into grid/quadtree/BVH cells to accelerate nearest-enemy queries, line-of-sight checks, and collision detection.
- **Coroutine / Async Pattern**: Express time-based sequences (wait 2 seconds, spawn wave, wait for player input) as coroutines rather than complex state machines.
- **Hit-Stop / Juice Techniques**: Brief freeze-frame, screen shake, particle burst, and sound on impactful events — dramatically increases perceived game feel.

## Domain Concepts & Terminology

### Gameplay Systems
- **Player Controller**: Component responsible for translating input to character movement; often the most iterated-on system in development
- **Character Controller**: Physics representation that handles character-environment collision without ragdoll physics constraints
- **Rigidbody**: Physics-simulated object with mass, velocity, and drag — affected by forces and collisions
- **Hitbox / Hurtbox**: Volume used to detect whether an attack connects (hitbox) vs. volume that can receive damage (hurtbox) — separate for correct fighting game feel
- **Projectile Motion**: Ballistic trajectory calculation (parabolic arc for grenades, ray cast for bullets)
- **Navigation Mesh (NavMesh)**: Walkable surface representation for AI pathfinding

### AI & Pathfinding
- **A\* Pathfinding**: Graph search algorithm finding the shortest path using a heuristic — standard for grid-based and navmesh pathfinding
- **Steering Behaviors**: Autonomous movement behaviors (seek, flee, arrive, separation, cohesion) composable for flocking and crowd simulation
- **Line of Sight (LOS)**: Raycast from AI to player to determine visibility — often paired with a field-of-view cone check
- **Perception System**: AI sensory model (sight, hearing, memory) — separates what the AI knows from what it does
- **Goal-Oriented Action Planning (GOAP)**: AI that plans action sequences to achieve goals — more flexible than behavior trees for complex AI

### Physics & Collision
- **Broad Phase Collision**: Fast spatial query to find potentially colliding pairs (AABB overlap)
- **Narrow Phase Collision**: Precise overlap test between specific pairs (GJK, SAT algorithms)
- **Trigger Volume**: Non-physical collision volume that fires events on enter/exit without physical response
- **Layer Collision Matrix**: Define which physics layers interact — prevents player bullets from hitting player, enemies from colliding with each other
- **Continuous Collision Detection (CCD)**: Prevents fast objects (bullets) from tunneling through thin geometry

### Input & Controls
- **Input Buffer**: Short window where a pressed input is remembered — allows players to queue actions and feel more responsive
- **Coyote Time**: Brief window after walking off a ledge where the player can still jump — improves platformer feel
- **Jump Squash/Stretch**: Scale the character on jump start (squash) and peak (stretch) — reinforces weight and energy
- **Dead Zone**: Area around joystick center where input is ignored — prevents drift and improves precision

## Anti-Patterns to Avoid

- **Magic Numbers in Game Logic**: Hardcoded `if (health < 50)` or `speed = 4.5f` scattered through code — use named constants and data-driven parameters so designers can tune without touching code.
- **God Script**: A single massive script handling movement, combat, inventory, and dialog — split into focused components that each handle one concern.
- **Allocating in the Game Loop**: Creating new objects (bullets, effects) by calling `new` every frame — use object pools; allocation triggers GC hitches that destroy frame rate consistency.
- **Coupling Animation to Logic**: Game state changing based on animation events, or vice versa, without a clean interface — creates fragile timing dependencies that break when animations are adjusted.
- **Synchronous Long Operations**: Loading assets, pathfinding a large graph, or iterating thousands of objects synchronously in `Update()` — use async, coroutines, or time-slicing.
- **Input Polling Without Dead Zones**: Reading raw joystick values without dead zone filtering — causes character drift on gamepads and frustrates players.
- **Float Imprecision in Time**: Using floating-point accumulation for game timers — use integer tick counts or fixed-step time tracking for precision.

## Quality Indicators

- **Core Game Loop Playable at 60fps**: The fundamental interaction cycle maintains frame rate target under typical gameplay load.
- **Zero Frame Hitches During Gameplay**: Memory profiler shows no GC spikes or large allocations during steady-state gameplay.
- **AI Response Time Under 16ms**: AI behavior tree or FSM updates complete within one frame budget.
- **Input Latency < 2 Frames**: Player input is reflected on screen within 2 frames — measured from physical button press to visual change.
- **All Game State Serializable**: Game state can be saved, loaded, and replayed — verifiable by save/load round-trip test.
- **Gameplay Parameters Externalized**: No magic numbers in gameplay scripts — all tunable values are in data assets or inspector-exposed fields.
- **Cheat/Debug Menu Available**: Development builds have a debug menu for teleportation, god mode, spawn override, and state inspection.

## Collaboration Touchpoints

- **With Engine Developer**: Consume engine APIs cleanly — don't bypass engine abstractions; surface performance requirements early so the engine team can provide appropriate systems.
- **With Game Designer**: Expose tunable parameters as data; build debug tools that let designers test changes without programmer involvement.
- **With QA Lead**: Define test scenarios for common gameplay edge cases (health at exactly zero, simultaneous inputs, disconnection during multiplayer) — many gameplay bugs require specific scenario recreation.
- **With Engineering Manager**: Surface frame budget risk early — "this feature works but costs 3ms per frame" is a delivery risk that needs architectural discussion.
