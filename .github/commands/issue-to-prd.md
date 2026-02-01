description = "Convert a GitHub issue into a PRD at the root directory"
prompt = """
# /issue-to-prd — Issue to PRD Converter

## 🎯 Simple One-Step Action
Read a GitHub issue and turn it into a PRD file at the repo root.

## How to Use
```
/issue-to-prd #<issue-number>
```

**Example:**
```
/issue-to-prd #42
```

## What It Does
1. **Fetch the issue** from GitHub (title, description, labels, acceptance criteria if present)
2. **Build the PRD** using the standard format:
   - Goal (from issue title)
   - Context (from issue description)
   - User Stories / Tasks (from issue description or create checklist from requirements)
   - Definition of Done (pull from existing PRD template)
3. **Save to root** as `PRD.md` (overwrite if exists, or create new with timestamp if you want to keep it)
4. **Done** — No extra steps, no cleanup, just a PRD ready to go.

## Format (Ralph's Simple PRD)
```markdown
# Feature: [Issue Title]

## Goal
[One-sentence summary of issue description]

## Technical Context
- **Issue:** #[number]
- **Labels:** [comma-separated labels]
- **Requirements:** [Key requirements from description]

## User Stories / Tasks
- [ ] [First requirement from issue]
- [ ] [Second requirement from issue]
- [ ] [Add tests and documentation]

## Definition of Done (DoD)
- [ ] All tasks checked off
- [ ] No `any` types introduced
- [ ] `npm run test` passes
- [ ] `npm run lint` passes
- [ ] Documentation updated
```

## That's It
No overthinking, no extra files, just a PRD that Ralph would be proud of.

"""
