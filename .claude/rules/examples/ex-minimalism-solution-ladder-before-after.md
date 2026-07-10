---
name: ex-minimalism-solution-ladder-before-after
description: "Example: a worked before/after showing over-abstraction (strategy pattern + ABC + dataclass for one discount calc) collapsed to a 3-line function — the minimal-solution ladder's rung 1 (YAGNI) and rung 7 (write new code) in action. Load when an execution agent is about to add a new abstraction."
license: MIT
compatibility: "Claude Code 2.x, cAgents 12.x"
metadata:
  id: ex-minimalism-solution-ladder-before-after
  category: minimalism
  source_repo: multica-ai/andrej-karpathy-skills
  source_url: "https://github.com/multica-ai/andrej-karpathy-skills"
  applies_to:
    - cagents:backend-developer
    - cagents:frontend-developer
    - cagents:reviewer
  demonstrates: "Over-abstraction (strategy pattern/ABC) vs a 3-line function — ladder rungs 1 and 7 in action."
  added: "2026-07-10"
---

# Example: Minimal-Solution Ladder, Worked

## Context
`pat-minimal-solution-ladder.md` states the YAGNI -> stdlib -> native -> existing-dep
-> one-liner -> minimum-viable-change ladder but ships no code. Here is the ladder in
action, for a work item like "WI-7: apply a loyalty-tier discount".

## Example

Before — over-abstraction (speculative flexibility no caller asked for):

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

**Problems:** an ABC + dataclass + engine class for one percentage calculation with
one caller. Rung 1 (YAGNI) fails: no second strategy exists. The "flexibility" is
imaginary.

After — the minimum viable change (rung 7 only after 1-6 genuinely don't fit):

```python
def apply_discount(price: float, pct: float) -> float:
    return price * (1 - pct / 100)

# ponytail: single call site — no strategy abstraction until a second discount type appears (ladder rung 1)
apply_discount(100, 10)
```

The rule-of-three earns the abstraction: extract `DiscountStrategy` only when a
*second* real discount type appears, not before. Add complexity when you actually
need it, marked with a `ponytail:` note so the minimal choice reads as deliberate.

## Why it matters
Gives execution agents and Stage-2 reviewers a concrete anchor when review flags
"could this be simpler?", and shows the `ponytail:` convention used correctly.
Distilled from multica-ai/andrej-karpathy-skills `EXAMPLES.md` (Over-abstraction /
Speculative Features).
