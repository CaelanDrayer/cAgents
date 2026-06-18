# Best Practices: Frontend Lead

> Design principles, patterns, and frameworks that guide high-quality frontend team coordination, architecture decisions, and design system leadership.

## Design Principles

- **Component Architecture Scales the Team**: A well-designed component library lets engineers ship faster without stepping on each other — invest in the architecture before scaling the team.
- **Performance Budgets Are Non-Negotiable**: Establish Core Web Vitals targets at the start of every project; retrofit is expensive and politically difficult.
- **Design System is a Product**: The component library is an internal product with consumers — maintain its API stability, documentation, and changelog with the same rigor as a public API.
- **Frontend Architecture Mirrors Team Structure**: If three teams work on one frontend, the architecture must enable independent deployment — Conway's Law applies to UIs.
- **Accessibility is a Team Standard**: Every developer on the team should be able to write accessible HTML; it cannot be delegated to a single specialist.
- **TypeScript is the Foundation**: Type safety catches entire categories of runtime bugs — strong TypeScript configuration is a non-negotiable standard.
- **Measure Before Optimizing**: Profile actual bundle sizes, render times, and Web Vitals in production — assumptions about performance are usually wrong.

## Key Patterns & Frameworks

- **Micro-Frontend Architecture**: Split the frontend by business domain, each owned by a separate team — enables independent deployment but requires explicit integration contracts.
- **Module Federation**: Webpack/Vite Module Federation for sharing components and code between micro-frontends at runtime without shared build steps.
- **Design System Governance Model**: Define a contribution model (who can add components, how they're reviewed, what the stability contract is) — without governance, design systems decay.
- **Frontend Performance Budget**: Define and enforce budgets for initial bundle size (< 150KB gzipped), Time to Interactive (< 3.8s on 3G), and Core Web Vitals — measured in CI.
- **A/B Testing Infrastructure**: Integrate experiment framework (LaunchDarkly, GrowthBook, custom) into the component architecture — feature flags at the component level.
- **State Management Architecture Decision**: Choose a state management strategy (React Query for server state + Zustand for client state) and document the decision; enforce it in code review.
- **Component Testing Strategy**: Define which tests live where (unit with Testing Library, integration with Cypress/Playwright, visual regression with Chromatic/Percy).
- **Frontend Observability**: Instrument Real User Monitoring (RUM), error tracking (Sentry), and Web Vitals collection — production visibility is as important for frontends as backends.
- **Code Splitting Strategy**: Define bundle splitting at route level (always), at feature level (large features), and at third-party level (heavy libraries) — standardize in build configuration.
- **Dependency Audit Cadence**: Review and update frontend dependencies weekly for security patches; monthly for minor/major upgrades — security applies to npm packages too.

## Domain Concepts & Terminology

### Architecture Patterns
- **Micro-Frontend**: Independent frontend applications composed at runtime or build time
- **Monorepo Frontend**: Multiple packages in one repository (Nx, Turborepo) — enables code sharing with independent deployability
- **BFF (Backend for Frontend)**: Backend service tailored to the frontend's needs — reduces over-fetching and client-side orchestration
- **Islands Architecture**: Mostly static HTML with isolated interactive "islands" (Astro, Fresh) — minimizes JavaScript for content-heavy sites

### Build & Bundling
- **Tree Shaking**: Dead code elimination — ensure libraries support ES module exports
- **Code Splitting**: Dividing the bundle into chunks loaded on demand
- **Chunk Strategy**: Route-based, vendor, and dynamic import splitting
- **Source Maps**: Debug information linking production code to source — critical for production error debugging
- **Bundle Analysis**: `webpack-bundle-analyzer` or `rollup-visualizer` — identify large dependencies and duplication

### Performance
- **Core Web Vitals**: LCP (Largest Contentful Paint), INP (Interaction to Next Paint), CLS (Cumulative Layout Shift)
- **RAIL Model**: Response (< 100ms), Animation (< 16ms frame), Idle (defer work during idle), Load (< 5s interactive)
- **Critical CSS**: Inline above-the-fold styles to eliminate render-blocking CSS
- **Resource Hints**: `preload`, `prefetch`, `preconnect` — control the browser's loading priority
- **Image Optimization**: WebP/AVIF formats, responsive images (`srcset`), lazy loading, explicit dimensions (prevents CLS)

### Team Standards
- **Frontend Linting Stack**: ESLint (logic), Prettier (formatting), Stylelint (CSS) — all enforced in CI
- **Git Hooks**: Husky + lint-staged — run linting and type checking before commit
- **PR Review Checklist**: Accessibility, performance impact, design system adherence, TypeScript correctness, test coverage
- **Browser Support Matrix**: Define supported browsers explicitly; maintain a testing matrix across real devices

## Anti-Patterns to Avoid

- **No Design System**: Each team building their own components independently — results in visual inconsistency, accessibility gaps, and duplicated effort.
- **Global CSS at Scale**: Unscoped CSS in a large codebase — styles conflict unpredictably; every change requires fear-driven regression testing.
- **Uncontrolled Bundle Growth**: Adding dependencies without tracking bundle size — initial load time degrades gradually and is only noticed when it becomes a crisis.
- **No Frontend Monitoring**: Shipping without error tracking or RUM — production issues are discovered by users, not engineers.
- **TypeScript Any-Escaping**: Using `any` to suppress TypeScript errors — defeats the purpose of type safety and accumulates hidden bugs.
- **Shared State Everywhere**: Putting all UI state in global stores — creates invisible coupling between components and makes the data flow impossible to trace.
- **Skipping Visual Regression Testing**: Shipping UI changes without visual regression checks — CSS changes have a large blast radius that manual review misses.

## Quality Indicators

- **Core Web Vitals All Green**: LCP < 2.5s, INP < 200ms, CLS < 0.1 measured in CrUX for the 75th percentile.
- **Zero Accessibility Violations in CI**: Automated axe-core scan returns zero violations on every PR.
- **Bundle Size Within Budget**: Initial JS bundle is within the established size budget — enforced by bundlesize or similar tool in CI.
- **Design System Coverage**: All new UI components are built using or extending the design system — no bespoke one-off styling.
- **TypeScript Strict Mode**: `strict: true` in tsconfig.json with zero `@ts-ignore` or `any` usages in new code.
- **Component Test Pass Rate 100%**: All frontend tests pass in CI before merge — no skipped tests.
- **Production Error Rate Trending Down**: Sentry or equivalent shows decreasing frontend error rate over time.

## Collaboration Touchpoints

- **With Frontend Developer**: Set clear standards and review PRs as a teaching opportunity; surface recurring patterns as design system contributions.
- **With UX Designer**: Translate design decisions into component API design — collaborate on token naming, variant structure, and interaction patterns.
- **With Backend Developer**: Agree on API contracts (OpenAPI spec), error response formats, and pagination strategies before either team begins implementation.
- **With Engineering Manager**: Report on Web Vitals trends, design system adoption, and frontend technical debt — frame performance as user experience impact.
