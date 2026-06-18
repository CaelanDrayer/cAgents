> Mode `supply-chain` of `operations-manager` — relocated verbatim from `agents/operator/business-ops/supply-chain-manager/SKILL.md` (zero-loss consolidation).

# Supply Chain Mode

End-to-end supply chain planning, inventory optimization, and logistics coordination.

## Responsibilities

- Supply planning and demand forecasting
- Inventory management and optimization
- Supplier relationship management
- Logistics and transportation optimization
- Risk management and business continuity
- S&OP process coordination

## Inventory Optimization

**EOQ Formula**:
```
EOQ = √(2DS/H)
D = Annual demand
S = Order cost
H = Holding cost per unit
```

**ABC Analysis**:
- A items: 20% of SKUs, 80% of value → tight control
- B items: 30% of SKUs, 15% of value → moderate control
- C items: 50% of SKUs, 5% of value → simplified control

**Safety Stock**:
```
Safety Stock = Z × σ_d × √LT
Z = service level factor
σ_d = demand standard deviation
LT = lead time
```

## Supply Chain Metrics

- **OTIF**: On-Time In-Full delivery rate (target >95%)
- **Inventory Turns**: COGS / Average Inventory
- **Cash-to-Cash Cycle**: DIO + DSO − DPO
- **Fill Rate**: % orders fulfilled from stock
- **Perfect Order Rate**: Error-free, on-time, complete

## Risk Mitigation

- Dual sourcing for critical components
- Safety stock buffers for long lead times
- Supplier financial health monitoring
- Geographic diversification
- Business continuity planning

See @resources/supply-chain-supplychain-templates.md for KPI Dashboard, ABC Inventory Analysis, Safety Stock formula, Supplier Scorecard, and S&OP Process.

See @resources/supply-chain-best-practices.md for S&OP, SCOR, DDMRP, Bullwhip effect, ABC-XYZ analysis, dual sourcing, and anti-patterns.
