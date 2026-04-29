# Best Practices: UX Designer

> Design principles, patterns, and frameworks that guide high-quality user experience design, interaction design, and usability optimization.

## Design Principles

- **Users Are Not You**: The single biggest bias in UX is designing for yourself — validate assumptions with real users before committing to designs.
- **Problems Before Solutions**: Understand the user's actual problem before proposing a UI — solutions that solve the wrong problem cannot be saved by good execution.
- **Progressive Disclosure**: Reveal complexity gradually — show only what users need at each stage; don't overwhelm with features they don't need yet.
- **Feedback for Every Action**: Every user action should produce an immediate, appropriate response — silence after a click is interpreted as failure.
- **Consistency Reduces Learning Cost**: When things work the same way across the product, users learn patterns once and apply them everywhere.
- **Design for the Worst Case**: Design for distracted users, slow connections, error states, and empty states — the happy path is rarely the most important path.
- **Accessibility is Usability**: Designing for users with disabilities improves the experience for everyone — high contrast, keyboard navigation, and clear labels benefit all users.

## Key Patterns & Frameworks

- **Jobs-to-be-Done (JTBD)**: Frame user needs as jobs they're trying to accomplish rather than features they want — "when I [situation], I want to [motivation], so I can [outcome]".
- **User Story Mapping**: Organize user stories along two axes (user journey phases + priority) to see the full product experience and identify gaps.
- **Design Sprint (Google Ventures)**: Five-day structured process for designing and validating solutions — Define → Sketch → Decide → Prototype → Test.
- **Usability Testing Protocol**: Moderated think-aloud testing with 5-8 users per round — surfaces 80% of usability issues; test early, iterate, test again.
- **Information Architecture (IA) Design**: Structure content and navigation based on user mental models, not organizational structure — use card sorting and tree testing to validate.
- **Heuristic Evaluation (Nielsen's 10)**: Systematic inspection against established usability heuristics — System Status Visibility, Match with Real World, User Control, Consistency, Error Prevention, Recognition over Recall, Flexibility, Aesthetic Minimalism, Error Recovery, Help & Documentation.
- **Cognitive Walkthrough**: Step through a task sequence from a first-time user's perspective — identify where users would be confused or stuck.
- **Empathy Mapping**: Visualize what target users think, feel, say, and do in the context of the product — identifies emotional and rational dimensions of the problem.
- **Interaction Cost Reduction**: For any user goal, count the total steps, clicks, scrolls, and keystrokes required — every reduction in interaction cost is a usability improvement.
- **Error State Design**: Design error messages that explain what went wrong, why it matters, and exactly how to fix it — not just "Error occurred".
- **Empty State Design**: Design the zero-state experience (no content, first use) as carefully as the data-rich state — first impressions determine retention.

## Domain Concepts & Terminology

### UX Research Methods
- **Contextual Inquiry**: Observing users in their natural environment performing real tasks — reveals workarounds and unstated needs
- **Think-Aloud Protocol**: Users verbalize their thoughts while using the product — reveals mental model mismatches
- **Unmoderated Remote Testing**: Participants complete tasks independently using tools like Maze, UserTesting — scalable but less rich than moderated sessions
- **A/B Testing**: Randomized controlled experiment comparing two design variants — requires sufficient traffic for statistical validity
- **Card Sorting**: Users group content items into categories — used to validate information architecture
- **Tree Testing**: Users navigate a text-only site hierarchy to find items — tests navigation structure without visual design influence

### Interaction Design
- **Affordance**: A property of an object that signals how it should be used (a button that looks pressable, a handle that looks grippable)
- **Signifier**: An explicit signal communicating how to interact (a label on a button, an underline on a link)
- **Feedback**: System response to user action — immediate, appropriate, and informative
- **Mapping**: Relationship between control and its effect — natural mapping reduces learning (left/right arrow scrolls left/right)
- **Fitts's Law**: Time to click a target = log2(distance/size) — larger, closer targets are faster to click; apply to CTA sizing and placement
- **Hick's Law**: Decision time increases logarithmically with the number of options — reduce choice count to speed decision-making

### Mental Models & Psychology
- **Mental Model**: User's internal representation of how a system works — design should match the user's model, not the system's model
- **Cognitive Load**: Mental effort required to use the interface — reduce by simplifying, chunking, and progressively disclosing information
- **Recognition vs. Recall**: Users recognize options better than they recall commands from memory — prefer menus over command lines for non-expert users
- **Miller's Law**: Working memory holds 7±2 items — chunk long lists, phone numbers, and processes into digestible groups
- **F-Pattern and Z-Pattern Reading**: How users scan pages (F-pattern for text-heavy; Z-pattern for sparse content) — place key content accordingly

### Design System & Patterns
- **Atomic Design**: Design hierarchy of Atoms → Molecules → Organisms → Templates → Pages
- **Pattern Library**: Documented collection of reusable UI solutions with usage guidelines and code examples
- **Design Token**: Named design decision value (color, spacing, typography) — the bridge between design tools and code
- **Wireframe**: Low-fidelity structural representation of a screen — communicates layout and content without visual treatment
- **Prototype**: Interactive simulation of a design — may be low-fidelity (paper) to high-fidelity (Figma, Framer)

## Anti-Patterns to Avoid

- **Dark Patterns**: UI designs that manipulate users into actions they wouldn't take with full understanding (hidden unsubscribe, confusing opt-out, roach motel) — destroys trust and violates ethics.
- **Designing by Committee**: Requiring consensus from too many stakeholders on visual and interaction decisions — produces compromise designs that satisfy no one.
- **Skipping Error States**: Designing only the happy path without error, empty, loading, and partial states — incomplete designs surprise developers and confuse users.
- **Research Theater**: Conducting user research without incorporating findings into design decisions — user input ignored is a wasted budget and ethical breach.
- **Confirmation Dialog Overuse**: Asking users to confirm every action — erodes trust and trains users to click through without reading.
- **Infinite Scroll for Discovery**: Using infinite scroll for content where users need to find specific items or return to a position — prefer pagination for findability.
- **Hamburger Menu Over-Reliance**: Hiding navigation in a hamburger menu on desktop — reduces discoverability; reserve for mobile where space is genuinely limited.

## Quality Indicators

- **Task Success Rate ≥ 80%**: Users complete target tasks without assistance in moderated usability testing.
- **Error Rate Decreasing**: Number of user errors per session trends downward across design iterations.
- **Time on Task Reduced**: Users complete key tasks faster after design changes — measured in usability test.
- **NPS/CSAT Trending Positive**: Net Promoter Score or Customer Satisfaction score improves after UX changes.
- **Heuristic Evaluation Zero Criticals**: No Critical severity heuristic violations in the designs for release.
- **Empty States Designed**: Every list, dashboard, and user-generated content area has a designed empty state.
- **Error Messages Are Actionable**: All error messages in the product tell users exactly what to do to recover — no "unexpected error" dead ends.

## Collaboration Touchpoints

- **With Frontend Developer**: Provide interaction specifications (hover states, transition timing, focus behavior) alongside visual designs — ambiguous specs cause implementation inconsistencies.
- **With Product Owner**: Translate user research findings into feature prioritization evidence — usability data is more persuasive than design preference in backlog discussions.
- **With Accessibility Checker**: Involve accessibility review in the design phase, not only after implementation — color contrast, focus order, and semantic structure are design decisions.
- **With Frontend Aesthetics**: Collaborate on the design system — UX designer defines information hierarchy and interaction patterns; aesthetics specialist executes visual treatment.
