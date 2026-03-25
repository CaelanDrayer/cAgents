# Best Practices: Media Buyer

> Design principles, patterns, and frameworks that guide high-quality media planning, programmatic buying, and ad spend optimization work.

## Design Principles

- **Audience Precision Over Broad Reach**: Reaching fewer of the right people generates more value than reaching many of the wrong ones
- **Performance Data Commands Budget**: Move budget to what performs — attachment to a channel that's not delivering is waste
- **Frequency Management is Audience Respect**: Bombarding the same people daily trains them to ignore the brand and creates negative associations
- **Placement Quality Affects Brand Quality**: Low-quality placements (piracy sites, politically extreme content) undermine brand perception even with technical targeting accuracy
- **Incrementality Testing Validates Value**: Absence of testing means you might be paying for conversions that would have happened anyway
- **Cost Is Only Half the Efficiency Equation**: CPM and CPC measure cost, not value; CPA and ROAS measure outcome — optimize for outcome
- **Programmatic is Algorithm + Human Oversight**: Automated bidding needs human strategic direction, creative refresh, and anomaly detection

## Key Patterns & Frameworks

- **Media Mix Planning**: Allocating budget across channels based on funnel objective (awareness → consideration → conversion), audience concentration, and historical channel efficiency
- **CPM/CPC/CPA/ROAS Benchmarking**: Establishing category and channel benchmarks before campaign launch to evaluate whether performance is acceptable during optimization
- **Programmatic Buying Stack**: DSP (Demand-Side Platform) → SSP (Supply-Side Platform) → Ad Exchange → Publisher inventory — understanding the layers determines where quality and fraud risk enter
- **Brand Safety Controls**: Inclusion/exclusion lists, content category blocks, viewability thresholds, and fraud filtering (IVT detection) layered into every programmatic buy
- **Frequency Capping Strategy**: Channel-specific frequency caps (e.g., no more than 5 impressions per user per week on display) by funnel stage and creative type
- **Audience Segmentation for Buying**: First-party (CRM list, site visitors), second-party (partner data), third-party (data provider segments) — stacked in layers and tested independently
- **Creative-Channel Fit Matrix**: Which creative formats (video, static, native, rich media) perform best in which channels for which objectives — guides trafficking decisions
- **Bid Strategy Selection Guide**: Manual (data collection phase) → Enhanced CPC (learning phase) → Target CPA / Target ROAS (optimization phase) → Maximum Conversion Value (scale phase)
- **Attribution Window Testing**: Compare results using different attribution windows (1-day click, 7-day click, 1-day view) to understand how much credit the channel deserves at each window
- **Post-Campaign Reconciliation**: Comparing ordered vs. delivered impressions, viewability rates, and IVT rates across direct buy partners to enforce contract terms

## Domain Concepts & Terminology

### Buying Models
- **CPM (Cost Per Mille)**: Cost to reach 1,000 impressions — primary metric for awareness campaigns
- **CPC (Cost Per Click)**: Cost for each user who clicks the ad — metric for traffic and consideration campaigns
- **CPA (Cost Per Acquisition)**: Cost for each desired action (lead, purchase) completed — primary metric for conversion campaigns
- **ROAS (Return on Ad Spend)**: Revenue generated per dollar of media spend — overall efficiency metric
- **RTB (Real-Time Bidding)**: Automated auction system where ad impressions are bought and sold in milliseconds
- **Programmatic Guaranteed**: Pre-negotiated, direct inventory reservation purchased via programmatic pipes — combines scale with predictability
- **Private Marketplace (PMP)**: Invite-only programmatic auctions with premium publishers — better brand safety and inventory quality than open exchange

### Audience Targeting
- **First-Party Data**: Audience data owned by the advertiser — CRM lists, site visitors, email subscribers
- **Second-Party Data**: Audience data shared by a trusted partner — co-op data, platform-to-platform sharing
- **Third-Party Data**: Audience segments purchased from data brokers — broad but declining in precision post-cookie
- **Lookalike Audience**: Platform-generated audience with attributes similar to a seed first-party list
- **Contextual Targeting**: Placing ads adjacent to relevant content rather than targeting based on user data — gaining relevance post-third-party-cookie

### Quality & Fraud
- **Viewability**: Percentage of ads that were actually visible on screen for a minimum duration (IAB standard: 50% of pixels visible for 1 second for display; 2 seconds for video)
- **IVT (Invalid Traffic)**: Non-human traffic (bots, crawlers) that inflates impression and click counts without representing real audience
- **Brand Safety**: Ensuring ad placements don't appear alongside content that damages brand reputation
- **Ad Fraud**: Deliberate manipulation of advertising metrics — click fraud, impression stuffing, domain spoofing
- **Inventory Quality Score**: Composite signal of viewability, IVT rate, and brand safety across a publisher or exchange

## Anti-Patterns to Avoid

- **Optimizing for Click-Through Rate**: High CTR on display doesn't correlate with business outcomes — optimize for CPA or ROAS, not clicks
- **Open Exchange Without Fraud Filtering**: Buying all inventory from the open exchange without IVT filtering and brand safety controls wastes significant portions of budget on fraud
- **No Frequency Caps**: Uncapped frequency burns budget on over-saturated audiences while under-reaching fresh ones
- **Chasing Volume with Low-Quality Placements**: MFA (Made-for-Advertising) sites generate cheap CPMs but poor brand association and negligible conversion lift
- **Manual Bidding Forever**: Continuing to manually bid when enough conversion data exists for algorithmic bidding limits scale and misses optimization opportunities
- **Single Attribution Window**: Evaluating channel performance using only one attribution window misses channels (like display) that operate on longer conversion cycles
- **No Incrementality Testing**: Assuming all conversions attributed to a channel were caused by that channel without testing leads to over-attribution and misallocated budget

## Quality Indicators

- **ROAS vs. Target**: Is each channel generating the required revenue return on spend?
- **Viewability Rate**: Above 70% for display, above 50% for video — below these thresholds indicates placement quality issues
- **IVT Rate**: Below 3% for quality programmatic buys; above 10% indicates publisher quality or fraud issues
- **Frequency Distribution**: Are impressions distributed across audience members or concentrated on a small percentage who are over-exposed?
- **CPA Trend**: Is cost per acquisition declining as campaigns accumulate learning?
- **Brand Safety Incident Rate**: Number of ads appearing in brand-unsafe contexts per reporting period
- **Budget Utilization Rate**: Percentage of media budget paced as planned — significant underpacing wastes planning effort; significant overpacing violates budgets

## Collaboration Touchpoints

- **With Digital Marketing Manager**: Media buying executes the paid channel strategy; align on platform selection, targeting approach, and creative requirements before campaign launch
- **With Marketing Analyst**: Campaign attribution data and ROAS analysis require joint interpretation — media buyer knows the buy, analyst knows the data model
- **With Campaign Manager**: Media schedules and budget allocation must align with overall campaign timing and messaging architecture
- **With Creative Director**: Ad format specifications and performance data (which creative performs best where) must flow bidirectionally — creative decisions affect media performance
- **With Conversion Rate Optimizer**: Post-click landing page performance directly affects the ROAS of any paid media buy; flag underperforming landing pages for priority CRO attention
