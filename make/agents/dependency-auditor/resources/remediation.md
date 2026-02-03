# Automated Remediation

## Update Safety Levels

1. **Patch updates**: Always safe, auto-apply
2. **Minor updates**: Usually safe, review changelog
3. **Major updates**: Requires manual review and testing
4. **CVE fixes**: Apply immediately, test thoroughly

## Update Commands

### npm (Node.js)
```bash
# Audit vulnerabilities
npm audit
npm audit fix

# Check outdated
npm outdated

# Update specific package
npm update package-name
```

### pip (Python)
```bash
# Audit vulnerabilities
pip-audit

# Check outdated
pip list --outdated

# Update package
pip install --upgrade package-name
```

### bundler (Ruby)
```bash
# Audit vulnerabilities
bundle-audit check
bundle-audit update

# Check outdated
bundle outdated

# Update package
bundle update package-name
```

### cargo (Rust)
```bash
# Audit vulnerabilities
cargo audit

# Check outdated
cargo outdated

# Update package
cargo update package-name
```
