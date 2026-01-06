#!/bin/sh
# cAgents Agent_Memory Initialization Script
# Part of @cagents/core
# Version: 4.0.0
#
# This script initializes the Agent_Memory folder structure at the project root.
# It is designed to:
# - Create the base memory structure if missing
# - Detect existing Agent_Memory and preserve all data
# - Support multi-domain operation with domain registration
# - Be idempotent (safe to run multiple times)
#
# Usage:
#   sh init-memory.sh [--dry-run] [--upgrade]
#
# Options:
#   --dry-run   Show what would be done without making changes
#   --upgrade   Force upgrade to 4.0 structure even if already initialized

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
MEMORY_DIR="$PROJECT_ROOT/Agent_Memory"
VERSION="4.0.0"

# Parse arguments
DRY_RUN=false
FORCE_UPGRADE=false
for arg in "$@"; do
    case "$arg" in
        --dry-run) DRY_RUN=true ;;
        --upgrade) FORCE_UPGRADE=true ;;
        -h|--help)
            echo "Usage: sh init-memory.sh [--dry-run] [--upgrade]"
            echo ""
            echo "Options:"
            echo "  --dry-run   Show what would be done without making changes"
            echo "  --upgrade   Force upgrade to 4.0 structure"
            exit 0
            ;;
    esac
done

# Logging functions
log_info() {
    echo "[INFO] $1"
}

log_action() {
    if [ "$DRY_RUN" = true ]; then
        echo "[DRY-RUN] Would: $1"
    else
        echo "[ACTION] $1"
    fi
}

log_skip() {
    echo "[SKIP] $1 (already exists)"
}

# Create directory helper
create_dir() {
    local dir="$1"
    if [ ! -d "$dir" ]; then
        log_action "Create directory: $dir"
        if [ "$DRY_RUN" = false ]; then
            mkdir -p "$dir"
        fi
    else
        log_skip "$dir"
    fi
}

# Create file helper
create_file() {
    local file="$1"
    local content="$2"
    if [ ! -f "$file" ]; then
        log_action "Create file: $file"
        if [ "$DRY_RUN" = false ]; then
            echo "$content" > "$file"
        fi
    else
        log_skip "$file"
    fi
}

# Check if multi-domain version
is_multi_domain() {
    [ -f "$MEMORY_DIR/_system/domains.yaml" ]
}

# Main initialization
log_info "cAgents Agent_Memory Initialization v$VERSION"
log_info "Project root: $PROJECT_ROOT"
log_info "Memory directory: $MEMORY_DIR"
echo ""

# Detect existing installation
if [ -d "$MEMORY_DIR" ]; then
    if is_multi_domain; then
        log_info "Existing multi-domain Agent_Memory detected (v4.0+)"
        if [ "$FORCE_UPGRADE" = false ]; then
            log_info "No changes needed. Use --upgrade to force refresh."
            exit 0
        fi
    else
        log_info "Existing pre-4.0 Agent_Memory detected. Upgrading..."
    fi
else
    log_info "No Agent_Memory found. Creating fresh installation..."
fi

echo ""
log_info "Creating base directory structure..."

# Core directories
create_dir "$MEMORY_DIR"
create_dir "$MEMORY_DIR/_system"
create_dir "$MEMORY_DIR/_archive"
create_dir "$MEMORY_DIR/_knowledge"
create_dir "$MEMORY_DIR/_knowledge/semantic"
create_dir "$MEMORY_DIR/_knowledge/procedural"
create_dir "$MEMORY_DIR/_knowledge/calibration"
create_dir "$MEMORY_DIR/_communication"
create_dir "$MEMORY_DIR/_communication/inbox"
create_dir "$MEMORY_DIR/_communication/broadcast"

echo ""
log_info "Creating core agent inboxes..."

# Core agent inboxes
for agent in trigger orchestrator hitl; do
    create_dir "$MEMORY_DIR/_communication/inbox/$agent"
done

echo ""
log_info "Creating software domain agent inboxes..."

# Software domain agent inboxes (create all to support the domain)
WORKFLOW_AGENTS="router planner executor validator self-correct"
INTEL_AGENTS="pattern-recognition risk-assessment dependency-analyzer learning-coordinator predictive-analyst"
QA_AGENTS="architecture-reviewer code-standards-auditor security-analyst qa-compliance-officer performance-analyzer test-coverage-validator documentation-reviewer dependency-auditor accessibility-checker"
EXEC_AGENTS="ceo cto cfo coo vp-engineering"
TEAM_AGENTS="product-owner stakeholder-rep finance-manager compliance tech-lead sysadmin devops it-support architect senior-developer dba data-analyst ux-designer qa-lead security-specialist frontend-developer backend-developer scribe reviewer"

for agent in $WORKFLOW_AGENTS $INTEL_AGENTS $QA_AGENTS $EXEC_AGENTS $TEAM_AGENTS; do
    create_dir "$MEMORY_DIR/_communication/inbox/$agent"
done

echo ""
log_info "Creating system configuration files..."

# Create domains.yaml for multi-domain tracking
DOMAINS_CONTENT="# Multi-Domain Registry
# Tracks which cAgents domains are installed
# Created by init-memory.sh v$VERSION

domains:
  core:
    registered_at: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
    version: \"$VERSION\"
    agents:
      - trigger
      - orchestrator
      - hitl

  software:
    registered_at: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
    version: \"$VERSION\"
    agents:
      - router
      - planner
      - executor
      - validator
      - self-correct
      - architect
      - senior-developer
      - frontend-developer
      - backend-developer
      - qa-lead
      - security-specialist
      - tech-lead
      - product-owner
      - stakeholder-rep
      - finance-manager
      - compliance
      - sysadmin
      - devops
      - it-support
      - dba
      - data-analyst
      - ux-designer
      - scribe
      - reviewer

# Future domains will be registered here when installed:
# creative:
#   registered_at: ...
#   version: ...
#   agents: [...]
"

if [ ! -f "$MEMORY_DIR/_system/domains.yaml" ] || [ "$FORCE_UPGRADE" = true ]; then
    log_action "Create file: $MEMORY_DIR/_system/domains.yaml"
    if [ "$DRY_RUN" = false ]; then
        echo "$DOMAINS_CONTENT" > "$MEMORY_DIR/_system/domains.yaml"
    fi
else
    log_skip "$MEMORY_DIR/_system/domains.yaml"
fi

# Create config.yaml if missing
CONFIG_CONTENT="# Agent Memory System Configuration
# cAgents v$VERSION - Multi-Domain Support

config:
  version: \"$VERSION\"
  name: \"cAgents Multi-Domain System\"

  # Multi-domain configuration
  domains:
    active:
      - core
      - software

    routing:
      strategy: hybrid  # direct for clear requests, vote for ambiguous
      vote_threshold: 0.7

  # Memory settings
  memory:
    base_path: \"Agent_Memory\"
    archive_after_days: 30
    prune_low_confidence_after_days: 90
    low_confidence_threshold: 0.3

  # Communication settings
  communication:
    inbox_poll_interval: \"1s\"
    message_timeout: \"5m\"
    broadcast_read_timeout: \"1h\"
    max_escalation_levels: 4

  # Collaboration settings
  collaboration:
    consultation_timeout: \"5m\"
    review_timeout: \"15m\"
    delegation_acknowledgement_timeout: \"2m\"

  # Validation settings
  validation:
    require_tests: true
    min_coverage_threshold: 80
    require_security_review_for:
      - \"auth\"
      - \"password\"
      - \"token\"
      - \"credential\"
      - \"secret\"

  # Complexity tiers
  tiers:
    0:
      name: \"trivial\"
      approach: \"direct_answer\"
    1:
      name: \"simple\"
      approach: \"execute_validate\"
    2:
      name: \"moderate\"
      approach: \"plan_execute_validate\"
    3:
      name: \"complex\"
      approach: \"parallel_execution\"
    4:
      name: \"expert\"
      approach: \"full_orchestration_hitl\"

  # Learning settings
  learning:
    enabled: true
    calibration_update_frequency: \"on_instruction_complete\"
    min_samples_for_confidence: 5
    confidence_decay_rate: 0.1

  # Observability
  observability:
    log_all_decisions: true
    log_all_communication: true
    metrics_aggregation_frequency: \"hourly\"
    event_retention_days: 90
"

if [ ! -f "$MEMORY_DIR/_system/config.yaml" ]; then
    log_action "Create file: $MEMORY_DIR/_system/config.yaml"
    if [ "$DRY_RUN" = false ]; then
        echo "$CONFIG_CONTENT" > "$MEMORY_DIR/_system/config.yaml"
    fi
else
    log_skip "$MEMORY_DIR/_system/config.yaml"
fi

# Create agent_status.yaml if missing
STATUS_CONTENT="# Agent Status Tracking
# Updated by each agent when state changes

status:
  last_updated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
  initialized_by: \"init-memory.sh v$VERSION\"

  agents:
    # Core agents
    trigger:
      status: available
      last_active: null

    orchestrator:
      status: available
      last_active: null

    hitl:
      status: available
      last_active: null

    # Software domain agents initialized as available
    # Status will be updated by agents during operation
"

if [ ! -f "$MEMORY_DIR/_system/agent_status.yaml" ]; then
    log_action "Create file: $MEMORY_DIR/_system/agent_status.yaml"
    if [ "$DRY_RUN" = false ]; then
        echo "$STATUS_CONTENT" > "$MEMORY_DIR/_system/agent_status.yaml"
    fi
else
    log_skip "$MEMORY_DIR/_system/agent_status.yaml"
fi

# Create knowledge README files
SEMANTIC_README="# Semantic Knowledge

This folder contains facts about the project:
- conventions.yaml - Coding conventions and standards
- entities.yaml - Known project entities
- domain.yaml - Domain-specific knowledge

Files are prefixed by domain:
- software_conventions.yaml
- creative_style_guides.yaml (future)
"

PROCEDURAL_README="# Procedural Knowledge

This folder contains how-to patterns:
- patterns.yaml - Design and implementation patterns
- strategies.yaml - Recovery and optimization strategies
- tool_recipes.yaml - Tool usage examples

Files are prefixed by domain:
- software_patterns.yaml
- creative_workflows.yaml (future)
"

CALIBRATION_README="# Calibration Data

This folder contains learning data:
- routing.yaml - Router classification accuracy
- strategies.yaml - Recovery strategy effectiveness

Files are prefixed by domain:
- software_routing.yaml
- creative_routing.yaml (future)

Each domain has isolated calibration data to prevent
cross-domain learning contamination.
"

create_file "$MEMORY_DIR/_knowledge/semantic/README.md" "$SEMANTIC_README"
create_file "$MEMORY_DIR/_knowledge/procedural/README.md" "$PROCEDURAL_README"
create_file "$MEMORY_DIR/_knowledge/calibration/README.md" "$CALIBRATION_README"

# Create .gitkeep files to preserve empty directories
for dir in "$MEMORY_DIR/_archive" "$MEMORY_DIR/_knowledge/calibration"; do
    if [ ! -f "$dir/.gitkeep" ]; then
        log_action "Create file: $dir/.gitkeep"
        if [ "$DRY_RUN" = false ]; then
            touch "$dir/.gitkeep"
        fi
    fi
done

echo ""
log_info "Agent_Memory initialization complete!"
echo ""

if [ "$DRY_RUN" = true ]; then
    echo "This was a dry run. No changes were made."
    echo "Run without --dry-run to apply changes."
else
    echo "Agent_Memory is ready at: $MEMORY_DIR"
    echo ""
    echo "Structure created:"
    echo "  _system/          - Registry, config, agent status"
    echo "  _archive/         - Completed instructions"
    echo "  _knowledge/       - Semantic, procedural, calibration data"
    echo "  _communication/   - Agent inboxes and broadcast"
    echo ""
    echo "Domains registered: core, software"
    echo "Agent inboxes created for all 46+ agents"
fi
