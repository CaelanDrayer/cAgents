# Scholar Mode Playbooks

Deep per-mode mechanics for the three scholar modes (search / review / write). The
SKILL.md body keeps the mode dispatch table; this file carries the detailed
mechanics for each mode.

## Mode: Search

*Formerly: academic-paper-searcher*

Use **OpenAlex** (<https://openalex.org>) — 250M+ academic works, free, no API key —
to search and retrieve scholarly literature. Returns titles, authors, citation counts,
DOIs, abstracts, and open-access PDF links.

### Quick start

OpenAlex exposes a public REST API at `https://api.openalex.org`. Two primary operations:

**Keyword search**

```bash
curl -sG "https://api.openalex.org/works" \
  --data-urlencode 'search=YOUR QUERY' \
  --data-urlencode 'per-page=10' \
  --data-urlencode 'sort=relevance_score:desc' \
  | jq '.results[] | {title, doi, year: .publication_year, cites: .cited_by_count, authors: [.authorships[].author.display_name]}'
```

Sort options: `relevance_score:desc` (default), `cited_by_count:desc` (landmark papers),
`publication_date:desc` (most recent first). Pagination: add `&page=2`. Max `per-page=200`.

**Specific paper lookup (by DOI or OpenAlex ID)**

```bash
# By DOI URL
curl -s "https://api.openalex.org/works/https://doi.org/10.3390/brainsci8020020" \
  | jq '{title, abstract: .abstract_inverted_index, oa_url: .open_access.oa_url}'

# By OpenAlex ID (W-prefixed)
curl -s "https://api.openalex.org/works/W2789811475" \
  | jq '{title, authors: [.authorships[].author.display_name]}'
```

OpenAlex returns abstracts as an inverted index — reconstruct by ordering tokens by
their position arrays.

### Search tips

- **Be specific**: "bilingual cognitive advantages executive function" beats "bilingualism brain".
- **Citations as quality signal**: sort `cited_by_count:desc` for papers the field actually reads.
- **Traverse the citation graph**: `related_works` array on each paper contains OpenAlex IDs
  for one-hop deeper traversal.
- **Polite pool**: append `&mailto=your@email` for faster, more reliable responses.

### Output format (search mode)

```
1. {Title}
   Authors: {first three authors}{', et al.' if more}
   Year: {year} | Cites: {cited_by_count} | DOI: {doi or 'N/A'}
   {one-sentence abstract summary}
```

For systematic reviews, also report the OpenAlex ID for deterministic downstream lookups.

---

## Mode: Review

*Formerly: literature-review-author*

Synthesizes a corpus of prior work into a structured, defensible literature review
using PRISMA-style methodology.

### Default Workflow (PRISMA-Lite)

1. **Define question + scope** — produce a one-paragraph PICO/PECO statement
   (Population, Intervention/Exposure, Comparator, Outcome) before searching.
2. **Build the search** — list 3-7 source universes (arXiv, ACM DL, IEEE Xplore,
   PubMed, Google Scholar, named conferences) with explicit boolean queries + date range.
3. **Title screen** — drop obviously off-topic results; record exclusion count.
4. **Abstract screen** — apply criteria; record per-paper exclusion reasons.
5. **Full-text extract** — for each retained paper: claim, method, sample, outcome,
   limitations, 1-2 quotable findings.
6. **Cluster + synthesize** — group by theme; write narrative paragraphs citing the
   evidence table.
7. **Gap analysis** — list 3-7 named gaps the literature has not closed.

### Output Artifacts (review mode)

- **Evidence table** (`outputs/literature/evidence.csv`): one row per source —
  citation, claim, method, sample, outcome, limitations, retained Y/N, reason.
- **Search log** (`outputs/literature/search-log.md`): queries, dates, source universes,
  hit counts at each PRISMA stage.
- **Review narrative** (`outputs/literature/review.md`): structured prose with inline
  citations to the evidence table.
- **Gap analysis** (`outputs/literature/gaps.md`): named open questions + suggested
  empirical paths.

### Quality Bar (review mode)

- Every synthesis claim MUST cite a row in the evidence table.
- Every excluded source MUST have a recorded reason.
- The search MUST be reproducible — same queries + date range leads to ±10% hit count.
- "I read the abstract" is acceptable only for excluded sources.

---

## Mode: Write

Produces academic prose across three sub-modes:

| Sub-mode | Trigger | Output |
|----------|---------|--------|
| `paper` | "write a paper / article / manuscript" | Full-length academic paper |
| `abstract` | "write an abstract" | 150-300 word structured abstract |
| `proposal` | "write a proposal / grant" | Research proposal / specific aims page |

### Paper sub-mode

Produces IMRaD (Introduction, Methods, Results, Discussion) structure. Follows APA 7th
by default; switches to MLA, Chicago, or journal-specific style when specified.

1. **Hook + significance** — open with the problem, not the solution.
2. **Gap statement** — name exactly what is unknown and why existing work falls short.
3. **Thesis / objective** — one sentence stating what this paper does.
4. **Methods** — sufficient detail for replication; cite instruments and statistical tests.
5. **Results** — data first, interpretation second.
6. **Discussion** — interpret, contextualize, acknowledge limitations, propose next steps.
7. **Conclusion** — close the loop opened by the hook; state contribution.

### Abstract sub-mode

150-300 words, structured: Background / Objective / Methods / Results / Conclusions.
For proposals: add "Expected Impact." No jargon not defined elsewhere in the manuscript.

### Proposal sub-mode

Follows funder review criteria. Default template: NIH R01 Specific Aims page (1 page).

1. **Opening paragraph** — significance, innovation, urgency.
2. **Aims** — 2-4 logically sequenced aims with testable hypotheses.
3. **Expected outcomes** — what will be known after each aim.
4. **Closing** — contribution to field + expected impact.
