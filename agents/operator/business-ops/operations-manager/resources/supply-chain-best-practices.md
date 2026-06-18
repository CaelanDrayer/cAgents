> Sub-resource for mode `supply-chain` — relocated verbatim from `agents/operator/business-ops/supply-chain-manager/resources/best-practices.md` (zero-loss consolidation).

# Best Practices: Supply Chain Manager

> Design principles, patterns, and frameworks that guide high-quality supply chain optimization, inventory management, logistics coordination, and end-to-end delivery reliability work.

## Design Principles

- **End-to-End Visibility is Power**: Supply chain problems are usually discovered late because visibility is poor. Build systems that detect disruptions at the source, not at the point of impact.
- **Resilience Over Efficiency Alone**: Pure efficiency optimization (just-in-time, single-source) creates fragile systems. Balance efficiency with resilience — dual sourcing, safety stock, and geographic diversification have a real risk-adjusted value.
- **Demand Drives Everything**: The supply chain exists to serve demand — all supply planning, inventory, and logistics decisions trace back to the demand signal. Garbage demand data produces garbage supply plans.
- **Inventory Is the Symptom**: High inventory often indicates demand uncertainty, supplier unreliability, or poor forecasting — don't manage inventory in isolation from the root causes driving it.
- **Supplier Relationships Are Supply Chain**: Supplier performance is your performance in the customer's eyes. Invest in supplier capability, not just price negotiation.
- **Speed and Flexibility Require Lead Time**: The time available to respond to disruptions is limited by lead times. Reducing lead times across the supply chain is an investment in strategic agility.
- **Total Cost Beats Unit Cost**: The lowest-price supplier decision that ignores quality, reliability, lead time, and switching costs typically produces the highest total cost. Apply TCO thinking to all supply chain decisions.

## Key Patterns & Frameworks

- **S&OP (Sales and Operations Planning)**: Monthly cross-functional process aligning demand signals (sales/marketing) with supply capabilities (operations/procurement/logistics) into an integrated operating plan. Apply as the primary supply-demand balancing mechanism.
- **SCOR Model (Supply Chain Operations Reference)**: Plan → Source → Make → Deliver → Return — framework for assessing and improving supply chain performance across five domains.
- **Demand-Driven MRP (DDMRP)**: Inventory positioning based on actual demand signals rather than forecast-driven MRP, using strategic buffer placement and dynamic buffer sizing. Apply to reduce demand amplification (bullwhip) and improve flow.
- **Bullwhip Effect Mitigation**: Demand variability amplification across supply chain tiers — mitigated through demand signal sharing, order smoothing, and collaborative forecasting. Apply when inventory volatility exceeds demand volatility.
- **ABC-XYZ Inventory Classification**: ABC (value: A=high, B=medium, C=low) × XYZ (demand variability: X=stable, Y=variable, Z=irregular). Apply to differentiate inventory management strategies by item type.
- **Safety Stock Calculation**: Safety stock = Z × σD × √LT (where Z=service level factor, σD=demand standard deviation, LT=lead time). Apply to set scientifically grounded safety stock levels rather than arbitrary buffers.
- **Supplier Dual Sourcing**: Qualifying and maintaining two suppliers for critical components — the second source may receive 20-30% of volume to maintain capability. Apply to eliminate single-source risk in critical supply paths.
- **Last Mile Optimization**: Analysis and redesign of the final delivery leg (from distribution center to customer) — often the most expensive, most visible, and most differentiated segment of the logistics network.
- **Landed Cost Analysis**: Full cost from supplier to customer including product cost, freight, duties, insurance, handling, and carrying cost. Apply to evaluate true sourcing options rather than just FOB price.
- **Supply Chain Segmentation**: Differentiate supply chain design by product segment — high runners (efficient, lean), slow movers (flexible, responsive), and seasonal (build-ahead). Apply when a one-size-fits-all supply chain creates suboptimal service/cost trade-offs.

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

- **Single-Source Critical Components**: Relying on one supplier for strategic or critical components without a qualified backup. Fix: dual-source all critical items; the second source should receive regular volume to maintain production readiness.
- **Forecast as Truth**: Treating demand forecasts as certainties and building supply plans with no buffer for error. Fix: always understand forecast accuracy history; build safety stock and flexibility proportional to forecast uncertainty.
- **Push Inventory Downstream**: Forcing large batch deliveries on customers or distribution centers to smooth production, creating inventory problems downstream. Fix: align replenishment to actual consumption signals; reduce batch sizes to improve demand-supply synchronization.
- **Measuring Inventory Only**: Managing inventory levels without addressing the root causes driving them (demand variability, lead time variability, forecast error). Fix: diagnose before optimizing — reduce root cause uncertainty before optimizing buffer sizes.
- **No Supply Chain Risk Register**: Operating without a documented view of supply chain vulnerabilities. Fix: maintain supplier risk register covering single-source exposure, geographic concentration, financial health, and capacity constraints.
- **S&OP Without Accountability**: Running monthly S&OP meetings that review numbers but produce no decisions or owner commitments. Fix: every S&OP cycle must conclude with demand/supply agreement signed off by Sales and Operations leadership.
- **Total Cost Blindness**: Making supply decisions based on unit price alone, ignoring freight, duties, quality costs, and inventory carrying costs. Fix: require landed cost analysis for all significant sourcing decisions.

## Quality Indicators

- **OTIF (On Time In Full)**: % of customer orders delivered on time and in the full quantity ordered (target: >95%) — primary end-to-end delivery performance metric.
- **Inventory Turnover**: Annual COGS ÷ Average inventory — benchmark against industry; rising turnover indicates improving efficiency.
- **Safety Stock Coverage vs. Target**: Actual safety stock days vs. model-calculated target — deviation in either direction signals demand or lead time changes not reflected in safety stock parameters.
- **Supplier OTIF**: % of supplier deliveries on time and in full (target: >95%) — measures supply base reliability.
- **Forecast Accuracy (at Planning Horizon)**: MAPE of demand forecasts vs. actuals at the lead time horizon — directly determines required safety stock levels.
- **Days of Supply (Dead Stock)**: % of SKUs with >90 days of supply based on recent consumption — measures excess inventory risk.
- **Supply Chain Disruption Response Time**: Average hours from disruption identification to alternative supply plan activated — measures operational resilience.

## Collaboration Touchpoints

- **With Operations Manager**: Quality looks like supply signals flowing into operational production planning, demand disruptions communicated with sufficient lead time for operational adjustment, and S&OP process running monthly with operations as co-owner.
- **With Procurement Specialist**: Quality looks like supplier selection criteria incorporating supply reliability and lead time requirements, dual-source strategies reflected in supplier contracts, and supplier performance data shared between supply chain and procurement for joint management.
- **With Finance Manager**: Quality looks like inventory investment tracked with carrying cost, supply chain optimization ROI calculated on total landed cost basis, and working capital targets reflected in inventory optimization models.
- **With Quality Manager**: Quality looks like supplier quality data integrated into OTIF measurement, incoming inspection protocols aligned with supply risk, and supplier quality issues escalated to sourcing decisions through defined process.
