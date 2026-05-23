# Best Practices: Accessibility Checker

> Design principles, patterns, and frameworks that guide high-quality web and application accessibility auditing work.

## Design Principles

- **Inclusive by Default**: Accessibility is not a feature to add later — it is a baseline requirement for every UI component.
- **Standards-First**: WCAG 2.1 AA is the minimum bar; structure every audit around measurable success criteria.
- **Real-User Perspective**: Evaluate with actual assistive technologies (screen readers, keyboard-only, magnifiers) not just automated scanners.
- **Severity Triage**: Rank barriers by user impact — blocking issues (cannot access) outweigh annoyances (harder to access).
- **Context Sensitivity**: What counts as accessible varies by content type; images, forms, tables, and media each have distinct requirements.
- **Evidence-Based Findings**: Every violation must cite the specific WCAG criterion, the failing element, and the remediation path.
- **Progressive Enhancement**: Ensure core functionality is available without JavaScript, CSS, or rich media.

## Key Patterns & Frameworks

- **WCAG 2.1 AA Audit**: The primary framework — evaluate against all 50 level AA success criteria, organized by POUR (Perceivable, Operable, Understandable, Robust).
- **POUR Principles**: Perceivable (content must be presentable in multiple ways), Operable (all functions available via keyboard), Understandable (content and UI behavior must be predictable), Robust (content must be interpreted by assistive technologies).
- **Automated + Manual Testing**: Automated tools (axe, Lighthouse, WAVE) catch ~30% of issues; manual keyboard and screen-reader testing catches the rest.
- **Screen Reader Testing Matrix**: Test with NVDA+Firefox, JAWS+Chrome, VoiceOver+Safari, and TalkBack+Chrome to cover real-world AT diversity.
- **Keyboard Navigation Audit**: Tab through every interactive element; verify focus order matches visual order, focus is always visible, and no keyboard traps exist.
- **Color Contrast Analysis**: Use WCAG contrast ratio formula — 4.5:1 for normal text, 3:1 for large text and UI components.
- **ARIA Correct-Use Pattern**: Use ARIA only when native HTML semantics are insufficient; prefer `<button>` over `<div role="button">`.
- **Focus Management Protocol**: After dynamic content changes (modals, alerts, route changes), move focus to the appropriate element programmatically.
- **Landmark Region Audit**: Verify `<main>`, `<nav>`, `<header>`, `<footer>`, and `<aside>` landmarks are present and labeled when multiple instances exist.
- **Form Accessibility Checklist**: Every input has a programmatic label, error messages reference the failing field, and required fields are indicated.

## Domain Concepts & Terminology

### WCAG Structure
- **Success Criterion (SC)**: Specific testable statement (e.g., SC 1.4.3 Contrast Minimum)
- **Conformance Level**: A (minimum), AA (standard requirement), AAA (enhanced)
- **Sufficient Technique**: An approved implementation approach that satisfies a criterion
- **Advisory Technique**: A best practice that improves accessibility beyond the criterion
- **Failure**: A documented way an implementation fails a criterion

### Assistive Technologies
- **Screen Reader**: Software that converts screen content to speech or braille (NVDA, JAWS, VoiceOver, TalkBack)
- **Switch Access**: Single-button navigation for motor-impaired users
- **Screen Magnifier**: Enlarges portions of the screen (ZoomText, Windows Magnifier)
- **Voice Control**: Navigation via speech commands (Dragon NaturallySpeaking, Voice Control on macOS/iOS)
- **Braille Display**: Refreshable hardware device that renders text in braille

### ARIA
- **Role**: Defines the element type to AT (e.g., `role="dialog"`, `role="alert"`)
- **State**: Dynamic condition (e.g., `aria-expanded`, `aria-checked`, `aria-disabled`)
- **Property**: Characteristic (e.g., `aria-label`, `aria-describedby`, `aria-required`)
- **Live Region**: Area that announces dynamic changes (`aria-live="polite"` or `"assertive"`)
- **Accessible Name**: The label AT announces for an element (computed via accessible name algorithm)

### Perceivability
- **Alt Text**: Text alternative for non-text content
- **Captions**: Synchronized text for audio in video
- **Audio Description**: Narration of visual content in video
- **Reflow**: Content must be readable at 400% zoom without horizontal scrolling (SC 1.4.10)
- **Text Spacing**: Content must remain readable when line-height, letter-spacing, and word-spacing are overridden (SC 1.4.12)

### Operability
- **Focus Indicator**: Visible highlight showing which element has keyboard focus (SC 2.4.7)
- **Skip Links**: Bypass navigation mechanism ("Skip to main content")
- **Keyboard Trap**: Condition where keyboard focus cannot leave a component — always a blocking failure
- **Pointer Cancellation**: Up-event (mouseup/touchend) should trigger actions, not down-event (SC 2.5.2)
- **Target Size**: Interactive targets should be at least 24×24 CSS pixels (SC 2.5.8, AA in WCAG 2.2)

## Anti-Patterns to Avoid

- **Automated-Only Audits**: Relying solely on axe or Lighthouse produces false confidence — automated tools miss ~70% of real accessibility barriers.
- **ARIA Overuse**: Adding ARIA attributes to override poor HTML structure instead of fixing the underlying semantics creates unpredictable AT behavior.
- **Placeholder as Label**: Using `placeholder` attribute as the only label for inputs — placeholders disappear on input, leaving users without context.
- **Color-Only Information**: Conveying meaning through color alone (red = error, green = success) without a text or icon supplement fails SC 1.4.1.
- **Missing Focus Management**: Not moving focus after modal open/close or route changes leaves keyboard/AT users disoriented.
- **Generic Alt Text**: Writing alt="image" or alt="photo" instead of a meaningful description of the image's content and purpose.
- **Keyboard Trap**: Any interactive component (custom dropdown, date picker, modal) that traps focus without an Escape key escape route.

## Quality Indicators

- **Zero Keyboard Traps**: Tab through entire UI without getting stuck in any component.
- **100% Interactive Elements Reachable**: Every button, link, and form control is reachable via Tab/Shift+Tab and activatable via Enter/Space.
- **Contrast Ratio ≥ 4.5:1**: All normal text passes WCAG AA contrast requirement when measured with a contrast checker.
- **All Images Have Appropriate Alt Text**: Decorative images have `alt=""`, informative images have descriptive text, complex images link to full descriptions.
- **Screen Reader Announcements Match Visual Content**: What VoiceOver/NVDA announces matches what sighted users see, with no extra noise.
- **axe-core Zero Violations**: Automated scan returns zero violations (not just warnings) for the page under review.
- **Form Error Recovery Rate**: Users can identify, understand, and correct every form error using a screen reader alone.

## Collaboration Touchpoints

- **With Frontend Developer**: Accessibility findings are most effective when paired with specific code examples of the fix — collaborate on semantic HTML and ARIA implementation.
- **With UX Designer**: Surface accessibility constraints early in design (color contrast, touch target size, focus order) so they are designed-in rather than retrofitted.
- **With QA Lead**: Define which accessibility checks belong in automated CI gates vs. manual release testing, and establish severity thresholds for blocking release.
- **With Code Reviewer**: Provide a reusable checklist of common HTML/ARIA mistakes so reviewers can catch issues before they reach accessibility audit.
