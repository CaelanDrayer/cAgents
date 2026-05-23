# Physical / Product Domain

Designing a physical object, hardware component, or craft artifact — the
unit of work is a manufacturable thing with materials and tolerances, NOT
a software system.

## When to pick this domain

Pick this domain when the user is designing a physical artifact:

- "design a wooden standing desk with adjustable height"
- "design a 3D-printed enclosure for an electronics project"
- "design a coffee mug for a small ceramic line"
- "design a backpack for trail-running with hydration"
- "design a kit-built shed for a 12x10 backyard"

Do NOT pick this domain for: the e-commerce site selling the product
(Software), the marketing campaign launching it (Business), the
photography for the catalog (Creative).

## Phase 1-3 framing

**Empathize**. Users hold and live with this object. Map the use context:
where is the object used (indoor, outdoor, wet, dusty), how often, by
whom (hand size, strength, vision, dexterity), and for how long per
session. Identify pain points with existing alternatives.

**Define**. The problem statement frames the object's required behavior
under named conditions. Constraints in this domain are concrete:
dimensional envelope, weight budget, materials cost, fabrication method
(hand, CNC, injection, additive, sewing), tolerances, finish
requirements, regulatory (e.g. UL, CPSC, FDA contact), and
sustainability (recyclability, repairability).

**Conceptualize**. Offer the user 2-4 framings tied to the fabrication
approach:
- *Single-piece / monolithic* (one material, one fabrication step)
- *Assembled / modular* (separable parts, repairable, but joinery design needed)
- *Kit / flat-pack* (ships flat, user assembles)
- *Customized / made-to-measure* (per-user fit, more iteration)

The framing cascades into Phase 5: assembled designs need joinery
specifications; flat-pack needs packing geometry.

## Phase 5 questions

Refinement for this domain centers on materials, geometry, and
fabrication feasibility. The designer selects from these question
templates (full set in `../../templates/physical_product_chunks.yaml`):

- "What is the dimensional envelope (length × width × height), and what
  tolerance does each dimension need?"
- "What materials are you considering, and what does each cost per unit
  at your run size?"
- "What loads or stresses does the object experience in use (static
  weight, impact, thermal, UV, moisture)?"
- "Which fabrication method fits your run size — hand, CNC, injection
  molding, additive (FDM/SLA/SLS), sewing, casting?"
- "What finish does the user touch — raw, sanded, painted, anodized,
  glazed, sealed?"
- "How is the object assembled, repaired, or recycled at end of life?"
- "What regulatory or safety standards apply (UL, CPSC, FDA contact,
  child-safe, food-safe)?"
- "What's the bill of materials, and where do the raw inputs come from?"

## Phase 6 artifacts

For Physical / Product, Phase 6 emits:

| Artifact | Purpose |
|----------|---------|
| `bill_of_materials.md` | Every input part / material with quantity, supplier, cost |
| `cad_or_sketch_package.md` | Drawings, dimensions, tolerances, section views |
| `fabrication_plan.md` | Method, machine, fixturing, sequence, time-per-unit |
| `qc_checklist.md` | Inspection points, acceptable ranges, sample size |
| `materials_safety_sheet.md` | Hazards, PPE, disposal, regulatory citations |
| `sustainability_brief.md` | End-of-life path, recycled content, repair guide |

Phase 6 emits a `bill_of_materials.md` — NOT user stories, NOT an API
spec, NOT a technical software architecture.

**Follow-up dispatch agent**: `cagents:product-designer` for industrial-design
review, or `cagents:concept-artist` for early ideation sketches. Fall
back to `cagents:technical-writer` for the documentation pass. NEVER
`cagents:backend-developer` — materials questions are not software
questions.
