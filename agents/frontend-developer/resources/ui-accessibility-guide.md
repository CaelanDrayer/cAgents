# Accessibility Guide

Reference for building accessible web interfaces (WCAG 2.1 AA compliance).

## Core Principles (POUR)

| Principle | Meaning | Key Questions |
|-----------|---------|---------------|
| **Perceivable** | Content can be perceived | Can users see/hear/read all content? |
| **Operable** | UI can be operated | Can users navigate and interact? |
| **Understandable** | Content is understandable | Can users comprehend the interface? |
| **Robust** | Works across technologies | Does it work with assistive tech? |

## Semantic HTML

### Use Native Elements First

```html
<!-- Bad: div with click handler -->
<div class="btn" onclick="submit()">Submit</div>

<!-- Good: native button -->
<button type="submit">Submit</button>

<!-- Bad: div as heading -->
<div class="title">Page Title</div>

<!-- Good: semantic heading -->
<h1>Page Title</h1>
```

### Document Structure

```html
<header>            <!-- Site header, nav -->
<nav>               <!-- Navigation links -->
<main>              <!-- Primary content (one per page) -->
  <article>         <!-- Self-contained content -->
    <section>       <!-- Thematic grouping -->
  </article>
  <aside>           <!-- Related sidebar content -->
</main>
<footer>            <!-- Site footer -->
```

### Heading Hierarchy

```html
<h1>Page Title</h1>           <!-- One per page -->
  <h2>Section</h2>            <!-- Do not skip levels -->
    <h3>Subsection</h3>
    <h3>Subsection</h3>
  <h2>Section</h2>
    <h3>Subsection</h3>
```

## ARIA Patterns

### When to Use ARIA

1. **First**: Use native HTML elements (button, input, select, etc.)
2. **If needed**: Add ARIA roles and properties to custom widgets
3. **Rule**: No ARIA is better than bad ARIA

### Common ARIA Attributes

| Attribute | Purpose | Example |
|-----------|---------|---------|
| `aria-label` | Label for element with no visible text | Icon-only button |
| `aria-labelledby` | Points to visible label element | Dialog title |
| `aria-describedby` | Additional description | Error message for input |
| `aria-hidden="true"` | Hide decorative content | Decorative icons |
| `aria-live="polite"` | Announce dynamic content | Status messages |
| `aria-expanded` | Toggle state | Accordion, dropdown |
| `role` | Override element's role | Custom widget |

### Live Regions

```html
<!-- Announce status updates to screen readers -->
<div aria-live="polite" aria-atomic="true">
  {statusMessage}
</div>

<!-- Urgent announcements (interrupts) -->
<div role="alert">
  {errorMessage}
</div>
```

## Keyboard Navigation

### Focus Management

```jsx
// Trap focus in modal
function Modal({ isOpen, onClose, children }) {
  const modalRef = useRef();

  useEffect(() => {
    if (isOpen) {
      const focusable = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      focusable[0]?.focus();
    }
  }, [isOpen]);

  return isOpen ? (
    <div ref={modalRef} role="dialog" aria-modal="true" onKeyDown={handleKeyDown}>
      {children}
      <button onClick={onClose}>Close</button>
    </div>
  ) : null;
}
```

### Required Keyboard Interactions

| Widget | Keys | Behavior |
|--------|------|----------|
| Button | Enter, Space | Activate |
| Link | Enter | Navigate |
| Tab list | Arrow keys | Switch tabs |
| Menu | Arrow keys, Enter, Escape | Navigate, select, close |
| Dialog | Tab (trapped), Escape | Navigate within, close |
| Dropdown | Arrow keys, Enter, Escape | Navigate, select, close |
| Checkbox | Space | Toggle |

### Skip Links

```html
<!-- First element in body, visible on focus -->
<a href="#main-content" class="skip-link">Skip to main content</a>
```

```css
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  z-index: 100;
}
.skip-link:focus {
  top: 0;
}
```

## Forms

### Label Every Input

```html
<!-- Visible label (preferred) -->
<label for="email">Email address</label>
<input id="email" type="email" required aria-describedby="email-hint" />
<span id="email-hint">We will never share your email.</span>

<!-- Error state -->
<input id="email" type="email" aria-invalid="true" aria-describedby="email-error" />
<span id="email-error" role="alert">Please enter a valid email address.</span>
```

### Error Handling

- Announce errors immediately (use `role="alert"` or `aria-live`)
- Associate errors with inputs via `aria-describedby`
- Do not rely on color alone to indicate errors
- Provide clear, actionable error messages

## Color and Contrast

### Minimum Contrast Ratios (WCAG AA)

| Element | Ratio | Tool to Check |
|---------|-------|---------------|
| Normal text | 4.5:1 | WebAIM contrast checker |
| Large text (18px+ bold, 24px+) | 3:1 | Browser dev tools |
| UI components, icons | 3:1 | axe DevTools |

### Do Not Rely on Color Alone

```html
<!-- Bad: color-only indicator -->
<span style="color: red">Error</span>

<!-- Good: color + icon + text -->
<span style="color: red">
  <ErrorIcon aria-hidden="true" /> Error: Email is required
</span>
```

## Testing Checklist

- [ ] Navigate entire page with keyboard only (no mouse)
- [ ] Test with screen reader (VoiceOver, NVDA, JAWS)
- [ ] Run axe DevTools or Lighthouse accessibility audit
- [ ] Check all images have alt text (or aria-hidden for decorative)
- [ ] Verify focus order is logical
- [ ] Check color contrast ratios
- [ ] Test at 200% zoom
- [ ] Verify forms have labels, errors are announced
- [ ] Check skip links work
- [ ] Test with reduced motion preference
