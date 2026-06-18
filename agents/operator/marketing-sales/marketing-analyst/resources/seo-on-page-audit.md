# On-Page SEO Audit

> **v12 absorption note**: This document was absorbed from the standalone `on-page-seo-auditor`
> agent in v12.0.0 as part of the SEO collapse (6 agents → 2: `seo-specialist` + `geo-strategist`).
> When prior docs reference `cagents:on-page-seo-auditor`, route to `cagents:marketing-analyst` with `mode: seo` and
> the on-page-audit focus described here. Original SKILL.md content preserved below.

<example>
<context>Single-page audit</context>
<user>Audit https://example.com/pricing for on-page SEO</user>
<agent>seo-specialist (on-page mode) inspects: title (length, keyword, uniqueness), meta description, H1/H2/H3 hierarchy, body content quality and E-E-A-T markers, internal anchor text inbound and outbound, schema (Product, Offer, Organization), image alt text and file sizes, canonical, Open Graph and Twitter Card. Reports each finding with severity (Critical/High/Medium/Low) and fix.</agent>
</example>

The element-by-element auditor of what's actually on the page. Where technical-audit
asks "can Google crawl and index this site?", on-page-audit asks "once Google
sees this page, is it set up to rank for what we want it to rank for?"

## Use When

- A specific URL needs a deep on-page audit
- A page is indexed but not ranking despite reasonable content
- Schema markup needs validation or a recommendation
- Heading hierarchy or internal linking is suspected of being broken
- E-E-A-T signals need assessment (especially YMYL topics: health, finance, legal)
- A new page is being planned and the on-page checklist needs to be applied pre-launch

## Core Responsibilities

- **Title tag audit**: 50-60 chars, keyword presence, uniqueness across the site, brand suffix
- **Meta description**: 150-160 chars, compelling, keyword present, CTA where appropriate
- **Heading hierarchy**: exactly one H1, no skipped levels (H2 → H3, never H2 → H4), descriptive H2/H3 mirroring search queries
- **URL structure**: short, descriptive, hyphenated, no parameters where avoidable, no trailing-slash inconsistency
- **Internal linking**: outbound anchors from this page (relevance, anchor diversity); inbound anchors to this page (do other pages link here at all?)
- **Schema markup**: detect, validate (required + recommended properties), recommend additions
- **Image SEO**: alt text presence + descriptiveness, file size flags, format (WebP/AVIF preferred), width/height attributes
- **Content quality / E-E-A-T**: word count vs page-type minimum, readability, freshness signals, author credentials, first-person experience markers
- **Canonical and meta robots**: correctly set, no accidental noindex
- **Open Graph and Twitter Card**: complete and image-validated

## Engagement Patterns

| Input | Output |
|---|---|
| "Audit URL X" | Full element-by-element report with severity-ranked findings |
| "Why isn't this page ranking?" | On-page diagnosis: keyword/intent fit, content depth, schema, internal linking inbound |
| "Validate schema for these pages" | Detected types, validation status, missing properties, recommended additions |
| "Audit images on this page" | Alt text coverage, missing dimensions, oversize files (>200KB warning, >500KB critical), format suggestions |

## Title Tag Standards

| Aspect | Standard | Severity if violated |
|---|---|---|
| Length | 50-60 chars (truncation at ~600 SERP px) | High |
| Primary keyword present | Yes, ideally near the front | High |
| Uniqueness across site | No two pages share the same title | High |
| Brand suffix | Optional but conventional: ` | Brand` or ` - Brand` | Low |
| Click-worthiness | Avoid pure keyword-stuffing; humans click | Medium |

## Meta Description Standards

| Aspect | Standard | Severity |
|---|---|---|
| Length | 150-160 chars | Medium |
| Primary keyword present | Yes, naturally | Medium |
| CTA or value statement | Yes for transactional/commercial pages | Medium |
| Uniqueness | Each page distinct | High |
| Auto-generation | Avoid CMS auto-generated descriptions on key pages | High |

## Heading Hierarchy Rules

- Exactly one `H1` per page, matching the page intent
- `H2` for primary sections, `H3` under `H2`, `H4` under `H3`. Never skip levels.
- `H2`/`H3` should mirror real search queries (especially PAA phrasings)
- Avoid using headings for visual styling — use CSS for that
- Severity: skipped levels = Medium; missing or duplicate H1 = High

## Schema Markup

### Detection
Read JSON-LD, microdata, and RDFa. JSON-LD is preferred and what Google primarily uses.

### Validation
Check required + recommended properties per schema.org type. Common types and their
required props:

| Type | Required (selected) | Recommended additions |
|---|---|---|
| Article | headline, datePublished, author | image, dateModified, publisher |
| Product | name, image, offers | brand, aggregateRating, review, sku |
| Organization | name, url | logo, sameAs (social profiles), contactPoint |
| LocalBusiness | name, address, telephone | openingHours, priceRange, geo |
| BreadcrumbList | itemListElement | (deprecation: don't use position-only forms) |
| Person | name | image, jobTitle, sameAs |
| Recipe | name, recipeIngredient, recipeInstructions | image, nutrition, aggregateRating |
| Event | name, startDate, location | offers, image, performer |

### What NOT to recommend
- **HowTo**: deprecated as a Google rich result. Don't use.
- **FAQPage**: rich-result eligibility restricted to government/health sites since Aug 2023. The content pattern still helps citability — but don't promise the SERP feature.

## Image SEO

| Check | Standard | Severity |
|---|---|---|
| Alt text present | Yes, on all content images (decorative images use empty alt) | High |
| Alt text descriptive | Describes the image, includes keyword naturally where relevant | Medium |
| File size | Warn >200KB, critical >500KB | Medium / High |
| Format | WebP or AVIF preferred over JPEG/PNG | Medium |
| Dimensions in HTML | width/height attributes set (prevents CLS) | Medium |
| Lazy loading | `loading="lazy"` on below-fold images | Low |
| Filename | Descriptive, hyphenated (`hero-laptop.webp` not `IMG_1234.png`) | Low |

## Content Quality and E-E-A-T

E-E-A-T = Experience, Expertise, Authoritativeness, Trustworthiness. Especially critical
for YMYL (Your Money or Your Life) topics: health, finance, legal, safety.

Signals to check:

| Signal | Where to find it |
|---|---|
| Author byline + credentials | Top or side of article, linked to author page |
| Author page exists | Bio, photo, credentials, sameAs links to LinkedIn/Twitter/etc. |
| First-hand experience markers | "I tested...", "We measured...", original photos, original data |
| Citations to authoritative sources | Government, academic, established industry publications |
| Publication date + last updated date | Visible to users, also in schema |
| Editorial standards page | Linked from footer or about page |
| Fact-check / corrections policy | For news/journalism sites |

Word count by page type (rough minimums for ranking competitiveness, not arbitrary):

| Page type | Minimum competitive word count |
|---|---:|
| Definition / glossary | 150-300 |
| Product page | 300-500 (descriptive copy + specs/features) |
| Category / hub | 300-600 (including curated child links + intro) |
| How-to guide | 800-1500 |
| Pillar / cornerstone article | 2000-4000 |
| Comparison / "vs" | 1200-2500 |

Word count alone doesn't rank — but consistently undersized content for the page
type is a signal of thin content.

## Internal Linking Audit

For the audited page:
- **Outbound** (links from this page): are they relevant? Anchor text varied? Pointing to topically-related pages? Excessive count suggests link-stuffing.
- **Inbound** (links to this page from elsewhere on the domain): do *any* internal pages link here? An orphan page rarely ranks. Are anchor texts descriptive (not "click here")?

## Open Graph and Twitter Card

| Property | Required for sharing? |
|---|---|
| `og:title` | Yes |
| `og:description` | Yes |
| `og:image` | Yes (1200×630 recommended) |
| `og:url` | Yes (canonical) |
| `og:type` | Yes (`article`, `website`, `product`) |
| `twitter:card` | Yes (`summary_large_image` for content) |
| `twitter:title` | Yes |
| `twitter:description` | Yes |
| `twitter:image` | Yes |

## Severity Scoring

| Severity | Examples |
|---|---|
| Critical | No title tag, accidental noindex, broken canonical, missing H1, no body content |
| High | Duplicate titles across site, missing meta description on key pages, no internal links inbound to a money page, schema missing required properties |
| Medium | Title length out of band, heading hierarchy skips, oversize images, missing OG tags |
| Low | Suboptimal anchor variety, missing Twitter Card image, filename not descriptive |

## Anti-patterns

- Recommending HowTo or FAQPage rich-result schema (deprecated/restricted, see above)
- Treating word count as a ranking factor in itself rather than a thin-content signal
- Stuffing keywords into alt text — alt text is for accessibility *and* SEO, in that order
- Recommending exact-match anchors heavily (over-optimization signal)
- Generic findings ("improve content quality") without specific fixes
- Ignoring intent fit — a perfectly-optimized page targeting the wrong intent still won't rank

## Key Outputs

- `ON-PAGE-AUDIT.md` per audited URL with severity-ranked findings
- `SCHEMA-VALIDATION.md` when schema is the focus
- `INTERNAL-LINKING-MAP.md` when linking architecture is in scope
- `IMAGE-SEO-REPORT.md` when image optimization is the focus

## See Also

- `operator/marketing-sales/seo-specialist/resources/keyword-research.md` (intent input)
- `operator/marketing-sales/seo-specialist/resources/technical-audit.md` (complementary scope)
- `operator/marketing-sales/geo-strategist/SKILL.md` (citability + answer-block patterns)
