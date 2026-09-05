# Link Strategy

> **v12 absorption note**: This document was absorbed from the standalone `link-strategist`
> agent in v12.0.0 as part of the SEO collapse (6 agents → 2: `seo-specialist` + `geo-strategist`).
> When prior docs reference `cagents:link-strategist`, route to `cagents:marketing-analyst` with `mode: seo` and
> the link-strategy focus described here. Original SKILL.md content preserved below.

<example>
<context>Link profile audit</context>
<user>I think we have toxic links pulling us down — can you check?</user>
<agent>seo-specialist (link-strategy mode) pulls referring domains, scores anchor distribution (red flag: >50% exact-match), flags spam signals (PBN footprints, low-quality directories, foreign-language sites mismatched with brand market), separates legitimate but low-value links from genuinely toxic, and produces a disavow file recommendation only for the latter — disavow is a last resort, not a first.</agent>
</example>

The strategy that treats links — internal and external — as a network engineering
problem. Internal links shape how authority flows inside the site. External links shape
how the site is perceived from outside. Both can be planned, audited, and improved.

## Use When

- Backlink profile health needs assessment
- A new link-building campaign needs a strategy (not just outreach lists)
- Internal linking architecture is unclear or thin (orphan pages, weak hub-spoke flow)
- Toxic link exposure is suspected (penalties, manual actions, or unexplained drops)
- A competitor backlink gap analysis is requested
- Anchor text distribution is suspect (over-optimization risk)
- A topic cluster needs an internal linking matrix

## Core Responsibilities

### Internal Linking Architecture

Internal links pass topical relevance and authority within the site. Goals:
- Every important page reachable in ≤ 3 clicks from the homepage
- No orphan pages (pages with zero internal inbound links)
- Hub pages (pillars) link out to spoke pages and back
- Anchor text varied and descriptive — no "click here" or generic anchors on key pages
- Breadcrumb implementation reinforces hierarchy
- Faceted/filtered navigation does not create link explosion

### External Backlink Profile

| Dimension | What to measure | What good looks like |
|---|---|---|
| Total referring domains | unique linking domains | trend up; absolute number competitive with category |
| Domain quality | average authority (DA/DR/PR) of linking domains | mix; not concentrated in low-quality sources |
| Anchor distribution | % branded vs naked URL vs exact-match vs partial-match vs generic | natural mix: ~30-50% branded, 10-25% naked, 5-15% exact-match, rest split |
| Topical relevance | links from sites in the same vertical | majority topically relevant |
| Geographic relevance | linking-site language/region matches target market | majority match |
| Link velocity | rate of new links over time | steady or growing — sudden spikes from low-quality sources flag spam |
| Follow ratio | follow vs nofollow/sponsored/UGC | ≥ 60% follow on healthy profiles |

### Toxic Link Detection

A link is *toxic* when it actively harms ranking, not merely when it's low-value. Signals:
- Linking site exists primarily to sell links (PBN footprint: same hosting, similar templates, no real audience)
- Linking site is in an unrelated language without business reason
- Anchor text is exact-match commercial term in volume from a single source
- Link velocity spike from many similar low-quality domains (negative SEO attack pattern)
- Linking site has a manual action against it
- Linking page is part of a known link scheme (link wheels, spammy directories, comment spam)

Disavow guidance: Google's John Mueller has repeatedly said disavow is rarely needed.
Use it when:
1. There's a manual action and Google says to clean up unnatural links, OR
2. There's clear evidence of negative SEO (volume of obvious spam)

Don't use it for:
- Links that are merely low-quality but not spammy
- Algorithmic suspicions without evidence

### Competitor Link Gap

Identify domains linking to ≥ 2 competitors but not to you. These are the highest-probability
prospects because they've shown willingness to link to sites in your category.

### Anchor Diversity Audit

Anchor patterns to flag:

| Pattern | Risk |
|---|---|
| > 30% exact-match commercial anchor | High — over-optimization signal |
| > 80% branded | Low — natural for big brands; check if you're earning them organically |
| Many anchors on the *same* commercial term | Medium-High — looks coordinated |
| Many anchors in a foreign language unrelated to brand | High — likely unsolicited spam |
| Many "click here" / "read more" generic anchors | Low — wastes signal but not harmful |

## Engagement Patterns

| Input | Output |
|---|---|
| "Audit our backlink profile" | Profile overview, anchor distribution, quality breakdown, link velocity, flagged issues |
| "Find link prospects in [vertical]" | Tiered prospect list (Tier 1: high-DA topical sites; Tier 2: niche relevant; Tier 3: low-effort wins) with outreach-angle suggestions |
| "Audit internal linking" | Click-depth heatmap, orphan list, hub-spoke flow, anchor-text variety on key pages |
| "Should we disavow these?" | Per-link verdict with reasoning; disavow file format if recommended; usually: "no, don't disavow" |
| "Link gap vs [competitor]" | Domains linking to them but not us, prioritized by relevance + DA |
| "Plan link strategy for [campaign]" | Targets, angles (digital PR, broken link, resource page, guest post, expert quote), KPIs |

## Internal Linking Strategy

For a topic cluster:

```
Hub page (pillar) — comprehensive overview, broad keyword
  ↓ links to ↓                ↑ links from ↑
Spoke pages — narrow keywords, deeper detail, link back to hub
  ↔ optional: spokes link to other spokes when topically related
```

For a category-driven site (e-commerce, marketplace, directory):

```
Home → Category → Subcategory → Item
              ↘ Filtered facet (carefully — risk of explosion)
Cross-linking: related items, related categories, breadcrumbs
```

For a content/publisher site:

```
Topic hub → article → article (related)
Author pages and tag pages provide secondary discovery paths
Avoid date-archive depth blowing past 3 clicks for high-value evergreen
```

## Link Building Tactics by Risk Profile

| Tactic | Risk | When to use |
|---|---|---|
| Digital PR (newsworthy story → press) | Low | Always-on for brands with real news |
| Broken link building | Low | When relevant authoritative pages have dead outbound links |
| Resource page outreach | Low | When a comprehensive asset exists worth listing |
| Expert quote / HARO-style | Low | When a subject-matter expert is on staff |
| Guest posting on relevant high-DA sites | Low-Medium | Quality > quantity; avoid scaled networks |
| Statistics / original research | Low | High effort, very durable links |
| Mention reclamation | Low | Brand mentioned but not linked → ask for link |
| Skyscraper / 10x content | Low-Medium | Effort-intensive, works in saturated topics |
| Guest posting on low-DA networks | High | Avoid |
| PBN links | Very high | Never |
| Paid links violating guidelines | Very high | Never (paid links are fine if disclosed via `rel="sponsored"`) |
| Mass directory submissions | High | Avoid except authoritative niche directories |

## Anti-patterns

- Recommending disavow as a first response to ranking drops (it's a last resort)
- Treating link count as the headline metric — referring domains, quality, anchor diversity matter more
- Ignoring internal linking because external links feel more "real" — internal is faster and fully under your control
- Mass outreach with no prospecting — low conversion, easily looks spammy, can damage relationships
- Recommending specific exact-match anchor distributions to encourage to link partners — that pattern itself is a manipulation signal
- Treating no-follow links as worthless — they pass topical signals, brand awareness, and referral traffic, and Google's "hint" model means some flow ranking signal as well

## Key Outputs

- `BACKLINK-PROFILE-AUDIT.md` — full profile breakdown with quality + anchors + velocity
- `LINK-PROSPECT-LIST.md` — tiered prospects with outreach angles
- `INTERNAL-LINKING-MAP.md` — current state + recommended additions/restructuring
- `LINK-GAP-ANALYSIS.md` — competitor backlink gap
- `DISAVOW-RECOMMENDATION.md` — only when disavow is warranted; ships with reasoning
- `LINK-STRATEGY.md` — campaign plan tied to KPIs

## See Also

- `operator/marketing-sales/seo-specialist/resources/keyword-research.md` (cluster architecture informs internal linking)
- `operator/marketing-sales/pr-specialist/SKILL.md` (digital PR partner)
- `operator/marketing-sales/partnership-marketing-manager/SKILL.md` (partnership-driven links)
