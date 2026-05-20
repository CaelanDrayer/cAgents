# Game Programming Patterns

## State Machine Pattern
```
States: Idle, Moving, Jumping, Attacking, Stunned
Transitions: Input-driven or event-driven
Benefits: Clear logic, easy debugging
```

## Behavior Tree Pattern
```
Root -> Selector -> [Attack, Patrol, Idle]
Each node: Success, Failure, Running
Benefits: Complex behaviors, reusable nodes
```

## Event System Pattern
```
Publisher.Emit("PlayerDied", data)
Subscriber.On("PlayerDied", handler)
Benefits: Decoupled systems, flexible
```

## Object Pool Pattern
```
Pool.Get() -> Active object
Pool.Return(obj) -> Back to pool
Benefits: No GC spikes, consistent performance
```

## Entity-Component-System
```
Entity: Just an ID
Component: Data only (Position, Health)
System: Logic (MovementSystem, DamageSystem)
Benefits: Data-oriented, cache-friendly
```

## Player Controller Checklist
- [ ] Input buffering
- [ ] Coyote time (late jump grace)
- [ ] Variable jump height
- [ ] Animation state sync
- [ ] Network prediction (if multiplayer)
