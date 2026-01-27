# CircleCI Configuration Architecture

## Overview

The CircleCI configuration for this project uses a **shared configuration pattern** to reduce duplication while maintaining flexibility for module-specific validation logic.

## Architecture

### Files Structure

```
.circleci/
├── config.yml                    # Main entry point (dynamic config setup)
├── shared-config.yml             # Shared executors and commands
├── scripts/
│   ├── detect_changes.sh         # Detects which modules changed
│   └── generate_config.py        # Generates dynamic config
└── workflows/
    ├── core-pr-validation.yml    # Core validation (lint, types, build)
    ├── bunkbot-pr-validation.yml # Bunkbot-specific validation
    ├── bluebot-pr-validation.yml # Bluebot-specific validation
    ├── covabot-pr-validation.yml # Covabot-specific validation
    ├── djcova-pr-validation.yml  # Djcova-specific validation
    ├── main-merge.yml            # Main branch workflow
    └── deploy-production.yml     # Production deployment workflow
```

### Shared Configuration (`shared-config.yml`)

Contains common elements used across all workflows:

#### Executors

- **node22**: Node.js 22.14 environment for build/test jobs
- **docker**: Base Docker environment for Docker operations

#### Commands

- **setup_npm_cache**: Install npm dependencies with caching
- **persist_build_artifacts**: Compress and save build artifacts to workspace
- **attach_build_artifacts**: Restore build artifacts from workspace
- **setup_docker_cli**: Ensure Docker CLI is available

### Module Workflows

Each module workflow (`*-pr-validation.yml`) contains:

- **Jobs**: Module-specific jobs (build, test, docker_build, docker_health_check)
- **Workflows**: Job orchestration and dependencies

The workflows reference shared executors and commands defined in `shared-config.yml`.

## How It Works

### 1. Dynamic Configuration

On every commit/PR:

1. **config.yml** triggers the `detect_and_continue` job
2. **detect_changes.sh** identifies which modules changed
3. **generate_config.py** dynamically generates the final configuration:
   - Loads shared executors/commands from `shared-config.yml`
   - Merges relevant module workflows based on changes
   - Outputs a complete CircleCI configuration

### 2. Change Detection

The `detect_changes.sh` script:

- Compares current branch against `origin/main`
- Identifies affected modules (bunkbot, bluebot, covabot, djcova)
- Checks for special label `force-all-checks` to run all validations
- Outputs JSON with change information

### 3. Configuration Generation

The `generate_config.py` script:

1. Reads change detection results from `.circleci/diff.json`
2. Loads shared executors/commands from `shared-config.yml`
3. Merges workflow files for changed modules
4. Always includes `core-pr-validation` workflow
5. Generates final configuration with no duplication

## Benefits

### ✅ Reduced Duplication

- **Before**: 818 total lines across 5 workflow files
- **After**: 613 total lines (78 shared + 535 in workflows)
- **Savings**: 205 lines removed (25% reduction)

Key improvements:

- Executors defined once (was duplicated 5 times)
- Commands defined once (was duplicated 5 times)
- Easier to maintain and update common patterns

### ✅ Single Source of Truth

- Executors and commands defined once in `shared-config.yml`
- Changes to caching or npm setup only need to be made in one place

### ✅ Scalability

Adding a new module requires:

1. Create a new workflow file (e.g., `newmodule-pr-validation.yml`)
2. Reference shared executors/commands
3. Update `detect_changes.sh` to include the new module
4. Update `generate_config.py` to load the new workflow

### ✅ Maintainability

- Clear separation between shared and module-specific configuration
- Easy to see what's common vs. what's unique to each module
- Standardized patterns across all modules

## Module Validation Flow

Each module follows this standard flow:

```
module_build
    ↓
module_test
    ↓
module_docker_build
    ↓
module_docker_health_check
```

### Exception: Covabot

Covabot has an additional step in the test job:

- Rebuilds native dependencies (`better-sqlite3`)
- Ensures compatibility with the build environment

## Making Changes

### Adding a New Module

1. **Create workflow file**: `.circleci/workflows/newmodule-pr-validation.yml`

   ```yaml
   version: 2.1

   jobs:
     newmodule_build:
       executor: node22
       steps:
         - checkout
         - setup_npm_cache
         - run: npm run build:newmodule
         - persist_build_artifacts

     # Add test, docker_build, docker_health_check jobs...

   workflows:
     newmodule-checks:
       jobs:
         - newmodule_build
         # Add workflow dependencies...
   ```

2. **Update change detection**: Edit `.circleci/scripts/detect_changes.sh`

   ```bash
   # Add to the apps list
   for app in bunkbot covabot djcova bluebot newmodule; do
   ```

3. **Update config generation**: Edit `.circleci/scripts/generate_config.py`

   ```python
   # Add to the apps list
   for app in ['bunkbot', 'bluebot', 'covabot', 'djcova', 'newmodule']:
   ```

### Modifying Shared Configuration

To change executors or commands:

1. Edit `.circleci/shared-config.yml`
2. Changes automatically apply to all module workflows
3. Test by running `generate_config.py` locally

### Modifying Module-Specific Logic

To change module-specific jobs:

1. Edit the specific workflow file (e.g., `.circleci/workflows/bunkbot-pr-validation.yml`)
2. Changes only affect that module
3. Test by running `generate_config.py` locally

## Testing Configuration Changes

### Local Testing

```bash
# Ensure changes are detected
.circleci/scripts/detect_changes.sh

# Generate and preview config
python3 .circleci/scripts/generate_config.py > /tmp/preview.yml

# Review the generated configuration
cat /tmp/preview.yml
```

### CircleCI Validation

Use the CircleCI CLI to validate generated configs:

```bash
# Install CircleCI CLI (if not installed)
# https://circleci.com/docs/local-cli/

# Validate the config
circleci config validate /tmp/preview.yml
```

## Troubleshooting

### Issue: Shared commands not found

**Symptom**: Jobs fail with "command not found" errors

**Solution**: Ensure `generate_config.py` is correctly loading `shared-config.yml`:

- Check stderr output for "Loaded shared-config.yml" message
- Verify shared-config.yml exists and is valid YAML

### Issue: Workflows not being generated

**Symptom**: Module workflow missing from generated config

**Solution**: Check change detection:

```bash
cat .circleci/diff.json
```

Ensure the module's `<module>_changed` flag is `true`.

### Issue: Duplicate executors/commands

**Symptom**: Generated config has duplicate definitions

**Solution**: Remove executor/command definitions from individual workflow files. They should only be in `shared-config.yml`.

## Future Improvements

Potential enhancements:

- [ ] Parameterized job definitions using YAML anchors
- [ ] Matrix-based workflow generation for similar modules
- [ ] Shared job templates with parameters
- [ ] Automated testing of generated configurations

## References

- [CircleCI Dynamic Configuration](https://circleci.com/docs/dynamic-config/)
- [CircleCI Reusable Configuration](https://circleci.com/docs/reusing-config/)
- [CircleCI Orbs Documentation](https://circleci.com/docs/orb-intro/)
