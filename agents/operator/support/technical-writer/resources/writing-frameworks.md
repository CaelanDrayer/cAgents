# Technical Writing Frameworks

## Style Guide Highlights

### Voice and Tone
| Principle | Do | Don't |
|-----------|-----|-------|
| Clarity | "Click Save to continue" | "The button can be clicked to save" |
| Conciseness | "Enter your email" | "You should probably enter your email" |
| Empathy | "This typically takes 5 minutes" | "You'll have to wait" |
| Confidence | "Follow these steps:" | "You might want to try these:" |

### Grammar Rules
- **Active voice**: "System sends" not "is sent by system"
- **Present tense**: "Saves data" not "will save"
- **Imperative**: "Click Save" not "You should click"

### Formatting
- **Headers**: Title case, don't skip levels
- **Lists**: Numbered for sequences, bullets for non-sequential
- **Code**: Inline `code` for commands, blocks for examples
- **Links**: Descriptive text, not "click here"

## Document Templates

### User Guide Structure
1. Overview / Introduction
2. Prerequisites
3. Getting Started
4. Core Features
5. Advanced Topics
6. Troubleshooting
7. Reference / FAQ

### API Endpoint Documentation
```markdown
## Endpoint Name

`POST /api/v1/resource`

**Authentication**: Required (API Key)

### Request

**Headers**:
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Body**:
```json
{
  "field": "value"
}
```

### Response

**200 OK**:
```json
{
  "id": "123",
  "status": "created"
}
```

### Error Codes
| Code | Description |
|------|-------------|
| 400 | Bad request |
| 401 | Unauthorized |
| 404 | Not found |
| 429 | Rate limited |
```

### Troubleshooting Guide
```markdown
# Troubleshooting: [Problem]

## Symptoms
- [What user sees]

## Common Causes
- [Cause 1]
- [Cause 2]

## Solutions

### Solution 1: [Most Common]
1. [Step]
2. [Step]

### Solution 2: [Alternative]
1. [Step]
2. [Step]

## Still Having Issues?
[Escalation path]
```

### Release Notes
```markdown
# Release Notes - v[X.Y.Z]

**Release Date**: [Date]

## New Features
- **[Feature]**: [Benefit] ([Link])

## Improvements
- [Improvement description]

## Bug Fixes
- Fixed [issue] that caused [problem]

## Coming Soon
- [Upcoming feature]
```

## Content Process Checklist

### Planning
- [ ] Define audience and purpose
- [ ] Outline structure
- [ ] Identify information sources

### Research
- [ ] Interview SMEs
- [ ] Test product functionality
- [ ] Review existing docs

### Writing
- [ ] Follow style guide
- [ ] Include examples and visuals
- [ ] Link related resources

### Review
- [ ] Technical accuracy review
- [ ] Editorial clarity review
- [ ] Accessibility check (alt text)

### Publishing
- [ ] Format for platform
- [ ] Add metadata (tags, SEO)
- [ ] Announce to teams

### Maintenance
- [ ] Monitor feedback
- [ ] Update for changes
- [ ] Refresh screenshots quarterly
