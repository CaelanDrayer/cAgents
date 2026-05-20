# Framework-Specific Review Patterns

Based on detected framework, enhance agents with framework-specific patterns.

## Framework Detection

Detect frameworks from project files:
- `next.config.*` -> Next.js
- `package.json` with `react` -> React
- `package.json` with `vue` -> Vue
- `angular.json` -> Angular
- `settings.py` / `manage.py` -> Django
- `*.py` with `FastAPI` -> FastAPI
- `package.json` with `express` -> Express
- `requirements.txt` with `flask` -> Flask
- `Gemfile` with `rails` -> Rails
- `pom.xml` with `spring-boot` -> Spring Boot
- `composer.json` with `laravel` -> Laravel
- `*.csproj` with `Microsoft.NET` -> .NET

## Per-Framework Agent Enhancement

### Next.js Projects
- **architect --review** -> Load Next.js App Router, Server Components, RSC patterns
- **performance-analyzer** -> Check ISR, SSG, image optimization, route caching
- **security-analyst** -> Validate API routes, middleware, env vars, CSP

### React Projects
- **architect --review** -> Check component composition, hooks usage, context
- **performance-analyzer** -> Analyze re-renders, useMemo, useCallback, lazy loading
- **accessibility-checker** -> Validate ARIA, semantic HTML, keyboard navigation

### Django Projects
- **architect --review** -> Check MVT pattern, apps structure, settings
- **performance-analyzer** -> Analyze ORM queries, caching, static files
- **security-analyst** -> Validate CSRF, SQL injection, XSS, middleware

### FastAPI Projects
- **architect --review** -> Check async patterns, dependency injection, routers
- **performance-analyzer** -> Analyze async/await, database connections, response models
- **security-analyst** -> Validate OAuth2, JWT, input validation, CORS

### Express Projects
- **architect --review** -> Check middleware chain, routing, error handling
- **performance-analyzer** -> Analyze async patterns, database pooling, caching
- **security-analyst** -> Validate helmet, CORS, SQL injection, XSS

### Vue Projects
- **architect --review** -> Check Composition API, store patterns, component structure
- **performance-analyzer** -> Analyze computed properties, watchers, lazy routes
- **accessibility-checker** -> Validate ARIA, focus management

### Angular Projects
- **architect --review** -> Check module structure, dependency injection, lazy loading
- **performance-analyzer** -> Analyze change detection, OnPush strategy, bundle size
- **security-analyst** -> Validate DomSanitizer, HTTP interceptors

## Config Location

Framework patterns loaded from: `cagents-memory/_system/commands/review/framework_patterns.yaml`
