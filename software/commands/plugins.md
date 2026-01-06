---
name: plugins
description: Display available agents, their descriptions, hierarchy, and workflow pipeline information
---

# Display Available Agents and Information

Display comprehensive information about all available agents across domains, including their roles, capabilities, hierarchy, and workflow organization.

## Output Format

Show agents organized by:

1. **Domain** (Core, Software, Creative, etc.)
2. **Layer** (Workflow, Intelligence, QA, Executive, Team)
3. **Role** (orchestration, strategic, lead, specialist, executor, reviewer)

For each agent include:
- Name and ID
- Brief description
- Capabilities
- Autonomy level
- Review/delegation/blocking authority
- Tools available

## Example Output

```
cAgents v4.0.0 - Available Agents
=================================

CORE DOMAIN (@cagents/core)
---------------------------
Workflow Infrastructure (3 agents):
  • trigger - Universal entry point, intent detection, domain routing
  • orchestrator - Phase management and workflow coordination
  • hitl - Human-in-the-loop escalation

SOFTWARE DOMAIN (@cagents/software)
-----------------------------------
Workflow Agents (5 agents):
  • router - Complexity classification (tier 0-4)
  • planner - Task decomposition and planning
  • executor - Task execution coordination
  • validator - Quality gates (PASS/FIXABLE/BLOCKED)
  • self-correct - Adaptive error recovery

Executive Leadership (5 agents):
  • ceo - Strategic vision, stakeholder management
  • cto - Technology strategy, innovation
  • cfo - Financial strategy, budgeting
  • coo - Operational execution, coordination
  • vp-engineering - Engineering org, delivery

Intelligence Layer (5 agents):
  • pattern-recognition - Identify recurring issues
  • risk-assessment - Analyze potential failures
  • dependency-analyzer - Map task dependencies
  • learning-coordinator - Extract workflow learnings
  • predictive-analyst - Forecast issues preemptively

QA Layer (9 agents):
  • architecture-reviewer - System design validation
  • code-standards-auditor - Code quality enforcement
  • security-analyst - Vulnerability scanning
  • performance-analyzer - Performance bottlenecks
  • test-coverage-validator - Test gap identification
  • documentation-reviewer - Documentation quality
  • dependency-auditor - Dependency vulnerabilities
  • accessibility-checker - WCAG compliance
  • qa-compliance-officer - Regulatory compliance

Team Agents (18 agents):
  Business & Strategy:
    • product-owner - Product vision, prioritization
    • stakeholder-rep - Requirements, validation
    • finance-manager - Budget, ROI analysis
    • compliance - Regulatory, audits

  Technical Leadership:
    • tech-lead - Delivery coordination
    • architect - System design, patterns
    • senior-developer - Complex implementation

  Development:
    • frontend-developer - UI/UX, components
    • backend-developer - APIs, databases
    • qa-lead - Testing strategy
    • security-specialist - Security review

  Operations:
    • sysadmin - Infrastructure, deployments
    • devops - CI/CD, automation
    • it-support - User support

  Data & Specialized:
    • dba - Database optimization
    • data-analyst - ETL, analytics
    • ux-designer - Interface design
    • scribe - Documentation

Total: 46 agents (3 core + 43 software)
```

## Available Commands

- `/trigger <task>` - Start any workflow (auto-routes to domain)
- `/designer` - Interactive design assistant (software)
- `/reviewer` - Comprehensive code review (software)
- `/plugins` - Show this information
