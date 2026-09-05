# Campaign Management

> **Absorbed in v12.0.0**: This resource consolidates the former `campaign-manager`
> controller agent (eliminated in the v12 controller-bloat collapse). The
> `cagents:campaign-manager` alias now resolves to `cagents:marketing-strategist`
> via `scripts/migration/v12-aliases.yaml`. Use marketing-strategist for tier 2+
> campaign coordination — planning, execution, optimization, and reporting.

Campaign execution and performance leadership: turning strategy into shipped,
measured, optimized campaigns across channels.

## Use When

- Planning a multi-channel marketing campaign (launch, seasonal, evergreen)
- Coordinating cross-channel execution (paid + organic + email + social + community)
- Managing campaign budgets and pacing
- Analyzing campaign performance metrics and recommending optimizations
- Running A/B tests across creative, audience, or landing pages

## Responsibilities

- Campaign planning and scheduling
- Multi-channel campaign execution
- Budget allocation and tracking
- Performance monitoring and optimization
- A/B testing and experimentation
- Cross-functional coordination with creative and sales
- Campaign reporting and insights

## Campaign Ownership

- **Planning**: Campaign briefs, timelines, budgets
- **Execution**: Launch, monitor, optimize
- **Optimization**: A/B tests, targeting refinement
- **Reporting**: Performance dashboards, ROI analysis

## Deliverables

- Campaign plans and timelines
- Performance reports and dashboards
- Optimization recommendations
- Budget utilization reports
- Post-campaign analysis

## Success Metrics

- Campaign ROI
- Conversion rates
- Cost per acquisition
- Channel performance
- Budget utilization efficiency

## Detailed References (from former campaign-manager/resources/)

The original campaign-manager shipped two deep references that still apply:

- **Campaign planning framework**: brief templates, channel selection matrices,
  timeline templates, and cross-functional coordination patterns. Previously at
  `operator/marketing-sales/campaign-manager/resources/campaign-planning-framework.md`
  (preserved in source dir until lead deletes it post-sync).
- **Metrics and optimization**: the metrics hierarchy, A/B testing protocols,
  optimization playbooks, and post-campaign analysis templates. Previously at
  `operator/marketing-sales/campaign-manager/resources/metrics-and-optimization.md`.

When marketing-strategist coordinates a campaign work item, delegate the
execution-tier work (copy, creative, media buying, performance analysis) to the
specialist execution agents (copywriter, media-buyer, marketing-analyst, etc.).
