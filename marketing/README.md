# Marketing Domain (@cagents/marketing)

Complete marketing domain for demand generation, brand management, content strategy, and growth marketing.

## Overview

**Version**: 1.0.0  
**Total Agents**: 27 (5 workflow + 1 executive + 21 team)  
**Detection Keywords**: campaign, launch, content, brand, social, growth, SEO, leads, awareness, engagement, demand gen, email, events, webinar, paid ads, organic, nurture, pipeline, MQL, SQL

## Agent Structure

### Workflow Agents (5)
- **router** - Marketing complexity classification (campaign_plan, product_launch, content_strategy, demand_gen_plan, brand_strategy, marketing_analytics)
- **planner** - Campaign decomposition into structured marketing activities
- **executor** - Marketing team coordination and campaign execution
- **validator** - Marketing deliverable quality gate (brand compliance, tracking, performance)
- **self-correct** - Marketing-specific recovery (copy edits, SEO, tracking, brand fixes)

### Executive Leadership (1)
- **cmo** - Chief Marketing Officer: marketing strategy, brand leadership, demand generation

### Team Agents (21)

#### Demand Generation & Growth
- **demand-generation-manager** - Lead gen, nurture, funnel optimization, pipeline acceleration
- **growth-marketer** - Growth experiments, viral loops, AARRR optimization

#### Content & Brand
- **content-marketing-manager** - Content strategy, editorial planning, content production
- **brand-manager** - Brand strategy, identity, guidelines, brand health
- **copywriter** - Ad copy, website copy, email copy, long-form content
- **creative-director** - Creative strategy, visual design, campaign creative

#### Digital & Channels
- **digital-marketing-manager** - Paid search, paid social, display, conversion optimization
- **social-media-manager** - Social strategy, community management, social campaigns
- **seo-specialist** - Keyword research, on-page SEO, technical SEO, link building
- **email-marketing-specialist** - Email campaigns, nurture automation, deliverability

#### Product & Sales Enablement
- **product-marketing-manager** - Product positioning, messaging, launches, competitive intel
- **customer-marketing-manager** - Customer retention, upsell/cross-sell, advocacy

#### Analytics & Operations
- **marketing-analyst** - Campaign measurement, attribution, dashboards, ROI analysis
- **marketing-data-analyst** - Predictive analytics, segmentation, marketing mix modeling
- **marketing-operations-manager** - Marketing automation, lead management, martech stack

#### Specialized Marketing
- **events-manager** - Conferences, trade shows, webinars, field events
- **field-marketing-manager** - Regional campaigns, local events, sales territory support
- **partnership-marketing-manager** - Co-marketing, partner enablement, alliance marketing
- **influencer-marketing-specialist** - Influencer campaigns, creator partnerships, ambassador programs
- **pr-specialist** - PR strategy, media relations, thought leadership, crisis comms
- **marketing-strategist** - Marketing strategy, competitive analysis, market research

## Template Library

### Campaign Templates
- `campaign_plan` - Multi-channel campaign planning (tier 2)
- `product_launch` - Full product launch with GTM strategy (tier 3)
- `demand_gen_plan` - Pipeline creation and lead generation (tier 2-3)

### Content & Brand Templates
- `content_strategy` - Editorial planning and content production (tier 2)
- `brand_strategy` - Brand positioning, identity, messaging (tier 3-4)
- `social_media_strategy` - Platform strategy and content calendar (tier 2)

### Specialized Templates
- `event_plan` - Events, webinars, conferences (tier 2-3)
- `marketing_analytics` - Performance analysis and optimization (tier 2)
- `growth_strategy` - Growth experiments and funnel optimization (tier 3)

## Key Capabilities

- Multi-channel campaign orchestration (email, social, paid, content, events, PR)
- Demand generation and pipeline creation (lead gen, nurture, qualification)
- Brand strategy and identity management
- Content marketing and SEO
- Product launches and go-to-market
- Growth marketing and experimentation
- Marketing analytics and attribution
- Customer lifecycle marketing (acquisition, activation, retention, advocacy)
- Account-based marketing (ABM)
- Marketing operations and automation

## Detection Examples

Marketing domain handles requests such as:
- "Plan Q2 demand gen campaign to generate 500 MQLs"
- "Launch new product with full GTM strategy"
- "Create content strategy for H2 with editorial calendar"
- "Build brand awareness campaign across social and PR"
- "Optimize email nurture funnel for conversion"
- "Design growth experiments for user acquisition"
- "Develop ABM program for enterprise accounts"
- "Plan webinar series with promotion and follow-up"

## Success Metrics

- Pipeline created and influenced
- Lead volume (MQLs, SQLs)
- Conversion rates (MQL→SQL, SQL→Close)
- Customer acquisition cost (CAC)
- Marketing ROI and ROMI
- Brand awareness and perception
- Content engagement and performance
- Campaign performance and optimization

## Usage

```bash
# Install marketing domain
claude /plugin install @cagents/marketing

# Example marketing requests
/trigger Plan product launch campaign for Product X
/trigger Create Q1 content strategy with SEO focus
/trigger Design demand gen program for enterprise segment
/trigger Build brand awareness campaign for new market
```

---

**Marketing Domain Status**: ✅ Complete  
**Integration**: Ready for root plugin manifest inclusion
