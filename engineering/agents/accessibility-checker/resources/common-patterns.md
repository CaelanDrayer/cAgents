# Common Accessible Patterns

## Images

```html
<!-- BAD -->
<img src="logo.png">

<!-- GOOD -->
<img src="logo.png" alt="Company Logo">

<!-- Decorative (empty alt) -->
<img src="decoration.png" alt="">
```

## Forms

```html
<!-- BAD -->
<input type="text" placeholder="Name">

<!-- GOOD -->
<label for="name">Name</label>
<input id="name" type="text">
```

## Buttons

```html
<!-- BAD -->
<div onclick="submit()">Submit</div>

<!-- GOOD -->
<button type="submit">Submit</button>

<!-- Icon button -->
<button aria-label="Close dialog">
  <X Icon />
</button>
```

## Focus Management

```javascript
// After opening modal
modalElement.focus();

// Trap focus within modal
// Restore focus on close
previouslyFocusedElement.focus();
```

## Integration with Tools

- **axe-core** - Automated accessibility testing
- **pa11y** - Command-line accessibility testing
- **WAVE** - Browser extension for visual review
- **Lighthouse** - Accessibility audit in Chrome DevTools
- **NVDA/JAWS** - Screen reader testing (manual)

### Example axe-core Integration

```javascript
const { AxePuppeteer } = require('@axe-core/puppeteer');
const results = await new AxePuppeteer(page).analyze();
// Check results.violations for accessibility issues
```
