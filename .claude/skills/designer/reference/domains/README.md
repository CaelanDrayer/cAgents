# /designer Domain Reference Docs

This directory holds one Markdown file per domain branch the `/designer`
skill supports. Each file follows the same four-section contract so
Phase 3 (Conceptualize) can pick a domain consistently, and Phase 6
(Specification) knows what artifacts to emit.

## 8-Domain Taxonomy (v12.7.x — post "design ANYTHING" expansion)

| # | Domain | Status | Reference doc | Chunk YAML | Bootstrap framings |
|---|--------|--------|---------------|------------|--------------------|
| 1 | Software | original | (legacy — in SKILL.md Phase 3 + `cagents-memory/_system/templates/designer/software_chunks.yaml`) | `software_chunks.yaml` (in cagents-memory) | system |
| 2 | Business | original | (legacy — in SKILL.md Phase 3 + `cagents-memory/_system/templates/designer/business_chunks.yaml`) | `business_chunks.yaml` (in cagents-memory) | process |
| 3 | Creative | original | (legacy — in SKILL.md Phase 3 + `cagents-memory/_system/templates/designer/creative_chunks.yaml`) | `creative_chunks.yaml` (in cagents-memory) | experience, artifact |
| 4 | Research / Scientific | NEW | `research.md` | `../../templates/research_chunks.yaml` | process |
| 5 | Education / Curriculum | NEW | `education.md` | `../../templates/education_chunks.yaml` | experience, process |
| 6 | Physical / Product | NEW | `physical-product.md` | `../../templates/physical_product_chunks.yaml` | artifact |
| 7 | Personal / Life | NEW | `personal.md` | `../../templates/personal_chunks.yaml` | process, experience |
| 8 | Game | NEW | `game.md` | `../../templates/game_chunks.yaml` | artifact, experience |

## Bootstrap framing → domain map (consumed by Phase-1 novice path)

The WI-5 Phase-1 topic-bootstrap asks novice users `"design what kind of thing?"`
with these high-level framings. Each framing routes to one or more domains.

| Framing | Routes to (default → fallback) |
|---------|--------------------------------|
| `system` (software, business process, infrastructure) | Software → Business |
| `process` (workflow, routine, study, lesson sequence) | Business → Research → Personal → Education |
| `experience` (event, course, story, gameplay session) | Creative → Education → Game |
| `artifact` (product, document, game, physical object) | Creative → Physical/Product → Game |
| `event` (one-off occurrence: wedding, launch, exhibit) | Creative → Business → Personal |

A framing may match multiple domains; the designer uses the user's
follow-up topic phrase to disambiguate, falling back to the framing's
default domain when ambiguous.

## The four-section contract

Every `<domain>.md` file MUST include exactly these four sections, in this
order, with these headings (`##` level). This contract is enforced by code
review and by the WI-9 regression test reading the contract file structure.

### 1. When to pick this domain

Two-to-five bullets describing the kinds of design problems this domain
handles. Include at least one concrete example phrase a user might type
to `/designer` (e.g. `"design a study on caffeine and sleep latency"`).

### 2. Phase 1-3 framing

How the designer should re-frame the Empathize / Define / Conceptualize
phases for this domain. Specifically:

- **Empathize**: who counts as "users/stakeholders" in this domain? (For
  some domains — e.g. Personal — the answer is "the designer themselves",
  and the question must reframe accordingly.)
- **Define**: what does the "problem statement" look like? What are the
  domain-specific constraint axes? (e.g. budget + deadline for Personal;
  fabrication tolerances + supply chain for Physical/Product.)
- **Conceptualize**: what mental models or solution paradigms exist in
  this domain? List 2-4 framings the designer should offer.

### 3. Phase 5 questions

The signature questions Phase 5 (Refinement) asks for this domain. Include
at least 4 concrete question templates that the designer should select
from when the user picks this domain. These are typically pulled from the
matching `<domain>_chunks.yaml` but the reference doc gives a human-readable
summary.

### 4. Phase 6 artifacts

The list of artifacts Phase 6 (Specification) should generate for this
domain. Typical artifact shapes per domain:

| Domain | Phase 6 artifacts |
|--------|-------------------|
| Software | user stories, technical spec, implementation checklist |
| Business | process flow, RACI, roadmap, change plan, risk register |
| Creative | story bible, character sheets, plot outline, world bible, style guide |
| Research | study protocol, analysis plan, IRB doc, data-management plan |
| Education | lesson plan, assessment rubric, syllabus, materials list |
| Physical/Product | bill of materials, CAD/sketch package, fabrication plan, QC checklist |
| Personal | habit ledger, decision matrix, weekly review template, accountability checklist |
| Game | mechanics doc, balance sheet, playtest protocol, level/encounter outline |

Each domain's Phase 6 section MUST also name the follow-up dispatch agent
(NOT `cagents:architect` or `cagents:backend-developer` for non-software
domains — see WI-2 acceptance criteria).

## Authoring rules

1. **Same four sections, same order, same `##` heading level** in every domain file.
2. **No software examples in non-software domain files.** A `research.md`
   that talks about JWT or API endpoints fails review.
3. **Name a real follow-up dispatch agent** that exists in the cAgents
   catalog (use `bash scripts/sync-agents.sh && grep <name> .claude-plugin/plugin.json`
   to verify). If no perfect match exists, fall back to the
   nearest neighbor (e.g. `cagents:technical-writer` for Education,
   `cagents:research-specialist` or `cagents:business-analyst` for Research).
4. **Pair every domain file with a chunk YAML** at `../../templates/<domain>_chunks.yaml`
   following the schema in that directory's README.
5. **Update this README's taxonomy table** when adding a new domain.

See `../../templates/README.md` for the matching chunk YAML schema.
