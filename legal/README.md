# Legal Domain (@cagents/legal)

Complete legal domain for cAgents with 19 specialized agents covering all aspects of legal operations, compliance, and risk management.

## Overview

The Legal domain provides comprehensive legal support across:
- Contract management and negotiation
- Regulatory compliance (GDPR, CCPA, SOX, industry-specific)
- Intellectual property (patents, trademarks, copyrights, trade secrets)
- Litigation and dispute resolution
- Corporate law and M&A
- Employment law and workplace compliance
- Privacy and data protection
- Ethics and anti-corruption
- Legal operations and analytics

## Domain Structure

### Workflow Agents (5)
1. **router** - Legal complexity classification (tier 0-4) and template matching
2. **planner** - Task decomposition with specialist assignments and timelines
3. **executor** - Team coordination and deliverable aggregation
4. **validator** - Quality gate for legal work products (PASS/FIXABLE/BLOCKED)
5. **self-correct** - Adaptive correction and pattern learning

### Executive Leadership (1)
6. **general-counsel** - Chief Legal Officer: strategic counsel, high-stakes decisions, organizational legal leadership

### Team Agents (13)

#### Core Legal Functions
7. **corporate-counsel** - Corporate law, M&A, securities, entity formation, governance
8. **contracts-manager** - Contract drafting, review, negotiation, lifecycle management
9. **ip-attorney** - Patents, trademarks, copyrights, trade secrets, IP licensing
10. **compliance-manager** - Regulatory compliance, audit management, SOX, GDPR, CCPA
11. **employment-attorney** - Employment law, labor relations, wage/hour, workplace policies

#### Specialized Legal
12. **privacy-officer** - Data privacy, GDPR/CCPA compliance, privacy-by-design, data governance
13. **litigation-manager** - Lawsuit management, discovery, settlement, trial strategy
14. **regulatory-affairs-specialist** - Regulatory filings, agency communications, SEC/FDA/FCC compliance

#### Legal Operations & Support
15. **legal-operations-manager** - Legal spend, vendor management, process improvement, technology
16. **paralegal** - Document preparation, legal research, filing coordination, matter support
17. **legal-analyst** - Legal analytics, spend analysis, risk quantification, metrics

#### Risk & Ethics
18. **risk-and-compliance-manager** - Enterprise risk management, compliance frameworks, GRC
19. **ethics-and-compliance-officer** - Code of conduct, anti-corruption (FCPA), ethics investigations

## Templates

The Legal Router matches requests to these workflow templates:

1. **contract_review** - Contract analysis, redlining, risk assessment, negotiation strategy
2. **compliance_assessment** - Gap analysis, control testing, remediation roadmap
3. **ip_strategy** - Patent/trademark analysis, freedom-to-operate, portfolio management
4. **legal_risk_assessment** - Risk identification, quantification, mitigation strategies
5. **regulatory_filing** - SEC filings, regulatory submissions, agency coordination
6. **policy_development** - Corporate policies, governance frameworks, compliance programs

## Detection Keywords

The Legal domain is triggered by requests containing:
- **Contracts**: contract, agreement, terms, NDA, MSA, SLA, amendment, addendum
- **Compliance**: compliance, regulatory, audit, GDPR, CCPA, SOX, HIPAA
- **IP**: patent, trademark, copyright, IP, intellectual property, licensing
- **Legal**: legal, governance, policy, terms, conditions, liability, indemnification
- **Litigation**: litigation, dispute, claim, lawsuit, settlement
- **Regulatory**: regulatory, filing, disclosure, SEC, FDA, FTC
- **Privacy**: privacy, data protection, GDPR, CCPA

## Complexity Tiers

### Tier 0: Trivial
- "What is an NDA?"
- Simple legal definitions or questions

### Tier 1: Simple
- Review single contract clause
- Basic compliance check
- Routine NDA preparation

### Tier 2: Moderate
- Full contract review and redlining
- Single-jurisdiction compliance assessment
- Trademark search and clearance

### Tier 3: Complex
- Multi-party agreements with negotiation
- Cross-jurisdictional compliance
- IP portfolio management
- Patent prior art search and filing strategy

### Tier 4: Expert
- M&A legal due diligence
- Major litigation strategy
- Regulatory enforcement response
- Comprehensive compliance program overhaul

## Usage Examples

### Contract Review
```
/trigger Review the SaaS vendor agreement and identify high-risk terms
```
Routes to: contract_review template → Contracts Manager (lead), Privacy Officer (data clauses), IP Attorney (IP terms)

### GDPR Compliance
```
/trigger Conduct GDPR compliance assessment and create remediation plan
```
Routes to: compliance_assessment template → Compliance Manager (lead), Privacy Officer (GDPR expertise)

### Patent Filing
```
/trigger Conduct prior art search and assess patentability for ML fraud detection invention
```
Routes to: ip_strategy template → IP Attorney (lead)

### Litigation Strategy
```
/trigger Analyze litigation risk and settlement strategy for Jones Class Action
```
Routes to: legal_risk_assessment template → Litigation Manager (lead), Risk Manager (quantification)

## Installation

```bash
# Install legal domain plugin
claude /plugin install @cagents/legal

# Or install from local development
cd cAgents/legal
claude --plugin-dir .
```

## Agent Collaboration

Legal agents collaborate seamlessly:
- **Vertical**: Router → Planner → Executor → Validator → Self-Correct
- **Horizontal**: Executor coordinates specialist team agents (contracts, IP, compliance, etc.)
- **Escalation**: Complex issues escalate to General Counsel
- **Cross-Domain**: Legal coordinates with Business (contracts), Software (IP), Finance (SOX)

## Key Features

### Legal Memory System
All legal work persists in `Agent_Memory/`:
- **Instruction Folders**: Each legal matter gets isolated workspace
- **Workflow State**: Plans, execution state, validation results
- **Deliverables**: Partial and final legal work products
- **Knowledge**: Patterns, strategies, precedents shared across matters

### Quality Assurance
- **Validation Gate**: Every deliverable reviewed by Legal Validator
- **Self-Correction**: Automated fixing of minor issues (citations, formatting)
- **Pattern Learning**: System learns from corrections to improve future work
- **General Counsel Review**: High-stakes matters escalate for executive oversight

### Specialization
Each agent brings deep expertise:
- **Contracts Manager**: 20+ contract types, negotiation playbooks
- **IP Attorney**: Patent prosecution, trademark clearance, FTO opinions
- **Privacy Officer**: GDPR/CCPA compliance, DPIAs, privacy-by-design
- **Compliance Manager**: SOC 2, HIPAA, industry-specific regulations

## Metrics and Reporting

Legal domain tracks:
- **Matter Metrics**: Volume, cycle time, backlog
- **Contract Metrics**: Turnaround time, redline rate, template usage
- **Litigation Metrics**: Win rate, settlement rate, cost per matter
- **Spend Analytics**: Outside counsel spend by firm/practice area
- **Risk Metrics**: Risk exposure, mitigation ROI, compliance scores

## Integration

Works seamlessly with other cAgents domains:
- **@cagents/core** - Universal trigger and orchestration
- **@cagents/software** - IP protection for software, open source compliance
- **@cagents/business** - Contract negotiations, M&A support
- **@cagents/finance** - SOX compliance, regulatory filings (future)

## Version

**Version**: 1.0.0
**Status**: Production Ready
**Total Agents**: 19 (5 workflow + 1 executive + 13 team)
**Templates**: 6
**Last Updated**: 2026-01-10

## License

MIT License - See LICENSE file for details

## Author

CaelanDrayer - cAgents Multi-Domain Agent System
