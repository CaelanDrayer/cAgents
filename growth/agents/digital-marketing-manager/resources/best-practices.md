# Best Practices: Digital Marketing Manager

> Design principles, patterns, and frameworks that guide high-quality digital campaign management, paid acquisition, and channel optimization work.

## Design Principles

- **Performance Data Drives Budget, Not Relationships**: Allocate and reallocate budget based on ROAS, CPA, and conversion data — not vendor relationships or familiarity
- **Channel Fit Before Channel Presence**: Not every channel deserves budget — enter only channels where your audience is present and conversion paths are viable
- **Audience > Creative > Offer**: The right audience matters more than the best creative; the best creative matters more than the best offer
- **Full-Funnel Thinking**: Awareness investment that doesn't flow to lower-funnel conversion is waste; connect the funnel explicitly
- **Platform Algorithm Partnership**: Modern ad platforms allocate budget algorithmically; feed them enough data and trust to perform
- **Frequency Management Prevents Waste**: Unmanaged frequency burns budget reaching already-saturated audiences while neglecting fresh ones
- **Cross-Channel Attribution is an Approximation**: No attribution model is perfect — triangulate across models rather than treating any single one as truth

## Key Patterns & Frameworks

- **Digital Channel Audit**: Evaluate each channel on audience reach, intent signal strength, conversion path length, and competitive density before investment decisions
- **Campaign Objective Hierarchy**: Awareness (reach, frequency) → Consideration (traffic, engagement, video views) → Conversion (leads, purchases) — platform objectives must match funnel stage
- **Bidding Strategy Progression**: Start with manual bidding to collect data, transition to automated bidding (Target CPA, Target ROAS) once sufficient conversion history exists (50+ conversions/month per campaign)
- **Quality Score Optimization**: For Google Ads, improving ad relevance, landing page experience, and expected CTR reduces CPC and improves position
- **Audience Exclusion Hygiene**: Regularly exclude converters, current customers, and irrelevant segments to prevent wasted spend
- **Dayparting + Device Bid Modifiers**: Adjust bids based on time-of-day, day-of-week, and device performance data to concentrate spend when conversion probability is highest
- **Cross-Channel Message Sequencing**: Coordinate the order of exposure across channels — awareness on YouTube, consideration on LinkedIn, conversion on search — to guide prospects efficiently
- **Landing Page Score Card**: Evaluate landing pages against message match, load speed, form length, social proof, and CTA clarity before scaling any campaign
- **Attribution Model Comparison**: Run first-touch, last-touch, and multi-touch models in parallel; use the comparison to understand each channel's role in the funnel
- **Budget Pacing Dashboard**: Real-time view of daily spend vs. pacing targets by channel, campaign, and ad set to prevent under- or over-delivery

## Domain Concepts & Terminology

### Paid Search (SEM)
- **Quality Score**: Google's rating (1–10) of the relevance of your keyword, ad, and landing page — higher score = lower CPC
- **Ad Rank**: The formula determining ad position: bid × Quality Score × expected impact of ad extensions
- **Match Types**: Broad, phrase, exact — controls how closely a search query must match your keyword to trigger the ad
- **Negative Keywords**: Terms that prevent your ad from showing for irrelevant searches
- **Search Term Report**: The actual queries that triggered your ads — the source of negative keywords and new keyword ideas
- **ROAS (Return on Ad Spend)**: Revenue generated per dollar of ad spend — primary efficiency metric for conversion-focused campaigns

### Paid Social
- **Lookalike Audience**: Platform-generated audience that shares characteristics with your seed list of customers
- **Custom Audience**: Audience built from your own data (customer list, website visitors, app users)
- **CPM (Cost Per Mille)**: Cost to reach 1,000 people — primary metric for awareness-focused campaigns
- **Frequency**: Average number of times a person in your audience sees your ad — high frequency accelerates fatigue
- **Creative Fatigue**: Declining performance due to audience over-exposure to the same creative
- **Conversion Window**: The attribution period during which conversions are credited to an ad impression or click

### Analytics & Attribution
- **GA4 / Analytics Platform**: Web analytics foundation for tracking session behavior, conversion paths, and channel contribution
- **UTM Parameters**: URL tags that identify the source, medium, campaign, and content driving each visit
- **View-Through Attribution**: Crediting an ad impression even when the user didn't click but later converted
- **Multi-Touch Attribution**: Distributing conversion credit across multiple ad touchpoints in the buyer journey
- **Incrementality Testing**: Measuring the true lift from a campaign by comparing exposed vs. holdout groups

## Anti-Patterns to Avoid

- **Set-It-and-Forget-It Campaigns**: Digital campaigns require regular optimization; unmonitored campaigns develop inefficiencies that compound over time
- **Ignoring Audience Saturation**: Running reach campaigns at high frequency without frequency caps wastes budget on over-exposed audiences
- **Mismatched Objectives**: Running a conversion campaign to a cold audience or an awareness campaign to a bottom-funnel audience misaligns the conversion path
- **Vanity Metric Reporting**: Reporting impressions and clicks to stakeholders who care about pipeline and revenue obscures whether digital marketing is working
- **Landing Page Neglect**: Optimizing ads extensively while ignoring the landing page ignores that conversion happens after the click
- **Over-Segmentation**: Creating too many small ad sets fragments the data, preventing algorithms from learning efficiently
- **No Budget Escalation Trigger**: Letting successful campaigns under-pace because of rigid budget caps misses the opportunity to scale what's working

## Quality Indicators

- **ROAS by Channel**: Is each channel generating acceptable return on ad spend relative to its objective and funnel stage?
- **CPA Trend**: Is cost per acquisition decreasing over time as campaigns optimize?
- **Quality Score Average (Paid Search)**: Average Quality Score above 6 indicates well-aligned keyword-ad-landing page alignment
- **Landing Page Conversion Rate**: Is the post-click conversion rate meeting benchmarks for the channel and offer type?
- **Impression Share**: For branded and high-intent keywords, are you capturing the majority of available impressions?
- **Audience Overlap Analysis**: Are different ad sets reaching meaningfully different audience segments rather than competing for the same people?
- **Attribution Completeness**: Can you trace every conversion back to a specific campaign, ad set, and creative?

## Collaboration Touchpoints

- **With Marketing Analyst**: Digital performance data feeds attribution models and optimization decisions; weekly analysis reviews should be joint
- **With Conversion Rate Optimizer**: Landing page performance is a shared responsibility — flag underperforming pages and co-prioritize CRO test roadmap
- **With SEO Specialist**: Paid and organic search data should be shared — high-performing paid keywords are candidates for organic investment and vice versa
- **With Campaign Manager**: Digital campaigns execute against the broader campaign strategy; brief alignment before launch prevents channel fragmentation
- **With Media Buyer**: Programmatic and display buying strategy must coordinate with search and social to avoid frequency overlap and optimize total digital mix
