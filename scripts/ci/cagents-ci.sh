#!/bin/bash
#
# cAgents CI Runner
# Self-contained CI script for quality gates
# Version: 12.56.0
#
# Usage:
#   ./scripts/ci/cagents-ci.sh [command]
#
# Commands:
#   validate    - Validate all agents
#   lint        - Lint agent documentation
#   check       - Run quality checks
#   test        - Run Vitest test suite
#   evals       - Run evaluations on recent sessions
#   contract   - (removed in v12.6.0; no-op for back-compat)
#   tiny-bump   - Run tiny-bump guard (BLOCKING as of V10.26.5; set
#                 CAGENTS_TINY_BUMP_BLOCK=0 to fall back to warn-only)
#   counts      - Verify documented counts match disk (warn-only by default)
#   terminal-states - Reject off-enum pipeline_state/phase literals (REC-01, BLOCKING)
#   skill-paths - Reject CWD-relative session-path writes in skill bodies (REC-20, BLOCKING)
#   advisory    - Run advisory validators (F6, WARN-only; never blocks CI)
#   all         - Run all checks
#
# Exit codes:
#   0 - All checks passed
#   1 - Validation errors
#   2 - Linting errors
#   3 - Quality check failures
#   4 - Test failures
#   5 - Contract test failures
#   6 - Tiny-bump guard failure (blocking by default; set
#       CAGENTS_TINY_BUMP_BLOCK=0 for warn-only)
#   7 - Counts-derivation mismatch (blocking only when CAGENTS_COUNTS_BLOCK=1)
#   8 - Terminal-state vocabulary violation (REC-01, blocking)
#   9 - Skill session-path CWD-leak violation (REC-20, blocking)

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
AGENT_MEMORY="$PROJECT_ROOT/cagents-memory"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
ERRORS=0
WARNINGS=0

#
# Logging functions
#
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
    WARNINGS=$((WARNINGS + 1))
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    ERRORS=$((ERRORS + 1))
}

log_section() {
    echo ""
    echo "=================================================="
    echo "$1"
    echo "=================================================="
    echo ""
}

#
# Find all agent directories
#
find_agents() {
    local domain="$1"
    local agents_dir="$PROJECT_ROOT/$domain/agents"

    if [[ -d "$agents_dir" ]]; then
        # Find directories with SKILL.md or .md files
        find "$agents_dir" -type f -name "SKILL.md" -exec dirname {} \; 2>/dev/null
        find "$agents_dir" -maxdepth 1 -type f -name "*.md" 2>/dev/null
    fi
}

#
# Validate agents
#
validate_agents() {
    log_section "AGENT VALIDATION"

    # Delegate to validate-agents.sh which handles all domains with full schema validation.
    # Falls back to basic frontmatter checks if validate-agents.sh is not found.
    if [[ -f "$SCRIPT_DIR/validate-agents.sh" ]]; then
        log_info "Running validate-agents.sh for all domains..."
        if bash "$SCRIPT_DIR/validate-agents.sh" 2>&1; then
            log_info "Agent validation passed"
            return 0
        else
            log_error "Agent validation failed (see output above)"
            return 1
        fi
    fi

    # Fallback: basic frontmatter check when validate-agents.sh is unavailable
    log_warn "validate-agents.sh not found — running basic frontmatter check"
    local total=0
    local passed=0
    local failed=0

    for domain in core shared engineering creative business growth people service leadership science health education personal arts trades; do
        log_info "Checking $domain domain..."
        local domain_dir="$PROJECT_ROOT/$domain/agents"
        if [[ ! -d "$domain_dir" ]]; then
            continue
        fi

        while IFS= read -r agent_path; do
            ((total++))
            if [[ -f "$agent_path/SKILL.md" ]]; then
                if head -1 "$agent_path/SKILL.md" | grep -q "^---"; then
                    ((passed++))
                else
                    log_error "Missing frontmatter: $agent_path/SKILL.md"
                    ((failed++))
                fi
            elif [[ -f "$agent_path" ]] && [[ "$agent_path" == *.md ]]; then
                if head -1 "$agent_path" | grep -q "^---"; then
                    ((passed++))
                else
                    log_error "Missing frontmatter: $agent_path"
                    ((failed++))
                fi
            fi
        done < <(find_agents "$domain")
    done

    log_info "Validation: $passed/$total passed"

    if [[ $failed -gt 0 ]]; then
        return 1
    fi
    return 0
}

#
# Lint agent documentation
#
lint_docs() {
    log_section "DOCUMENTATION LINTING"

    local issues=0

    # Check for TODO/FIXME in production agents
    log_info "Checking for TODO/FIXME in agents..."
    for domain in core shared engineering creative business growth people service leadership science health education personal arts trades; do
        local domain_dir="$PROJECT_ROOT/$domain/agents"
        if [[ -d "$domain_dir" ]]; then
            while IFS= read -r file; do
                if grep -q "TODO\|FIXME" "$file"; then
                    log_warn "TODO/FIXME found in: $file"
                    ((issues++))
                fi
            done < <(find "$domain_dir" -name "*.md" -type f 2>/dev/null)
        fi
    done

    # Check for placeholder text
    log_info "Checking for placeholder text..."
    for domain in core shared engineering creative business growth people service leadership science health education personal arts trades; do
        local domain_dir="$PROJECT_ROOT/$domain/agents"
        if [[ -d "$domain_dir" ]]; then
            while IFS= read -r file; do
                if grep -q "Replace with\|TBD\|\[INSERT\]" "$file"; then
                    log_warn "Placeholder text in: $file"
                    ((issues++))
                fi
            done < <(find "$domain_dir" -name "*.md" -type f 2>/dev/null)
        fi
    done

    # Check for required sections in agents
    log_info "Checking required sections..."
    for domain in core shared engineering creative business growth people service leadership science health education personal arts trades; do
        local domain_dir="$PROJECT_ROOT/$domain/agents"
        if [[ -d "$domain_dir" ]]; then
            while IFS= read -r file; do
                if ! grep -q "^## " "$file"; then
                    log_warn "No sections found in: $file"
                    ((issues++))
                fi
            done < <(find "$domain_dir" -name "*.md" -type f 2>/dev/null)
        fi
    done

    log_info "Linting complete: $issues warnings"
    return 0
}

#
# Run quality checks
#
quality_checks() {
    log_section "QUALITY CHECKS"

    local checks_passed=0
    local checks_total=0

    # Check 1: Plugin manifests are valid JSON
    log_info "Checking plugin manifests..."
    ((checks_total++))
    for manifest in $(find "$PROJECT_ROOT" -name "plugin.json" -type f 2>/dev/null); do
        if ! node -e "JSON.parse(require('fs').readFileSync('$manifest', 'utf8'))" 2>/dev/null; then
            log_error "Invalid JSON: $manifest"
        else
            ((checks_passed++))
        fi
    done

    # Check 2: marketplace.json exists and is valid
    log_info "Checking marketplace.json..."
    ((checks_total++))
    if [[ -f "$PROJECT_ROOT/.claude-plugin/marketplace.json" ]]; then
        if node -e "JSON.parse(require('fs').readFileSync('$PROJECT_ROOT/.claude-plugin/marketplace.json', 'utf8'))" 2>/dev/null; then
            ((checks_passed++))
        else
            log_error "Invalid marketplace.json"
        fi
    else
        log_error "Missing marketplace.json"
    fi

    # Check 3: CJS hooks are valid (V9.5+: CJS-only hooks in .claude/hooks/)
    log_info "Checking CJS hooks..."
    ((checks_total++))
    local hooks_valid=true
    for hook in $(find "$PROJECT_ROOT/.claude/hooks" -name "*.cjs" -type f 2>/dev/null); do
        if ! node --check "$hook" 2>/dev/null; then
            log_error "Invalid CJS hook: $hook"
            hooks_valid=false
        fi
    done
    if $hooks_valid; then
        ((checks_passed++))
    fi

    # Check 4: Required directories exist
    log_info "Checking directory structure..."
    ((checks_total++))
    local dirs_ok=true
    for dir in "agents" "agents/core" "agents/developer" "agents/operator" "agents/advisor" "agents/analyst" "agents/creator" "agents/writer" "agents/strategist" "agents/leadership" "agents/_overlay/people" "agents/_overlay/shared" ".claude/hooks" ".claude/rules"; do
        if [[ ! -d "$PROJECT_ROOT/$dir" ]]; then
            log_error "Missing directory: $dir"
            dirs_ok=false
        fi
    done
    if $dirs_ok; then
        ((checks_passed++))
    fi

    # Check 5: CLAUDE.md exists
    log_info "Checking CLAUDE.md..."
    ((checks_total++))
    if [[ -f "$PROJECT_ROOT/CLAUDE.md" ]]; then
        ((checks_passed++))
    else
        log_error "Missing CLAUDE.md"
    fi

    log_info "Quality checks: $checks_passed/$checks_total passed"

    if [[ $checks_passed -lt $checks_total ]]; then
        return 3
    fi
    return 0
}

#
# Run evaluations on recent sessions
#
run_evals() {
    log_section "SESSION EVALUATIONS"

    local sessions_dir="$AGENT_MEMORY/sessions"

    if [[ ! -d "$sessions_dir" ]]; then
        log_info "No sessions directory found"
        return 0
    fi

    # Find recent sessions (last 5)
    local sessions=$(ls -1t "$sessions_dir" 2>/dev/null | head -5)

    if [[ -z "$sessions" ]]; then
        log_info "No sessions to evaluate"
        return 0
    fi

    local eval_runner="$PROJECT_ROOT/scripts/eval-runner.cjs"
    if [[ ! -f "$eval_runner" ]]; then
        log_warn "Eval runner not found, skipping evaluations"
        return 0
    fi

    for session in $sessions; do
        log_info "Evaluating: $session"
        node "$eval_runner" --session "$session" 2>&1 || true
    done

    return 0
}

#
# Contract tests removed in v12.6.0 (Pillar 4)
#
# The external-UI schema contract was dropped. tests/contract.test.js,
# scripts/ci/fetch-schemas.sh, and the `contract` CI subcommand were removed.
# Session YAML is now an internal-only contract; see
# .claude/skills/run/reference/session-schema.md.
#
run_contract_tests() {
    log_warn "Contract tests removed in v12.6.0 — skipping (no-op)"
    return 0
}

#
# Run Vitest tests
#
run_tests() {
    log_section "VITEST TESTS"

    if [[ ! -f "$PROJECT_ROOT/package.json" ]]; then
        log_warn "No package.json found, skipping tests"
        return 0
    fi

    # Check if vitest is available
    if ! command -v npx &> /dev/null; then
        log_warn "npx not available, skipping tests"
        return 0
    fi

    log_info "Running Vitest test suite..."
    if cd "$PROJECT_ROOT" && npx vitest run --config tests/vitest.config.js --reporter=verbose 2>&1; then
        log_info "All tests passed"
        return 0
    else
        log_error "Test suite failed"
        return 4
    fi
}

#
# Tiny-bump guard (added in V10.26.3, warn-only)
#
# Validates on any version change that:
#   (1) CHANGELOG.md has a new entry matching the new version
#   (2) all 16 registry locations agree on the new version
#   (3) for PATCH-level bumps only, the non-sync diff (files outside the 16
#       registry targets) is <= 5 files. MINOR and MAJOR bumps are EXEMPT from
#       this file-count cap (they still require checks (1) and (2)).
#
# V10.26.3 shipped warn-only; V10.26.5 flips the default to blocking.
# Set CAGENTS_TINY_BUMP_BLOCK=0 to opt back into warn-only mode (useful for
# local experiments where CHANGELOG entries haven't been written yet).
#
check_tiny_bump() {
    log_section "TINY-BUMP GUARD"

    local block_mode="${CAGENTS_TINY_BUMP_BLOCK:-1}"
    local violation=0

    # Resolve old and new version. Prefer env overrides (set by tests),
    # otherwise read package.json at HEAD vs HEAD~1.
    local new_version old_version
    new_version="${CAGENTS_TINY_BUMP_NEW:-}"
    old_version="${CAGENTS_TINY_BUMP_OLD:-}"

    if [[ -z "$new_version" ]]; then
        new_version="$(grep -E '^\s*"version":' "$PROJECT_ROOT/package.json" \
            | head -1 | sed -E 's/.*"([0-9]+\.[0-9]+\.[0-9]+)".*/\1/')"
    fi
    if [[ -z "$old_version" ]]; then
        old_version="$(git -C "$PROJECT_ROOT" show HEAD~1:package.json 2>/dev/null \
            | grep -E '^\s*"version":' | head -1 \
            | sed -E 's/.*"([0-9]+\.[0-9]+\.[0-9]+)".*/\1/')"
    fi

    if [[ -z "$new_version" ]]; then
        log_warn "check_tiny_bump: could not parse current version; skipping"
        return 0
    fi

    if [[ -z "$old_version" ]] || [[ "$old_version" == "$new_version" ]]; then
        log_info "check_tiny_bump: no version change (current=$new_version); skipping"
        return 0
    fi

    log_info "check_tiny_bump: $old_version -> $new_version"

    # (1) CHANGELOG.md must have an entry for the new version.
    local changelog="$PROJECT_ROOT/CHANGELOG.md"
    if [[ ! -f "$changelog" ]]; then
        log_warn "check_tiny_bump: CHANGELOG.md missing"
        violation=1
    elif ! grep -qE "^## \[$new_version\]" "$changelog"; then
        log_warn "check_tiny_bump: CHANGELOG.md has no entry for [$new_version]"
        violation=1
    else
        log_info "check_tiny_bump: CHANGELOG entry for [$new_version] present"
    fi

    # (2) Registry-location agreement.
    local bad_locations=0
    for f in "$PROJECT_ROOT/package.json" \
             "$PROJECT_ROOT/.claude-plugin/plugin.json" \
             "$PROJECT_ROOT/.claude-plugin/marketplace.json"; do
        if [[ -f "$f" ]] && ! grep -qE "\"version\"\s*:\s*\"$new_version\"" "$f"; then
            log_warn "check_tiny_bump: $f does not report version $new_version"
            bad_locations=$((bad_locations + 1))
        fi
    done
    if [[ -f "$PROJECT_ROOT/CLAUDE.md" ]] \
       && ! grep -qE "^\*\*Version\*\*: $new_version" "$PROJECT_ROOT/CLAUDE.md"; then
        log_warn "check_tiny_bump: CLAUDE.md does not report version $new_version"
        bad_locations=$((bad_locations + 1))
    fi
    if [[ $bad_locations -gt 0 ]]; then
        violation=1
    else
        log_info "check_tiny_bump: sampled registry locations agree on $new_version"
    fi

    # (3) Non-sync diff size: files changed on HEAD outside the 16 sync targets.
    # The 16 registry files (canonical list: .claude/rules/core/version-registry.md)
    # are auto-updated by sync-versions.sh; a tiny bump should touch <= 5 files
    # beyond those. NOTE: /org (removed v12.2.0) and /improve (folded into /run
    # v12.1.2) SKILL.md targets were dropped here — those files no longer exist.
    local sync_targets=(
        "package.json"
        ".claude-plugin/plugin.json"
        ".claude-plugin/marketplace.json"
        "CLAUDE.md"
        ".claude/settings.json"
        ".claude/skills/run/SKILL.md"
        ".claude/skills/team/SKILL.md"
        ".claude/skills/designer/SKILL.md"
        ".claude/skills/helper/SKILL.md"
        ".claude/hooks/session-catchup.cjs"
        "scripts/ci/cagents-ci.sh"
        "scripts/ci/validate-agents.sh"
        "README.md"
        "docs/README.md"
        "docs/RELEASE_NOTES.md"
        "CHANGELOG.md"
    )

    # The ≤5-non-sync-file cap applies ONLY to PATCH-level (tiny) bumps.
    # A "tiny bump" is by definition a patch increment (x.y.Z+1) that ships one
    # coherent change (see .claude/rules/core/version-registry.md § Tiny-Bump
    # Cadence). MINOR bumps (x.Y+1.0) legitimately land audit/consolidation work
    # touching dozens of files, and MAJOR bumps (X+1.0.0) land V11.0-scale
    # removals as a single large commit — so BOTH minor and major bumps are
    # EXEMPT from the non-sync-diff size check. Checks (1) CHANGELOG and
    # (2) registry agreement still apply to every bump regardless of level.
    # A bump is patch-level iff the major AND minor components are unchanged.
    local old_major new_major old_minor new_minor is_patch_bump=0
    old_major="${old_version%%.*}"
    new_major="${new_version%%.*}"
    old_minor="${old_version#*.}"; old_minor="${old_minor%%.*}"
    new_minor="${new_version#*.}"; new_minor="${new_minor%%.*}"
    if [[ "$old_major" == "$new_major" ]] && [[ "$old_minor" == "$new_minor" ]]; then
        is_patch_bump=1
    else
        log_info "check_tiny_bump: minor/major bump ($old_version -> $new_version) detected; skipping non-sync diff size check (≤5-file cap applies to patch bumps only)"
    fi

    if [[ $is_patch_bump -eq 1 ]]; then
        local non_sync_count=0
        # Test seam: CAGENTS_TINY_BUMP_NONSYNC overrides the computed non-sync
        # file count (mirrors the CAGENTS_TINY_BUMP_NEW/OLD version overrides
        # above). Unset in production, where the count is derived from the
        # HEAD~1..HEAD diff.
        if [[ -n "${CAGENTS_TINY_BUMP_NONSYNC:-}" ]]; then
            non_sync_count="${CAGENTS_TINY_BUMP_NONSYNC}"
        else
            local changed_files
            changed_files="$(git -C "$PROJECT_ROOT" diff --name-only HEAD~1..HEAD 2>/dev/null || true)"
            while IFS= read -r f; do
                [[ -z "$f" ]] && continue
                local is_sync=0
                for t in "${sync_targets[@]}"; do
                    if [[ "$f" == "$t" ]]; then is_sync=1; break; fi
                done
                if [[ $is_sync -eq 0 ]]; then
                    non_sync_count=$((non_sync_count + 1))
                fi
            done <<< "$changed_files"
        fi

        if [[ $non_sync_count -gt 5 ]]; then
            log_warn "check_tiny_bump: patch-bump non-sync diff touches $non_sync_count files (>5)"
            violation=1
        else
            log_info "check_tiny_bump: patch-bump non-sync diff touches $non_sync_count files (<=5)"
        fi
    fi

    if [[ $violation -eq 0 ]]; then
        log_info "check_tiny_bump: all criteria satisfied"
        return 0
    fi

    if [[ "$block_mode" == "1" ]]; then
        log_error "check_tiny_bump: violations above; blocking (CAGENTS_TINY_BUMP_BLOCK=1)"
        return 6
    else
        log_warn "check_tiny_bump: violations above (warn-only)"
        return 0
    fi
}

# check_counts: Run scripts/ci/validate-counts.sh to verify documented counts
# (agents, hooks, archetypes, registry slots) match what is derived from disk.
# Warn-only by default during the v12.7.0 stabilization window — set
# CAGENTS_COUNTS_BLOCK=1 to make this stage blocking.
check_counts() {
    log_section "Counts-Derivation Check (P1-5)"

    local script="$PROJECT_ROOT/scripts/ci/validate-counts.sh"
    if [[ ! -x "$script" ]]; then
        log_warn "check_counts: $script not executable; skipping"
        return 0
    fi

    if bash "$script" >/tmp/validate-counts.out 2>&1; then
        log_info "check_counts: doc counts match disk-derived counts"
        return 0
    fi

    cat /tmp/validate-counts.out
    if [[ "${CAGENTS_COUNTS_BLOCK:-0}" = "1" ]]; then
        log_error "check_counts: doc-vs-disk mismatch (blocking)"
        return 7
    else
        log_warn "check_counts: doc-vs-disk mismatch (warn-only — set CAGENTS_COUNTS_BLOCK=1 to block)"
        return 0
    fi
}

#
# check_terminal_states (REC-01): Run scripts/ci/validate-terminal-states.cjs to
# reject off-enum / non-canonical `pipeline_state:` / `phase:` literals in shipped
# skills and config. BLOCKING — the canonical terminal vocabulary must not drift.
#
check_terminal_states() {
    log_section "Terminal-State Vocabulary Check (REC-01)"

    local script="$PROJECT_ROOT/scripts/ci/validate-terminal-states.cjs"
    if [[ ! -f "$script" ]]; then
        log_warn "check_terminal_states: $script not found; skipping"
        return 0
    fi
    if ! command -v node &> /dev/null; then
        log_warn "check_terminal_states: node not available; skipping"
        return 0
    fi

    if node "$script" 2>&1; then
        log_info "check_terminal_states: shipped state literals are canonical"
        return 0
    fi

    log_error "check_terminal_states: off-enum pipeline_state/phase literal(s) found (blocking)"
    return 8
}

#
# Skill session-path CWD-leak guard (REC-20, BLOCKING)
#
# Fails if a shipped skill body reintroduces a CWD-relative session-path write
# (relative `cagents-memory/…` mkdir/redirect/SESSION_DIR=) or an npm-into-
# session/scratch footgun. Both nest a stray tree under a session dir when a
# nested /run or /team teammate has a drifted cwd. Session writes must anchor on
# an absolute "$MEM" ($CAGENTS_ROOT/cagents-memory).
#
check_skill_paths() {
    log_section "Skill Session-Path Guard (REC-20)"

    local script="$PROJECT_ROOT/scripts/ci/check-skill-session-paths.cjs"
    if [[ ! -f "$script" ]]; then
        log_warn "check_skill_paths: $script not found; skipping"
        return 0
    fi
    if ! command -v node &> /dev/null; then
        log_warn "check_skill_paths: node not available; skipping"
        return 0
    fi

    if node "$script" 2>&1; then
        log_info "check_skill_paths: skill bodies anchor session writes on \$MEM"
        return 0
    fi

    log_error "check_skill_paths: CWD-relative session-path write in a skill body (blocking)"
    return 9
}

#
# Advisory validators (F6, WARN-only)
#
# Runs scripts/ci/run-advisory.cjs, the driver that F1-F4 advisory validators
# plug into. This stage is ADVISORY: the runner always exits 0 and its result
# NEVER flips the overall CI pass/fail. Findings are surfaced for visibility
# only, and baseline-suppressed findings (scripts/ci/validator-baseline.yaml)
# are dropped before display.
#
check_advisory() {
    log_section "ADVISORY VALIDATORS (WARN-only)"

    local runner="$PROJECT_ROOT/scripts/ci/run-advisory.cjs"
    if [[ ! -f "$runner" ]]; then
        log_warn "check_advisory: run-advisory.cjs not found; skipping"
        return 0
    fi

    if ! command -v node &> /dev/null; then
        log_warn "check_advisory: node not available; skipping"
        return 0
    fi

    # WARN-only: the runner always exits 0, but guard with `|| true` so `set -e`
    # can never let this stage abort or fail the CI run.
    node "$runner" 2>&1 || true
    log_info "check_advisory: advisory validators ran (WARN-only, non-blocking)"
    return 0
}

#
# Main execution
#
main() {
    local command="${1:-all}"
    local exit_code=0

    log_section "cAgents CI Runner v12.56.0"
    log_info "Project root: $PROJECT_ROOT"
    log_info "Command: $command"

    case "$command" in
        validate)
            validate_agents || exit_code=1
            ;;
        lint)
            lint_docs || exit_code=2
            ;;
        check)
            quality_checks || exit_code=3
            ;;
        evals)
            run_evals || exit_code=0
            ;;
        test)
            run_tests || exit_code=4
            ;;
        contract)
            run_contract_tests || exit_code=5
            ;;
        tiny-bump)
            check_tiny_bump || exit_code=6
            ;;
        counts)
            check_counts || exit_code=7
            ;;
        terminal-states)
            check_terminal_states || exit_code=8
            ;;
        skill-paths)
            check_skill_paths || exit_code=9
            ;;
        advisory)
            # WARN-only stage: check_advisory always returns 0, so it can never
            # set a non-zero exit_code.
            check_advisory
            ;;
        all)
            validate_agents || exit_code=1
            lint_docs || exit_code=$((exit_code > 0 ? exit_code : 2))
            quality_checks || exit_code=$((exit_code > 0 ? exit_code : 3))
            run_tests || exit_code=$((exit_code > 0 ? exit_code : 4))
            run_contract_tests || exit_code=$((exit_code > 0 ? exit_code : 5))
            check_tiny_bump || exit_code=$((exit_code > 0 ? exit_code : 6))
            check_counts || exit_code=$((exit_code > 0 ? exit_code : 7))
            check_terminal_states || exit_code=$((exit_code > 0 ? exit_code : 8))
            check_skill_paths || exit_code=$((exit_code > 0 ? exit_code : 9))
            # Advisory validators run LAST as a non-blocking stage — this call
            # never flips exit_code (check_advisory always returns 0).
            check_advisory
            ;;
        *)
            echo "Unknown command: $command"
            echo "Usage: $0 [validate|lint|check|contract|evals|test|tiny-bump|counts|terminal-states|skill-paths|advisory|all]"
            exit 1
            ;;
    esac

    log_section "SUMMARY"
    log_info "Errors: $ERRORS"
    log_info "Warnings: $WARNINGS"

    if [[ $exit_code -eq 0 ]] && [[ $ERRORS -eq 0 ]]; then
        log_info "All checks passed!"
    else
        log_error "CI failed with exit code $exit_code"
    fi

    exit $exit_code
}

main "$@"
