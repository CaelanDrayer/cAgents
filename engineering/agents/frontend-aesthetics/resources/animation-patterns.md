# Animation & Motion Design Patterns

## Core Principles

- **Performance first** - Animate only `transform` and `opacity` (GPU-accelerated)
- **Easing matters** - Use `cubic-bezier` for natural motion
- **Orchestration** - Stagger reveals for hierarchy
- **Respect preferences** - Support `prefers-reduced-motion`

## Page Load Orchestration

### CSS-Only Staggered Reveal

```css
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Staggered reveal pattern */
.hero-title {
  animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both;
}

.hero-subtitle {
  animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both;
}

.hero-cta {
  animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.5s both;
}
```

### React with Framer Motion

```javascript
import { motion } from 'framer-motion';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

function HeroSection() {
  return (
    <motion.div variants={container} initial="hidden" animate="show">
      <motion.h1 variants={item}>Welcome</motion.h1>
      <motion.p variants={item}>Distinctive design</motion.p>
      <motion.button variants={item}>Get Started</motion.button>
    </motion.div>
  );
}
```

## Hover Micro-interactions

```css
.card {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1),
              box-shadow 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.card:hover {
  transform: translateY(-4px) scale(1.02);
  box-shadow: 0 20px 40px var(--color-shadow);
}

/* Button press feedback */
.button:active {
  transform: scale(0.98);
}
```

## Atmospheric Backgrounds

### Layered Gradient Atmosphere

```css
.hero-background {
  background:
    radial-gradient(circle at 20% 80%, rgba(122, 162, 247, 0.15) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(187, 154, 247, 0.15) 0%, transparent 50%),
    linear-gradient(135deg, #24283b 0%, #1a1b26 100%);
}
```

### Animated Gradient

```css
@keyframes gradientShift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.animated-gradient {
  background: linear-gradient(270deg, #7aa2f7, #bb9af7, #f7768e);
  background-size: 200% 200%;
  animation: gradientShift 15s ease infinite;
}
```

### Geometric Pattern Overlay

```css
.geometric-background {
  background-color: var(--color-bg-primary);
  background-image:
    linear-gradient(30deg, var(--color-bg-secondary) 12%, transparent 12.5%, transparent 87%, var(--color-bg-secondary) 87.5%),
    linear-gradient(150deg, var(--color-bg-secondary) 12%, transparent 12.5%, transparent 87%, var(--color-bg-secondary) 87.5%);
  background-size: 80px 140px;
}
```

## Accessibility: Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Easing Cheat Sheet

| Effect | Cubic-Bezier |
|--------|--------------|
| Smooth out | `cubic-bezier(0.16, 1, 0.3, 1)` |
| Bounce | `cubic-bezier(0.34, 1.56, 0.64, 1)` |
| Snap | `cubic-bezier(0.68, -0.6, 0.32, 1.6)` |
| Ease in out | `cubic-bezier(0.65, 0, 0.35, 1)` |
