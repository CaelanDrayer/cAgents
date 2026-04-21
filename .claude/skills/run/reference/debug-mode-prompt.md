# Debug-Mode Controller Prompt Prefix (V10.26.12+)

Reusable prompt prefix injected into the controller spawn when `/run --mode debug`
is active. Landed dormant in V10.26.12; V10.26.13 wires it into the
PROMPTS_READY state. Subsequent patches (V10.26.14–17) extend the universal-validator
to enforce the artifacts this prefix asks the controller to produce.

## Prefix Text

> You are operating in DEBUG mode. Apply the 4-phase methodology:
> reproduce, pattern-analyze, hypothesis-test, implement. Record every
> hypothesis you test (and its result: confirmed or falsified) in
> `workflow/coordination_log.yaml` under a top-level `hypotheses_tested[]`
> array. A failing-test artifact is required in evidence before you
> implement any fix — the test must reproduce the bug and live under
> `tests/**`. If 3 hypotheses are falsified without a confirmed root cause,
> stop and escalate per `/debug` Escalation Rules (the validator will
> BLOCK the run automatically).

## Required Sentinels

The prefix text MUST contain these four sentinel strings. Automated tests
assert their presence so the prefix stays compatible with the
corresponding validator checks:

- `DEBUG` — announces the mode to the controller
- `4-phase` — references the methodology from `.claude/skills/debug/reference/methodology.md`
- `hypotheses_tested` — the canonical coordination_log key validator enforces (V10.26.15)
- `failing-test` — the evidence artifact validator enforces (V10.26.16)

## Where It Is Consumed

- V10.26.13 PROMPTS_READY controller spawn (see `delegation-patterns.md`)
- V10.26.18 `/debug` shim invokes `/run --mode debug`, inheriting this prefix

## Authoring Notes

Keep the prefix under 150 tokens so it fits cleanly into the controller spawn
prompt without crowding out the delegation prompt crafted by the
prompt-engineer agent. Revise copy before promoting checks — the prefix is the
source of truth for what the validator enforces.
