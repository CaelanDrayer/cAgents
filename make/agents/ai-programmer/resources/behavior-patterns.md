# AI Behavior Patterns

## Behavior Trees
```
Selector (OR): Try children until one succeeds
Sequence (AND): Run all children in order
Parallel: Run children simultaneously
Decorator: Modify child behavior
```

### Common Nodes
- Condition: Check game state
- Action: Do something
- Wait: Delay execution
- Repeat: Loop behavior

## Finite State Machines
Best for simple, predictable AI.
```
Idle -> Patrol -> Alert -> Attack -> Flee
Transitions: Events or conditions
```

## Utility AI
Score-based decision making.
```
Actions: [Attack, Flee, Heal, Patrol]
Score each based on context
Pick highest scoring action
```

## GOAP (Goal-Oriented Action Planning)
```
Goal: KillEnemy
Actions: [GetWeapon, MoveTo, Attack]
Planner finds valid action sequence
```

## Awareness States
1. **Unaware**: Normal patrol
2. **Suspicious**: Investigating
3. **Alerted**: Combat-ready
4. **Searching**: Lost target

## Boss AI Patterns
- Phase transitions
- Attack patterns
- Vulnerability windows
- Rage/enrage mechanics
