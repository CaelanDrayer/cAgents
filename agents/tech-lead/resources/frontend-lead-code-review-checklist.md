# Frontend Code Review Checklist

Comprehensive checklist for frontend code reviews.

## Quick Reference

```yaml
review_priorities:
  blocking:  # Must fix before merge
    - Security vulnerabilities
    - Breaking changes
    - Critical bugs
    - Missing error handling

  important:  # Should fix, can follow up
    - Performance issues
    - Accessibility problems
    - Test coverage gaps
    - Documentation missing

  suggestions:  # Nice to have
    - Code style improvements
    - Alternative approaches
    - Future enhancements
```

## Component Architecture

### Structure
- [ ] Component has single responsibility
- [ ] Props interface is well-defined
- [ ] Default props are sensible
- [ ] Component is appropriately sized (< 300 lines)
- [ ] Logic is extracted to hooks when reusable

### Composition
- [ ] Uses composition over inheritance
- [ ] Children/render props used appropriately
- [ ] Context used only when necessary
- [ ] HOCs avoided where hooks suffice

### State Management
- [ ] State lives at appropriate level
- [ ] Derived state computed, not stored
- [ ] Side effects in useEffect with proper deps
- [ ] No unnecessary re-renders
- [ ] Complex state uses useReducer

## TypeScript Quality

### Types
- [ ] No `any` types (or justified with comment)
- [ ] Props interfaces are complete
- [ ] Return types are explicit where helpful
- [ ] Union types used for variants
- [ ] Generics used for reusable components

### Safety
- [ ] Null checks for optional values
- [ ] Type guards for runtime checks
- [ ] Discriminated unions for state
- [ ] No type assertions without justification

## Performance

### Rendering
- [ ] useMemo for expensive computations
- [ ] useCallback for event handlers passed as props
- [ ] React.memo for pure components
- [ ] Keys are stable and unique
- [ ] No inline object/array literals in JSX

### Loading
- [ ] Lazy loading for route components
- [ ] Code splitting at appropriate boundaries
- [ ] Images optimized and lazy loaded
- [ ] No unnecessary network requests

### Bundle Impact
- [ ] New dependencies justified
- [ ] Tree-shakeable imports used
- [ ] No duplicate dependencies
- [ ] Large libraries loaded dynamically

## Accessibility

### Semantic HTML
- [ ] Correct heading hierarchy
- [ ] Meaningful landmark regions
- [ ] Lists used for list content
- [ ] Buttons for actions, links for navigation

### Keyboard
- [ ] All interactions keyboard accessible
- [ ] Focus visible and logical
- [ ] No keyboard traps
- [ ] Skip links for navigation

### Screen Readers
- [ ] Images have meaningful alt text
- [ ] Form inputs have labels
- [ ] Dynamic content announced
- [ ] ARIA used correctly (or not at all)

### Visual
- [ ] Color contrast meets WCAG AA (4.5:1)
- [ ] Text resizable to 200%
- [ ] No reliance on color alone
- [ ] Focus indicators visible

## Error Handling

### User Errors
- [ ] Form validation messages clear
- [ ] Error states are designed
- [ ] Recovery paths provided
- [ ] No cryptic error messages

### Application Errors
- [ ] Error boundaries at appropriate levels
- [ ] Graceful degradation for failed components
- [ ] Error logging to monitoring service
- [ ] Loading/error/success states handled

### Network Errors
- [ ] Failed requests handled gracefully
- [ ] Retry logic where appropriate
- [ ] Offline state considered
- [ ] Timeout handling

## Testing

### Unit Tests
- [ ] Business logic tested
- [ ] Edge cases covered
- [ ] Mocks used appropriately
- [ ] Tests are readable and maintainable

### Component Tests
- [ ] Render states tested
- [ ] User interactions tested
- [ ] Accessibility tested
- [ ] Error states tested

### Integration Tests
- [ ] Critical paths covered
- [ ] API integration tested
- [ ] State management tested

### Coverage
- [ ] New code has tests
- [ ] Coverage not decreased
- [ ] Critical paths at 80%+

## Security

### Input Handling
- [ ] User input sanitized
- [ ] No dangerouslySetInnerHTML (or justified)
- [ ] URL parameters validated
- [ ] File uploads validated

### Data Protection
- [ ] Sensitive data not logged
- [ ] Auth tokens handled securely
- [ ] No credentials in code
- [ ] XSS vectors eliminated

### Dependencies
- [ ] No known vulnerabilities
- [ ] Versions pinned
- [ ] Audit warnings addressed

## Code Quality

### Readability
- [ ] Clear naming conventions
- [ ] Comments explain why, not what
- [ ] Complex logic documented
- [ ] Consistent formatting

### Maintainability
- [ ] DRY principles applied
- [ ] Single responsibility
- [ ] Easy to modify/extend
- [ ] No magic numbers/strings

### Consistency
- [ ] Follows project patterns
- [ ] Style guide adherence
- [ ] Consistent file structure
- [ ] Naming conventions followed

## Documentation

### Code Comments
- [ ] Complex algorithms explained
- [ ] Business logic documented
- [ ] TODOs have tickets
- [ ] No commented-out code

### Component Documentation
- [ ] Props documented
- [ ] Usage examples provided
- [ ] Edge cases noted
- [ ] Storybook updated (if applicable)

### README/Docs
- [ ] Setup instructions current
- [ ] API documentation updated
- [ ] Architecture docs reflect changes

## Review Process

### Before Review
```yaml
author_checklist:
  - "Self-review completed"
  - "Tests passing"
  - "Linter errors resolved"
  - "PR description complete"
  - "Screenshots/videos for UI changes"
```

### During Review
```yaml
reviewer_approach:
  1_understand:
    - "Read PR description"
    - "Understand the context"
    - "Check linked issues"

  2_review:
    - "Read through changes"
    - "Check against checklist"
    - "Run locally if needed"

  3_feedback:
    - "Be specific and actionable"
    - "Explain the why"
    - "Offer alternatives"
    - "Distinguish blocking vs suggestions"
```

### After Review
```yaml
followup:
  approved:
    - "Merge promptly"
    - "Delete branch"
    - "Verify deployment"

  changes_requested:
    - "Address feedback"
    - "Re-request review"
    - "Discuss if unclear"
```

## Review Comment Templates

### Blocking Issue
```
🚫 **Blocking**: [Issue description]

This needs to be fixed before merge because [reason].

Suggested fix:
```code
// suggestion here
```
```

### Important Suggestion
```
⚠️ **Important**: [Issue description]

This should be addressed because [reason].

One approach:
```code
// suggestion here
```
```

### Minor Suggestion
```
💡 **Suggestion**: [Idea description]

This might improve [aspect] by [benefit].

Optional alternative:
```code
// suggestion here
```
```

### Praise
```
✨ **Nice**: [What's good about it]

This is a great pattern for [reason].
```
