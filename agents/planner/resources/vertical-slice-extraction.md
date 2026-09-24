# Vertical-Slice Extraction

The planner extracts a vertical slice as the last action inside Work Item
Generation, step 5. Steps 2 through 4 finish their normal exhaustive-breadth
work first, untouched. This algorithm is baked into the existing 5 steps. It
is not a new step 6.

## Slice-detection algorithm

The planner walks the finished, untainted dependency graph. It pulls the
minimal connected chain of work items that touches every category the
request exercises. The planner skips a category with zero items. The
algorithm tags that chain `vertical-slice`.

The algorithm runs after the graph is complete. It never contaminates step 2
through step 4's exhaustiveness, because it reads the graph, and it does not
rebuild it.

## Wave-1 rule

For `/team`, the planner always emits the vertical-slice wave as `wave: 1`.
This is the first wave inside the wave-reviewer's already-gated loop. Wave 0
stays reserved for pure bootstrap. The planner never retypes Wave 0 as
`vertical-slice`.

For `/act`, this constraint does not apply. `parallel_groups` has no
reserved-index concept. The vertical slice is the first group in
`critical_path` and in `parallel_groups`.

## Small-plan collapse

Sometimes `vertical_slice.work_item_ids` equals the full work-item list.
Then the first wave, or the first group, is the only one. The planner types
it `vertical-slice`. It adds no synthetic extra wave, and no empty
depth-fill wave.

## On slice failure

A failed slice routes through the existing bounded REVISE cycle. The cap
stays at 3 cycles. See .claude/rules/playbooks/pat-gate-taxonomy.md for the
Revision gate type. The cycle triggers earlier than usual, not only at the
end. This design needs no new gate type.

## Edge cases

- **Pure-UNDERSTAND request**: the slice equals the UNDERSTAND items
  present. This collapses to the small-plan case, with one wave and no
  split. The checkpoint fires once, at plan completion. This case is
  redundant with the terminal validator. The redundancy is harmless,
  because the checkpoint is WARN-only.
- **Single-item plan**: slice-complete and plan-complete coincide.
- **Item mid-reviewer-loop**: an item counts as completed only after its
  bounded reviewer loop resolves. The checkpoint cannot fire on a
  still-contested item.
- **Vertical-slice wave with zero build items**: the regression guard,
  Check 6, skips `npm test` through the conditional bucket. See
  agents/wave-reviewer/resources/gate-check-protocol.md for Check 6's rule.
