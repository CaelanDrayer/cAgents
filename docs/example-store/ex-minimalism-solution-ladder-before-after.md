---
name: ex-minimalism-solution-ladder-before-after
description: "Example: a worked before/after showing over-abstraction (strategy pattern + ABC + dataclass for one discount calc) collapsed to a 3-line function. It shows rung 1 (YAGNI) and rung 7 (write new code) of the minimal-solution ladder. Load when an execution agent is about to add a new abstraction."
license: MIT
compatibility: "Claude Code 2.x, cAgents 12.x"
metadata:
  id: ex-minimalism-solution-ladder-before-after
  category: minimalism
  source_repo: multica-ai/andrej-karpathy-skills
  source_url: "https://github.com/multica-ai/andrej-karpathy-skills"
  source_commit: 2c606141936f1eeef17fa3043a72095b4765b9c2
  reviewed: "2026-10-15"
  applies_to:
    - cagents:backend-developer
    - cagents:frontend-developer
    - cagents:reviewer
  demonstrates: "Over-abstraction (strategy pattern/ABC) vs a 3-line function: ladder rungs 1 and 7 in action."
  added: "2026-07-10"
---

# Example: Minimal-Solution Ladder, Worked

## Context
`pat-minimal-solution-ladder.md` states the ladder: YAGNI -> stdlib -> native ->
existing-dep -> one-liner -> minimum-viable-change. It has no code. This example
shows the ladder for a work item such as "WI-7: apply a loyalty-tier discount".

## Example

Before. Over-abstraction: flexibility that no caller asked for.

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass

class DiscountStrategy(ABC):
    @abstractmethod
    def apply(self, price: float) -> float: ...

@dataclass
class PercentageDiscount(DiscountStrategy):
    pct: float
    def apply(self, price): return price * (1 - self.pct / 100)

class DiscountEngine:
    def __init__(self, strategy: DiscountStrategy): self.strategy = strategy
    def calculate(self, price): return self.strategy.apply(price)

# usage
DiscountEngine(PercentageDiscount(10)).calculate(100)
```

**Problems:** an ABC, a dataclass, and an engine class for one percentage
calculation with one caller. Rung 1 (YAGNI) fails, because no second strategy
exists. The flexibility is imaginary.

After. The minimum viable change. Use rung 7 only when rungs 1-6 do not fit.

```python
def apply_discount(price: float, pct: float) -> float:
    return price * (1 - pct / 100)

# ponytail: single call site; no strategy abstraction until a second discount type appears (ladder rung 1)
apply_discount(100, 10)
```

The rule of three earns the abstraction. Extract `DiscountStrategy` only when a
second real discount type appears, not before. Add complexity only when you need
it. Mark the minimal choice with a `ponytail:` note so that it reads as deliberate.

## Why it matters
This gives execution agents and Stage-2 reviewers a concrete anchor when a
review asks "could this be simpler?". It also shows the correct use of the
`ponytail:` convention. Distilled from multica-ai/andrej-karpathy-skills
`EXAMPLES.md` (section 2, Example 1 Over-abstraction and Example 2 Speculative
Features).
