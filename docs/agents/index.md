# Agent Catalog

## Summary

60 agents across 9 builder-role archetypes (developer 8, operator 8, advisor 4, analyst 5, creator 3, writer 4, strategist 3, core 16, leadership 9). Post-v12.20.0 catalog consolidation from 141 (44 routable + 16 core; absorbed agents use mode flags). The per-domain breakdowns below are LEGACY routing-overlay groupings (the 13-domain pre-v11.1.0 layout, kept for routing-keyword continuity); the canonical structure is the 9 archetypes.

## Engineering (31 agents)

| Agent | Tier | Role |
|-------|------|------|
| tech-lead | controller | Day-to-day engineering coordination |
| architect | controller | System design, architectural decisions |
| security-lead | controller | Security coordination |
| backend-developer | execution | API, database, business logic |
| frontend-developer | execution | UI components, state management |
| senior-developer | execution | Complex implementation |
| devops | execution | Deployment, CI/CD |
| infrastructure-lead | execution | Infrastructure coordination |
| qa-lead | execution | Testing strategy |
| reviewer | execution | Code review |
| security-specialist | execution | Security review |
| security-analyst | execution | Vulnerability assessment |
| dba | execution | Database optimization |
| data-analyst | execution | Data analysis |
| data-lead | execution | Data team coordination |
| tech-lead | execution | Technical leadership |
| backend-lead | execution | Backend team coordination |
| frontend-lead | execution | Frontend team coordination |
| frontend-aesthetics | execution | UI/UX polish |
| ux-designer | execution | User experience design |
| performance-analyzer | execution | Performance profiling |
| accessibility-checker | execution | Accessibility audit |
| architect --review | controller | Architecture review (mode flag on architect; absorbed architecture-reviewer in v12.0.0) |
| code-standards-auditor | execution | Code standards |
| dependency-analyzer | execution | Dependency analysis |
| dependency-auditor | execution | Dependency security |
| test-coverage-validator | execution | Test coverage |
| risk-assessment | execution | Risk evaluation |
| it-support | execution | IT support |
| sysadmin | execution | System administration |
| engine-developer | execution | Game engine programming |
| game-programmer | execution | Gameplay programming |
| vp-engineering | execution | VP-level engineering |

## Creative (30 agents)

| Agent | Tier | Role |
|-------|------|------|
| narrative-director | controller | Creative coordination |
| story-architect | controller | Story structure |
| editor | execution | Content editing |
| copy-editor | execution | Copy editing |
| dialogue-specialist | execution | Dialogue writing |
| prose-stylist | execution | Prose quality |
| genre-specialist | execution | Genre-specific writing |
| worldbuilder | execution | World creation |
| character-designer | execution | Character creation |
| character-psychologist | execution | Character psychology |
| plot-developer | execution | Plot development |
| sensitivity-reader | execution | Sensitivity review |
| continuity-checker | execution | Continuity verification |
| setting-designer | execution | Setting creation |
| lore-keeper | execution | Lore management |
| narrative-designer | execution | Narrative design |
| narrative-game-designer | execution | Game narrative |
| game-writer | execution | Game writing |
| concept-artist | execution | Concept art direction |
| animator | execution | Animation direction |
| music-composer | execution | Music composition |
| sound-designer | execution | Sound design |
| ai-writing-detector | execution | AI content detection |
| ai-writing-rewriter | execution | AI content rewriting |

## Business (28 agents)

Strategy, product, operations, finance. Includes: marketing-strategist (absorbed campaign-manager, product-marketing-manager, seo-strategist in v12), sales-strategist, finance-manager, operations-manager, strategic-planner, product-owner, game-designer, copywriter, and additional specialists.

## People (0 — config-only)

The legacy `people/` domain is **routing-overlay only** as of v11.1.0 — the directory holds `config/domain_overrides.yaml` (router keywords + controller catalog) but ships zero SKILL.md files. People-domain requests route through this overlay to active agents under the `operator/people-ops/` archetype branch (hr-manager, talent-acquisition-manager, recruiter, compensation-analyst, learning-specialist, etc.). See CLAUDE.md § "Domain overlay (legacy — routing/config only)" for the full overlay model.

## Service (28 agents)

Customer support, CX, legal, compliance, governance. Key agents: customer-success-manager, legal-counsel, support-director, general-counsel, compliance-director, compliance-officer.

## Leadership (9 agents)

C-suite executives used by `/team` strategic mode (auto-enabled when `router.domain_count >= 2`; v12.2.0+). Pre-v12.2.0 these agents were invoked by the now-removed `/org` skill. The 9 agents: CEO, CTO, CFO, CMO, CRO, COO, CCO, CHRO, CPO. (CSO, CLO, VP-Engineering removed in v12.20.0 consolidation.)

## Core (16 agents)

Pipeline infrastructure: trigger, orchestrator, planner (absorbed `task-decomposer` and `prompt-engineer` in v12.0.0), executor, validator, router, self-correct, hitl, optimizer, task-state (absorbs task-merger in v12.20.0), team (replaces the standalone `team-trigger` and `team-lead-adapter` agents removed in v12.0.0 — the `/team` skill loop now does this work inline), coordinator, reviewer, wave-reviewer, coord-log-writer, team-lead.

## Shared (12 agents)

Cross-domain intelligence: bi-specialist, competitive-intelligence-analyst, data-scientist, economist, historian, linguist, market-research-analyst, philosopher, political-analyst, psychologist, sociologist, translator.

## Growth (34 agents)

Marketing, sales, revenue operations: account-executive, affiliate-marketing-manager, brand-manager, channel-partner-manager, content-marketing-manager, conversion-rate-optimizer, copywriter, creative-director, demand-generation-manager, digital-marketing-manager, email-marketing-specialist, events-coordinator, field-marketing-manager, growth-marketer, influencer-marketing-specialist, inside-sales-rep, marketing-analyst, marketing-ops-specialist, marketing-strategist (v12 absorbs campaign-manager, product-marketing-manager, seo-strategist), media-buyer, partnership-marketing-manager, pr-specialist, pricing-analyst, proposal-specialist, revenue-operations-manager, sales-analyst, sales-development-rep, sales-enablement-specialist, sales-engineer, sales-strategist, seo-specialist, social-media-manager, territory-manager, video-marketing-specialist.

## Science (10 agents)

STEM research: astronomer, biochemist, biologist, chemist, ecologist, geoscientist, mathematician, physicist, science-coordinator, statistician.

## Health (5 agents)

Medical and wellness: fitness-coach, medical-advisor, mental-health-advisor, nutritionist, pharmacist. Uses coordinator from core.

## Education (5 agents)

Teaching and tutoring: academic-researcher, academic-tutor, curriculum-designer, language-tutor, teacher-coach. Uses coordinator from core.

## Personal (5 agents)

Career and life coaching: career-counselor, life-coach, personal-finance-advisor, productivity-coach, relationship-coach. Uses coordinator from core.

## Arts (5 agents)

Visual arts, music, film: arts-director, film-director, music-producer, photographer, visual-artist. Uses coordinator from core.

## Trades (5 agents)

Culinary, construction, automotive: agronomist, automotive-technician, chef, construction-advisor, fashion-designer. Uses coordinator from core.
