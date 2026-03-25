# Best Practices: Email Marketing Specialist

> Design principles, patterns, and frameworks that guide high-quality email campaign design, automation, deliverability, and optimization work.

## Design Principles

- **Permission is the Foundation**: Every contact on your list should have explicitly opted in — purchased lists and gray-area consent destroy deliverability and trust
- **Relevance Over Frequency**: An email that's perfectly relevant to the recipient is welcome; an irrelevant one trains them to unsubscribe
- **Subject Line is 90% of the Battle**: If the email isn't opened, nothing else matters — invest disproportionate effort in subject line and preview text
- **One Email, One Action**: Each email should have a single primary CTA; multiple competing actions reduce click-through on all of them
- **Mobile-First Design**: More than half of email opens are on mobile — design for the smaller screen and enhance for desktop
- **Segmentation Multiplies Impact**: The same send to two different segments with tailored messages consistently outperforms a single unsegmented blast
- **List Health is a Long-Term Asset**: Sending to unengaged contacts destroys your sender reputation faster than it generates revenue

## Key Patterns & Frameworks

- **Email Deliverability Stack**: SPF + DKIM + DMARC authentication + dedicated sending IP (for high volume) + sender reputation monitoring — foundational infrastructure that must be maintained
- **Welcome Sequence Architecture**: Day 0 (confirmation/welcome) → Day 2 (brand story/value) → Day 5 (key feature/benefit) → Day 10 (social proof/case study) → Day 15 (conversion offer) — sets expectations and drives early engagement
- **Re-engagement Sequence**: 3-email series targeting contacts who haven't opened in 90+ days: curiosity subject → value reminder → sunset email with opt-in confirmation — preserves list health
- **Behavioral Trigger Map**: Identify key user/prospect actions and map the email response (e.g., webinar attended → educational follow-up, pricing page visited → sales outreach trigger)
- **Segmentation Matrix**: Segment by lifecycle stage × persona × engagement level × product interest — the more specific the segment, the higher the relevance and conversion
- **A/B Testing Calendar**: Systematic testing of subject lines, sender names, send times, CTA placement, and email length — one variable at a time with defined success metrics
- **Email Performance Benchmark Set**: Open rate, click-through rate, click-to-open rate, unsubscribe rate, bounce rate, and conversion rate — benchmarked by email type and industry
- **Drip vs. Trigger Decision Framework**: Drip campaigns run on schedule for all contacts in a segment; trigger campaigns fire in response to individual behavior — use triggers for personalization, drips for programmatic nurture
- **Subject Line Swipe File**: Library of high-performing subject line formulas tested and proven for your audience — organized by objective (curiosity, benefit, urgency, social proof)
- **Email Design System**: Modular template system with reusable header, body, CTA, and footer blocks — ensures visual consistency and accelerates production

## Domain Concepts & Terminology

### Deliverability
- **Sender Reputation**: The trustworthiness score email providers assign your sending domain and IP, based on engagement and complaint rates
- **SPF (Sender Policy Framework)**: DNS record that authorizes which mail servers can send email on behalf of your domain
- **DKIM (DomainKeys Identified Mail)**: Cryptographic signature that verifies email hasn't been tampered with in transit
- **DMARC (Domain-based Message Authentication, Reporting & Conformance)**: Policy defining what happens to emails that fail SPF/DKIM checks
- **Bounce Rate**: Hard bounces (invalid address) must be removed immediately; soft bounces (temporary delivery failure) should be retried and removed after repeated failure
- **Spam Trap**: Email addresses operated by ISPs to identify senders with poor list hygiene; hitting spam traps severely damages reputation
- **List Hygiene**: Regular process of removing hard bounces, spam complainers, and unengaged contacts to maintain list quality
- **Inbox Placement Rate**: Percentage of sent emails that land in the inbox (vs. spam folder) — the true deliverability metric

### Campaign Metrics
- **Open Rate**: Percentage of delivered emails opened; increasingly unreliable due to Apple Mail Privacy Protection
- **Click-Through Rate (CTR)**: Percentage of delivered emails that generated at least one click
- **Click-to-Open Rate (CTOR)**: Clicks divided by opens — measures engagement quality among those who opened
- **Conversion Rate**: Percentage of recipients who completed the desired action after clicking
- **Unsubscribe Rate**: Above 0.5% indicates a relevance or frequency problem requiring immediate attention
- **Complaint Rate**: Spam report rate; above 0.1% will damage deliverability with major inbox providers

### Automation
- **Marketing Automation Platform (MAP)**: Software (HubSpot, Marketo, Klaviyo, ActiveCampaign) that enables automated, personalized email workflows
- **Workflow / Sequence**: A series of automated emails triggered by enrollment criteria and time or behavior delays
- **Trigger**: The action or condition that enrolls a contact in an automated sequence
- **Conditional Branch**: Logic that routes contacts to different email paths based on their behavior or attributes
- **Suppression List**: Contacts excluded from sends (unsubscribers, current customers, active sales conversations)

## Anti-Patterns to Avoid

- **Purchased Lists**: Sending to contacts who didn't opt in generates spam complaints, destroys reputation, and violates CAN-SPAM/GDPR
- **No Sunset Policy**: Keeping unengaged contacts on your active list indefinitely hurts deliverability for everyone on the list
- **Subject Line Bait-and-Switch**: Writing a subject line that doesn't match the email content creates distrust and unsubscribes
- **Excessive Send Frequency**: Emailing too often trains your list to ignore you; the right frequency depends on content value and audience expectations
- **Ignoring Unsubscribe Signals**: Contacts who click "unsubscribe" should be suppressed immediately; delays violate law and further erode trust
- **No Mobile Preview Check**: Sending emails that render poorly on mobile ignores that majority of your opens happen there
- **Batch-and-Blast without Segmentation**: Sending the same message to your entire list assumes all subscribers have the same needs and stage — rarely true

## Quality Indicators

- **Inbox Placement Rate**: Above 95% for well-maintained lists — below 90% requires deliverability investigation
- **Active List Health**: Percentage of list that has opened at least one email in the past 90 days; declining trend indicates re-engagement program needed
- **Open Rate vs. Industry Benchmark**: Compare to vertical benchmarks; significant underperformance indicates subject line or sender name issues
- **Click-to-Open Rate**: Above 10–15% indicates emails are delivering relevant, compelling content to those who open
- **Automation Coverage**: What percentage of key lifecycle triggers have active automated sequences in place?
- **A/B Test Velocity**: How many email elements have been tested in the past quarter — a program learning health signal
- **Unsubscribe Rate Trend**: Rising unsubscribe rates signal a frequency or relevance problem before deliverability consequences materialize

## Collaboration Touchpoints

- **With Copywriter**: Subject lines and email body copy require specialized email copywriting skill; provide the brief, behavioral context, and segment data; co-review drafts for both conversion and brand voice
- **With Marketing Ops Specialist**: Email workflows, trigger logic, list segmentation, and CRM sync all require close coordination — they own the platform configuration, you own the program design
- **With Campaign Manager**: Email is often the primary owned-media channel in campaign execution; align on timing, messaging, and list targeting before launch
- **With Demand Generation Manager**: Nurture sequences are the execution layer of demand gen programs; co-design the behavioral branch logic that qualifies contacts as MQLs
- **With Marketing Analyst**: Email performance data feeds attribution models and list optimization recommendations; regular joint reviews identify decay patterns early
