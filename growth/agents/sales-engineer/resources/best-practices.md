# Best Practices: Sales Engineer

> Design principles, patterns, and frameworks that guide high-quality technical discovery, product demonstrations, and proof-of-concept delivery work.

## Design Principles

- **Technical Credibility is the Asset**: Buyers engage with sales engineers because they trust technical expertise — never overstate capabilities or hide limitations
- **Understand Before Demonstrating**: A demo that shows features the prospect doesn't care about is entertainment, not selling — invest in technical discovery before the demo
- **The Demo Tells a Story**: Structure every demonstration around the prospect's specific use case, not a generic product tour
- **POC Scope Discipline**: Undefined POC scopes become never-ending evaluation cycles; agree on success criteria before the first line of configuration
- **Bridge Business and Technical**: Sales engineers translate business pain into technical requirements and technical capabilities into business outcomes — both directions matter
- **Documentation Amplifies Work**: Well-documented technical evaluations, POC results, and integration guides accelerate future deals with similar requirements
- **Support the AE, Don't Replace Them**: The SE's role is technical enablement of the deal, not ownership of the deal — commercial relationships stay with the AE

## Key Patterns & Frameworks

- **Technical Discovery Framework**: Current environment (what they have) → Technical pain (what's not working) → Desired state (what they need to be true) → Evaluation criteria (how they'll judge solutions) → Integration requirements (what must connect) → Security/compliance requirements
- **Demo Story Architecture**: Business context (their situation) → specific problem they need to solve → solution demonstration (only relevant features) → quantified outcome (how this helps their metrics) → next step confirmation
- **POC Scoping Document**: Success criteria → use cases to be validated → configuration requirements → timeline → resources required from both sides → decision criteria after POC → sign-off required — agreed before POC begins
- **Technical Objection Handling**: Acknowledge the concern → validate the technical detail → demonstrate or explain the resolution → confirm the concern is addressed → ask if anything else
- **RFP Technical Response Framework**: For each technical requirement — yes/out-of-the-box (preferred), partial (describe gap and workaround), no (acknowledge limitation and provide alternative) → honest responses build more trust than overselling
- **Integration Architecture Assessment**: Document the prospect's data environment, identify integration points, map to your API/connector capabilities, flag required custom work — gives the prospect a realistic deployment picture
- **Technical Champion Development**: Identify the internal technical person with influence → ensure they have deep product understanding → equip them to navigate internal technical objections → create a direct relationship outside of the main sales cycle
- **Competitive Technical Battlecard**: How our technical architecture compares to each competitor's, where we win technically, where we're weaker, and how to position the architecture differences as business advantages
- **Post-Demo Action Items**: Confirm open technical questions → agree on next steps → document what was shown and what needs follow-up → send technical summary within 24 hours
- **SE-AE Debrief Protocol**: After every demo and POC milestone, structured debrief: technical health of the deal, open risks, technical champion status, integration complexity, competitive technical risks

## Domain Concepts & Terminology

### Technical Sales Process
- **Technical Discovery**: Structured conversation to understand the prospect's technical environment, requirements, and constraints — prerequisite for any meaningful demo
- **Product Demo**: Live demonstration of the product tailored to the prospect's specific use case and evaluation criteria
- **POC (Proof of Concept)**: A scoped technical evaluation where the prospect validates that the product can solve their specific problem in their environment
- **Technical Evaluation**: Formal period during which the prospect assesses product technical fit against defined requirements
- **Sandbox**: A non-production environment where prospects can test the product without risking their live systems

### Architecture & Integration
- **API (Application Programming Interface)**: Technical interface enabling two software systems to exchange data — critical for integration assessments
- **Data Flow Diagram**: Visual documentation of how data moves between the prospect's systems and your product
- **SSO (Single Sign-On)**: Authentication mechanism allowing users to access your product with their existing corporate credentials — often a technical requirement
- **Compliance Requirements**: Security and regulatory mandates (SOC 2, HIPAA, GDPR, FedRAMP) that must be satisfied for the deal to progress
- **Technical Architecture**: The structural design of a software system, including components, integrations, and data flows

### POC Management
- **POC Success Criteria**: Pre-agreed, measurable outcomes that the prospect will use to determine POC success or failure
- **POC Scope**: The defined set of use cases and capabilities to be validated during the evaluation — must be bounded
- **Technical Sponsor**: The prospect's technical lead who owns the evaluation and advocates for your solution internally
- **Decision Criteria**: The technical and functional requirements against which the prospect will compare solutions

## Anti-Patterns to Avoid

- **Undiscovered Demo**: Demonstrating the product without technical discovery leads to showing features that don't matter to the prospect and missing the ones that do
- **POC Without Success Criteria**: Starting a POC without agreed success criteria creates an evaluation that never ends and produces a decision based on whoever got tired first
- **Overclaiming Capabilities**: Overstating what the product can do to win the POC leads to implementation failure, churn, and referenceability loss that costs far more than a lost deal
- **Technical Depth Without Business Context**: Deep technical discussions without connecting capabilities to business outcomes lose the economic buyer — always translate technical to value
- **SE Owning the Deal**: When the SE takes over deal ownership from the AE, commercial discipline often breaks down — maintain role clarity
- **No Technical Documentation**: Verbally explaining an integration architecture without documented artifacts leaves the technical champion with nothing to use internally in their evaluation
- **Over-Scoped POCs**: Agreeing to evaluate every feature in a 6-week POC prevents deals from closing in reasonable timeframes and strains SE capacity

## Quality Indicators

- **Demo-to-Next-Step Rate**: Percentage of demos that result in a committed next step (POC, proposal, executive meeting) — below 50% indicates demo quality or discovery issues
- **POC Win Rate**: Percentage of completed POCs that convert to closed/won — below 60% indicates scope, success criteria, or technical fit issues
- **Technical Objection Resolution Rate**: Percentage of flagged technical objections resolved before moving to procurement phase
- **POC Time to Completion**: Average days from POC start to decision — extended POCs drain SE capacity and signal scope discipline issues
- **RFP Technical Compliance Score**: Percentage of technical requirements marked as "met" without significant workarounds
- **Technical Champion Identification Rate**: Percentage of active opportunities with a confirmed, engaged technical champion
- **Documentation Quality**: Are POC results, integration assessments, and technical discovery outputs documented well enough to be reused as templates for similar prospects?

## Collaboration Touchpoints

- **With Account Executive**: The SE-AE partnership is the core of technical selling — weekly deal reviews align on where to invest SE time, what technical risks exist, and how to advance stalled evaluations
- **With Sales Strategist**: Complex deals require strategic SE resource allocation; flag deals where technical complexity exceeds standard SE capacity to trigger additional support
- **With Product Marketing Manager**: Technical objections encountered in the field are early warning signals for PMM battlecard updates and messaging improvements
- **With Backend Developer**: Complex integrations or POC customizations may require engineering support; establish a clear request and escalation process that doesn't require SE to manage engineering directly
- **With Sales Enablement Specialist**: Reusable technical content (demo scripts, integration guides, POC templates) built from field experience should be systematized by enablement for broader team use
