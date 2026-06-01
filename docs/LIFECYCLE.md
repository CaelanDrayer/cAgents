# cAgents Catalog — Lifecycle View

This doc maps the 141 cAgents agents (post-v12.7.0) onto a Define→Plan→Build→Verify→Review→Ship
software-lifecycle axis. This is an orthogonal view to the canonical role-based
archetype tree (see CLAUDE.md § Project Overview).

**Purpose**: discoverability for newcomers who think in terms of *what phase of work*
they're in, rather than *which role they need*. Each agent appears once per lifecycle
phase it serves — most agents appear in exactly one phase; some span 2-3.

**Source of truth**: the archetype tree (`developer/`, `operator/`, `advisor/`,
`analyst/`, `creator/`, `writer/`, `strategist/`, `core/`, `leadership/`) remains
canonical. This doc is a derived index regenerated periodically.

**Last regenerated**: 2026-05-20 (v12.0.2)

**Inspiration**: addyosmani/agent-skills uses a Define→Plan→Build→Verify→Review→Ship
catalog spine; mattpocock/skills uses bucket directories as lifecycle states. cAgents
keeps the role-based tree as canonical (for routing, ownership, and config inheritance)
but exposes this lifecycle view as a secondary index for newcomer discoverability.

---

## Define (~45 agents)

*Agents that help scope, frame, and clarify requirements before any design begins.
Research, market scans, persona work, problem statements, scenario planning, theme
analysis — everything upstream of "what are we building?"*

| Agent | Archetype | Description |
|-------|-----------|-------------|
| academic-researcher | advisor | Academic literature review, research design, methodology selection, academic writing support |
| curriculum-designer | advisor | K-12 and higher education curriculum development, learning objective creation, lesson planning |
| legal-analyst | advisor | Researching legal precedents, analyzing regulatory impact, preparing legal briefs |
| career-counselor | advisor | Career exploration, job search strategy, resume coaching, interview preparation |
| life-coach | advisor | Goal setting, values clarification, habit formation, and life transitions |
| productivity-coach | advisor | Time management, task prioritization, deep focus, and overcoming procrastination |
| academic-paper-searcher | analyst | Searches academic literature via OpenAlex (250M+ papers, no API key) |
| business-analyst | analyst | Gathering requirements, performing gap analysis, defining acceptance criteria |
| business-researcher | analyst | Researching market opportunities, analyzing industry trends, competitive scans |
| citation-graph-analyzer | analyst | Maps citation networks across academic and gray-literature corpora |
| competitive-intelligence-analyst | analyst | Tracking competitor activity, analyzing market positioning, competitive briefs |
| literature-review-author | analyst | Synthesizes prior academic and industry work into structured literature reviews (PRISMA) |
| market-research-analyst | analyst | Conducting market research, analyzing customer segments, evaluating market size |
| methodology-critic | analyst | Evaluates research methodology rigor — sample sizing, control design, power |
| performance-analyst | analyst | Analyzing performance metrics, identifying bottlenecks, planning capacity |
| predictive-analyst | analyst | Building predictive models, creating forecasts from historical data |
| concept-artist | creator | Creating visual concepts for characters, environments, props, vehicles |
| ux-designer | developer | Designing user experiences, creating wireframes, building user flows |
| risk-assessment | developer | Assessing technical risk for proposed changes, evaluating blast radius of refactors |
| brand-manager | operator | Developing brand strategy, maintaining brand consistency, brand guidelines |
| geo-strategist | operator | Generative Engine Optimization (GEO) — getting cited by ChatGPT, Claude, Perplexity |
| marketing-analyst | operator | Analyzing marketing performance data, building attribution models |
| marketing-strategist | operator | Coordinates marketing strategy, campaigns, product marketing, and SEO |
| pricing-analyst | operator | Analyzing pricing strategies, modeling price elasticity, competitive pricing |
| sales-analyst | operator | Analyzing sales pipeline data, forecasting revenue, identifying deal patterns |
| sales-strategist | operator | Developing sales strategies, defining target segments, territory coverage |
| compensation-analyst | operator | Analyzing compensation structures, benchmarking salaries against market data |
| hr-analyst | operator | Analyzing HR metrics, building people analytics dashboards, workforce trends |
| hr-business-partner | operator | Aligning HR strategy with business unit goals, advising leaders on people decisions |
| learning-specialist | operator | Designing training programs, creating learning content, competency frameworks |
| onboarding-specialist | operator | Designing onboarding programs, creating new hire experiences, 30/60/90 day plans |
| workforce-planning-analyst | operator | Forecasting headcount needs, modeling attrition scenarios, workforce demand |
| business-development-manager | strategist | Developing strategic partnerships, exploring new market opportunities |
| game-designer | strategist | Designing game mechanics, creating reward systems, balancing gameplay loops |
| product-owner | strategist | Feature prioritization, product roadmap planning, user stories, acceptance criteria |
| scenario-planner | strategist | Developing future scenarios, identifying strategic uncertainties, contingency plans |
| strategic-planner | strategist | Developing long-term strategy, analyzing competitive positioning, strategic goals |
| character-designer | writer | Creating characters with psychological depth, applying wound/want/need frameworks |
| creative-researcher | writer | Researching settings, historical periods, cultural details, technical subjects |
| genre-specialist | writer | Working within specific genre conventions, subverting genre expectations |
| narrative-designer | writer | Engineering reading experience, designing narrative flow at micro and macro scale |
| narrative-game-designer | writer | Designing interactive narrative systems, branching story structures |
| setting-designer | writer | Designing story settings, creating location profiles, atmospheric detail |
| theme-analyst | writer | Analyzing thematic content, tracking thematic development, theme-plot alignment |
| worldbuilder | writer | Constructing fictional universes, designing world systems (cosmology, culture, ecology) |

---

## Plan (~37 agents)

*Agents that design architecture, decompose work, sequence delivery, and produce
execution plans. The "how" before any keystroke of implementation.*

| Agent | Archetype | Description |
|-------|-----------|-------------|
| coordinator | core | Parameterized controller for lightweight domains (health, education, personal, arts, trades) |
| orchestrator | core | Enriches request context at pipeline start, detects domain and complexity |
| task-merger | core | Reduces task inventory context overhead, merging related tasks (40-88% reduction) |
| task-state | core | Manages CSV-based task state for large-scale workflows with 20+ items |
| team | core | Initializes team-mode execution (TeamCreate, wave planning); replaces the standalone `team-trigger` agent removed in v12.0.0 — the `/team` skill loop now drives this inline |
| trigger | core | Pipeline entry point — parses user requests, routes to /run or /team |
| planner | core | Creates plan.yaml + work_items.yaml + optional delegation_prompts.yaml |
| fashion-designer | creator | Garment design, pattern making, textile selection, trend analysis |
| film-director | creator | Cinematography, screenwriting, editing, production design |
| music-producer | creator | Recording, mixing, mastering, and DAW workflows |
| backend-lead | developer | Coordinates backend development across multiple engineers, reviews backend architecture |
| frontend-lead | developer | Coordinates frontend development, reviews UI architecture, frontend team velocity |
| architect | developer | System design decisions, evaluating technical approaches, designing API contracts |
| data-lead | developer | Coordinates data engineering work, reviews data pipeline architecture |
| tech-lead | developer | Leads technical direction on projects, makes architecture decisions, coordinates teams |
| infrastructure-lead | developer | Sets up CI/CD pipelines, configures infrastructure, debugs deployments |
| security-lead | developer | Coordinates security reviews, auth flow audits, input validation strategy |
| agile-coach | operator | Setting up sprint processes, managing backlogs, tracking velocity, coaching teams |
| change-management-specialist | operator | Planning organizational changes, training programs, internal comms |
| finance-manager | operator | Managing budgets, tracking financial performance, creating forecasts |
| operations-manager | operator | Optimizing operational processes, improving efficiency, managing workflows |
| planning-specialist | operator | Planning analytics, forecasting, facilitation, operations management |
| procurement-specialist | operator | Sourcing vendors, negotiating contracts, managing purchase orders |
| program-project-manager | operator | Scope definition, timeline creation, resource allocation, risk management |
| resource-planner | operator | Planning resource allocation, forecasting capacity needs, optimizing team utilization |
| supply-chain-manager | operator | Optimizing supply chain operations, managing inventory levels, logistics |
| creative-director | operator | Setting creative vision, reviewing campaign concepts, directing visual identity |
| organizational-development-specialist | operator | Designing organizational structures, facilitating team development |
| game-producer | strategist | Managing game production schedules, coordinating cross-discipline teams |
| okr-specialist | strategist | Setting OKRs, defining objectives and key results, tracking goal progress |
| portfolio-manager | strategist | Managing project portfolios, prioritizing initiatives, balancing resource allocation |
| roadmap-planner | strategist | Creating product or technology roadmaps, prioritizing features |
| narrative-director | writer | Structural guidance, pacing, character arc development |
| pacing-specialist | writer | Optimizing narrative pacing, balancing action with reflection |
| plot-developer | writer | Developing plot mechanics, engineering twists and reversals, subplot relationships |
| story-architect | writer | Evaluating story structure, designing narrative architecture |
| tension-architect | writer | Designing tension and suspense structures, emotional escalation |

---

## Build (~40 agents)

*Agents that produce the artifact. Code, copy, art, audio, contracts, documentation,
analyses, models — the actual work product.*

| Agent | Archetype | Description |
|-------|-----------|-------------|
| contracts-manager | advisor | Drafting contracts, negotiating terms, managing contract lifecycle |
| corporate-counsel | advisor | Advising on corporate transactions, governance, M&A |
| employment-attorney | advisor | Advising on employment law, reviewing HR policies, workplace disputes |
| legal-operations-manager | advisor | Optimizing legal department processes, managing legal technology |
| litigation-manager | advisor | Managing active litigation, coordinating with outside counsel |
| paralegal | advisor | Preparing legal documents, conducting legal research, organizing case files |
| bi-specialist | analyst | Building BI dashboards, creating data visualizations, designing reporting layers |
| data-scientist | analyst | Building statistical models, performing EDA, designing experiments |
| statistician | analyst | Statistical analysis: experimental design, hypothesis testing, regression modeling |
| translator | analyst | Professional translation, localization, and cultural adaptation |
| animator | creator | Creating character animations, motion systems, animation state machines |
| music-composer | creator | Composing game music, designing adaptive music systems, leitmotifs |
| photographer | creator | Composition, lighting, camera settings, post-processing |
| sound-designer | creator | Designing game audio, sound effects and Foley, spatial audio systems |
| visual-artist | creator | Painting techniques, composition, color theory, art history |
| backend-developer | developer | Building REST/GraphQL APIs, writing database queries, server-side logic |
| engine-developer | developer | Building game engine systems, rendering pipelines, physics |
| game-programmer | developer | Implementing gameplay mechanics, game logic, AI systems for games |
| frontend-aesthetics | developer | Evaluating visual design quality, reviewing UI consistency, accessibility |
| frontend-developer | developer | Building UI components, fixing responsive design issues, client-side logic |
| data-analyst | developer | Analyzing datasets, building queries, creating data visualizations |
| senior-developer | developer | Implementing complex features across the full stack, refactoring large codebases |
| it-support | developer | Troubleshooting IT infrastructure, system configurations, network issues |
| copywriter | operator | Writing marketing copy, crafting headlines, ad text, email series |
| proposal-specialist | operator | Writing RFP responses, sales proposals, pricing packages |
| benefits-administrator | operator | Managing employee benefits programs, processing enrollment |
| employee-relations-specialist | operator | Handling workplace conflicts, investigations, advising on disciplinary actions |
| hris-administrator | operator | Managing HR information systems, configuring HRIS workflows |
| hr-manager | operator | Structuring hiring processes, planning onboarding, managing performance reviews |
| hr-ops-specialist | operator | Optimizing HR operations, streamlining people processes, payroll coordination |
| talent-recruiter | operator | Full-cycle talent acquisition — sourcing, screening, interview coordination |
| customer-education-specialist | operator | Creating product training materials, onboarding guides, knowledge content |
| knowledge-base-manager | operator | Organizing knowledge base content, maintaining documentation accuracy |
| support-agent | operator | Customer support across all channels — tickets, live chat, technical troubleshooting |
| technical-writer | operator | Writing technical documentation, API references, user guides |
| ai-writing-rewriter | writer | Transforming AI-generated text into natural prose, removing synthetic patterns |
| dialogue-specialist | writer | Writing or improving dialogue, developing distinct character voices |
| game-writer | writer | Writing game narratives, branching dialogue trees, quest text |
| lore-keeper | writer | Maintaining fictional world consistency, managing lore databases |
| prose-stylist | writer | Refining prose style, developing distinctive voice, sentence rhythm |

*Plus ~40 more domain-specific Build agents (chef, pharmacist, biologist, chemist,
mathematician, music-teacher, language-tutor, …) — see archetype tree under
`advisor/health/`, `advisor/education/`, `advisor/personal/`, `analyst/`.*

---

## Verify (~23 agents)

*Agents that test, audit, and validate against acceptance criteria. The "does it work
and is it safe?" layer — automated tests, security audits, compliance scans, fact
checks, sensitivity reviews.*

| Agent | Archetype | Description |
|-------|-----------|-------------|
| compliance-manager | advisor | Manages compliance frameworks, conducts audits, tracks regulatory changes |
| privacy-officer | advisor | Privacy policies, privacy impact assessments, GDPR management |
| regulatory-affairs-specialist | advisor | Regulatory submissions, tracking regulatory changes, compliance reporting |
| process-auditor | analyst | Process audits, verifying compliance with standards, testing internal controls |
| validator | core | Final quality gate validation, checking acceptance criteria evidence completeness |
| risk-assessment | developer | Technical risk for proposed changes, blast radius of refactors |
| dependency-analyst | developer | Analyzing dependency trees, identifying version conflicts, security vulns |
| performance-analyzer | developer | Profiling application performance, identifying bottlenecks, measuring latency |
| security-engineer | developer | Implementing security controls, conducting penetration tests, hardening systems |
| accessibility-checker | developer | Auditing web/app accessibility, WCAG compliance checks |
| code-standards-auditor | developer | Auditing codebase compliance with coding standards, convention violations |
| playwright-test-engineer | developer | Authoring or debugging Playwright tests — E2E, API, component, visual regression |
| qa-lead | developer | Tests are failing, test coverage is missing, regression tests needed |
| security-owasp | developer | Auditing code against OWASP standards, security-focused code reviews |
| test-coverage-validator | developer | Analyzing test coverage, identifying untested code paths, coverage thresholds |
| process-improvement-specialist | operator | Optimizing processes using Lean, Six Sigma, continuous improvement |
| quality-manager | operator | Establishing quality standards, managing QA processes |
| risk-manager | operator | Identifying enterprise risks, assessing threat impact, mitigation strategies |
| hr-compliance-specialist | operator | Ensuring compliance with labor laws, auditing HR practices |
| support-quality-analyst | operator | Auditing support interactions, scoring agent performance, quality gaps |
| ai-writing-detector | writer | Detecting AI-generated text patterns, analyzing for synthetic markers |
| continuity-checker | writer | Verifying narrative consistency, timeline accuracy, character detail |
| sensitivity-reader | writer | Reviewing content for cultural sensitivity, identifying harmful representation |

---

## Review (~10 agents)

*Agents that perform peer review, editorial review, and quality-gate sign-off on
work others have produced. Distinct from Verify (objective testing) — Review is
judgment-based.*

| Agent | Archetype | Description |
|-------|-----------|-------------|
| methodology-critic | analyst | Evaluates research methodology rigor — sample sizing, control design |
| reviewer | core | Validates work item outputs against acceptance criteria, spec compliance |
| code-reviewer | developer | Reviewing code changes for quality, security, performance, maintainability |
| brand-manager | operator | Maintaining brand consistency, reviewing marketing output against brand standards |
| support-supervisor | operator | Managing support agents, real-time queue management, coaching |
| support-trainer | operator | Developing support training curricula, onboarding new agents |
| copy-editor | writer | Polishing prose for grammar, style, clarity, consistency — line editing |
| editor | writer | Content polish, awkward prose, length and tone adjustment |
| literary-critic | writer | Analyzing narrative craft, evaluating prose quality, substantive editorial feedback |
| prose-stylist | writer | Refining prose style, developing distinctive voice |

*Note: `architect` also serves Review duty via `--review` mode flag. The standalone `architecture-reviewer` agent was collapsed into `architect --review` in v12.0.0; the mode flag now selects review-only behavior on `cagents:architect`. See `developer/fullstack/architect/SKILL.md`.*

---

## Ship (~30 agents)

*Agents that release, deploy, launch, distribute. Production infrastructure, marketing
launch, sales execution, customer-facing rollout, post-launch support enablement.*

| Agent | Archetype | Description |
|-------|-----------|-------------|
| dba | developer | Database schemas, query performance, migrations, production database health |
| devops-engineer | developer | Setting up CI/CD pipelines, infrastructure as code, container orchestration |
| infrastructure-lead | developer | CI/CD pipelines, infrastructure configuration, deployment debugging |
| sysadmin | developer | Managing Linux/Unix systems, server configuration, system administration automation |
| facilities-manager | operator | Office operations, facility maintenance, space allocation |
| events-coordinator | operator | Planning events, conference/webinar logistics, speaker coordination |
| channel-marketer | operator | Cross-channel marketing execution — email, content, digital advertising |
| conversion-rate-optimizer | operator | Improving conversion funnels, A/B tests, drop-off analysis |
| demand-generation-manager | operator | Building demand-gen pipelines, lead nurture campaigns |
| field-marketing-manager | operator | Regional marketing activities, field events, local partnerships |
| growth-marketer | operator | Running growth experiments, acquisition channels, activation optimization |
| marketing-ops-specialist | operator | Marketing technology stack, automation platforms, ops maintenance |
| media-buyer | operator | Planning media buys, negotiating ad placements, ad spend optimization |
| partnership-marketing-manager | operator | Co-marketing partnerships, joint campaigns, partner programs |
| pr-specialist | operator | Media relations, press releases, press events |
| revenue-operations-manager | operator | Aligning sales, marketing, customer success operations |
| sales-enablement-specialist | operator | Creating sales training materials, playbooks, sales content library |
| sales-engineer | operator | Technical demos, prospect technical questions, proofs of concept |
| sales-rep | operator | Full-cycle sales from prospecting through close, outbound lead generation |
| seo-specialist | operator | Optimizing search rankings, keyword research, on-page and technical SEO |
| territory-manager | operator | Defining sales territories, balancing account distribution |
| video-marketing-specialist | operator | Producing marketing videos, video content strategy, video optimization |
| account-manager | operator | Managing client relationships, account reviews, upsell identification |
| community-manager | operator | Building community programs, moderating forums, user engagement |
| customer-advocacy-manager | operator | Customer advocacy programs, reference customers, case studies |
| customer-success-manager | operator | Onboarding customers, customer health scores, product adoption |
| escalation-manager | operator | Escalated customer issues, cross-team resolution, tracking |
| relationship-manager | operator | Nurturing key business relationships, partner communications |
| support-director | operator | Setting support strategy, support team structure, SLA targets |
| support-operations-manager | operator | Optimizing support workflows, support tooling, routing rules |

---

## Cross-Cutting (~29 agents)

*Support agents and C-suite executives that don't fit cleanly into a single lifecycle
phase. The C-suite (`leadership/`) is invoked by `/team` strategic mode (auto-enabled
when `router.domain_count >= 2`; v12.2.0+ — pre-v12.2.0 this was the
now-removed `/org` skill) for cross-domain strategic work; core pipeline agents
(`core/`) underpin every phase.*

| Agent | Archetype | Description |
|-------|-----------|-------------|
| general-counsel | advisor | Legal strategy, regulatory compliance, contract review, IP protection |
| science-coordinator | analyst | Coordinates STEM research and scientific analysis tasks |
| coordinator | core | Parameterized controller for lightweight domains |
| hitl | core | Workflow requires human approval, automated decisions need manual override |
| optimizer | core | Workflow needs performance tuning, token reduction, execution path optimization |
| orchestrator | core | Enriches request context at pipeline start, detects domain and complexity |
| task-merger | core | Reduces task inventory context overhead |
| task-state | core | Manages CSV-based task state for large-scale workflows |
| team | core | Initializes team-mode execution and wraps a controller as the team lead (replaces the standalone `team-trigger` and `team-lead-adapter` agents removed in v12.0.0 — `/team` skill loop now drives this inline) |
| trigger | core | Pipeline entry point |
| executor | core | Monitors controller execution progress, verifies coordination_log completeness |
| planner | core | Creates plan.yaml + work_items.yaml |
| router | core | Classifies request complexity into tiers 2-4, detects domain from keywords |
| self-correct | core | Agent is stuck, 3+ tool failures in sequence, 6-step recovery |
| validator | core | Final quality gate validation |
| cco | leadership | Creative vision, narrative strategy, artistic direction (Chief Creative Officer) |
| ceo | leadership | Strategic decisions, major initiatives, company direction (Chief Executive Officer) |
| cfo | leadership | Budget requests, investment decisions, pricing strategy, financial risk |
| chro | leadership | Workforce planning, organizational design, talent strategy, culture |
| clo | leadership | Legal strategy, regulatory compliance, contract review, IP protection |
| cmo | leadership | Marketing strategy, brand positioning, demand generation oversight |
| coo | leadership | Operational decisions, process coordination, cross-functional efficiency |
| cpo | leadership | Strategic planning oversight, cross-functional alignment, tier 3-4 plans |
| cro | leadership | Revenue strategy, sales and marketing alignment, pipeline optimization |
| cso | leadership | Sales strategy, enterprise deal oversight, sales team structure |
| cto | leadership | Technology strategy, architecture decisions, tech stack evaluation |
| vp-engineering | leadership | Engineering organization strategy, cross-team coordination, technical roadmap |
| scribe | operator | Documenting meeting notes, structured summaries, maintaining project records |

---

## How to use this index

- **Starting a new project?** Run `/designer` (Define phase) before any `/run` or
  `/team`. Designer is interactive and uses Define-phase agents (`product-owner`,
  `business-analyst`, `ux-designer`) to clarify scope.
- **Building a feature?** Walk Define → Plan → Build → Verify → Review → Ship,
  spawning the relevant agents per phase via `/run` or `/team`. The planner inside
  `/run` does this automatically, but knowing the spine lets you sanity-check
  whether a phase was skipped.
- **Diagnosing a problem?** Verify/Review agents (`qa-lead`, `code-reviewer`,
  `security-engineer`, `methodology-critic`, `reviewer`) are your first stop.
- **Cross-domain strategic work?** Use `/team` — strategic mode auto-enables for
  multi-domain requests (`router.domain_count >= 2`; v12.2.0+, replaces
  the removed `/org` skill), engaging the C-suite (Cross-Cutting section) and
  routing to the right domain teams.

## See also

- `CLAUDE.md` — canonical archetype tree (Project Overview section)
- `AGENTS.md` — multi-tool routing surface
- `docs/ARCHITECTURE.md` — subsystem deep dives
- `docs/SKILLS.md` — skill catalog (`/run`, `/team`, `/designer`, `/helper`; `/improve` folded into `/run` in v12.1.2, `/org` folded into `/team` strategic mode in v12.2.0)
