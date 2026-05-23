# /designer Templates Directory (Git-Tracked)

This directory holds the git-tracked chunk YAMLs that drive the per-domain
question pools the `/designer` skill loads during Phase 5 (Refinement) and
Phase 6 (Specification). Pre-existing chunk YAMLs for the original three
domains (`software`, `business`, `creative`) still live under
`cagents-memory/_system/templates/designer/` — those are NOT migrated in
v12.7.0+ (see `not_in_scope` in `plan.yaml`). All NEW domain chunk YAMLs
shipped after the "design ANYTHING" expansion land here.

## Why two locations

| Path | Tracked? | Holds |
|------|----------|-------|
| `cagents-memory/_system/templates/designer/` | NO (gitignored) | Original `software_chunks.yaml`, `business_chunks.yaml`, `creative_chunks.yaml`, plus runtime artifacts |
| `.claude/skills/designer/templates/` (this dir) | YES | All new domain chunks: `research`, `education`, `physical_product`, `personal`, `game`, plus future domains |

The loader in the `/designer` skill body reads BOTH locations — the cagents-memory
copy first for back-compat, then this directory. If both contain a chunk
YAML with the same `domain:` key, the git-tracked copy wins (newer +
authoritative). This dual-load is deliberate: it lets new domain branches
ship via PR without forcing a migration of the original three.

## Chunk YAML schema

Every `{domain}_chunks.yaml` file MUST satisfy this minimum schema. The
schema is derived from `cagents-memory/_system/templates/designer/software_chunks.yaml`
(the original reference) with one addition (`bootstrap_framings`) used by
the Phase-1 novice topic-bootstrap.

```yaml
# Top-level fields
domain: <string>                  # MUST match filename: <domain>_chunks.yaml
version: "<semver>"               # chunk-schema version (start at "1.0")
description: <string>             # one-line summary of what this domain covers

# Bootstrap routing — which novice framings route here (WI-5)
bootstrap_framings:               # list of strings from {system, process, experience, artifact, event}
  - process
  - artifact

# Question chunks (at least 8 entries for new domains; 12+ recommended)
chunk_templates:
  - chunk_id: chunk_001           # zero-padded, monotonic
    topic: <string>               # short label shown to the designer
    priority: critical|high|medium|low
    position: <int>               # ordering within the phase
    estimated_questions: <int>    # how many questions this chunk yields (typically 3-5)
    phase: empathize|define|conceptualize|ideation|refinement|specification

    questions:
      - question_template: <string>   # the actual question text shown to user
        question_type: <string>       # purpose|audience|context|technical|constraints|...
        expected_answers: open_ended|enum
        expertise_adaptation:         # OPTIONAL, recommended
          beginner: <string>
          expert: <string>

    synthesis_threshold: <int>    # OPTIONAL — number of answers before synthesis
    dependencies: []              # OPTIONAL — chunk_ids that must complete first
    unlock_condition: always|<expr>
```

## Three example chunk entries (schema reference)

```yaml
# Example A — Research domain, Empathize phase, "study population" question
- chunk_id: chunk_001
  topic: "Study Population & Stakeholders"
  priority: critical
  position: 1
  estimated_questions: 3
  phase: empathize
  questions:
    - question_template: "Who is the population this study draws inferences about?"
      question_type: audience
      expected_answers: open_ended
      expertise_adaptation:
        beginner: "Whose behavior or outcomes are you studying?"
        expert: "What is the target population, and what sampling frame approximates it?"
  synthesis_threshold: 1
  dependencies: []
  unlock_condition: always

# Example B — Education domain, Refinement phase, "learning outcomes" question
- chunk_id: chunk_007
  topic: "Learning Outcomes & Assessment"
  priority: high
  position: 7
  estimated_questions: 4
  phase: refinement
  questions:
    - question_template: "What specific learning outcomes should every learner demonstrate?"
      question_type: outcomes
      expected_answers: open_ended
      expertise_adaptation:
        beginner: "What should the learner be able to do at the end?"
        expert: "Map your outcomes to Bloom's levels and your assessment instruments."
  synthesis_threshold: 1
  dependencies: [chunk_006]
  unlock_condition: always

# Example C — Personal domain, Conceptualize phase, framing question (solo design)
- chunk_id: chunk_003
  topic: "Solo Design Framing"
  priority: critical
  position: 3
  estimated_questions: 2
  phase: conceptualize
  questions:
    - question_template: "Whose life is affected by this design (including yours)?"
      question_type: audience
      expected_answers: open_ended
      expertise_adaptation:
        beginner: "Who is this for — just you, or other people too?"
        expert: "Solo, partner, family, social network — what's the affected radius?"
  synthesis_threshold: 1
  dependencies: []
  unlock_condition: always
```

## Authoring rules for new domain chunks

1. **Filename**: `<domain>_chunks.yaml` where `<domain>` is lowercase, underscored if multi-word (e.g. `physical_product_chunks.yaml`).
2. **`domain:` field** at the top MUST match the filename slug exactly.
3. **At least 8 chunk entries** per domain (12+ for tier-3 domains like Research/Education).
4. **Cover at least 4 of the 6 phases** (empathize, define, conceptualize, ideation, refinement, specification).
5. **No software bias in non-software domains** — don't reuse `auth`, `JWT`, `API`, `database` examples in `research_chunks.yaml` or `game_chunks.yaml`.
6. **Pair every chunk YAML with a reference doc** at `../reference/domains/<domain>.md` that explains when to pick the domain and what artifacts Phase 6 produces.
7. **List `bootstrap_framings`** so the WI-5 Phase-1 novice path can route the user here.

See `../reference/domains/README.md` for the per-domain reference-doc contract.
