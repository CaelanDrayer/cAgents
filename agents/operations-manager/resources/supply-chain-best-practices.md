> Sub-resource for mode `supply-chain` — relocated verbatim from `agents/operator/business-ops/supply-chain-manager/resources/best-practices.md` (zero-loss consolidation).

# Best Practices: Supply Chain Manager

> Design principles, patterns, and frameworks that guide high-quality supply chain optimization, inventory management, logistics coordination, and end-to-end delivery reliability work.

## Design Principles

- **End-to-End Visibility is Power**: Supply chain problems are usually discovered late because visibility is poor.
  Build systems that detect the disruptions at the source, not at the point of impact.
- **Resilience Over Efficiency Alone**: Pure efficiency optimization creates fragile systems. Examples are just-in-time and single-source.
  Balance efficiency with resilience — dual sourcing, safety stock, and geographic diversification have a real risk-adjusted value.
- **Demand Drives Everything**: The supply chain exists to serve demand.
  All supply planning, inventory, and logistics decisions trace back to the demand signal — garbage demand data produces garbage supply plans.
- **Inventory Is the Symptom**: High inventory often shows demand uncertainty, supplier unreliability, or poor forecasting.
  One rule follows — do not manage inventory in isolation from the root causes that drive it.
- **Supplier Relationships Are Supply Chain**: Supplier performance is your performance in the customer's eyes. Invest in supplier capability, not just price negotiation.
- **Speed and Flexibility Require Lead Time**: Lead times limit the time available to respond to disruptions.
  A reduction of lead times across the supply chain is an investment in strategic agility.
- **Total Cost Beats Unit Cost**: The lowest-price supplier decision typically produces the highest total cost.
  It ignores quality, reliability, lead time, and switching costs. Apply TCO thinking to all supply chain decisions.

## Key Patterns & Frameworks

- **S&OP (Sales and Operations Planning)**: A monthly cross-functional process that aligns demand signals with supply capabilities, into an integrated operating plan.
  The demand signals come from sales and marketing. The supply capabilities come from operations, procurement and logistics.
  Apply it as the primary supply-demand balancing mechanism.
- **SCOR Model (Supply Chain Operations Reference)**: Plan → Source → Make → Deliver → Return.
  It is a framework — it assesses and improves supply chain performance across five domains.
- **Demand-Driven MRP (DDMRP)**: Inventory positioning based on actual demand signals, not on forecast-driven MRP.
  It uses strategic buffer placement and dynamic buffer sizing.
  Apply it to reduce demand amplification, the bullwhip, and to improve flow.
- **Bullwhip Effect Mitigation**: Demand variability amplification across supply chain tiers — you mitigate it with demand signal sharing.
  Order smoothing and collaborative forecasting also mitigate it. Apply this when inventory volatility exceeds demand volatility.
- **ABC-XYZ Inventory Classification**: ABC (value: A=high, B=medium, C=low) × XYZ (demand variability: X=stable, Y=variable, Z=irregular). Apply to differentiate inventory management strategies by item type.
- **Safety Stock Calculation**: Safety stock = Z × σD × √LT (where Z=service level factor, σD=demand standard deviation, LT=lead time).
  Apply it to set scientifically grounded safety stock levels, not arbitrary buffers.
- **Supplier Dual Sourcing**: You qualify and keep two suppliers for critical components — the second source may receive 20-30% of volume.
  That volume keeps the capability. Apply it to eliminate single-source risk in critical supply paths.
- **Last Mile Optimization**: Analysis and redesign of the final delivery leg, from the distribution center to the customer.
  This leg stands out — it is often the most expensive, most visible, and most differentiated segment of the logistics network.
- **Landed Cost Analysis**: The full cost from the supplier to the customer.
  It includes product cost, freight, duties, insurance, handling, and carrying cost.
  Apply it to evaluate true sourcing options, not the FOB price alone.
- **Supply Chain Segmentation**: Differentiate supply chain design by product segment — high runners are efficient and lean.
  Slow movers are flexible and responsive. Seasonal products are build-ahead.
  Apply this when a one-size-fits-all supply chain creates suboptimal trade-offs between service and cost.

## Domain Concepts & Terminology

### Supply Planning
- **S&OP (Sales and Operations Planning)**: Monthly integrated planning process aligning demand and supply across functions
- **MPS (Master Production Schedule)**: Time-phased plan specifying what will be produced, in what quantity, and when
- **MRP (Material Requirements Planning)**: Calculation of materials needed based on MPS, lead times, and current inventory
- **BOM (Bill of Materials)**: Structured list of all components required to produce a finished good
- **Safety Stock**: Inventory buffer maintained to protect against demand uncertainty or supply variability
- **Reorder Point**: Inventory level at which a replenishment order is triggered
- **EOQ (Economic Order Quantity)**: Order quantity that minimizes total inventory holding and ordering costs

### Inventory Management
- **SKU (Stock Keeping Unit)**: Unique identifier for a distinct product variant (size, color, packaging)
- **Days of Supply (DOS)**: Current inventory ÷ Average daily consumption — measure of how long current stock will last
- **Inventory Turnover**: Annual COGS ÷ Average inventory — higher turnover indicates leaner, more efficient inventory management
- **Dead Stock**: Inventory with no sales or consumption activity for a defined period — represents capital tied up with no value
- **FIFO / LIFO / FEFO**: Inventory consumption methods — First In First Out / Last In First Out / First Expired First Out
- **Bullwhip Effect**: Amplification of demand variability as signals move upstream through the supply chain

### Logistics
- **Lead Time**: Total elapsed time from order placement to receipt — includes supplier manufacturing, transit, and receiving
- **Incoterms**: International commercial terms defining responsibilities for shipping, insurance, and customs between buyer and seller (FOB, CIF, DDP, EXW)
- **3PL (Third-Party Logistics)**: External provider managing warehousing, transportation, or fulfillment on behalf of the organization
- **Cross-Docking**: Receiving goods from suppliers and immediately loading to outbound transport without storage — reduces handling and lead time
- **Last Mile**: Final delivery leg from distribution center or hub to the end customer

### Supplier Management
- **Supplier Reliability**: Consistency of on-time, in-full delivery from a supplier — primary metric for supply continuity risk
- **OTIF (On Time In Full)**: % of orders delivered on time and in the full quantity ordered — composite supplier performance metric
- **Supplier Development**: Active investment by the buyer in improving a supplier's quality, capacity, or capability
- **Single Source**: Supply configuration where one supplier provides 100% of a critical component — maximum efficiency but maximum risk

## Anti-Patterns to Avoid

- **Single-Source Critical Components**: You rely on one supplier for strategic or critical components, with no qualified backup.
  Fix: dual-source all critical items. The second source should receive regular volume to keep production readiness.
- **Forecast as Truth**: You treat demand forecasts as certainties, and you build supply plans with no buffer for error.
  Fix: always understand the forecast accuracy history. Build safety stock and flexibility proportional to forecast uncertainty.
- **Push Inventory Downstream**: You force large batch deliveries on customers or distribution centers to smooth production.
  This creates inventory problems downstream.
  Fix: align replenishment to actual consumption signals. Reduce batch sizes to improve demand-supply synchronization.
- **Measuring Inventory Only**: You manage inventory levels without addressing the root causes that drive them.
  The root causes are demand variability, lead time variability, and forecast error.
  Fix: diagnose before you optimize — reduce root cause uncertainty before optimizing buffer sizes.
- **No Supply Chain Risk Register**: You operate with no documented view of supply chain vulnerabilities.
  Fix: keep a supplier risk register. It covers single-source exposure, geographic concentration, financial health, and capacity constraints.
- **S&OP Without Accountability**: You run monthly S&OP meetings that review numbers but produce no decisions and no owner commitments.
  Fix: every S&OP cycle must conclude with a demand and supply agreement. Sales and Operations leadership sign it off.
- **Total Cost Blindness**: You make supply decisions on unit price alone.
  You ignore freight, duties, quality costs, and inventory carrying costs.
  Fix: do a landed cost analysis for all significant sourcing decisions.

## Quality Indicators

- **OTIF (On Time In Full)**: The % of customer orders delivered on time and in the full quantity ordered.
  The target is >95% — this is the primary end-to-end delivery performance metric
- **Inventory Turnover**: Annual COGS ÷ Average inventory — benchmark against industry; rising turnover indicates improving efficiency.
- **Safety Stock Coverage vs. Target**: Actual safety stock days vs. model-calculated target — a deviation in either direction is a signal.
  It signals demand or lead time changes that the safety stock parameters do not reflect.
- **Supplier OTIF**: % of supplier deliveries on time and in full (target: >95%) — measures supply base reliability.
- **Forecast Accuracy (at Planning Horizon)**: MAPE of demand forecasts vs. actuals at the lead time horizon — directly determines required safety stock levels.
- **Days of Supply (Dead Stock)**: % of SKUs with >90 days of supply based on recent consumption — measures excess inventory risk.
- **Supply Chain Disruption Response Time**: Average hours from disruption identification to alternative supply plan activated — measures operational resilience.

## Collaboration Touchpoints

- **With Operations Manager**: Quality looks like supply signals that flow into operational production planning.
  Demand disruptions are communicated with enough lead time for operational adjustment.
  The S&OP process runs monthly, with operations as co-owner.
- **With Procurement Specialist**: Quality looks like supplier selection criteria that incorporate supply reliability and lead time needs.
  Dual-source strategies are reflected in supplier contracts.
  Supplier performance data is shared between supply chain and procurement, for joint management.
- **With Finance Manager**: Quality looks like inventory investment that is tracked with carrying cost.
  Supply chain optimization ROI is calculated on a total landed cost basis.
  Working capital targets are reflected in inventory optimization models.
- **With Quality Manager**: Quality looks like supplier quality data that is integrated into OTIF measurement.
  Incoming inspection protocols align with supply risk.
  Supplier quality issues are escalated to sourcing decisions through a defined process.
