# Build

Build Starbunk containers. Specify a container name or build all.

## Arguments
- `$ARGUMENTS` - Optional: container name (bunkbot, djcova, covabot, bluebot, shared) or "all"/"clean"

## Instructions

Build based on the argument provided:

1. If "clean" is provided, do a clean build:
   ```bash
   npm run build:clean
   ```

2. If "shared" is provided, build only the shared package:
   ```bash
   npm run build:shared
   ```

3. If a specific container is provided (bunkbot, djcova, covabot, bluebot), build that container:
   ```bash
   npm run build:<container>
   ```

4. If no argument or "all" is provided, build everything:
   ```bash
   npm run build
   ```

5. Report any TypeScript compilation errors and suggest fixes.
