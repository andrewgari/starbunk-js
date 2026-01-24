# @starbunk/shared

Shared services and utilities for Starbunk containers.

## Optional Imports

To avoid unnecessary native dependencies for services that don't need database features, the database utilities are exported via a separate path.

- Core (no database):
  - `import { DiscordService, logLayer } from '@starbunk/shared'`
- Database features (optional):
  - `import { DatabaseService } from '@starbunk/shared/database'`

### Peer Dependency

`better-sqlite3` is declared as an optional peer dependency of `@starbunk/shared`.
If your service uses the database, add it to your service `package.json`:

```json
{
  "dependencies": {
    "@starbunk/shared": "*",
    "better-sqlite3": "^11.0.0"
  }
}
```

### Why This Structure?

- Smaller bundles for services without database needs
- Clearer, explicit dependency boundaries
- Better tree-shaking and reduced build complexity

See issue #460 for the architectural rationale and acceptance criteria.
