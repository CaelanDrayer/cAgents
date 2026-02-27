# Frontend Performance Optimization

Reference for improving frontend performance and Core Web Vitals.

## Core Web Vitals

| Metric | Good | Needs Work | Poor | What It Measures |
|--------|------|------------|------|-----------------|
| LCP (Largest Contentful Paint) | < 2.5s | 2.5-4s | > 4s | Loading performance |
| INP (Interaction to Next Paint) | < 200ms | 200-500ms | > 500ms | Interactivity |
| CLS (Cumulative Layout Shift) | < 0.1 | 0.1-0.25 | > 0.25 | Visual stability |

## Bundle Size Optimization

### Code Splitting

```jsx
// Route-based splitting (most impactful)
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));

function App() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Suspense>
  );
}
```

### Dynamic Imports for Heavy Libraries

```jsx
// Load chart library only when needed
async function renderChart(data) {
  const { Chart } = await import('chart.js');
  new Chart(canvas, { type: 'line', data });
}

// Load on interaction
<button onClick={() => import('./HeavyEditor').then(m => setEditor(m.default))}>
  Open Editor
</button>
```

### Tree Shaking

```javascript
// Bad: imports entire library
import _ from 'lodash';
_.debounce(fn, 300);

// Good: imports only what's needed
import debounce from 'lodash/debounce';
debounce(fn, 300);

// Best: use native or lightweight alternative
function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}
```

### Bundle Analysis

```bash
# Webpack
npx webpack-bundle-analyzer dist/stats.json

# Vite
npx vite-bundle-visualizer

# Size limits in CI
# package.json
"size-limit": [
  { "path": "dist/index.js", "limit": "50 KB" },
  { "path": "dist/vendor.js", "limit": "150 KB" }
]
```

## Rendering Performance

### Avoid Unnecessary Re-renders

```jsx
// Memoize expensive components
const ExpensiveList = memo(function ExpensiveList({ items }) {
  return items.map(item => <ItemRow key={item.id} item={item} />);
});

// Memoize expensive calculations
const sortedItems = useMemo(() => {
  return items.slice().sort((a, b) => a.name.localeCompare(b.name));
}, [items]);

// Memoize callback references
const handleClick = useCallback((id) => {
  setSelected(id);
}, []);
```

### Virtualize Long Lists

```jsx
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualList({ items }) {
  const parentRef = useRef();
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
  });

  return (
    <div ref={parentRef} style={{ height: '400px', overflow: 'auto' }}>
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map(virtual => (
          <div key={virtual.key} style={{
            position: 'absolute',
            top: virtual.start,
            height: virtual.size,
          }}>
            {items[virtual.index].name}
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Image Optimization

### Format Selection

| Format | Use For | Savings vs PNG |
|--------|---------|---------------|
| WebP | Photos, complex images | 25-35% smaller |
| AVIF | Photos (modern browsers) | 50% smaller |
| SVG | Icons, logos, illustrations | Scales infinitely |
| PNG | Screenshots, transparency needed | Baseline |

### Responsive Images

```html
<picture>
  <source srcset="hero.avif" type="image/avif" />
  <source srcset="hero.webp" type="image/webp" />
  <img
    src="hero.jpg"
    alt="Hero banner"
    width="1200"
    height="600"
    loading="lazy"
    decoding="async"
    srcset="hero-400.jpg 400w, hero-800.jpg 800w, hero-1200.jpg 1200w"
    sizes="(max-width: 600px) 400px, (max-width: 1000px) 800px, 1200px"
  />
</picture>
```

### Layout Shift Prevention

```css
/* Always set width and height on images */
img { aspect-ratio: attr(width) / attr(height); }

/* Or use aspect-ratio CSS */
.image-container {
  aspect-ratio: 16 / 9;
  overflow: hidden;
}
```

## Caching Strategies

### HTTP Cache Headers

| Resource | Cache-Control | Strategy |
|----------|--------------|----------|
| HTML | `no-cache` | Always revalidate |
| JS/CSS (hashed) | `max-age=31536000, immutable` | Cache forever |
| API responses | `max-age=60, stale-while-revalidate=300` | Short cache + background refresh |
| Fonts | `max-age=31536000` | Cache forever |
| Images | `max-age=86400` | Cache 1 day |

### Service Worker Caching

```javascript
// Cache-first for static assets
self.addEventListener('fetch', (event) => {
  if (event.request.url.match(/\.(js|css|woff2|png|svg)$/)) {
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request))
    );
  }
});
```

## Performance Budget

| Category | Budget | Measurement |
|----------|--------|-------------|
| Total JS | < 300 KB gzipped | webpack-bundle-analyzer |
| Total CSS | < 50 KB gzipped | Build output |
| LCP | < 2.5s | Lighthouse, CrUX |
| TTI | < 3.5s | Lighthouse |
| CLS | < 0.1 | Lighthouse, CrUX |
| First load | < 1.5s (3G) | WebPageTest |
