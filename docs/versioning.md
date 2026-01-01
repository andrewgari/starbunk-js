# Version Management

This project uses a **single source of truth** for versioning to avoid duplication and sync issues.

## How It Works

### Single Source of Truth
- **Root `package.json`** contains the authoritative version number
- All workspace packages (apps and shared) sync their versions from the root

### Automatic Syncing
The `scripts/sync-versions.sh` script automatically updates all package.json files to match the root version.

## Usage

### Manual Version Bump

To bump the version manually:

```bash
# 1. Update the root package.json version
npm version patch  # or minor, major
# or
npm version 1.3.2 --no-git-tag-version

# 2. Sync to all packages
npm run sync-versions
```

### Automatic Version Bump (CI/CD)

The semantic versioning workflow automatically:
1. Analyzes commits to determine version bump type (patch/minor/major)
2. Updates the root package.json
3. Runs `sync-versions.sh` to update all workspace packages
4. Creates a git tag and GitHub release

## Version Sync Script

The `scripts/sync-versions.sh` script:
- ✅ Reads version from root `package.json`
- ✅ Updates all `apps/*/package.json` files
- ✅ Updates `packages/shared/package.json`
- ✅ Shows clear output of what was updated
- ✅ Skips packages that are already at the correct version

## Benefits

1. **No Duplication**: Version is defined in one place only
2. **Consistency**: All packages always have the same version
3. **Easy Updates**: One command syncs everything
4. **CI/CD Integration**: Automated in release workflow
5. **Clear Audit Trail**: Easy to see what version each package is at

## Files Affected

- `package.json` (root) - **Source of truth**
- `apps/bunkbot/package.json`
- `apps/covabot/package.json`
- `apps/djcova/package.json`
- `apps/starbunk-dnd/package.json`
- `packages/shared/package.json`

## Troubleshooting

### Versions are out of sync
Run the sync script:
```bash
npm run sync-versions
```

### CI/CD failing on version bump
Check that:
1. The root package.json has the correct version
2. The sync script is executable: `chmod +x scripts/sync-versions.sh`
3. All package.json files are valid JSON

