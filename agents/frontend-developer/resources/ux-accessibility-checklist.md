# Accessibility Checklist (WCAG 2.1)

## Perceivable

### Text Alternatives
- [ ] All images have meaningful alt text
- [ ] Decorative images use `alt=""`
- [ ] Complex images have extended descriptions
- [ ] Icons have accessible names

### Time-based Media
- [ ] Videos have captions
- [ ] Audio has transcripts
- [ ] Live content has real-time captions

### Adaptable
- [ ] Content works without CSS
- [ ] Reading order is logical
- [ ] Orientation not restricted

### Distinguishable
- [ ] Text contrast ratio >= 4.5:1 (AA)
- [ ] Large text contrast >= 3:1
- [ ] Non-text contrast >= 3:1
- [ ] Color not sole indicator
- [ ] Text resizable to 200%
- [ ] No loss of content on zoom

## Operable

### Keyboard Accessible
- [ ] All functionality via keyboard
- [ ] No keyboard traps
- [ ] Visible focus indicators
- [ ] Skip links provided
- [ ] Logical tab order

### Enough Time
- [ ] Timing adjustable or extendable
- [ ] Moving content can be paused
- [ ] No time limits (or warnings)

### Seizures & Physical Reactions
- [ ] No flashing content (> 3 flashes/sec)
- [ ] Motion can be disabled

### Navigable
- [ ] Page titles descriptive
- [ ] Focus order logical
- [ ] Link purpose clear
- [ ] Multiple ways to find pages
- [ ] Headings describe content

## Understandable

### Readable
- [ ] Language of page defined
- [ ] Unusual words explained
- [ ] Abbreviations expanded

### Predictable
- [ ] Navigation consistent
- [ ] Components consistent
- [ ] No unexpected context changes

### Input Assistance
- [ ] Errors clearly identified
- [ ] Labels provided for inputs
- [ ] Error suggestions given
- [ ] Error prevention for important data

## Robust

### Compatible
- [ ] Valid HTML
- [ ] Name, role, value for custom components
- [ ] Status messages announced

## Testing Tools

### Automated
- WAVE browser extension
- Axe DevTools
- Lighthouse accessibility audit
- Pa11y CI

### Manual
- Keyboard-only navigation test
- Screen reader testing (NVDA, VoiceOver)
- Color contrast checker
- Zoom to 200% test

## Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| Low contrast text | Increase color contrast |
| Missing alt text | Add descriptive alt |
| No focus indicator | Add `:focus` styles |
| Unlabeled form inputs | Add `<label>` elements |
| Non-semantic markup | Use proper HTML elements |
| No skip link | Add skip to main content |
