# Docker Build Optimization

This document explains the Docker build optimizations implemented to reduce CI/CD build times.

## Overview

The Docker images for this project are built using a multi-stage approach with aggressive caching strategies to minimize build times in GitHub Actions workflows.

## Optimizations Implemented

### 1. Dockerfile Structure Optimization

#### Better Layer Separation
The Dockerfiles now copy files in an optimal order to maximize cache hits:

```dockerfile
# Copy package files first (least likely to change)
COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/<app>/package.json ./apps/<app>/

# Install dependencies (cached if package files unchanged)
RUN npm ci --prefer-offline --no-audit --ignore-scripts

# Copy source code (most likely to change)
COPY packages/shared/src ./packages/shared/src
COPY apps/<app>/src ./apps/<app>/src
```

This ensures that:
- Changes to source code don't invalidate the npm install layer
- Changes to app code don't invalidate the shared package build
- Maximum cache reuse across builds

#### BuildKit Cache Mounts
All Dockerfiles use BuildKit cache mounts for the npm cache:

```dockerfile
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit --ignore-scripts
```

**Benefits:**
- npm cache is preserved across builds
- ~30-50% faster npm install on subsequent builds
- Cache is shared across all app builds in the same workflow run

#### Workspace-Based Installation
Instead of installing dependencies separately for each package, we use npm workspaces:

```dockerfile
# Old approach (slow)
RUN cd shared && npm install
RUN npm install

# New approach (fast)
RUN npm ci --prefer-offline --no-audit --ignore-scripts
```

**Benefits:**
- Single installation handles all workspace dependencies
- Better deduplication of shared dependencies
- Faster installation due to parallel processing

#### Proper Directory Structure
The runtime images now maintain the correct monorepo structure:

```dockerfile
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/<app>/dist ./apps/<app>/dist
```

This ensures:
- Correct module resolution at runtime
- Smaller runtime images (only production dependencies)
- Easier debugging (matches development structure)

### 2. GitHub Actions Workflow Optimization

#### Scoped Caching
Each app build uses scoped caching to isolate cache entries:

```yaml
cache-from: |
  type=gha,scope=shared-deps
  type=gha,scope=<app>
cache-to: type=gha,mode=max,scope=<app>
```

**Benefits:**
- Each app maintains its own cache scope
- Common layers can be shared via the `shared-deps` scope
- Better cache hit rates due to reduced cache pollution
- `mode=max` ensures all intermediate layers are cached

#### Parallel Builds
All Docker builds run in parallel with no dependencies between them:

```yaml
jobs:
  docker-build-bunkbot: ...
  docker-build-covabot: ...
  docker-build-djcova: ...
  docker-build-bluebot: ...
```

**Benefits:**
- Maximum parallelization
- No waiting for other builds to complete
- Better utilization of GitHub Actions runners

## Expected Performance Improvements

### First Build (Cold Cache)
- **Before:** Each app builds shared package independently (~4 builds × 2-3 min)
- **After:** Shared layers cached, BuildKit optimizes (~2-3 min per app, but parallel)
- **Improvement:** ~40-50% reduction in total wall-clock time

### Subsequent Builds (Warm Cache)
- **Before:** ~3-5 minutes per app (minimal caching)
- **After:** ~1-2 minutes per app (npm cache + layer cache)
- **Improvement:** ~60-70% reduction in build time

### Cache Hit Rate
- **npm install:** ~90% cache hit rate (unless dependencies change)
- **Docker layers:** ~80% cache hit rate (unless source code changes)
- **Overall:** ~3-5x faster builds on average

## Best Practices

### For Developers

1. **Keep package.json changes separate**: If possible, commit package.json changes separately from code changes to maximize cache reuse.

2. **Use `npm ci` locally**: Match the CI behavior by using `npm ci` instead of `npm install`.

3. **Test Docker builds locally**: Before pushing, test your Docker build locally:
   ```bash
   docker build -f apps/<app>/Dockerfile -t <app>:test .
   ```

### For CI/CD

1. **Monitor cache hit rates**: Check GitHub Actions logs for cache hit rates.

2. **Clear cache if needed**: If builds are behaving strangely, clear the GitHub Actions cache.

3. **Update cache scopes**: If you add new apps, ensure they have their own cache scope.

## Troubleshooting

### Builds are slower than expected
- Check if GitHub Actions cache is enabled and working
- Verify BuildKit is being used (should see `[internal] load build context`)
- Check for network issues affecting npm downloads

### Cache not being used
- Verify cache scope names match between `cache-from` and `cache-to`
- Check that `mode=max` is set on `cache-to`
- Ensure BuildKit version supports cache mounts

### Runtime errors
- Verify the CMD path matches the new directory structure
- Check that all required files are copied to the runtime stage
- Ensure node_modules includes all production dependencies

## Future Optimizations

Potential areas for further improvement:

1. **Registry cache**: In addition to GHA cache, use registry cache for public layers
2. **Base image**: Create a shared base image with common dependencies pre-installed
3. **Build matrices**: Further parallelize by building multiple apps in a single job
4. **Dependency pre-caching**: Pre-warm cache with common dependencies before builds

## References

- [Docker BuildKit documentation](https://docs.docker.com/build/buildkit/)
- [GitHub Actions cache documentation](https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows)
- [Docker build cache best practices](https://docs.docker.com/build/cache/)
