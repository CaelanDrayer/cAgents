# @cagents/operations

**Operations Domain Plugin for cAgents**

Process optimization, supply chain management, and operational excellence through specialized autonomous agents.

## Overview

The Operations domain provides 20 specialized agents that collaborate to optimize operations, manage supply chains, improve quality, and drive operational excellence. From process improvement to strategic transformation, these agents deliver comprehensive operations capabilities.

## Agent Architecture

### Workflow Agents (5)
- **router** - Complexity classification and template matching (process_design, capacity_plan, vendor_management, operations_strategy, quality_improvement, supply_chain_plan)
- **planner** - Task decomposition and execution planning for operations initiatives
- **executor** - Team coordination and deliverable aggregation
- **validator** - Quality gate for operations deliverables (PASS/FIXABLE/BLOCKED)
- **self-correct** - Adaptive recovery using learned strategies

### Executive Leadership (1)
- **coo** - Chief Operating Officer: operational excellence, execution leadership, strategic operations

### Operations Team Agents (14)
- **operations-manager** - Day-to-day operations oversight and execution management
- **process-improvement-specialist** - Process mapping, lean/six sigma, waste elimination
- **supply-chain-manager** - End-to-end supply chain strategy and network design
- **procurement-specialist** - RFP/RFQ management, contract negotiation, sourcing
- **inventory-manager** - Inventory optimization, demand planning, stock policies
- **quality-manager** - Quality systems, SPC, defect prevention, compliance
- **facilities-manager** - Facilities planning, layout design, space optimization
- **vendor-manager** - Vendor relationships, performance scorecards, supplier development
- **logistics-coordinator** - Transportation, distribution, carrier management
- **capacity-planner** - Capacity planning, demand forecasting, expansion planning
- **operations-analyst** - Data analysis, performance reporting, metrics tracking
- **business-continuity-planner** - Business continuity, disaster recovery, crisis preparedness
- **continuous-improvement-manager** - Kaizen, lean programs, CI culture
- **operations-strategist** - Operations strategy, transformation, capability maturity

## Templates

The Operations router assigns these templates based on request type:

- **process_design** - Document, analyze, and optimize operational processes
- **capacity_plan** - Forecast and plan operational capacity needs
- **vendor_management** - Manage vendor relationships and procurement
- **operations_strategy** - Define strategic direction for operations
- **quality_improvement** - Identify and implement quality enhancements
- **supply_chain_plan** - Design or optimize supply chain operations

## Detection Keywords

The Trigger agent routes these keywords to the Operations domain:
- **Process:** process, workflow, efficiency, optimize, streamline, bottleneck, waste
- **Supply Chain:** supply chain, logistics, distribution, transportation, fulfillment
- **Vendor/Procurement:** vendor, supplier, procurement, sourcing, RFP, contract
- **Capacity:** capacity, throughput, utilization, resources, scaling
- **Quality:** quality, defects, variance, control, Six Sigma, lean
- **Operations Strategy:** operations strategy, transformation, excellence, capabilities

## Example Use Cases

### Tier 1: Simple Tasks
```bash
/trigger Document our current order fulfillment process
/trigger Generate monthly inventory report
/trigger Update vendor contact list
```

### Tier 2: Moderate Improvements
```bash
/trigger Analyze bottlenecks in our shipping process
/trigger Optimize warehouse layout for faster picking
/trigger Create vendor scorecard system
```

### Tier 3: Complex Initiatives
```bash
/trigger Design new supply chain strategy for international expansion
/trigger Implement lean manufacturing across 3 production lines
/trigger Create vendor management program with RFP process
```

### Tier 4: Strategic Transformations
```bash
/trigger Transform end-to-end supply chain with automation and AI
/trigger Design and implement business continuity plan for all operations
/trigger Build operations excellence framework with continuous improvement culture
```

## Key Capabilities

### Process Excellence
- Process mapping (current and future state)
- Bottleneck identification and root cause analysis
- Lean waste elimination (TIMWOODS)
- Six Sigma DMAIC projects
- 5S and visual management
- Standard work development

### Supply Chain Optimization
- Network design and optimization
- Supplier strategy and segmentation
- Logistics and transportation planning
- Inventory optimization (ABC analysis, safety stock)
- Demand forecasting and planning
- Control tower visibility

### Quality Management
- Quality management systems (ISO 9001)
- Statistical Process Control (SPC)
- Process capability analysis (Cp, Cpk)
- Root cause analysis (5 Whys, fishbone)
- Quality improvement (DMAIC)
- Defect prevention and poka-yoke

### Capacity Planning
- Capacity analysis and utilization
- Demand forecasting and scenario planning
- Gap analysis and expansion planning
- Financial analysis (ROI, payback, NPV)
- Multi-scenario modeling
- Resource optimization

### Continuous Improvement
- Kaizen event planning and execution
- Lean enterprise transformation
- Six Sigma certification programs
- Improvement project portfolio
- Benefits tracking and realization
- Change management

### Strategic Operations
- Operations strategy development
- Target operating model design
- Capability maturity assessment
- Transformation roadmap
- Benchmarking and best practices
- Performance management

## Installation

```bash
# From Claude Code Marketplace
claude /plugin install @cagents/operations

# Local development
cd cAgents/operations
claude --plugin-dir ..
```

## Dependencies

- **@cagents/core** (>=4.0.0) - Required for universal infrastructure

## Integration

The Operations domain integrates with:
- **Core domain** - Trigger routing, orchestration, HITL escalation
- **Business domain** - Strategic alignment, financial planning
- **Software domain** - Technology enablement, systems implementation

## Typical Workflows

### Process Improvement
1. **Router** classifies as process_design (Tier 2)
2. **Planner** decomposes into analysis → design → implementation
3. **Executor** coordinates:
   - process-improvement-specialist (current state mapping, bottleneck analysis)
   - operations-analyst (data collection and metrics)
   - facilities-manager (layout optimization)
   - operations-manager (implementation roadmap)
4. **Validator** checks for complete process documentation and actionable recommendations
5. **Self-correct** adds missing quantification or implementation details if needed

### Supply Chain Strategy
1. **Router** classifies as supply_chain_plan (Tier 3)
2. **Planner** creates parallel workstreams (network design, supplier strategy, logistics, inventory)
3. **Executor** coordinates:
   - supply-chain-manager (network optimization)
   - vendor-manager (supplier evaluation)
   - logistics-coordinator (transportation strategy)
   - inventory-manager (stocking policies)
   - operations-analyst (data modeling)
4. **Validator** ensures comprehensive strategy with financial justification
5. **Self-correct** adds scenario analysis or risk mitigation if needed

### Operations Transformation
1. **Router** classifies as operations_strategy (Tier 4, COO involvement)
2. **Planner** creates multi-phase transformation plan
3. **Executor** coordinates:
   - COO (strategic vision and executive decisions)
   - operations-strategist (capability assessment, target operating model)
   - All team agents (current state assessment, roadmap development)
4. **Validator** ensures strategic alignment and complete transformation plan
5. **Self-correct** enhances governance or change management approach

## Version

**1.0.0** - Initial release with 20 agents

## License

MIT

## Author

CaelanDrayer
