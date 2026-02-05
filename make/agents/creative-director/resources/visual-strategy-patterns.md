# Visual Strategy Patterns

Reference guide for visual design decision-making, brand consistency, and design system governance.

## Visual Design Principles

### Hierarchy and Attention

Visual hierarchy guides the viewer's eye through content in order of importance.

**Hierarchy Tools**:

| Tool | Effect | Application |
|------|--------|------------|
| **Size** | Larger elements draw attention first | Headlines, hero images, primary CTAs |
| **Contrast** | High contrast elements stand out | Text on backgrounds, button colors, dividers |
| **Color** | Saturated or warm colors advance | Accent colors for actions, muted for secondary |
| **Position** | Top-left (LTR) gets scanned first | Key messages above the fold, F-pattern layout |
| **Whitespace** | Isolation creates emphasis | Breathing room around important elements |
| **Typography** | Weight and style signal importance | Bold for headings, regular for body, italic for emphasis |

### Composition Patterns

**F-Pattern**: Users scan in an F shape. Place key content along the top horizontal bar and the left vertical bar. Best for text-heavy pages.

**Z-Pattern**: Users scan in a Z shape. Place logo top-left, CTA top-right, supporting content bottom-left, primary action bottom-right. Best for landing pages.

**Gutenberg Diagram**: Divide the page into four quadrants. Primary optical area (top-left) and terminal area (bottom-right) get the most attention. Place key content and CTAs accordingly.

**Rule of Thirds**: Divide the canvas into a 3x3 grid. Place focal points at grid intersections for natural, engaging composition.

## Color Strategy

### Color Psychology in Context

Colors carry meaning that varies by context, culture, and industry.

| Color | Common Associations | Use Cases | Caution |
|-------|-------------------|-----------|---------|
| Blue | Trust, stability, professionalism | Enterprise, finance, healthcare | Can feel cold or impersonal |
| Green | Growth, nature, success | Sustainability, health, finance | Can feel generic for tech |
| Red | Urgency, energy, danger | Alerts, CTAs, sales | Overuse creates anxiety |
| Orange | Warmth, creativity, enthusiasm | CTAs, playful brands, food | Can feel unserious |
| Purple | Luxury, creativity, wisdom | Premium, creative, wellness | Can feel niche or exclusive |
| Black | Sophistication, power, elegance | Luxury, fashion, minimalist | Can feel heavy or somber |
| White | Clean, simple, spacious | Minimalist, tech, healthcare | Can feel empty without balance |

### Building a Color System

**Functional Color Categories**:

1. **Primary palette** (1-2 colors): Brand identity, main actions
2. **Secondary palette** (2-3 colors): Supporting elements, categories
3. **Neutral palette** (4-6 shades): Text, backgrounds, borders
4. **Semantic colors**: Success (green), warning (amber), error (red), info (blue)
5. **Surface colors**: Background layers, card surfaces, overlays

**Accessibility Requirements**:
- Text on backgrounds must meet WCAG AA minimum (4.5:1 contrast ratio for normal text)
- Large text requires 3:1 contrast ratio minimum
- Interactive elements need 3:1 contrast against adjacent colors
- Never use color alone to convey meaning (pair with icons, labels, or patterns)

### Dark Mode Considerations

- Do not simply invert colors; redesign the palette for dark surfaces
- Reduce color saturation on dark backgrounds (vivid colors vibrate)
- Use elevated surfaces (lighter grays) instead of borders for separation
- Ensure all contrast ratios meet accessibility standards in both modes
- Test text readability on all background combinations

## Typography Strategy

### Type Scale

Establish a consistent scale based on a mathematical ratio.

**Common Scales**:
- Minor Third (1.2): Subtle, compact interfaces
- Major Third (1.25): Balanced, general purpose
- Perfect Fourth (1.333): Clear hierarchy, content-heavy
- Augmented Fourth (1.414): Strong hierarchy, editorial

**Example Scale (Major Third, base 16px)**:
- Display: 39px (2.441rem)
- H1: 31px (1.953rem)
- H2: 25px (1.563rem)
- H3: 20px (1.25rem)
- Body: 16px (1rem)
- Small: 13px (0.8rem)
- Caption: 10px (0.64rem)

### Font Pairing Principles

- **Contrast**: Pair fonts with distinct characteristics (serif + sans-serif)
- **Mood alignment**: Both fonts should support the same emotional tone
- **Limited palette**: Use at most 2-3 font families in a project
- **Weight variety**: Use weight variations within a family before adding another family
- **Readability**: Body text must be highly readable; reserve display fonts for headings

### Responsive Typography

- Scale font sizes based on viewport width using clamp() or fluid typography
- Adjust line height at different sizes (tighter for headings, looser for body)
- Reduce heading sizes on mobile (maintain hierarchy with smaller jumps)
- Ensure minimum body text size of 16px on mobile for readability
- Test line length: 45-75 characters per line for optimal reading comfort

## Layout and Spacing Systems

### Spacing Scale

Use a consistent spacing scale based on a base unit.

**4px Base Unit Scale**:
- 4px (0.25rem): Micro spacing (icon padding, tight groups)
- 8px (0.5rem): Small spacing (inline elements, compact lists)
- 12px (0.75rem): Medium-small (form fields, card padding)
- 16px (1rem): Medium (paragraph spacing, standard padding)
- 24px (1.5rem): Large (section spacing, card gaps)
- 32px (2rem): Extra large (section dividers)
- 48px (3rem): Layout spacing (major sections)
- 64px (4rem): Page-level spacing (header/footer separation)

### Grid Systems

**12-Column Grid**: Most flexible, supports 1, 2, 3, 4, 6, and 12 column layouts.

**Common Breakpoints**:
- Mobile: 320-767px (1-2 columns)
- Tablet: 768-1023px (2-3 columns)
- Desktop: 1024-1439px (3-4 columns)
- Wide: 1440px+ (4-6 columns)

**Content Width Constraints**:
- Maximum content width: 1200-1440px (prevents lines from becoming too long)
- Maximum text content width: 680-720px (optimal reading length)
- Minimum touch target: 44x44px on mobile

## Design System Governance

### Component Quality Standards

Every design system component must meet these criteria before inclusion:

**Functional Requirements**:
- Solves a documented, recurring need
- Works across all supported breakpoints
- Handles all states (default, hover, active, focus, disabled, error, loading)
- Supports keyboard navigation and screen readers
- Performs acceptably (no layout shifts, fast rendering)

**Documentation Requirements**:
- Usage guidelines (when and when not to use)
- Anatomy diagram (labeled parts)
- Property/variant table (all configurable options)
- Accessibility notes (ARIA attributes, keyboard behavior)
- Code examples for each variant
- Do and do-not examples with explanations

### Design Token Architecture

Organize design tokens in three layers:

1. **Global tokens**: Raw values (colors, spacing, type scale)
   - `color.blue.500: #2563EB`
   - `spacing.4: 16px`

2. **Semantic tokens**: Purpose-mapped values referencing global tokens
   - `color.action.primary: {color.blue.500}`
   - `spacing.component.padding: {spacing.4}`

3. **Component tokens**: Component-specific values referencing semantic tokens
   - `button.background: {color.action.primary}`
   - `button.padding: {spacing.component.padding}`

This layered approach enables theming (swap global tokens) without changing component definitions.

### Consistency Audit Checklist

Periodically audit creative output against the design system:

- [ ] Color usage matches defined palette (no rogue colors)
- [ ] Typography follows the established type scale
- [ ] Spacing uses the defined spacing scale (no arbitrary values)
- [ ] Components use standard library variants (no one-off modifications)
- [ ] Icons follow consistent style, size, and stroke weight
- [ ] Imagery follows established photography or illustration guidelines
- [ ] Responsive behavior matches defined breakpoint patterns
- [ ] Accessibility standards met across all touchpoints
- [ ] Dark mode (if applicable) properly supported
- [ ] Animation follows established motion principles

## Motion and Animation Principles

### Purposeful Motion

Animation should serve function, not decoration.

**Appropriate Uses**:
- Guiding attention to important changes
- Providing feedback for user actions
- Showing relationships between elements (expand, collapse, connect)
- Smoothing transitions between states or views
- Indicating loading or progress

**Timing Guidelines**:
- Micro-interactions: 100-200ms (button feedback, toggles)
- Transitions: 200-400ms (page changes, modal open/close)
- Emphasis animations: 300-500ms (notifications, highlights)
- Complex sequences: 500-1000ms (onboarding, tutorials)

**Easing Curves**:
- Entry: ease-out (decelerate into position)
- Exit: ease-in (accelerate out of view)
- State change: ease-in-out (smooth transition)
- Attention: spring or bounce (playful emphasis)

### Accessibility and Motion

- Respect `prefers-reduced-motion` media query
- Provide static alternatives for essential animated content
- Avoid flashing or strobing effects (seizure risk)
- Keep animation subtle; excessive motion causes discomfort
- Ensure animated content is not the only way to access information
