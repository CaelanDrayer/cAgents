# Domain Detection

3-method weighted detection for accurate domain classification.

## Detection Methods

### Method 1: Keyword-Based (50% weight)

Match keywords from user request against domain patterns:

| Domain | Keywords |
|--------|----------|
| Engineering | fix, bug, implement, code, api, database |
| Creative | write, story, content, copy, design |
| Revenue | campaign, marketing, sales, conversion |
| Finance | budget, cost, revenue, forecast |
| People | hire, recruit, onboard, culture |
| Business | strategy, operations, product, project, budget, forecast, process |
| Growth | campaign, marketing, sales, conversion, SEO, leads, pipeline |
| Service | support, legal, compliance, customer, SLA, contract, privacy |
| Shared | data, analytics, research, statistics, intelligence |
| Science | physics, chemistry, biology, math, mathematics, calculus, algebra, theorem, proof, hypothesis, experiment, research, lab, laboratory, molecule, atom, equation, scientific, quantum, genetics, ecology, statistics, geology, astronomy, biochemistry |
| Health | medical, health, wellness, fitness, nutrition, mental health, therapy, diagnosis, treatment, medication, symptoms, exercise, diet, workout, clinical, pharmacy, counseling, mindfulness, rehabilitation, preventive, chronic, acute, BMI, calories |
| Education | teach, learn, tutor, curriculum, lesson, student, exam, study, academic, school, university, course, training, pedagogy, assessment, grade, homework, lecture, syllabus, scholarship, SAT, GRE, STEM, literacy, classroom |
| Personal | career, personal, life coach, goals, productivity, personal finance, budget, retirement, relationship, coaching, self-improvement, habits, motivation, time management, resume, interview, salary, savings, investing, work-life balance, mindset, procrastination, journaling, gratitude |
| Arts | painting, photography, film, filmmaking, music production, visual art, gallery, composition, sculpture, performing arts, instrument, recording, mixing, mastering, watercolor, oil painting, cinematography, directing, art history, portfolio, exhibition |
| Trades | cooking, recipe, culinary, construction, automotive, repair, plumbing, electrical, farming, agriculture, fashion, sewing, woodworking, welding, HVAC, roofing, gardening, landscaping, baking, sourdough, mechanic, carpentry, masonry, irrigation |

## Qualifier-Based Disambiguation

When a keyword matches multiple domains, check for qualifying context to resolve:

| Keyword | Qualifier | Domain | Example |
|---------|-----------|--------|---------|
| review | code, PR, pull request, diff | engineering | "review my code" |
| review | text, essay, prose, manuscript | creative | "review my essay" |
| review | performance, employee | people | "review employee performance" |
| design | system, API, database, architecture | engineering | "design the API" |
| design | character, world, narrative | creative | "design a character" |
| design | game mechanics, levels | business | "design game mechanics" |
| design | visual, graphic, UI, UX | arts | "design a logo" |
| write | copy, email, ad, landing page | growth | "write ad copy" |
| write | story, novel, poem, script | creative | "write a short story" |
| write | documentation, technical, API docs | engineering | "write API docs" |
| analyze | data, code, performance, logs | engineering | "analyze server logs" |
| analyze | market, business, competitive | business | "analyze the market" |
| analyze | statistical, survey, experiment | shared | "analyze survey results" |
| plan | strategic, business, quarterly | business | "plan Q4 strategy" |
| plan | campaign, marketing, launch | growth | "plan product launch" |
| plan | workforce, hiring, headcount | people | "plan hiring for Q3" |
| manage | project, sprint, backlog | business | "manage this project" |
| manage | performance, talent, reviews | people | "manage performance reviews" |
| manage | support, tickets, SLA | service | "manage support queue" |
| pipeline | CI/CD, deploy, build | engineering | "fix the CI pipeline" |
| pipeline | sales, leads, funnel | growth | "optimize sales pipeline" |
| test | unit, integration, e2e, QA | engineering | "write unit tests" |
| test | A/B, split, experiment | growth | "run an A/B test" |

Resolution algorithm:
1. If qualifier words appear near the keyword (within 5 words): route to qualified domain
2. If no qualifier: use keyword weight + context for disambiguation
3. If still ambiguous: present top-2 candidates to user

### Method 2: Context-Based (20% weight)

Analyze project structure, git history, and file distribution:

```bash
# Git context
git status --short > workflow/git_status.txt
git log --oneline -20 > workflow/recent_commits.txt
git diff --stat > workflow/git_diff_stat.txt

# Project structure
find . -maxdepth 3 -name "package.json" -o -name "requirements.txt" \
  -o -name "Gemfile" -o -name "composer.json" -o -name "pom.xml" \
  -o -name "go.mod" -o -name "Cargo.toml" > workflow/project_files.txt

# File type distribution
find . -type f \( -name "*.js" -o -name "*.ts" -o -name "*.py" -o -name "*.md" \) | \
  cut -d'.' -f2- | sort | uniq -c > workflow/file_types.txt
```

### Method 3: Framework Detection (30% weight)

Detect specific frameworks and apply domain associations:

| Framework | Detection | Domain |
|-----------|-----------|--------|
| Next.js | next.config.js, `next` in package.json | engineering |
| React | `react` in package.json | engineering |
| Django | settings.py, manage.py | engineering |
| FastAPI | `fastapi` in requirements.txt | engineering |
| Flask | `flask` in requirements.txt | engineering |
| Vue | `vue` in package.json | engineering |
| Angular | angular.json | engineering |

## Score Calculation

```
domain_score = (
  keyword_score * 0.5 +
  context_score * 0.2 +
  framework_score * 0.3
) + historical_adjustment
```

## Confidence Thresholds

| Confidence | Action |
|------------|--------|
| >= 0.75 | Auto-proceed (high confidence) |
| 0.5-0.75 | Show top-3 candidates with scores |
| < 0.5 | Apply multi-signal fallback (see strategy below) |

**Close-score rule**: If any two domains score within 0.15 of each other AND both are above 0.5, always show top-3 candidates regardless of the top score. This prevents routing errors when domains are close.

## Low-Confidence Fallback Strategy

When primary detection confidence < 0.5, apply these steps in order:

1. **Expanded Keyword Scan**: Run a broad keyword match across ALL domain `router_keywords` from each domain's `domain_overrides.yaml`. Score each domain by keyword overlap with the request.
   - If any domain scores > 0.4: route to that domain
   - If top 2 domains are within 0.1 of each other: present both as candidates with reasoning

2. **Capability Matching**: If no domain scores > 0.4, check agent capability descriptions in the top-scoring domains. Match request intent against agent capabilities.
   - Route to the domain whose agent capabilities best match the request intent

3. **User Disambiguation**: Only if steps 1 and 2 both fail to produce a confident match, present the user with the top 3 domain candidates, each with a one-sentence description of why it might apply.
   - Never default to engineering without applying steps 1 and 2 first

## Multi-Domain Handling

If 2+ domains score > 0.6: Create multi-domain workflow with parent and child workflows per domain.

## Example Detection Result

Detection runs across all 15 domains: Engineering, Creative, Revenue, Finance, People, Business, Growth, Service, Shared, Science, Health, Education, Personal, Arts, Trades.

```yaml
method: context_aware
timestamp: 2026-01-16T10:30:00Z

scores:
  engineering: 0.92
  product: 0.35
  creative: 0.12

selected_domain: engineering
confidence: 0.92
detection_methods_used:
  keyword: 0.80  # "fix", "bug", "auth"
  context: 0.95  # next.config.js found
  framework: 0.95  # Next.js detected

framework_detected: nextjs
multi_domain: false
user_confirmation_required: false
```
