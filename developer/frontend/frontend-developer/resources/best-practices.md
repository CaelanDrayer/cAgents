# Best Practices: Frontend Developer

> Design principles, patterns, and frameworks that guide high-quality UI component development, state management, and client-side engineering.

## Design Principles

- **Component as the Unit of Work**: Build UIs as composable, self-contained components with clear interfaces — reusability and testability emerge from good composition.
- **Collocate Logic and View**: State and logic that only a component needs should live with that component, not in a global store — avoid premature state lifting.
- **Performance is User Experience**: Slow interfaces frustrate users before they understand the product — treat Core Web Vitals as first-class requirements.
- **Accessibility is Not Optional**: Every interactive element must be keyboard-operable and screen-reader-accessible — semantic HTML and ARIA are part of the implementation, not a post-processing step.
- **Unidirectional Data Flow**: State flows down via props, events flow up via callbacks — this predictability makes debugging tractable.
- **Type Safety Prevents Runtime Errors**: TypeScript types for all component props, API responses, and state — catch errors at compile time, not in production.
- **Progressive Enhancement**: Build core functionality that works without JavaScript, then enhance with JS — improves resilience and initial load performance.

## Key Patterns & Frameworks

- **Component Composition Pattern**: Build complex UIs from simple, composable parts — prefer composition over inheritance; use Compound Components and Render Props for flexible APIs.
- **Container/Presentational Split**: Separate components that fetch and manage data (containers) from components that render UI (presentational) — improves testability and reuse.
- **Custom Hooks for Shared Logic**: Extract stateful logic (data fetching, form handling, timers) into custom hooks — enables reuse without component coupling.
- **Controlled vs. Uncontrolled Components**: Controlled components hold state in React (enables validation and synchronization); uncontrolled components use DOM refs (simpler for one-off inputs).
- **Optimistic UI Updates**: Apply the expected result of a mutation immediately in the UI, then reconcile with the server response — makes interactions feel instantaneous.
- **Virtualization**: Render only visible rows in long lists (react-window, react-virtual) — critical for lists with thousands of items.
- **Code Splitting with React.lazy**: Split bundles at the route and component level — reduce initial JS payload; load code only when needed.
- **Error Boundary Pattern**: Wrap subtrees with error boundaries so a runtime error in one component doesn't crash the entire app.
- **Suspense for Loading States**: Use React Suspense to declaratively handle loading states — clean separation of loading UI from data-fetching logic.
- **Form State Management**: Use controlled forms with validation libraries (react-hook-form, Formik, Zod) — avoid manual state management for complex forms.
- **CSS Module / CSS-in-JS Scoping**: Scope styles to components to prevent unintended style bleedthrough — CSS Modules, styled-components, or Tailwind with component boundary discipline.

## Domain Concepts & Terminology

### React Concepts
- **Virtual DOM**: React's in-memory representation of the DOM; reconciliation computes the minimal set of real DOM updates
- **Reconciliation**: React's algorithm for determining what changed between renders
- **Key Prop**: Stable identifier for list items; helps React reconcile list changes efficiently
- **Ref**: Direct reference to a DOM element or component instance; escape hatch from declarative model
- **Context**: React mechanism for sharing state without prop drilling; use sparingly — overuse creates hidden coupling
- **Memo / useMemo / useCallback**: Memoization to skip re-renders or recalculations when dependencies haven't changed

### State Management
- **Local State**: Component state via useState — right scope for UI state (open/closed, current tab)
- **Lifted State**: State moved to a common ancestor to share between siblings
- **Global State**: Application-wide state via Redux, Zustand, Jotai, or Context — for auth state, cart, user preferences
- **Server State**: Remote data synchronized with the server (React Query, SWR, Apollo) — separate from UI state
- **URL State**: State encoded in the URL (route params, query strings) — makes deep linking possible

### Performance
- **Core Web Vitals**: LCP (Largest Contentful Paint), CLS (Cumulative Layout Shift), INP (Interaction to Next Paint)
- **Bundle Size**: Total JavaScript downloaded by the browser — target < 150KB gzipped for initial bundle
- **Tree Shaking**: Dead code elimination during bundling — only exports that are imported end up in the bundle
- **Lazy Loading**: Deferring image, script, or component loading until needed
- **Hydration**: Process of attaching React event handlers to server-rendered HTML
- **Web Worker**: Browser thread for CPU-intensive work that shouldn't block the main thread

### Browser & Web Platform
- **Critical Rendering Path**: HTML parse → CSS parse → Render tree → Layout → Paint — minimize blocking resources
- **CORS (Cross-Origin Resource Sharing)**: Browser security mechanism for cross-origin requests
- **CSP (Content Security Policy)**: HTTP header that restricts which resources the browser may load — prevents XSS
- **Service Worker**: Script running in the background for offline support, push notifications, and caching
- **Web Vitals API**: Browser API for measuring LCP, CLS, and INP in real user sessions

## Anti-Patterns to Avoid

- **Prop Drilling**: Passing props through many intermediate components to reach a distant descendant — use Context or a state manager for deeply shared state.
- **useEffect for Data Fetching**: Fetching data in useEffect with manual loading/error state — use React Query or SWR which handle caching, deduplication, and refetching.
- **Inline Object/Function as Prop**: Creating new object or function literals in JSX (`style={{color: 'red'}}`) — creates new references every render, breaking memoization.
- **Over-Global State**: Putting all state in a global store — local and server state should not pollute global state.
- **Missing Error Boundaries**: Allowing a single component runtime error to crash the entire app — wrap subtrees in error boundaries.
- **Render Everything**: Rendering thousands of list items in the DOM — use virtualization for large lists.
- **Non-Semantic HTML**: Using `<div>` and `<span>` for everything instead of semantic elements (`<button>`, `<nav>`, `<main>`, `<section>`) — degrades accessibility and SEO.

## Quality Indicators

- **LCP < 2.5 Seconds**: Measured in real users (CrUX) and lab conditions (Lighthouse) — key user experience metric.
- **CLS < 0.1**: No layout shifts caused by late-loading content (images without dimensions, late-injected content).
- **Zero Accessibility Violations in axe Scan**: Automated scan returns zero violations for core user flows.
- **TypeScript Strict Mode Passes**: No TypeScript errors with `strict: true` — catches null references and type mismatches.
- **Component Test Coverage**: All interactive components have tests covering user interactions (click, type, submit).
- **Bundle Size Budget Met**: Initial JS payload is within the agreed budget; imports are tree-shaken.
- **No Console Errors in Production**: Browser console is clean for standard user flows — errors indicate unhandled edge cases.

## Collaboration Touchpoints

- **With Backend Developer**: Agree on API contract (OpenAPI spec) before implementation; coordinate on error response format and loading states.
- **With UX Designer**: Implement interaction states (hover, focus, loading, error, empty) that may not be in the wireframe but are critical to usability.
- **With Accessibility Checker**: Provide component demos for screen reader testing; implement fixes from accessibility reports promptly.
- **With Frontend Lead**: Follow component architecture decisions and design system conventions; surface reuse opportunities in code review.
