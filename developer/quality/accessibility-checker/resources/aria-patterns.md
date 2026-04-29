# ARIA Usage Patterns

## Correct ARIA Usage

```html
<!-- role="button" with keyboard handlers -->
<div role="button" tabIndex={0} onClick={handleClick} onKeyPress={handleKeyPress}>
  Action
</div>

<!-- aria-label on icon-only buttons -->
<button aria-label="Close dialog">
  <X Icon />
</button>

<!-- aria-describedby for complex inputs -->
<input id="email" aria-describedby="email-help" />
<span id="email-help">Enter your work email</span>

<!-- aria-live for dynamic content -->
<div aria-live="polite" role="status">
  {statusMessage}
</div>

<!-- aria-hidden on decorative elements -->
<img src="decoration.png" aria-hidden="true" alt="" />
```

## Common ARIA Mistakes

- **Redundant roles**: `<button role="button">` (unnecessary)
- **Invalid ARIA attributes**: Using non-existent attributes
- **aria-label on non-interactive elements**: Only for focusable elements
- **Missing required ARIA properties**: Roles without required attributes

## Semantic HTML Check

Prefer semantic elements over ARIA:
- `<button>` over `<div onclick>`
- `<a>` for links, `<button>` for actions
- `<nav>`, `<main>`, `<aside>`, `<header>`, `<footer>`
- `<h1>`-`<h6>` for headings
- `<label>` for form inputs
