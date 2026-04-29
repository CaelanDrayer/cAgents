# Template Auto-Selection Algorithm

Reference document for team-trigger's template matching logic.

## Selection Flow

```
1. Load _index.yaml catalog (~300 tokens)
2. Score each template against request + context
3. Select top scorer above confidence_threshold (0.6)
4. If no template qualifies -> flat execution (no waves)
5. Override via flags: --template <id>, --no-template, --waves <N>
```

## Scoring Algorithm

Score = `keyword_score * 0.4 + domain_score * 0.2 + signal_score * 0.2 + item_score * 0.2`

### Keyword Score (weight: 0.4)

Match request text against template keywords (case-insensitive):

```
keyword_matches = count of template.keywords found in request text
keyword_score = min(keyword_matches / 2, 1.0)
```

Two or more keyword hits yields a perfect keyword score.

### Domain Score (weight: 0.2)

Match detected domain against template domains:

```
if detected_domain in template.domains:
  domain_score = 1.0
elif detected_super_domain matches template super_domain:
  domain_score = 0.5
else:
  domain_score = 0.0
```

### Signal Score (weight: 0.2)

Check project files/directories against template project_signals:

```
signal_matches = count of template.project_signals found in project
signal_score = min(signal_matches / 2, 1.0) if signals exist, else 0.5
```

Templates with no project_signals get a neutral 0.5.

### Item Score (weight: 0.2)

Compare decomposed work item count against template minimum:

```
if work_items >= template.min_work_items:
  item_score = 1.0
elif work_items >= template.min_work_items * 0.7:
  item_score = 0.5
else:
  item_score = 0.0
```

## Selection Decision

```
scores = { template_id: score for each template in catalog }
best = max(scores, key=score)

if best.score >= best.confidence_threshold:
  selected_template = best.template_id
else:
  selected_template = None  # Flat execution
```

## Flag Overrides

| Flag | Effect |
|------|--------|
| `--template <id>` | Force specific template, skip auto-selection |
| `--no-template` | Force flat execution, skip auto-selection |
| `--waves <N>` | Override wave count from template |

## Work Item Tagging

After selecting a template, tag each work item with:
- **wave**: Which wave it belongs to (based on `work_item_tags` matching)
- **team**: Which team owns it (based on `focus_areas` matching)

```
for each work_item in decomposition:
  for each wave in template.waves:
    if any(tag in work_item.tags for tag in wave.work_item_tags):
      work_item.wave = wave.id
      break

  if wave.type == "parallel":
    for each team in wave.teams:
      if any(tag in work_item.tags for tag in team_def.work_item_tags):
        work_item.team = team
        break

  # Untagged items default to the latest parallel wave
  if not work_item.wave:
    work_item.wave = last_parallel_wave.id
```

## Logging

Log template selection in the session:

```yaml
# team/team_manifest.yaml (template section)
template:
  id: fullstack-app
  name: "Full-Stack Application"
  selection_method: auto  # auto | flag_override | none
  scores:
    fullstack-app: 0.85
    api-service: 0.45
    frontend-app: 0.30
  confidence: 0.85
```
