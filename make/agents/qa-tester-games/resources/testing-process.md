# Game Testing Process

## Bug Report Format
```
Title: [Short description]
Severity: Critical/Major/Minor/Trivial
Steps to Reproduce:
1. [Step 1]
2. [Step 2]
3. [Step 3]
Expected: [What should happen]
Actual: [What happened]
Build: [Version]
Platform: [PC/Console]
Attachments: [Screenshot/Video]
```

## Severity Levels
- **Critical**: Game-breaking, crashes, data loss
- **Major**: Significant impact, workaround exists
- **Minor**: Low impact, cosmetic
- **Trivial**: Nitpicks, polish

## Testing Types
- **Smoke**: Basic functionality
- **Functional**: Feature verification
- **Regression**: Previously fixed bugs
- **Exploratory**: Free-form discovery
- **Soak**: Long-duration stability

## Checklist: New Feature
- [ ] All requirements implemented
- [ ] Works on all platforms
- [ ] Save/load works with feature
- [ ] No performance regression
- [ ] Audio/visual correct
- [ ] Localization ready

## Certification Focus
- First-time user experience
- Save data handling
- Network disconnection
- Controller switching
- Error messaging
