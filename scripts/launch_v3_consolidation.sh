#!/bin/bash

# V3 Consolidation Workflow Launcher
# Executes the complete V3 consolidation plan using cAgents workflow system

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "=== cAgents V3 Consolidation Launcher ==="
echo ""

# Check if we're in the right directory
if [ ! -f "$PROJECT_ROOT/V3_EXECUTABLE_WORKFLOW_PLAN.md" ]; then
  echo "❌ Error: V3_EXECUTABLE_WORKFLOW_PLAN.md not found"
  echo "   Please run from cAgents project root"
  exit 1
fi

# Parse command line options
MODE="${1:-full}"
PHASE="${2:-all}"

case "$MODE" in
  full)
    echo "Mode: Full automated execution (all phases)"
    WORKFLOW_REQUEST="Execute complete V3 consolidation from V3_EXECUTABLE_WORKFLOW_PLAN.md - all 5 phases with validation checkpoints"
    ;;

  phase)
    if [ "$PHASE" == "all" ]; then
      echo "❌ Error: Please specify phase number (1-5)"
      echo "   Usage: $0 phase <1-5>"
      exit 1
    fi
    echo "Mode: Single phase execution - Phase $PHASE"
    WORKFLOW_REQUEST="Execute Phase $PHASE of V3 consolidation from V3_EXECUTABLE_WORKFLOW_PLAN.md"
    ;;

  task)
    if [ -z "$PHASE" ]; then
      echo "❌ Error: Please specify task ID"
      echo "   Usage: $0 task <task_id>"
      exit 1
    fi
    echo "Mode: Single task execution - Task $PHASE"
    WORKFLOW_REQUEST="Execute task $PHASE from V3_EXECUTABLE_WORKFLOW_PLAN.md"
    ;;

  status)
    echo "Mode: Check consolidation status"
    if [ -f "$PROJECT_ROOT/Agent_Memory/v3_consolidation/progress.yaml" ]; then
      echo ""
      echo "=== Current Progress ==="
      cat "$PROJECT_ROOT/Agent_Memory/v3_consolidation/progress.yaml"
    else
      echo ""
      echo "No consolidation in progress"
    fi
    exit 0
    ;;

  *)
    echo "❌ Error: Unknown mode '$MODE'"
    echo ""
    echo "Usage: $0 <mode> [options]"
    echo ""
    echo "Modes:"
    echo "  full              - Execute all 5 phases with validation"
    echo "  phase <1-5>       - Execute single phase"
    echo "  task <task_id>    - Execute single task"
    echo "  status            - Check current progress"
    echo ""
    echo "Examples:"
    echo "  $0 full"
    echo "  $0 phase 1"
    echo "  $0 task cleanup_001"
    echo "  $0 status"
    exit 1
    ;;
esac

echo ""
echo "=== Workflow Request ==="
echo "$WORKFLOW_REQUEST"
echo ""

# Confirm before proceeding
if [ "$MODE" == "full" ]; then
  echo "⚠️  WARNING: This will execute the complete V3 consolidation"
  echo "   - 71 tasks across 5 phases"
  echo "   - Estimated duration: 4-5 weeks"
  echo "   - Will modify 228+ agent files"
  echo "   - Multiple validation checkpoints"
  echo ""
  read -p "Continue? (yes/no): " confirm

  if [ "$confirm" != "yes" ]; then
    echo "Cancelled"
    exit 0
  fi
fi

echo ""
echo "=== Creating Workflow ==="

# Create instruction folder
INSTRUCTION_ID="v3_consolidation_$(date +%Y%m%d_%H%M%S)"
INSTRUCTION_DIR="$PROJECT_ROOT/Agent_Memory/$INSTRUCTION_ID"

mkdir -p "$INSTRUCTION_DIR"/{workflow,tasks/{pending,in_progress,completed,blocked},outputs/{partial,final},decisions,reviews,episodic}

# Create instruction.yaml
cat > "$INSTRUCTION_DIR/instruction.yaml" <<EOF
instruction_id: $INSTRUCTION_ID
created: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
domain: software
tier: 4
intent: refactor
request: |
  $WORKFLOW_REQUEST

metadata:
  workflow_plan: V3_EXECUTABLE_WORKFLOW_PLAN.md
  total_tasks: 71
  total_phases: 5
  mode: $MODE
  phase: $PHASE
EOF

# Create status.yaml
cat > "$INSTRUCTION_DIR/status.yaml" <<EOF
instruction_id: $INSTRUCTION_ID
domain: software
tier: 4
current_phase: routing
workflow_status: pending
created: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
updated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
EOF

echo "✅ Instruction created: $INSTRUCTION_ID"
echo "   Location: $INSTRUCTION_DIR"
echo ""

# Update registry
if [ ! -f "$PROJECT_ROOT/Agent_Memory/_system/registry.yaml" ]; then
  mkdir -p "$PROJECT_ROOT/Agent_Memory/_system"
  cat > "$PROJECT_ROOT/Agent_Memory/_system/registry.yaml" <<EOF
instructions:
  - instruction_id: $INSTRUCTION_ID
    created: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
    domain: software
    tier: 4
    status: pending
EOF
else
  # Append to existing registry
  echo "  - instruction_id: $INSTRUCTION_ID" >> "$PROJECT_ROOT/Agent_Memory/_system/registry.yaml"
  echo "    created: $(date -u +"%Y-%m-%dT%H:%M:%SZ")" >> "$PROJECT_ROOT/Agent_Memory/_system/registry.yaml"
  echo "    domain: software" >> "$PROJECT_ROOT/Agent_Memory/_system/registry.yaml"
  echo "    tier: 4" >> "$PROJECT_ROOT/Agent_Memory/_system/registry.yaml"
  echo "    status: pending" >> "$PROJECT_ROOT/Agent_Memory/_system/registry.yaml"
fi

echo "✅ Registry updated"
echo ""

# Launch orchestrator
echo "=== Launching Orchestrator ==="
echo ""
echo "The orchestrator will now:"
echo "  1. Route to software domain (tier 4)"
echo "  2. Plan task breakdown (71 tasks)"
echo "  3. Execute tasks with parallel agents"
echo "  4. Validate at each checkpoint"
echo "  5. Report results"
echo ""

echo "Instruction ID: $INSTRUCTION_ID"
echo ""
echo "To monitor progress:"
echo "  cat Agent_Memory/v3_consolidation/progress.yaml"
echo "  cat Agent_Memory/$INSTRUCTION_ID/status.yaml"
echo ""
echo "To check results:"
echo "  cat Agent_Memory/$INSTRUCTION_ID/outputs/final/"
echo ""

# Execute via Claude Code
echo "Executing workflow..."
echo ""

# Note: This would actually invoke the orchestrator agent
# For now, we output the command that should be run

echo "Run this command to execute:"
echo ""
echo "  claude /trigger \"$WORKFLOW_REQUEST\""
echo ""
echo "Or use the cAgents system:"
echo ""
echo "  Task("
echo "    subagent_type='orchestrator',"
echo "    prompt='Execute V3 consolidation workflow $INSTRUCTION_ID'"
echo "  )"
echo ""

echo "=== Workflow Prepared ==="
echo "Instruction ID: $INSTRUCTION_ID"
echo "Ready for execution"
