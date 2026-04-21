# Product Context Loader

Documented procedure for the orchestrator's direct read of `product_context.yaml`
into `enriched_context.yaml`. This helper formalizes the existing INIT-state
behavior so `/run` loads persistent project knowledge without invoking the
`/context` skill. Added V10.26.7 as part of the `/context` utility demotion
arc (V10.26.6 – V10.26.10).

## Data File Contract

- **Canonical path**: `Agent_Memory/_projects/{project_hash}/product_context.yaml`
- **Hash computation**: first 8 characters of `sha256(pwd)` where `pwd` is the
  absolute project root path
- **Owner**: the `/context` skill (Claude-invoked utility) is the only writer
  after V10.26.6. The orchestrator is a read-only consumer.
- **Optional**: if the file is absent, the orchestrator proceeds without
  `project_summary`. No error, no user prompt.

## Load Procedure

The orchestrator runs this procedure during the INIT state, before writing
`workflow/enriched_context.yaml`:

1. Compute `project_hash = sha256(pwd).slice(0, 8)`.
2. Resolve `context_path = Agent_Memory/_projects/{project_hash}/product_context.yaml`.
3. If `context_path` does not exist: skip — set `project_summary` to `null`.
4. Read the YAML file.
5. Extract the `description` field as the primary summary signal.
6. Append `primary_language` and `framework` if present, to add routing signal.
7. Truncate the final string to the 500-character budget (`MAX_ATTENTION_CHARS`
   per `orchestration-reference.md:27`). If truncation occurs, end with `…`.
8. Inject the truncated string as `enriched_context.project_summary`.

### Pseudocode

```
project_hash = sha256(pwd).slice(0, 8)
context_path = `Agent_Memory/_projects/${project_hash}/product_context.yaml`

if not exists(context_path):
  project_summary = null
else:
  data = yaml.parse(read(context_path))
  parts = [data.description]
  if data.primary_language: parts.push(`(${data.primary_language})`)
  if data.framework: parts.push(`framework: ${data.framework}`)
  summary = parts.join(' ').trim()
  if summary.length > 500:
    summary = summary.slice(0, 499) + '…'
  project_summary = summary

enriched_context.project_summary = project_summary
```

## Budget Rationale

The 500-character cap comes from the `MAX_ATTENTION_CHARS` budget documented
in `orchestration-reference.md:27`. Exceeding the budget dilutes the
downstream planner's attention on the actual request. Callers that need the
full product context should read the source file directly rather than widen
this budget.

## Why This is a Helper, Not a Skill Call

The orchestrator does NOT invoke the `/context` skill during enrichment:

- `/context` is Claude-invoked after V10.26.6 (`metadata.user-invocable: "false"`);
  invoking it from another agent would add a subagent spawn and exceed the
  2-level nesting limit within `/team` wave execution.
- The orchestrator only needs READ access. The skill's write surface (`init`,
  `update`, `clear`) is irrelevant to enrichment.
- Direct YAML read is ~10ms; skill dispatch is ~2s of agent overhead.

The `/context` skill owns the WRITE path. This helper documents the READ path.
The two must not cross.

## Test Fixture Layout

Tests exercising this helper should create a fixture at:

```
Agent_Memory/_projects/{test_hash}/product_context.yaml
```

with a minimal payload:

```yaml
project_name: "test-fixture"
description: "A test project for the loader."
primary_language: "typescript"
framework: "vitest"
```

Then assert that the orchestrator's `enriched_context.yaml` contains a
`project_summary` field matching the description-derived string.

## Cross-References

- `orchestration-reference.md:18,27` — `enriched_context.yaml` schema and
  `MAX_ATTENTION_CHARS` budget.
- `.claude/skills/context/SKILL.md` — the WRITE-side utility.
- `.claude/rules/core/orchestration.md` — pipeline state machine.
- `tests/orchestrator/product-context-read.test.js` — V10.26.7 regression
  test covering this contract.
