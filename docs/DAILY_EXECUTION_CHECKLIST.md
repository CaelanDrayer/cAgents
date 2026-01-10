# Daily Execution Checklist - cAgents Implementation

**Purpose**: Quick-start guide for each work session (assumes NO long-term memory)

---

## 🌅 START OF DAY - ORIENTATION (5 minutes)

Every time you start working, run these commands to orient yourself:

### 1. Where Am I?
```bash
cd /home/PathingIT/cAgents
pwd  # Should output: /home/PathingIT/cAgents
```

### 2. What's My Current Progress?
```bash
# Count domains
ls -d */ | grep -v node_modules | wc -l

# Count planning agents
ls planning/agents/*.md 2>/dev/null | wc -l

# Check if planning domain complete
ls planning/agents/*.md 2>/dev/null | wc -l  # Should be 22 if complete
```

### 3. Read Today's Instructions

**If planning domain NOT complete** (< 22 agents):
```bash
cat docs/AUTONOMOUS_IMPLEMENTATION_GUIDE.md | grep -A 500 "## 🚀 PHASE 0"
```

**If planning domain IS complete** (= 22 agents):
```bash
cat docs/AUTONOMOUS_IMPLEMENTATION_GUIDE.md | grep -A 500 "## 📅 PHASE 1"
```

---

## 📋 TODAY'S TASK - DETERMINE WHAT TO WORK ON

Run this decision tree:

```bash
# Check planning domain status
PLANNING_AGENTS=$(ls planning/agents/*.md 2>/dev/null | wc -l)

if [ $PLANNING_AGENTS -lt 22 ]; then
    echo "TASK: Complete Planning Domain ($PLANNING_AGENTS/22 agents done)"
    echo "START AT: STEP $((PLANNING_AGENTS + 1)) in PHASE 0"
elif [ ! -d sales ]; then
    echo "TASK: Start Sales Domain"
    echo "START AT: STEP 1 of PHASE 1A (Create sales folder)"
elif [ $(ls sales/agents/*.md 2>/dev/null | wc -l) -lt 23 ]; then
    echo "TASK: Complete Sales Domain"
    SALES_AGENTS=$(ls sales/agents/*.md 2>/dev/null | wc -l)
    echo "START AT: Continue from agent $((SALES_AGENTS + 1))/23"
elif [ ! -d marketing ]; then
    echo "TASK: Start Marketing Domain"
    echo "START AT: STEP 1 of PHASE 1B"
else
    echo "TASK: Check MASTER_IMPLEMENTATION_PLAN.md for current phase"
fi
```

---

## 🔨 WORKING ON AN AGENT - STANDARD PROCESS

Every agent follows the same pattern. Use this checklist:

### Creating Agent: _______________ (fill in name)

**Time Estimate**: 20-40 minutes per agent

#### [ ] Step 1: Find Specification (2 min)
```bash
# For planning agents:
cat docs/planning-domain-design.md | grep -A 100 "AGENT_NAME"

# For other domains:
cat docs/new-domains-plan.md | grep -A 100 "AGENT_NAME"
```

#### [ ] Step 2: Create File (1 min)
```bash
touch DOMAIN/agents/AGENT_NAME.md
```

#### [ ] Step 3: Look at Similar Agent for Pattern (3 min)
```bash
# Check an existing agent for structure
cat planning/agents/router.md | head -50  # See YAML and structure
cat business/agents/cso.md | head -50     # Executive pattern
```

#### [ ] Step 4: Write YAML Frontmatter (2 min)
```yaml
---
name: agent-name
description: One-line description. Use PROACTIVELY when...
capabilities: ["cap1", "cap2", "cap3"]
tools: Read, Grep, Glob, Write, Bash, TodoWrite
model: sonnet | opus | haiku
color: purple
domain: domain_name
---
```

#### [ ] Step 5: Write Agent Content (15-30 min)

**Structure**:
1. Purpose/Core Responsibility (1 paragraph)
2. Focus Areas (3-5 sections)
3. Responsibilities (bulleted list)
4. Methodologies/Frameworks (if applicable)
5. Capabilities (detailed breakdown)
6. Examples (optional but helpful)

**Target Length**:
- Workflow agents (router, planner, etc.): 300-500 lines
- Executive agents: 400-600 lines
- Team agents: 150-300 lines

#### [ ] Step 6: Verify File (2 min)
```bash
wc -l DOMAIN/agents/AGENT_NAME.md  # Check line count
grep "name: AGENT_NAME" DOMAIN/agents/AGENT_NAME.md  # Verify YAML
head -20 DOMAIN/agents/AGENT_NAME.md  # Visual check
```

#### [ ] Step 7: Update Progress Tracker (1 min)
```bash
# Count agents in current domain
ls DOMAIN/agents/*.md | wc -l
echo "Progress: X/Y agents complete"
```

---

## 🎯 END OF AGENT - MICRO CHECKPOINT

After completing each agent, run:

```bash
# Verify file exists and has content
ls -lh DOMAIN/agents/AGENT_NAME.md

# Verify YAML is valid
head -15 DOMAIN/agents/AGENT_NAME.md | grep "^name:"

# Count total progress
echo "Domain: DOMAIN_NAME"
ls DOMAIN/agents/*.md | wc -l
```

**Move to Next Agent**: Repeat the "Working on an Agent" checklist

---

## 📦 END OF DOMAIN - MAJOR CHECKPOINT

When all agents for a domain are created:

### [ ] 1. Verify Agent Count
```bash
cd DOMAIN/agents
ls -1 *.md | wc -l  # Should match target count
```

**Target Counts**:
- Planning: 22 agents
- Sales: 23 agents
- Marketing: 25 agents
- Finance: 22 agents
- Operations: 20 agents
- HR: 24 agents
- Legal: 19 agents
- Support: 21 agents

### [ ] 2. Create Plugin Manifest (15 min)
```bash
touch DOMAIN/.claude-plugin/plugin.json
# Copy structure from planning/.claude-plugin/plugin.json
# List all agent paths
```

### [ ] 3. Update Core Trigger (10 min)
```bash
# Add domain to core/agents/trigger.md domain detection table
cp core/agents/trigger.md core/agents/trigger.md.backup
# Edit to add domain row
```

### [ ] 4. Update Root Package.json (5 min)
```bash
# Add domain to workspaces array
cp package.json package.json.backup
# Edit workspaces: ["core", "software", "business", "planning", "DOMAIN"]
```

### [ ] 5. Update Root Plugin Manifest (10 min)
```bash
# Add all domain agents to .claude-plugin/plugin.json
cp .claude-plugin/plugin.json .claude-plugin/plugin.json.backup
# Add ./DOMAIN/agents/*.md paths
```

### [ ] 6. Test Domain (30-60 min)
```bash
# Restart Claude Code if needed
claude --plugin-dir .

# Run test cases:
/trigger [TIER 1 TEST FOR DOMAIN]
/trigger [TIER 2 TEST FOR DOMAIN]
/trigger [TIER 3 TEST FOR DOMAIN]
```

### [ ] 7. Document Completion (10 min)
```bash
# Update EXECUTION_SUMMARY.md
# Mark domain as complete
# Update progress percentages
```

**Move to Next Domain**: Start at "Today's Task" section

---

## 🌙 END OF DAY - SAVE STATE

Before ending your session, create a state file:

```bash
cd /home/PathingIT/cAgents
cat > TODAY_STATE.txt << 'EOF'
Date: $(date)
Current Domain: [NAME]
Agents Completed Today: [NUMBER]
Total Domain Progress: [X/Y]
Next Task: [DESCRIPTION]
Blockers: [ANY ISSUES]
Notes: [ANYTHING TO REMEMBER]
EOF
```

---

## 🔍 QUICK REFERENCE COMMANDS

### Check Overall Progress
```bash
cd /home/PathingIT/cAgents

# Count domains
ls -d */ | grep -vE "node_modules|docs" | wc -l

# Count total agents
find . -name "*.md" -path "*/agents/*" | wc -l

# Domain-specific counts
ls planning/agents/*.md 2>/dev/null | wc -l  # Planning
ls sales/agents/*.md 2>/dev/null | wc -l     # Sales
ls marketing/agents/*.md 2>/dev/null | wc -l # Marketing
# etc.
```

### Find Documentation
```bash
# Main guides
ls docs/*.md

# Planning domain spec
cat docs/planning-domain-design.md

# Other domains spec
cat docs/new-domains-plan.md

# Master timeline
cat docs/MASTER_IMPLEMENTATION_PLAN.md

# Current status
cat docs/EXECUTION_SUMMARY.md
```

### Verify JSON Files
```bash
# Check plugin manifests
cat DOMAIN/.claude-plugin/plugin.json | jq '.'

# Check root package
cat package.json | jq '.workspaces'

# Check root plugin
cat .claude-plugin/plugin.json | jq '.agents | length'
```

### Common File Paths
```
/home/PathingIT/cAgents/                      # Root
/home/PathingIT/cAgents/docs/                 # All documentation
/home/PathingIT/cAgents/planning/             # Planning domain
/home/PathingIT/cAgents/core/agents/trigger.md  # Domain detection
/home/PathingIT/cAgents/package.json          # Root package
/home/PathingIT/cAgents/.claude-plugin/plugin.json  # Root plugin
```

---

## ⚡ SPEED TIPS

### Fastest Way to Create an Agent

```bash
# 1. Set variables
DOMAIN="planning"
AGENT="agent-name"

# 2. Create from template
cat > $DOMAIN/agents/$AGENT.md << 'EOF'
---
name: AGENT_NAME
description: Description here
capabilities: ["cap1", "cap2"]
tools: Read, Grep, Glob, Write, Bash, TodoWrite
model: sonnet
color: purple
domain: DOMAIN_NAME
---

# Agent Name

## Purpose
[Write purpose]

## Responsibilities
- Responsibility 1
- Responsibility 2

## Capabilities
[Write capabilities]
EOF

# 3. Edit the template
# 4. Verify
wc -l $DOMAIN/agents/$AGENT.md
```

### Batch Create Agent Files
```bash
# Create multiple empty files at once
DOMAIN="sales"
touch $DOMAIN/agents/{router,planner,executor,validator,self-correct}.md
touch $DOMAIN/agents/cro.md
# Then fill them in one by one
```

---

## 🐛 COMMON MISTAKES TO AVOID

1. **Wrong Directory**: Always `cd /home/PathingIT/cAgents` first
2. **Typo in YAML**: Check `name:` matches filename
3. **Missing Domain**: Verify `domain: DOMAIN_NAME` in YAML
4. **Wrong Path in Manifest**: Use `./agents/file.md` not `/agents/file.md`
5. **Forgetting Comma in JSON**: Check with `jq '.'`
6. **Not Updating Trigger**: Domain won't be detected
7. **Not Testing**: Always test after completing domain

---

## 🎯 SUCCESS CRITERIA

### You're Done When:
```bash
# 1. All domains exist
ls -d */ | grep -vE "node_modules|docs" | wc -l  # Should be 11

# 2. All agents exist
find . -name "*.md" -path "*/agents/*" | wc -l  # Should be 248

# 3. All plugin manifests exist
find . -name "plugin.json" -path "*/.claude-plugin/*" | wc -l  # Should be 11

# 4. Root manifests updated
cat package.json | jq '.workspaces | length'  # Should be 11
cat .claude-plugin/plugin.json | jq '.agents | length'  # Should be 248

# 5. All tests pass
# Run tier 1-4 tests for each domain
```

---

**Use this checklist daily. Every session starts with "START OF DAY". Every agent follows "WORKING ON AN AGENT". Every domain ends with "END OF DOMAIN". You've got this! 🚀**
