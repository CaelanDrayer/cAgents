# Distinctive Typography Guide

## Font Selection Strategy

Choose fonts that are beautiful, unique, and memorable. Avoid the top 10 most popular Google Fonts.

### Display Fonts (Headlines)
- **Playfair Display** - Elegant, attention-grabbing serif
- **Crimson Pro** - Professional, readable display
- **Josefin Sans** - Geometric, modern
- **Abril Fatface** - Bold, dramatic
- **Raleway** - Clean, sophisticated

### Body Fonts (Readable)
- **Source Serif Pro** - Elegant, warm
- **Merriweather** - Trustworthy, readable
- **Lora** - Classic, contemporary
- **Nunito Sans** - Friendly, modern
- **Work Sans** - Professional, versatile

### Monospace Fonts (Code)
- **JetBrains Mono** - Developer-friendly, ligatures
- **Fira Code** - Programming ligatures
- **IBM Plex Mono** - Professional, clean
- **Recursive** - Variable, playful

## Anti-Patterns (NEVER USE)
- Inter (everywhere)
- Roboto (Android default)
- Arial/Helvetica (system defaults)
- Space Grotesk (overused in crypto/tech)

## Implementation Example

```css
:root {
  /* Display: Bold, attention-grabbing */
  --font-display: 'Playfair Display', serif;

  /* Body: Readable, elegant */
  --font-body: 'Source Serif Pro', serif;

  /* UI: Clean, modern */
  --font-ui: 'Nunito Sans', sans-serif;

  /* Code: Developer-friendly */
  --font-code: 'JetBrains Mono', monospace;

  /* Scale */
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  --text-3xl: 1.875rem;
  --text-4xl: 2.25rem;
  --text-5xl: 3rem;
}

h1 {
  font-family: var(--font-display);
  font-size: var(--text-5xl);
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.1;
}

body {
  font-family: var(--font-body);
  font-size: var(--text-base);
  line-height: 1.6;
  font-feature-settings: 'liga' 1, 'calt' 1;
}
```

## Font Pairing Guidelines

1. **Contrast is key** - Pair serif display with sans-serif body (or vice versa)
2. **Variable fonts** - Use for dynamic weight/width adjustments
3. **Font features** - Enable ligatures, small-caps, tabular numbers
4. **Typographic hierarchy** - Size, weight, and letter-spacing create visual order
