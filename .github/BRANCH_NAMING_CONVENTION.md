# Branch Naming Convention

We follow a strict branch naming convention to keep our repository organized and to integrate with our CI/CD pipelines.

## Format

`type/short-description`

## Types

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat/user-login` |
| `fix` | Bug fix | `fix/header-alignment` |
| `docs` | Documentation | `docs/update-readme` |
| `chore` | Maintenance, dependencies, tooling | `chore/update-deps` |
| `refactor` | Code restructuring without behavior change | `refactor/auth-service` |
| `test` | Adding or updating tests | `test/add-unit-tests` |
| `hotfix` | Critical fixes for production | `hotfix/security-patch` |

## Rules

1.  **Lowercase**: All branch names must be lowercase.
2.  **Hyphens**: Use hyphens `-` to separate words in the description.
3.  **No Special Characters**: Avoid symbols like `@`, `!`, `#`, etc.
4.  **Descriptive**: The description should be short but meaningful.

## Examples

*   ✅ `feat/add-dark-mode`
*   ✅ `fix/crash-on-startup`
*   ✅ `chore/bump-version-1.2.0`
*   ❌ `Feature/AddDarkMode` (Use lowercase)
*   ❌ `fix_crash` (Use hyphens and type)
