#!/bin/bash
# Sync version across all cAgents manifest files
# Usage: ./scripts/sync-versions.sh <new-version>
#
# Updates version in all 18 locations (see .claude/rules/core/version-registry.md):
# Location #16: scripts/ci/cagents-ci.sh (header comment + log_section banner)
# Location #17: scripts/ci/validate-agents.sh (# Version: header)
# Location #21: CHANGELOG.md (insert new "## [VERSION] - DATE" header under [Unreleased])
#   .claude-plugin/plugin.json, .claude-plugin/marketplace.json, package.json,
#   CLAUDE.md, .claude/settings.json,
#   6 skill SKILL.md frontmatter versions, session-catchup.cjs context string,
#   and CHANGELOG.md tiny-bump landing zone.
#
# NON-TOUCH POLICY (V11.1.12+ per-agent versioning contract):
#   This script does NOT touch agent `metadata.version` fields under
#   developer/, operator/, advisor/, analyst/, creator/, writer/,
#   strategist/, core/, or leadership/. Per-agent versions bump
#   independently of the cAgents plugin version per Phase 11. The
#   plugin version registry (18 locations above) tracks the cAgents
#   release; agent-level `metadata.version` tracks each agent's own
#   evolution. See `.claude/rules/core/skill-format.md` § metadata.version.

set -euo pipefail

VERSION="${1:?Usage: sync-versions.sh <version>}"

# Validate version format (major.minor.patch)
if ! echo "$VERSION" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$'; then
  echo "Error: Version must be in format major.minor.patch (e.g., 9.0.0)"
  exit 1
fi

# Root directory (script location parent)
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# All manifest files to update
MANIFESTS=(
  "$ROOT/.claude-plugin/plugin.json"
  "$ROOT/.claude-plugin/marketplace.json"
  "$ROOT/package.json"
)

UPDATED=0
FAILED=0

for manifest in "${MANIFESTS[@]}"; do
  if [ ! -f "$manifest" ]; then
    echo "SKIP: $manifest (not found)"
    continue
  fi

  # Use sed to replace version strings in JSON
  # Matches "version": "x.y.z" patterns
  if sed -i "s/\"version\": *\"[0-9]*\.[0-9]*\.[0-9]*\"/\"version\": \"$VERSION\"/g" "$manifest"; then
    rel="${manifest#$ROOT/}"
    echo "  OK: $rel"
    UPDATED=$((UPDATED + 1))
  else
    rel="${manifest#$ROOT/}"
    echo "FAIL: $rel"
    FAILED=$((FAILED + 1))
  fi
done

# Update settings.json CAGENTS_VERSION and $comment version
SETTINGS="$ROOT/.claude/settings.json"
if [ -f "$SETTINGS" ]; then
  if sed -i "s/\"CAGENTS_VERSION\": *\"[0-9]*\.[0-9]*\.[0-9]*\"/\"CAGENTS_VERSION\": \"$VERSION\"/" "$SETTINGS" && \
     sed -i "s/cAgents V[0-9]*\.[0-9]*\.[0-9]*/cAgents V$VERSION/" "$SETTINGS"; then
    echo "  OK: .claude/settings.json"
    UPDATED=$((UPDATED + 1))
  else
    echo "FAIL: .claude/settings.json"
    FAILED=$((FAILED + 1))
  fi
else
  echo "SKIP: .claude/settings.json (not found)"
fi

# Update CLAUDE.md Quick Reference version line
CLAUDEMD="$ROOT/CLAUDE.md"
if [ -f "$CLAUDEMD" ]; then
  if sed -i "s/\*\*Version\*\*: [0-9]*\.[0-9]*\.[0-9]*/\*\*Version\*\*: $VERSION/" "$CLAUDEMD"; then
    echo "  OK: CLAUDE.md"
    UPDATED=$((UPDATED + 1))
  else
    echo "FAIL: CLAUDE.md"
    FAILED=$((FAILED + 1))
  fi
else
  echo "SKIP: CLAUDE.md (not found)"
fi

# Update skill SKILL.md frontmatter versions
SKILLS=(
  "$ROOT/.claude/skills/run/SKILL.md"
  "$ROOT/.claude/skills/org/SKILL.md"
  "$ROOT/.claude/skills/team/SKILL.md"
  "$ROOT/.claude/skills/designer/SKILL.md"
  "$ROOT/.claude/skills/improve/SKILL.md"
  "$ROOT/.claude/skills/helper/SKILL.md"
)

for skill in "${SKILLS[@]}"; do
  if [ ! -f "$skill" ]; then
    echo "SKIP: $skill (not found)"
    continue
  fi

  # Match "  version: x.y.z" or "  version: \"x.y.z\"" in YAML frontmatter (indented, quoted or unquoted)
  if sed -i "s/^  version: \"[0-9]*\.[0-9]*\.[0-9]*\"/  version: \"$VERSION\"/" "$skill" && \
     sed -i "s/^  version: [0-9]*\.[0-9]*\.[0-9]*$/  version: $VERSION/" "$skill"; then
    rel="${skill#$ROOT/}"
    echo "  OK: $rel"
    UPDATED=$((UPDATED + 1))
  else
    rel="${skill#$ROOT/}"
    echo "FAIL: $rel"
    FAILED=$((FAILED + 1))
  fi
done

# Update session-catchup.cjs context string version
CATCHUP="$ROOT/.claude/hooks/session-catchup.cjs"
if [ -f "$CATCHUP" ]; then
  if sed -i "s/cAgents V[0-9]*\.[0-9]*\.[0-9]* session initialized/cAgents V$VERSION session initialized/" "$CATCHUP"; then
    echo "  OK: .claude/hooks/session-catchup.cjs"
    UPDATED=$((UPDATED + 1))
  else
    echo "FAIL: .claude/hooks/session-catchup.cjs"
    FAILED=$((FAILED + 1))
  fi
else
  echo "SKIP: .claude/hooks/session-catchup.cjs (not found)"
fi

# Update cagents-ci.sh header comment + log_section banner (#24)
CAGENTS_CI="$ROOT/scripts/ci/cagents-ci.sh"
if [ -f "$CAGENTS_CI" ]; then
  if sed -i "s/^# Version: [0-9]*\.[0-9]*\.[0-9]*/# Version: $VERSION/" "$CAGENTS_CI" && \
     sed -i "s/cAgents CI Runner v[0-9]*\.[0-9]*\.[0-9]*/cAgents CI Runner v$VERSION/" "$CAGENTS_CI"; then
    echo "  OK: scripts/ci/cagents-ci.sh"
    UPDATED=$((UPDATED + 1))
  else
    echo "FAIL: scripts/ci/cagents-ci.sh"
    FAILED=$((FAILED + 1))
  fi
else
  echo "SKIP: scripts/ci/cagents-ci.sh (not found)"
fi

# Update validate-agents.sh header comment (#25)
VALIDATE_AGENTS="$ROOT/scripts/ci/validate-agents.sh"
if [ -f "$VALIDATE_AGENTS" ]; then
  if sed -i "s/^# Version: [0-9]*\.[0-9]*\.[0-9]*/# Version: $VERSION/" "$VALIDATE_AGENTS"; then
    echo "  OK: scripts/ci/validate-agents.sh"
    UPDATED=$((UPDATED + 1))
  else
    echo "FAIL: scripts/ci/validate-agents.sh"
    FAILED=$((FAILED + 1))
  fi
else
  echo "SKIP: scripts/ci/validate-agents.sh (not found)"
fi

# Update README.md Version History "Current release" line (#19)
README="$ROOT/README.md"
if [ -f "$README" ]; then
  if sed -i "s/\*\*V[0-9]*\.[0-9]*\.[0-9]*\*\* — Current release/\*\*V$VERSION\*\* — Current release/" "$README"; then
    echo "  OK: README.md"
    UPDATED=$((UPDATED + 1))
  else
    echo "FAIL: README.md"
    FAILED=$((FAILED + 1))
  fi
else
  echo "SKIP: README.md (not found)"
fi

# Update docs/README.md **Version**: line (#20)
DOCS_README="$ROOT/docs/README.md"
if [ -f "$DOCS_README" ]; then
  if sed -i "s/\*\*Version\*\*: [0-9]*\.[0-9]*\.[0-9]*/\*\*Version\*\*: $VERSION/" "$DOCS_README"; then
    echo "  OK: docs/README.md"
    UPDATED=$((UPDATED + 1))
  else
    echo "FAIL: docs/README.md"
    FAILED=$((FAILED + 1))
  fi
else
  echo "SKIP: docs/README.md (not found)"
fi

# Update docs/RELEASE_NOTES.md **Current Version**: lines (#20)
RELEASE_NOTES="$ROOT/docs/RELEASE_NOTES.md"
if [ -f "$RELEASE_NOTES" ]; then
  if sed -i "s/\*\*Current Version\*\*: [0-9]*\.[0-9]*\.[0-9]*/\*\*Current Version\*\*: $VERSION/g" "$RELEASE_NOTES"; then
    echo "  OK: docs/RELEASE_NOTES.md"
    UPDATED=$((UPDATED + 1))
  else
    echo "FAIL: docs/RELEASE_NOTES.md"
    FAILED=$((FAILED + 1))
  fi
else
  echo "SKIP: docs/RELEASE_NOTES.md (not found)"
fi

# Update CHANGELOG.md — insert new version header under [Unreleased] (#21)
CHANGELOG="$ROOT/CHANGELOG.md"
if [ -f "$CHANGELOG" ]; then
  # Only insert a new header if one for this version does not already exist.
  if grep -qE "^## \[$VERSION\]" "$CHANGELOG"; then
    echo "  OK: CHANGELOG.md (## [$VERSION] already present)"
    UPDATED=$((UPDATED + 1))
  else
    TODAY="$(date +%Y-%m-%d)"
    # Insert new section after the [Unreleased] header.
    if sed -i "/^## \[Unreleased\]/a\\
\\
## [$VERSION] - $TODAY\\
\\
### Changed\\
- Version bump to $VERSION. See commit message for details." "$CHANGELOG"; then
      echo "  OK: CHANGELOG.md (inserted ## [$VERSION] - $TODAY)"
      UPDATED=$((UPDATED + 1))
    else
      echo "FAIL: CHANGELOG.md"
      FAILED=$((FAILED + 1))
    fi
  fi
else
  echo "SKIP: CHANGELOG.md (not found)"
fi

echo ""
echo "Version sync complete: $UPDATED updated, $FAILED failed"
echo "New version: $VERSION"
