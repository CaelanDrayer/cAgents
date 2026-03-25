# Best Practices: Knowledge Base Manager

> Design principles, patterns, and frameworks that guide high-quality knowledge base strategy, content creation, and maintenance work.

## Design Principles

- **Ticket-Driven Prioritization**: The support ticket queue is the most reliable signal for what content to write first; high-volume, high-resolution-time tickets should become KB articles before anything else
- **Customer Language, Not Internal Language**: Write using the words customers use to describe their problems, not the internal product taxonomy; searchability depends on vocabulary match
- **One Topic Per Article**: Each article should answer one question or cover one task; multi-topic articles are hard to find, hard to read, and hard to maintain
- **Accuracy Over Volume**: A small library of accurate, current articles outperforms a large library of stale ones; trust is the KB's most important asset
- **Deflection Is the Metric That Matters**: Article views and CSAT are useful, but deflection rate — tickets prevented — is the primary measure of KB impact on the business
- **Minimalism in Writing**: Remove every word that isn't essential; customers in trouble want the fastest path to resolution, not prose they have to read around to find the answer
- **Maintenance Is Non-Negotiable**: Publishing an article is the beginning of its lifecycle, not the end; outdated articles erode trust and create support tickets about the KB itself

## Key Patterns & Frameworks

- **KCS (Knowledge-Centered Service) Methodology**: Capture knowledge during the support process, structure it for reuse, improve it over time, and retire it when no longer relevant; embeds KB development into daily support work rather than treating it as a separate project
- **Content Gap Analysis Process**: Export the top 50 support ticket types by volume, identify which lack KB articles, estimate deflection potential, and prioritize writing accordingly
- **Article Template Library**: Standardized templates for how-to guides, troubleshooting articles, FAQs, and release notes; templates enforce structure, reduce writing time, and create reader consistency
- **SEO for Support Content**: Optimize article titles, headers, and metadata for both internal search and Google; many customers find KB articles via Google before reaching the KB directly
- **Content Tiering by Audience**: Separate beginner, intermediate, and advanced content; label articles clearly by difficulty so customers don't read the wrong content for their level
- **Article Review Workflow**: Every new or significantly updated article goes through technical review (accuracy), editorial review (clarity and style), and SEO review (discoverability) before publication
- **Quarterly Content Audit**: Review all articles for accuracy, helpfulness rating trend, search performance, and last-updated date; retire or update articles that fail the audit
- **Deflection Measurement Methodology**: Compare article view data against ticket volume for the same topic; articles where views are high and tickets on that topic are low indicate successful deflection

## Domain Concepts & Terminology

### KB Structure
- **Article**: Single-topic self-service content item in the knowledge base
- **Category**: Top-level organizational grouping of related articles
- **Tag**: Metadata label enabling cross-category content discovery
- **Taxonomy**: Complete hierarchical structure of categories and labels used to organize KB content
- **Table of Contents**: Article-level navigation structure for longer articles; improves scanability
- **Related Articles**: Links between articles covering related topics; reduces search dead-ends

### Content Types
- **How-To Guide**: Step-by-step procedural instructions for completing a task; format includes numbered steps with screenshots
- **Troubleshooting Article**: Symptom-driven article presenting multiple possible causes and solutions in structured format
- **FAQ Article**: Question-and-answer format for brief, frequently asked questions
- **Release Notes**: Documentation of product changes, additions, and fixes in each release
- **Concept Article**: Explanation of a product concept, feature, or term without step-by-step instructions

### Metrics
- **Deflection Rate**: Percentage of potential support tickets prevented by KB self-service; primary ROI metric
- **Helpfulness Rating**: Post-read customer vote on whether the article helped; "Yes/No" or 1-5 scale
- **Article View Count**: Total views within a period; high views indicate relevance, not necessarily quality
- **Search Click-Through Rate**: Percentage of searchers who click on an article from search results; measures title/description relevance
- **Failed Search Rate**: Percentage of searches returning zero results or where users don't click any result; identifies content gaps
- **Content Freshness**: Percentage of articles updated within the past 6 months; stale content erodes trust

### Methodology
- **KCS (Knowledge-Centered Service)**: Methodology integrating knowledge creation into the support workflow
- **Article Lifecycle**: Draft → Review → Publish → Monitor → Update → Archive — each stage has defined owners and criteria
- **SME (Subject Matter Expert) Review**: Technical review by a product or engineering expert to verify factual accuracy
- **Style Guide**: Document defining writing standards, terminology, formatting, and voice for KB content
- **Content Migration**: Process of moving content from legacy documentation into the KB with reformatting and quality review

## Anti-Patterns to Avoid

- **Writing Everything Without Prioritization**: Creating content for every feature regardless of ticket volume; produces a large KB where 90% of content covers 10% of customer needs
- **Stale Article Library**: Publishing articles and never updating them after product changes; customers who follow outdated steps lose trust in the KB entirely
- **Internal Jargon**: Using product team names for features rather than the names customers actually use; mismatches between customer search terms and article language prevent discovery
- **Walls of Text**: Writing KB articles as long unstructured paragraphs; customers scan for the specific step they need, not read linearly
- **Missing Screenshots**: Describing UI interactions in text without screenshots; customers can't follow multi-step UI tasks without visual confirmation of what they should be seeing
- **Treating Deflection as Avoidance**: Measuring only tickets deflected without measuring whether customers actually resolved their issues; high deflection with low helpfulness ratings means customers gave up, not succeeded
- **No Review Workflow**: Publishing articles without technical or editorial review; errors in KB articles produce incorrect instructions that damage both customer success and brand trust

## Quality Indicators

- **Deflection Rate >40%**: KB prevents more than 40% of potential support contacts through self-service
- **Helpfulness Rating >80%**: At least 80% of article readers vote the content helpful
- **Coverage >90%**: At least 90% of the top-50 ticket types have a corresponding KB article
- **Content Freshness <10% Stale**: Less than 10% of articles last updated more than 6 months ago
- **Failed Search Rate <15%**: Fewer than 15% of searches return no useful results
- **Article Review Compliance**: 100% of published articles passed technical and editorial review
- **Quarterly Audit Completion**: Full content audit completed every quarter with outdated articles updated or retired

## Collaboration Touchpoints

- **With Technical Writer**: Coordinate on technical content standards, API documentation, and complex feature guides; Technical Writer handles deep technical documentation while KB Manager handles customer-facing support content
- **With Support Operations Manager**: Align KB performance data with support ticket trends; KB manager is accountable for deflection rate improvement and reports to Support Ops
- **With Customer Support Rep**: KB Manager sources content gaps from front-line support experience; support reps identify the questions that need articles most urgently
- **With Product**: Receive advance notice of product releases to update KB content before features launch; lag between feature launch and KB article creates a predictable spike in support tickets
