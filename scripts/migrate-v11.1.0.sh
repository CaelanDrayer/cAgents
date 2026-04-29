#!/usr/bin/env bash
# cAgents v11.1.0 migration: builder-role archetype tree + cagents-memory rename
# Generates file-move table from plugin.json + per-agent SKILL.md frontmatter
# Designed for atomic execution — stages all changes, you commit when verified.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# -----------------------------------------------------------------------------
# Stage 0: Generate file-move-table.tsv from plugin.json + agent name heuristics
# -----------------------------------------------------------------------------
TABLE="cagents-memory-staging/file-move-table.tsv"
mkdir -p "$(dirname "$TABLE")"
> "$TABLE"

map_agent() {
  local path="$1"             # e.g. ./engineering/agents/backend-developer/SKILL.md
  local rel="${path#./}"       # engineering/agents/backend-developer/SKILL.md
  local domain="${rel%%/*}"    # engineering
  local name
  name="$(basename "$(dirname "$rel")")"  # backend-developer

  case "$domain" in
    core)        echo -e "${rel}\tcore/${name}/SKILL.md\tcore\t" ;;
    leadership)  echo -e "${rel}\tleadership/${name}/SKILL.md\tleadership\t" ;;
    arts)        echo -e "${rel}\tcreator/${name}/SKILL.md\tcreator\t" ;;
    health)      echo -e "${rel}\tadvisor/health/${name}/SKILL.md\tadvisor\thealth" ;;
    education)   echo -e "${rel}\tadvisor/education/${name}/SKILL.md\tadvisor\teducation" ;;
    personal)    echo -e "${rel}\tadvisor/personal/${name}/SKILL.md\tadvisor\tpersonal" ;;
    science)     echo -e "${rel}\tanalyst/${name}/SKILL.md\tanalyst\t" ;;
    shared)      echo -e "${rel}\tanalyst/${name}/SKILL.md\tanalyst\t" ;;
    people)      echo -e "${rel}\toperator/people-ops/${name}/SKILL.md\toperator\tpeople-ops" ;;
    engineering)
      case "$name" in
        backend-developer|api-*|dba|database-*|backend-*) echo -e "${rel}\tdeveloper/backend/${name}/SKILL.md\tdeveloper\tbackend" ;;
        frontend-*|ux-designer) echo -e "${rel}\tdeveloper/frontend/${name}/SKILL.md\tdeveloper\tfrontend" ;;
        senior-developer|tech-lead|architect|architecture-reviewer|engineering-manager|backend-lead|frontend-lead|devops-lead|data-lead|engine-developer|game-programmer) echo -e "${rel}\tdeveloper/fullstack/${name}/SKILL.md\tdeveloper\tfullstack" ;;
        devops-*|sysadmin|it-support|security-*|dependency-analyst|performance-analyzer) echo -e "${rel}\tdeveloper/infrastructure/${name}/SKILL.md\tdeveloper\tinfrastructure" ;;
        qa-*|test-*|code-*|frontend-aesthetics|accessibility-checker) echo -e "${rel}\tdeveloper/quality/${name}/SKILL.md\tdeveloper\tquality" ;;
        vp-engineering) echo -e "${rel}\tdeveloper/fullstack/${name}/SKILL.md\tdeveloper\tfullstack" ;;
        *) echo -e "${rel}\tdeveloper/fullstack/${name}/SKILL.md\tdeveloper\tfullstack" ;;
      esac
      ;;
    creative)
      case "$name" in
        copywriter|copy-editor|editor|technical-writer|scribe|prose-stylist|dialogue-specialist|game-writer|voice-coach|narrative-designer|narrative-director|narrative-game-designer|continuity-checker|literary-critic|theme-analyst|sensitivity-reader|story-architect|plot-developer|tension-architect|pacing-specialist|genre-specialist|character-designer|character-psychologist|setting-designer|worldbuilder|lore-keeper|creative-researcher) echo -e "${rel}\twriter/${name}/SKILL.md\twriter\t" ;;
        concept-artist|animator|sound-designer|music-composer) echo -e "${rel}\tcreator/${name}/SKILL.md\tcreator\t" ;;
        *) echo -e "${rel}\twriter/${name}/SKILL.md\twriter\t" ;;
      esac
      ;;
    business)
      case "$name" in
        product-owner|strategic-planner|portfolio-manager|roadmap-planner|scenario-planner|okr-specialist|game-designer|business-development-manager|game-producer) echo -e "${rel}\tstrategist/${name}/SKILL.md\tstrategist\t" ;;
        business-analyst|business-researcher|performance-analyst|predictive-analyst|process-auditor) echo -e "${rel}\tanalyst/${name}/SKILL.md\tanalyst\t" ;;
        *) echo -e "${rel}\toperator/business-ops/${name}/SKILL.md\toperator\tbusiness-ops" ;;
      esac
      ;;
    service)
      case "$name" in
        *attorney|*counsel|paralegal|legal-*|ip-*|contracts-manager|litigation-manager|privacy-officer|regulatory-affairs-specialist|compliance-manager|chief-legal-officer|employment-attorney|corporate-counsel) echo -e "${rel}\tadvisor/legal/${name}/SKILL.md\tadvisor\tlegal" ;;
        *) echo -e "${rel}\toperator/support/${name}/SKILL.md\toperator\tsupport" ;;
      esac
      ;;
    growth)
      case "$name" in
        marketing-strategist|brand-manager|product-marketing-manager|cmo|growth-marketer|seo-specialist|conversion-rate-optimizer|sales-strategist|cso|cro|sales-rep|account-manager|sales-engineer|customer-success-manager|territory-manager|channel-partner-manager|business-development-manager|sales-trainer|sales-enablement-specialist|sales-ops-specialist|sales-analyst|revenue-operations-manager|pricing-analyst|demand-generation-manager|campaign-manager|media-buyer|video-marketing-specialist|partnership-marketing-manager|field-marketing-manager|customer-marketing-manager|customer-advocacy-manager|affiliate-marketing-manager|influencer-marketing-specialist|channel-marketer|marketing-analyst|marketing-ops-specialist|competitive-intelligence-analyst|market-research-analyst|pr-specialist|proposal-specialist|relationship-manager|creative-director) echo -e "${rel}\toperator/marketing-sales/${name}/SKILL.md\toperator\tmarketing-sales" ;;
        community-manager|content-strategist|copywriter|knowledge-base-manager|customer-education-specialist|events-coordinator) echo -e "${rel}\toperator/content/${name}/SKILL.md\toperator\tcontent" ;;
        *) echo -e "${rel}\toperator/marketing-sales/${name}/SKILL.md\toperator\tmarketing-sales" ;;
      esac
      ;;
    trades)
      case "$name" in
        chef|fashion-designer) echo -e "${rel}\tcreator/${name}/SKILL.md\tcreator\t" ;;
        construction-advisor|automotive-technician|agronomist) echo -e "${rel}\tadvisor/personal/${name}/SKILL.md\tadvisor\tpersonal" ;;
        *) echo -e "${rel}\tadvisor/personal/${name}/SKILL.md\tadvisor\tpersonal" ;;
      esac
      ;;
    *)
      echo "ERROR: unknown domain '$domain' for $rel" >&2
      exit 1
      ;;
  esac
}

while IFS= read -r p; do
  map_agent "$p" >> "$TABLE"
done < <(jq -r '.agents[]' .claude-plugin/plugin.json)

echo "Generated $TABLE with $(wc -l < "$TABLE") rows."
echo ""
echo "Distribution:"
awk -F'\t' '{print $3}' "$TABLE" | sort | uniq -c | sort -rn
echo ""
echo "Branch breakdown for 3-level archetypes:"
awk -F'\t' '$3=="developer" || $3=="operator" || $3=="advisor" {print $3"/"$4}' "$TABLE" | sort | uniq -c | sort -rn
