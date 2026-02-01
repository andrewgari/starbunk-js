# Fix CI & Snyk Errors

## 🎯 Goal
Resolve common CircleCI and Snyk validation failures by syncing dependencies, fixing build paths, and excluding problematic tests.

## The Ralph Strategy
1. **Say it simply**: CI/Snyk fails when dependencies are out of sync, build scripts reference wrong paths, or tests require external tools
2. **Do the obvious thing**: Run `npm install`, verify all scripts use correct paths, exclude integration tests
3. **One step at a time**: Fix each category independently, test after each change
4. **Don't overthink**: Don't try to install system binaries—exclude tests that need them
5. **Finish strong**: Validate with `check:ci` and verify git push works

## Execution Protocol

### Step 1: Sync Dependencies
**What**: Regenerate package-lock.json to match package.json

**Actions**:
```bash
npm install
git add package-lock.json
git commit -m "chore: update package-lock.json to sync with package.json"
```

**Expected Outcome**:
- No "out of sync" warnings from Snyk
- package-lock.json shows recent changes

---

### Step 2: Verify Build Script Paths
**What**: Ensure all scripts reference correct file locations

**Actions**:
```bash
# Check docker:build path
grep -n "docker:build" package.json

# Verify path exists
ls -la infrastructure/docker/docker-compose.yml
```

**Fix if needed**:
```json
// package.json
"docker:build": "docker compose -f infrastructure/docker/docker-compose.yml build"
```

**Expected Outcome**:
- `docker:build` script uses correct path
- No "file not found" errors

---

### Step 3: Handle Integration Tests (External Dependencies)
**What**: Exclude tests requiring external tools (yt-dlp, network) from default runs

**Actions**:
```bash
# Rename integration test files to .integration.test.ts pattern
mv src/SERVICE/tests/TESTNAME-integration.test.ts \
   src/SERVICE/tests/TESTNAME.integration.test.ts

# Update vitest config to exclude pattern
```

**Fix vitest.config.ts**:
```typescript
test: {
  // ... existing config
  exclude: ['tests/**/*.integration.test.ts', 'src/**/*.integration.test.ts'],
}
```

**Expected Outcome**:
- Integration tests don't block `npm test`
- Can run selectively with: `npm test -- TESTNAME.integration.test.ts`

---

### Step 4: Run Core Checks Locally
**What**: Verify all checks pass before pushing

**Actions**:
```bash
npm run check:ci     # type-check + lint + test (no docker)
```

**Expected Outcome**:
- ✅ Type check passes
- ✅ Lint passes
- ✅ All tests pass (110+ tests)
- No ERROR or FAIL messages

---

### Step 5: Commit & Push
**What**: Save fixes and push to verify CI passes

**Actions**:
```bash
git add -A
git commit -m "fix: resolve CircleCI and Snyk validation errors

- Sync package-lock.json with package.json
- Fix docker:build script path
- Exclude integration tests from default runs"

git push origin BRANCH
```

**Expected Outcome**:
- Pre-push hook runs checks and passes
- Push succeeds to remote
- CI pipeline in CircleCI shows green

---

### Step 6: Verify CI Pipeline
**What**: Confirm CircleCI and Snyk both report success

**Actions**:
1. Go to: https://app.circleci.com/pipelines/github/andrewgari/starbunk-js
2. Check latest workflow for your branch
3. Verify all jobs show ✅ (type-check, lint, test)
4. Go to: GitHub PR → Checks tab
5. Verify "Snyk Code Scanning" shows no vulns introduced

**Expected Outcome**:
- CircleCI workflow: All green ✅
- Snyk: No new vulnerabilities
- PR ready to merge

---

## Output Format

```
## CI & Snyk Errors Fixed

**Changes Made**:
- ✅ package-lock.json synced
- ✅ docker:build path corrected
- ✅ Integration tests excluded from default run
- ✅ All core checks passing locally

**Validation**:
- ✅ `npm run check:ci` passes (type-check, lint, test)
- ✅ git push succeeds with pre-push hook
- ✅ CircleCI workflow: All jobs green
- ✅ Snyk: No new vulnerabilities

**Result**: PR ready for merge. CI/Snyk validation complete.
```

---

## Common Issues & Fixes

### Issue: "package-lock.json out of sync"
```bash
npm install
git add package-lock.json
git commit -m "chore: sync package-lock.json"
```

### Issue: "cannot find docker-compose.yml"
Check script path:
```bash
# Wrong:
"docker:build": "docker compose build"

# Right:
"docker:build": "docker compose -f infrastructure/docker/docker-compose.yml build"
```

### Issue: "yt-dlp exited with code 1" / "stream timeout"
These are integration tests. They require:
- `yt-dlp` binary installed
- Network access to YouTube
- Long timeout (30+ seconds)

**Solution**: Rename to `.integration.test.ts` and exclude from default runs.

### Issue: "Pre-push hook failing tests"
Run locally first:
```bash
npm run check:ci    # Runs type-check, lint, test
```

If passes locally, push should succeed. If fails, fix failing tests before commit.

---

## Red Flags ❌
- ❌ Trying to install system binaries in CI (use exclusions instead)
- ❌ Assuming all tests can run everywhere (some need external deps)
- ❌ Running `docker:build` without docker installed (skip in check:ci)
- ❌ Not running checks locally before pushing (always run `npm run check:ci`)
- ❌ Modifying test logic to make CI pass (exclude the test instead)

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `npm install` | Sync dependencies |
| `npm run check:ci` | Run all core checks (type/lint/test) |
| `npm run check:all` | Core checks only (no docker) |
| `npm test` | Run unit tests (excludes .integration.test.ts) |
| `npm test -- FILE.integration.test.ts` | Run specific integration test |

