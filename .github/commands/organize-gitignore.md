description = "Organize .gitignore file with clear sections and comments"
prompt = """
# Organize Gitignore

## 🎯 PRD Alignment
**Source of Truth**: Project standards and clean code practices

Goal: **Organize .gitignore into clear, commented sections for easy maintenance**

## The Ralph Strategy
1. **Say it simply**: Group similar patterns together with headers
2. **Do the obvious thing**: Read current .gitignore and categorize entries
3. **One step at a time**: Sort by type, add comments, remove duplicates
4. **Don't overthink**: Standard categories work fine
5. **Finish strong**: Verify nothing broken, all patterns preserved

## Execution Protocol

### Step 1: Read Current .gitignore
- Open `.gitignore` at repo root
- Note all current patterns
- Identify duplicates

### Step 2: Categorize Patterns
Group into standard sections:
- **OS Files**: `.DS_Store`, `Thumbs.db`, etc.
- **IDEs**: `.vscode/`, `.idea/`, `*.swp`, etc.
- **Dependencies**: `node_modules/`, `bower_components/`, etc.
- **Build Output**: `dist/`, `build/`, `*.js.map`, etc.
- **Environment**: `.env`, `.env.local`, etc.
- **Logs**: `*.log`, `logs/`, etc.
- **Testing**: `coverage/`, `.nyc_output/`, etc.
- **Project-Specific**: Any custom patterns

### Step 3: Organize & Format
Structure:
```gitignore
# ==========================================
# [SECTION NAME]
# ==========================================
pattern1
pattern2

# ==========================================
# [NEXT SECTION]
# ==========================================
pattern3
```

### Step 4: Remove Duplicates
- Keep one instance of each pattern
- Put more specific patterns before general ones
- Example: `dist/*.js.map` before `*.js.map`

### Step 5: Add Helpful Comments
- Note why certain patterns exist if not obvious
- Example: `# Auggie session logs` above `.auggie_wiggum/`

### Step 6: Validate
- Run: `git status` to ensure no untracked files suddenly tracked
- Run: `git check-ignore -v [test-file]` to verify patterns work
- Ensure no files accidentally ignored

## Output Format
```
## Organize Gitignore Complete

**What Changed**:
- Grouped [X] patterns into [Y] sections
- Removed [N] duplicate entries
- Added section headers and comments

**Sections Created**:
- OS Files
- IDEs & Editors
- Dependencies
- Build Output
- Environment
- Logs
- Testing
- Project-Specific

**Validation**:
- ✅ git status shows same tracked files
- ✅ No new untracked files
- ✅ All original patterns preserved
- ✅ File is readable and maintainable

**Result**: .gitignore is now organized and documented
```

## Red Flags
- ❌ Don't remove patterns you don't understand
- ❌ Don't change pattern order if it affects specificity
- ❌ Don't add patterns not currently in the file (organize only)
- ❌ Don't ignore files that should be tracked

"""
