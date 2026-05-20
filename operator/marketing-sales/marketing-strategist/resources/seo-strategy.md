# SEO Strategy

> **Absorbed in v12.0.0**: This resource consolidates the former `seo-strategist`
> controller agent (eliminated in the v12 controller-bloat collapse). The
> `cagents:seo-strategist` alias now resolves to `cagents:marketing-strategist`
> via `scripts/migration/v12-aliases.yaml`. Tier 2+ SEO work — site audits,
> ranking recovery, content/technical/link/GEO strategy — is now coordinated by
> marketing-strategist, which delegates to the SEO specialist execution agents.

Coordination playbook for organic search work. Decomposes "make us rank" into
specific questions and delegates to SEO specialists who actually do the audit,
the keyword research, the technical work, the link planning, and the GEO/AI-search
optimization. Synthesizes their findings into a single health score and a
sequenced roadmap.

## Use When

- A site needs a full SEO audit and a plan to act on it
- Rankings dropped and the cause is unknown (algorithmic? technical? content? links?)
- Launching a new site or section and SEO needs to be designed from day one
- A topic cluster, pillar page, or content hub is being planned
- AI search visibility (ChatGPT, Perplexity, Google AI Overviews, Gemini) needs improvement
- Multiple SEO concerns are tangled together and need coordinated decomposition

## Core Responsibilities

- **Scope and frame**: convert "do SEO" into bounded objectives with success criteria
- **Specialist orchestration**: route audit work to the SEO execution agents below
- **Synthesis**: combine sometimes-contradictory specialist findings into one plan
- **Prioritization**: stack-rank fixes by impact x effort, not by who shouted loudest
- **Roadmap**: phase the work into Foundation > Quick Wins > Compounding investments
- **Tradeoff arbitration**: technical-vs-content vs link-vs-GEO budget decisions

## Specialist Catalog

> v12 update (WI-W3.3): The four pre-v12 SEO execution agents (`keyword-researcher`,
> `on-page-seo-auditor`, `technical-seo-auditor`, `link-strategist`) were absorbed
> into `seo-specialist` as mode-specific resources (@resources/keyword-research.md,
> @resources/on-page-audit.md, @resources/technical-audit.md, @resources/link-strategy.md).
> `geo-strategist` remains a separate execution agent. Route SEO questions to
> `seo-specialist` (specify mode via the question) and AI-search questions to
> `geo-strategist`.

| Specialist | Mode (within seo-specialist) | Ask them about |
|---|---|---|
| **seo-specialist** | keyword-research | Search intent, SERP landscape, keyword difficulty, long-tail discovery, semantic clusters |
| **seo-specialist** | on-page-audit | Title tags, meta descriptions, heading hierarchy, internal anchors, schema, image alt |
| **seo-specialist** | technical-audit | robots.txt, sitemap, Core Web Vitals (LCP/INP/CLS), JS rendering, hreflang, structured data |
| **seo-specialist** | link-strategy | Internal linking architecture, external link prospecting, anchor diversity, toxic-link exposure |
| **geo-strategist** | — (separate agent) | LLM citation strategy, AI Overviews readiness, llms.txt, FAQ-rich schema, conversational queries |

## Question-Based Delegation

```
1. Read plan.yaml objectives + decomposition.yaml work items
2. Confirm scope: URL(s), depth, business type, target markets, language(s)
3. For each objective, formulate specific questions and route to the right specialist
4. Spawn specialists in parallel (they touch different signal layers — no conflicts)
5. Collect answers; cross-check for contradictions (e.g., "fix CWV" vs "expand content")
6. Synthesize a single SEO health score (0-100) and prioritized action plan
7. Write coordination_log.yaml with all Q&A, synthesis, implementation tasks
```

### Sample Question Routing

| Objective | Question | Delegated to (v12) |
|---|---|---|
| "Recover lost rankings" | "What technical regressions changed since the drop date?" | seo-specialist (technical-audit mode) |
| "Recover lost rankings" | "Did SERP intent shift for the affected queries?" | seo-specialist (keyword-research mode) |
| "Plan content cluster" | "What seed keyword expansions share top-10 SERP overlap?" | seo-specialist (keyword-research mode) |
| "AI search visibility" | "What citability gaps exist in our top 10 pages?" | geo-strategist |
| "Improve link profile" | "What anchor diversity issues exist on our money pages?" | seo-specialist (link-strategy mode) |
| "Site health audit" | "Are CWV (LCP/INP/CLS) within Google's good thresholds at p75?" | seo-specialist (technical-audit mode) |

## Synthesis Framework

Every audit produces ONE unified output, not five disconnected reports.

### SEO Health Score (0-100)

Weighted aggregate over the five specialist domains. Default weights — adjust based
on business type and the user's stated priorities:

| Domain | Default weight | Increase when... |
|---|---:|---|
| Technical SEO | 22% | Site is large (>10k pages), JS-heavy, or has known crawl/index issues |
| Content / On-Page | 23% | Content gaps drive most of the SERP gap to competitors |
| Keyword Strategy | 15% | New site, new market, or pivoting topic |
| Link Profile | 20% | Mature site competing in a high-DA vertical |
| GEO / AI Search | 10% | B2B SaaS, knowledge content, or AI-Overview-eligible queries |
| Quick wins / scoring tail | 10% | (always reserved for fast-shipping high-impact items) |

### Action Plan Structure

```
## Critical (ship this week)
1. [issue] — [specialist] — [estimated effort: hours/days] — [expected impact]
...

## High (ship this month)
...

## Medium (ship this quarter)
...

## Low / Backlog
...
```

Always pair an action with the specialist who diagnosed it so the implementer knows
where to follow up for clarification.

## Anti-patterns

- **Doing the audit yourself.** Spawn specialists. You synthesize, you don't crawl.
- **Treating GEO as "just SEO with FAQs."** ChatGPT and Google AI Overviews share only
  ~11% of cited domains for the same query. Platforms are different and need their own
  optimization.
- **Recommending FAQPage rich-result schema for non-gov/health sites.** Google
  restricted FAQ rich results to government/health since Aug 2023. The FAQ *content*
  pattern still helps citability, but don't promise a SERP feature you can't get.
- **Recommending HowTo schema.** Deprecated as a rich result. Skip it.
- **One-size-fits-all crawl depth.** A 50-page site doesn't need a 500-page crawl;
  a 100k-page e-commerce site needs sampled crawls plus log-file analysis.
- **Treating organic and AI-search as a zero-sum tradeoff.** They overlap heavily —
  good organic SEO is a prerequisite for AI Overview citations (~92% of AIO citations
  come from pages already in Google's top 10).

## Key Outputs

- `SEO-AUDIT-REPORT.md` — full audit with health score per domain
- `ACTION-PLAN.md` — prioritized fixes with effort, impact, owner
- `KEYWORD-STRATEGY.md` — when keyword strategy is in scope
- `CONTENT-CLUSTER-MAP.md` — when content architecture is in scope
- `coordination_log.yaml` — Q&A trail with all specialist answers and synthesis

## Success Metrics

- **Coverage**: every scoped page has been examined by at least 3 of the relevant SEO specialists
- **Cross-check rate**: contradictions between specialists are resolved (not buried) in synthesis
- **Action plan quality**: every Critical/High item has impact + effort + owner
- **Implementation traceability**: each action links back to the specialist diagnosis
