# Best Practices: SEO Specialist

> Design principles, patterns, and frameworks that guide high-quality search engine optimization, keyword strategy, and organic traffic growth work.

## Design Principles

- **Intent Alignment is the Foundation**: A page that exactly matches what a searcher is trying to do will outrank a technically superior page that doesn't — start with search intent, not keywords
- **Technical SEO is the Floor, Content is the Ceiling**: Technical errors limit your ranking ceiling; fix them first, but technical perfection without quality content won't rank
- **Topical Authority Compounds**: Owning a topic cluster earns trust from search engines over time; going wide too early dilutes the signal
- **Link Equity is Earned, Not Bought**: High-quality backlinks from relevant, authoritative sites are the most powerful ranking signal and the one most competitors can't quickly replicate
- **Page Experience Affects Rankings**: Core Web Vitals, mobile usability, and HTTPS are now ranking factors — user experience investment has SEO ROI
- **SEO Data Informs Content Strategy**: Search volume, keyword difficulty, and SERP features tell you where the market demand is before investing in content production
- **Measure Organic Traffic by Business Outcome**: Rankings and traffic are inputs; the outcomes are leads, sign-ups, and revenue attributed to organic search

## Key Patterns & Frameworks

- **Keyword Research Process**: Seed keywords → competitor gap analysis → volume and difficulty scoring → search intent classification → keyword clustering → priority tier assignment → content brief generation
- **Topic Cluster Architecture**: Pillar page (broad topic, 2000+ words) → cluster pages (subtopic variations, 800–1500 words) → internal link network connecting cluster to pillar → signals topical authority to search engines
- **Technical SEO Audit Checklist**: Crawlability (robots.txt, sitemap, crawl budget), indexability (canonical tags, noindex usage, redirect chains), performance (Core Web Vitals, page speed, TTFB), structure (schema markup, URL structure, internal links), mobile (mobile-first rendering, tap targets)
- **Content Optimization Framework**: Target keyword in title, H1, first 100 words; related terms throughout; semantic variants; image alt text; internal links to relevant pages; meta description with CTA
- **Core Web Vitals Optimization**: LCP (Largest Contentful Paint) < 2.5s, INP (Interaction to Next Paint) < 200ms, CLS (Cumulative Layout Shift) < 0.1 — specific technical interventions for each signal
- **Link Building Outreach System**: Identify relevant sites with authority → research editor/writer contact → craft value-first pitch (data study, expert quote, broken link replacement) → follow-up cadence → track placements
- **SERP Feature Optimization**: For each target keyword, identify which SERP features appear (featured snippet, People Also Ask, local pack, image carousel) → optimize content structure to target those features specifically
- **Competitor Gap Analysis**: Tools-based comparison of competitor ranking URLs vs. your own for the same keywords → identify content where you're underranked or absent → prioritize by traffic opportunity
- **SEO Content Brief Template**: Target keyword, search intent, SERP analysis (top 10 current rankers, format, length, schema types), required sections, word count estimate, internal links required, metadata guidance
- **Monthly SEO Reporting Stack**: Organic traffic by segment, keyword ranking distribution, Core Web Vitals status, top gaining/losing pages, link acquisition count, conversion from organic — trends over time, not point-in-time

## Domain Concepts & Terminology

### On-Page SEO
- **Target Keyword**: The primary search query a page is optimized to rank for
- **Search Intent**: The underlying goal of a search query — informational (learn), navigational (find), commercial (compare), transactional (buy)
- **Title Tag**: HTML element specifying the page title shown in SERPs and browser tabs — primary on-page ranking signal
- **Meta Description**: HTML element providing a page summary in SERPs — doesn't directly affect rankings but influences CTR
- **H1/H2/H3**: Heading tags that organize page content hierarchy — H1 should align with the target keyword
- **Semantic SEO**: Using related terms, synonyms, and entities alongside the exact target keyword to demonstrate topical coverage

### Technical SEO
- **Crawl Budget**: The number of pages search engines will crawl on a site within a given period — large sites must prioritize important pages
- **Canonical Tag**: HTML element specifying the authoritative version of a page when duplicate content exists
- **Schema Markup / Structured Data**: Standardized code that helps search engines understand page content and enables rich results in SERPs
- **Core Web Vitals**: Google's user experience metrics: LCP (load speed), INP (interactivity), CLS (visual stability)
- **Redirect Chain**: Multiple consecutive redirects that slow page loading and dilute link equity
- **Index Bloat**: When search engines index low-value pages (thin content, parameter variations) that dilute crawl budget from important pages

### Off-Page SEO
- **Backlink**: A link from an external site to your page — the primary off-page ranking signal
- **Domain Authority / Domain Rating**: Third-party metrics estimating a site's SEO strength based on its link profile
- **Link Equity / PageRank**: The authority passed from one page to another via hyperlinks
- **Anchor Text**: The visible, clickable text of a hyperlink — affects what the linked page ranks for
- **Link Building**: The practice of acquiring external backlinks to increase a page's authority and rankings

## Anti-Patterns to Avoid

- **Keyword Stuffing**: Repeating target keywords unnaturally in content signals poor quality to modern search engines and harms user experience
- **Ignoring Search Intent**: Targeting a keyword without matching the content format to what searchers actually want produces traffic that bounces immediately
- **Thin Content Targeting Competitive Keywords**: Publishing 300-word articles to compete with 2000-word authoritative pieces rarely works — match or exceed the depth of what's already ranking
- **No Internal Linking Strategy**: Failing to link related pages internally leaves topic cluster authority siloed and misses ranking opportunities for supporting pages
- **Prioritizing Low-Quality Link Volume**: Building hundreds of links from low-authority, irrelevant sites provides diminishing returns versus a few links from high-authority relevant publications
- **Technical Issues Blocking Crawl**: Robots.txt errors, noindex on important pages, or broken sitemaps prevent ranking regardless of content quality
- **Ignoring Core Web Vitals**: Slow-loading pages with poor interactivity are penalized in Google's ranking algorithm and convert poorly even when they rank

## Quality Indicators

- **Keyword Ranking Distribution**: What percentage of tracked keywords rank in positions 1–3, 4–10, 11–20, and 21+?
- **Organic Traffic Growth**: Month-over-month and year-over-year organic session growth — the primary traffic metric
- **Organic Conversion Rate**: Percentage of organic sessions that complete a desired action (sign-up, lead, purchase)
- **Core Web Vitals Pass Rate**: Percentage of key landing pages meeting all three Core Web Vitals thresholds
- **Backlink Acquisition Rate**: New referring domains added per month — a measure of off-page SEO investment productivity
- **Content Coverage Gap**: Percentage of priority keyword clusters with a fully optimized, ranking page vs. still needing content
- **Click-Through Rate (CTR) from SERPs**: Average CTR from Google Search Console — below 3% for branded or featured snippet positions suggests title/meta optimization opportunity

## Collaboration Touchpoints

- **With Content Marketing Manager**: SEO keyword research drives content strategy — keyword briefs should be provided before content production begins; co-review editorial calendar against keyword priority
- **With Frontend Developer**: Core Web Vitals and technical SEO fixes often require engineering work — communicate technical requirements in developer-readable format with clear priority and expected impact
- **With Digital Marketing Manager**: Paid and organic search data should be shared — high-performing paid keywords are candidates for organic investment and vice versa; coordinate to avoid cannibalization
- **With Copywriter**: Content briefs with target keyword, intent, required sections, and semantic terms give copywriters what they need to produce SEO-optimized drafts without guesswork
- **With Marketing Analyst**: Organic attribution modeling, keyword rank tracking, and conversion analysis from organic traffic require joint data model setup and interpretation
