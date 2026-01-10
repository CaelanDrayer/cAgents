# Marketing Domain Agent Manifest

## Summary
- **Total Agents**: 27
- **Workflow Agents**: 5 (router, planner, executor, validator, self-correct)
- **Executive**: 1 (cmo)
- **Team Agents**: 21

## Workflow Agents (5)

| Agent | Model | Color | Description |
|-------|-------|-------|-------------|
| router | opus | cyan | Marketing complexity classification and template matching |
| planner | opus | cyan | Campaign decomposition and task planning |
| executor | opus | cyan | Marketing team coordination and campaign execution |
| validator | opus | cyan | Marketing deliverable quality gate and brand compliance |
| self-correct | opus | cyan | Marketing-specific adaptive recovery and fixes |

## Executive Leadership (1)

| Agent | Model | Color | Layer | Description |
|-------|-------|-------|-------|-------------|
| cmo | opus | cyan | executive | Chief Marketing Officer - strategy, brand, demand gen |

## Team Agents (21)

### Demand Generation & Growth (2)
| Agent | Model | Capabilities |
|-------|-------|--------------|
| demand-generation-manager | sonnet | lead-gen, nurture, funnel-optimization, pipeline-acceleration |
| growth-marketer | sonnet | growth-experimentation, funnel-optimization, viral-mechanics |

### Content & Brand (4)
| Agent | Model | Capabilities |
|-------|-------|--------------|
| content-marketing-manager | sonnet | content-strategy, editorial-planning, seo-content |
| brand-manager | sonnet | brand-strategy, brand-positioning, visual-identity |
| copywriter | sonnet | ad-copywriting, website-copy, email-copy, seo-copywriting |
| creative-director | sonnet | creative-strategy, visual-design, art-direction |

### Digital & Channels (4)
| Agent | Model | Capabilities |
|-------|-------|--------------|
| digital-marketing-manager | sonnet | paid-search, paid-social, conversion-optimization |
| social-media-manager | sonnet | social-strategy, community-management, social-advertising |
| seo-specialist | sonnet | keyword-research, on-page-seo, technical-seo, link-building |
| email-marketing-specialist | sonnet | email-campaigns, nurture-automation, deliverability |

### Product & Sales Enablement (2)
| Agent | Model | Capabilities |
|-------|-------|--------------|
| product-marketing-manager | sonnet | product-positioning, messaging-framework, launch-planning |
| customer-marketing-manager | sonnet | customer-retention, upsell-crosssell, customer-advocacy |

### Analytics & Operations (3)
| Agent | Model | Capabilities |
|-------|-------|--------------|
| marketing-analyst | sonnet | marketing-analytics, attribution-modeling, dashboard-creation |
| marketing-data-analyst | sonnet | predictive-analytics, customer-segmentation, marketing-mix-modeling |
| marketing-operations-manager | sonnet | marketing-automation, lead-management, martech-stack |

### Specialized Marketing (6)
| Agent | Model | Capabilities |
|-------|-------|--------------|
| events-manager | sonnet | event-planning, conference-management, webinar-production |
| field-marketing-manager | sonnet | regional-marketing, local-events, sales-territory-support |
| partnership-marketing-manager | sonnet | co-marketing, partner-enablement, alliance-marketing |
| influencer-marketing-specialist | sonnet | influencer-campaigns, creator-partnerships, ambassador-programs |
| pr-specialist | sonnet | pr-strategy, media-relations, thought-leadership, crisis-comms |
| marketing-strategist | sonnet | marketing-strategy, competitive-analysis, market-research |

## Tools Used
All agents have access to: Read, Grep, Glob, Write, Bash, TodoWrite
Executor also has: Task

## Detection Keywords
campaign, launch, content, brand, social, growth, SEO, leads, awareness, engagement, demand gen, email, events, webinar, paid ads, organic, nurture, pipeline, MQL, SQL, conversion, funnel, ROI, attribution, personalization, segmentation, customer journey, ABM, retention, advocacy

## Template Coverage
- Campaign planning (campaign_plan, product_launch, demand_gen_plan)
- Content & Brand (content_strategy, brand_strategy, social_media_strategy)
- Specialized (event_plan, marketing_analytics, growth_strategy)

---

**Status**: ✅ All 27 agents created with complete YAML frontmatter and detailed implementations
**Next Steps**: Ready for integration into root cAgents plugin manifest
