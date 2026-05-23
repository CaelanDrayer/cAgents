# Cohesive Color Systems

## The 60-30-10 Rule

- **60%** - Dominant color (backgrounds)
- **30%** - Secondary color (UI elements)
- **10%** - Accent color (emphasis, CTAs)

## Inspiration Sources

### IDE Themes (Dark Mode Excellence)
- **Tokyo Night** - Deep navy, cool whites, aurora accents
- **Dracula** - Dark purple, pink highlights
- **Nord** - Cool grays, aurora pastels
- **Monokai** - Dark brown, vibrant colors
- **Solarized** - Scientific color relationships

### Cultural Aesthetics
- **Japanese Minimalism** - Warm whites, matcha green, clay red
- **Scandinavian Design** - Neutral tones, natural accents
- **Art Deco** - Gold, black, geometric patterns

### Nature Palettes
- **Sunset** - Orange, pink, purple gradients
- **Ocean Depths** - Deep blues, teals, bioluminescent
- **Forest** - Greens, browns, earth tones
- **Desert** - Terracotta, sage, cream

## Anti-Patterns (AVOID)
- Purple gradients on white (SaaS cliché)
- Blue + white (corporate default)
- Red + black (aggressive, overused)
- Rainbow gradients (too busy)

## Example: Tokyo Night Theme

```css
:root {
  /* Dominant colors (60%) */
  --color-bg-primary: #1a1b26;
  --color-bg-secondary: #24283b;
  --color-bg-tertiary: #414868;

  /* Text colors */
  --color-text-primary: #c0caf5;
  --color-text-secondary: #9aa5ce;
  --color-text-tertiary: #565f89;

  /* Accent colors (10-20%) */
  --color-accent-primary: #7aa2f7;    /* Blue */
  --color-accent-secondary: #bb9af7;  /* Purple */
  --color-accent-success: #9ece6a;    /* Green */
  --color-accent-warning: #e0af68;    /* Orange */
  --color-accent-error: #f7768e;      /* Red */

  /* Semantic colors */
  --color-border: rgba(255, 255, 255, 0.1);
  --color-shadow: rgba(0, 0, 0, 0.5);

  /* Gradients */
  --gradient-hero: linear-gradient(135deg, #24283b 0%, #1a1b26 100%);
  --gradient-accent: linear-gradient(135deg, #7aa2f7 0%, #bb9af7 100%);
}
```

## Example: Japanese Minimal Theme

```css
:root {
  /* Dominant: Warm whites */
  --color-bg-primary: #faf9f7;
  --color-bg-secondary: #f5f3f0;
  --color-bg-tertiary: #e8e6e3;

  /* Text: Charcoal */
  --color-text-primary: #2b2d2f;
  --color-text-secondary: #5a5c5e;

  /* Accents: Natural */
  --color-accent-matcha: #89a06b;
  --color-accent-clay: #c84c3f;
  --color-accent-stone: #8b8178;
}
```

## Dark Mode Considerations

1. **Colored shadows** - Use tinted shadows, not pure black
2. **Glow effects** - Accent borders emit subtle glow
3. **Glass morphism** - Semi-transparent with backdrop blur
4. **No harsh whites** - Use off-whites for text
