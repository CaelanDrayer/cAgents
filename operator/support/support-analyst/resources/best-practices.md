# Best Practices: Support Analyst

> Design principles, patterns, and frameworks that guide high-quality support data analysis, metrics reporting, and operational insights work.

## Design Principles

- **Action-Oriented Analysis**: Every analysis should conclude with specific, prioritized recommendations; data without decisions is reporting, not analysis
- **Trend Over Snapshot**: A single metric reading tells you where you are; a trend tells you where you're going — always show direction and rate of change
- **Root Cause Over Symptom**: Rising ticket volume is a symptom; what's driving it is the root cause worth addressing; never stop the analysis at the first observable fact
- **Statistical Significance Awareness**: Small sample sizes produce noisy conclusions; distinguish between statistically significant trends and random variation before acting
- **Audience-Appropriate Communication**: Executives need summary dashboards with key insights; operations managers need drill-down detail; frontline agents need team-level metrics — same data, different presentations
- **Causation Discipline**: Correlation between two metrics doesn't establish causation; identify the mechanism before concluding that changing X will change Y
- **Leading Vs. Lagging Indicators**: CSAT and NPS tell you how past interactions went; early ticket volume and SLA risk tell you where problems are headed — balance both in reporting

## Key Patterns & Frameworks

- **Support Operations Metrics Pyramid**: Foundation (volume and channel data) → Efficiency (AHT, agent utilization, cost per ticket) → Quality (CSAT, FCR, quality scores) → Strategic (NPS, revenue impact, churn correlation); build bottom-up, report top-down
- **Cohort Analysis for CSAT Trends**: Segment CSAT data by agent, team, issue type, product area, and customer tier to identify where satisfaction is high or low; aggregate CSAT hides actionable variation
- **Root Cause Analysis Framework**: 5 Whys applied to support data — rising ticket volume → which issue types? → why are those issues occurring? → what changed in the product or process? → what is the root cause?
- **Ticket Volume Forecasting Model**: Time-series analysis of historical ticket volume by day of week, week of month, and season; incorporate known events (product releases, marketing campaigns, billing cycles) as regressors
- **Support Efficiency Scorecard**: Composite score combining AHT, FCR, CSAT, quality score, and SLA compliance for each agent and team; enables performance comparison and improvement prioritization
- **Knowledge Base Gap Analysis**: Cross-reference KB article views against ticket categories; ticket categories with high volume and low KB coverage indicate highest-priority content creation opportunities
- **Deflection Opportunity Identification**: Analyze tickets by root cause to identify those preventable through: product improvement, KB content, proactive communication, or customer education
- **Reporting Cadence Design**: Real-time (current queue, SLA risk) → Daily (volume, response times, emerging trends) → Weekly (performance trends, emerging issues) → Monthly (comprehensive KPI review) → Quarterly (strategic insights and recommendations)

## Domain Concepts & Terminology

### Volume Metrics
- **Ticket Volume**: Total support contacts received in a period by channel and category
- **Inbound Rate**: Volume relative to customer base; rising rate indicates product or process issues
- **Channel Mix**: Distribution of contacts across email, chat, phone, and self-service; trends signal customer preferences
- **Issue Category Distribution**: Breakdown of ticket volume by issue type; identifies where support load concentrates
- **Deflection Rate**: Percentage of potential contacts resolved through self-service; measures KB and product UX effectiveness

### Efficiency Metrics
- **AHT (Average Handle Time)**: Average time from ticket open to close; efficiency indicator
- **Agent Utilization**: Percentage of available time spent on ticket work; balance between efficiency and burnout risk
- **Cost per Ticket**: Total support cost divided by ticket volume; efficiency of the support function
- **Tickets per Agent per Day**: Throughput metric; combines AHT and utilization

### Quality Metrics
- **FCR (First Contact Resolution)**: Percentage resolved in one contact without follow-up
- **CSAT (Customer Satisfaction Score)**: Post-contact survey rating
- **Quality Score**: Internal evaluation score from QA sampling
- **NPS (Net Promoter Score)**: Relationship-level loyalty metric, typically measured periodically
- **Reopen Rate**: Percentage of closed tickets reopened; indicates incomplete resolution
- **Escalation Rate**: Percentage of contacts escalated to higher tiers

### SLA Metrics
- **SLA Compliance Rate**: Percentage of tickets meeting response and resolution SLA
- **SLA Breach Rate**: Percentage of tickets that exceeded SLA commitments
- **Time-to-First-Response**: Duration from ticket creation to first agent response
- **Time-to-Resolution**: Duration from ticket creation to closure

## Anti-Patterns to Avoid

- **Vanity Metric Reporting**: Reporting metrics that look good but don't drive decisions (total KB article views without deflection context, total CSAT survey responses without response rate)
- **Aggregate Without Segmentation**: Reporting average CSAT across all agents, issue types, and customer tiers; averages hide the variation that reveals problems and opportunities
- **Presenting Correlation as Causation**: Finding that two metrics moved together and concluding one caused the other without investigating the mechanism
- **Analysis Without Recommendations**: Delivering dashboards and data summaries without "so what" and "so do what" conclusions; analysis is complete only when it drives action
- **Ignoring Outliers**: Dismissing outlier data points as noise; outliers often reveal the most interesting and actionable insights
- **Report Once and Forget**: Producing analysis reports that don't get acted on; analyst credibility depends on closing the loop — did the recommendations get implemented, and did the metrics improve?
- **Manual Reporting**: Building support reports by manually extracting and formatting data; manual processes are error-prone and prevent analytical depth; invest in automated dashboards

## Quality Indicators

- **Dashboard Delivery Timeliness**: All scheduled dashboards delivered on time without manual delays
- **Recommendation Implementation Rate**: Percentage of analyst recommendations that get acted on; measures stakeholder trust and analysis quality
- **Forecast Accuracy**: Predicted vs. actual ticket volume within ±10% for weekly and monthly forecasts
- **Analysis-to-Insight Ratio**: Average number of actionable insights per analysis delivered; rising ratio indicates improving analytical depth
- **Data Completeness**: Percentage of tickets with complete categorization (issue type, root cause, resolution method); high completeness enables accurate analysis
- **Anomaly Detection Speed**: Time from anomaly occurrence to analyst identification and escalation; measures monitoring effectiveness
- **Stakeholder Satisfaction**: Support operations and leadership rate analytics as useful and decision-relevant

## Collaboration Touchpoints

- **With Support Operations Manager**: Primary consumer of analytics; receives prioritized insights, forecasting data, and process improvement recommendations
- **With Support Quality Analyst**: Share quality score trend data; quality analyst uses trends to prioritize coaching and training focus areas
- **With Knowledge Base Manager**: Provide KB gap analysis and deflection opportunity data; ticket volume patterns drive KB content priorities
- **With Support Director**: Deliver executive-level dashboards and strategic insights; director uses data for leadership reporting, resourcing decisions, and strategic planning
