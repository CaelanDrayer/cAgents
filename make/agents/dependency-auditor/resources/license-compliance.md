# License Compliance

## Incompatible Licenses (for proprietary projects)

- GPL, AGPL, LGPL (copyleft)
- Creative Commons Non-Commercial
- Custom restrictive licenses

## Compatible Licenses

- MIT, Apache 2.0, BSD
- ISC, CC0, Unlicense
- Creative Commons Attribution

## License Checking Commands

### npm
```bash
npx license-checker --summary
```

### pip
```bash
pip-licenses
```

## Package Health Metrics

Check via npm, PyPI, RubyGems:
- Last publish date
- Download statistics
- Open issues count
- Maintainer activity
- Security policy presence

## Best Practices

- [ ] Lock file present and up-to-date (package-lock.json, Pipfile.lock)
- [ ] Dev dependencies separated from production
- [ ] Unused dependencies removed
- [ ] Dependency update policy established
- [ ] Security policy configured (Dependabot, Snyk)
- [ ] Regular dependency audits scheduled
