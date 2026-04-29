# Framework-Specific Patterns

Optimization patterns for common frameworks.

## Next.js Patterns

| Pattern | Detection | Optimization |
|---------|-----------|--------------|
| Missing Image optimization | `<img>` instead of `<Image>` | Replace with next/image |
| Missing font optimization | Manual font loading | Use next/font |
| Client-only rendering | No SSR/SSG | Add getStaticProps/getServerSideProps |
| Large bundles | Bundle analysis | Code splitting, dynamic imports |
| Missing caching | No ISR | Add revalidate to static pages |

## React Patterns

| Pattern | Detection | Optimization |
|---------|-----------|--------------|
| Missing memoization | Components without memo | Add React.memo |
| Prop drilling | Props passed 3+ levels | Use Context or state management |
| Re-render issues | No useCallback/useMemo | Add memoization hooks |
| Missing keys | Lists without key prop | Add unique keys |
| Virtual DOM thrashing | Frequent state updates | Batch updates, use refs |

## FastAPI Patterns

| Pattern | Detection | Optimization |
|---------|-----------|--------------|
| Sync operations | Blocking I/O calls | Convert to async/await |
| Missing dependency injection | Repeated code | Use Depends() |
| Large response payloads | No pagination | Add pagination, filtering |
| Missing response models | Dict returns | Add Pydantic models |
| No background tasks | Sync heavy operations | Use BackgroundTasks |

## Django Patterns

| Pattern | Detection | Optimization |
|---------|-----------|--------------|
| N+1 queries | Multiple DB hits in loops | Use select_related/prefetch_related |
| Missing indexes | Slow queries | Add db_index=True |
| Heavy middleware | Processing every request | Conditional middleware |
| Large querysets | Loading all records | Use pagination, defer() |
| Template issues | Complex template logic | Move to views/template tags |

## Express Patterns

| Pattern | Detection | Optimization |
|---------|-----------|--------------|
| Sync operations | Blocking code in routes | Convert to async |
| Missing compression | No gzip/brotli | Add compression middleware |
| Memory leaks | Growing memory usage | Fix closures, event listeners |
| Inefficient routing | Route order issues | Optimize route ordering |
| Missing caching | No cache headers | Add caching middleware |

## Detection Commands

```bash
# Detect frameworks
if [ -f "next.config.js" ]; then echo "nextjs"; fi
if grep -q '"react"' package.json; then echo "react"; fi
if [ -f "main.py" ] && grep -q "FastAPI" *.py; then echo "fastapi"; fi
if [ -f "settings.py" ]; then echo "django"; fi
if grep -q '"express"' package.json; then echo "express"; fi
```
