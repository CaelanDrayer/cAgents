# Support Domain (@cagents/support)

Customer success, technical support, and help desk capabilities for the cAgents multi-domain agent system.

## Overview

The Support domain provides 21 specialized agents covering the full spectrum of customer support operations, from front-line help desk to strategic customer success management.

## Agent Roster (21 Total)

### Workflow Agents (5)
1. **router** - Support complexity classifier and template matcher
2. **planner** - Support task decomposer with SLA-aware scheduling
3. **executor** - Support team coordinator and deliverable aggregator
4. **validator** - Support quality gate for deliverables and resolutions
5. **self-correct** - Adaptive recovery specialist for support deliverables

### Executive Leadership (1)
6. **vp-customer-support** - VP of Customer Support: executive leadership for support strategy and customer experience

### Team Agents (15)

**Support Management & Operations**
7. **support-manager** - Support team leader managing daily operations and agent performance
8. **support-operations-manager** - Support operations and process optimization leader
9. **escalation-manager** - Critical incident commander and escalation specialist

**Front-Line Support**
10. **customer-support-rep** - Front-line support agent handling general customer inquiries
11. **chat-support-specialist** - Real-time chat support expert
12. **technical-support-engineer** - Advanced technical troubleshooter for complex customer issues

**Customer Success & Advocacy**
13. **customer-success-manager** - Strategic customer relationship manager focused on adoption and retention
14. **customer-advocacy-manager** - Customer voice champion and advocacy program leader
15. **account-manager** - Account management and relationship specialist

**Quality & Training**
16. **support-quality-analyst** - Quality assurance specialist monitoring support interactions
17. **support-trainer** - Support team training and development specialist
18. **support-analyst** - Support data analyst and insights specialist

**Knowledge & Content**
19. **knowledge-base-manager** - Knowledge base strategist and content curator
20. **technical-writer** - Documentation and help content specialist
21. **customer-education-specialist** - Customer training and education program developer

**Community & Engagement**
22. **community-manager** - Customer community builder and engagement specialist

**Cross-Domain Shared**
23. **sales-operations-manager** - Sales operations and support system specialist (shared from sales domain)

## Support Templates

### support_strategy
- **Triggers**: "improve support", "CSAT strategy", "customer satisfaction plan"
- **Deliverables**: Support strategy document, KPI framework, staffing plan, technology roadmap
- **Agents**: vp-customer-support, support-manager, support-operations-manager, support-quality-analyst

### knowledge_base_plan
- **Triggers**: "knowledge base", "self-service", "documentation strategy", "FAQ system"
- **Deliverables**: Knowledge base architecture, content plan, maintenance workflow, search optimization
- **Agents**: knowledge-base-manager, technical-writer, customer-education-specialist, support-analyst

### escalation_process
- **Triggers**: "escalation", "incident management", "priority routing", "SLA management"
- **Deliverables**: Escalation matrix, SLA definitions, routing rules, communication templates
- **Agents**: escalation-manager, support-manager, technical-support-engineer, vp-customer-support

### support_analytics
- **Triggers**: "support metrics", "CSAT", "NPS", "ticket analysis", "support performance"
- **Deliverables**: Analytics dashboard, trend reports, root cause analysis, improvement recommendations
- **Agents**: support-analyst, support-quality-analyst, support-operations-manager, customer-advocacy-manager

### training_program
- **Triggers**: "support training", "onboarding", "skill development", "agent certification"
- **Deliverables**: Training curriculum, onboarding plan, certification program, ongoing education schedule
- **Agents**: support-trainer, support-manager, technical-support-engineer, customer-education-specialist

### customer_feedback_analysis
- **Triggers**: "customer feedback", "voice of customer", "satisfaction surveys", "sentiment analysis"
- **Deliverables**: Feedback analysis, sentiment trends, actionable insights, improvement priorities
- **Agents**: customer-advocacy-manager, support-quality-analyst, support-analyst, customer-success-manager

## Detection Keywords

Support domain requests typically contain:
- **Customer**: customer, client, user, account holder
- **Support Operations**: ticket, case, support request, help desk, service desk
- **Quality Metrics**: satisfaction, CSAT, NPS, customer experience, CX
- **Retention**: retention, churn, renewal, customer success
- **Support Activities**: support, help, assist, troubleshoot, resolve
- **Escalation**: escalation, priority, urgent, critical, SLA
- **Knowledge**: knowledge base, FAQ, documentation, self-service
- **Technical**: troubleshoot, debug, investigate, diagnose, fix

## Complexity Tiers

### Tier 0: Informational
- Simple FAQs and knowledge base queries
- **Example**: "What are your business hours?"

### Tier 1: Simple Support
- Single-issue tickets with known solutions
- **Example**: "User can't log in - password reset needed"

### Tier 2: Standard Support
- Multi-step troubleshooting required
- **Example**: "Application crashes on startup for certain users"

### Tier 3: Complex Support
- Cross-functional issues requiring multiple teams
- **Example**: "Enterprise customer experiencing intermittent API failures"

### Tier 4: Strategic Support
- VIP/Enterprise escalations with business impact
- **Example**: "Top revenue customer threatening churn due to recurring technical issues"

## Key Metrics

### Customer Satisfaction
- CSAT (Customer Satisfaction): >95% target
- NPS (Net Promoter Score): >50 target
- Customer Retention: >95% target

### Operational Efficiency
- First Contact Resolution: >70% target
- Average Response Time: <4 hours target
- Average Resolution Time: <24 hours target
- SLA Compliance: >98% target

### Quality
- Quality Score: >90% target
- Ticket Reopen Rate: <5% target
- Knowledge Base Deflection: >40% target

## Installation

```bash
# From Claude Code Marketplace
claude /plugin install @cagents/support

# Or as part of full cAgents system
claude /plugin install cagents
```

## Usage

The Support domain is automatically invoked by the core Trigger agent when support-related requests are detected. You can also invoke directly:

```bash
/trigger Create a comprehensive knowledge base strategy for our SaaS product
/trigger Analyze Q4 support tickets to identify top customer pain points
/trigger Design an escalation process for critical customer incidents
```

## Version

**Current Version**: 1.0.0

## License

MIT License - See main cAgents LICENSE file

## Author

CaelanDrayer

---

Part of the **cAgents** (Caelan's Agents) universal multi-domain agent system.
