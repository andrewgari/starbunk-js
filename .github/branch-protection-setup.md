# Branch Protection Setup for Main Branch

This document outlines how to set up branch protection rules for the `main` branch to ensure that all PRs have passing unit tests before they can be merged.

## Setting Up Branch Protection Rules

1. Go to the repository settings on GitHub.
2. Navigate to "Branches" in the left sidebar.
3. Under "Branch protection rules", click "Add rule".
4. In the "Branch name pattern" field, enter `main`.
5. Enable the following options:
    - ✅ Require a pull request before merging
    - ✅ Require approvals (set to at least 1)
    - ✅ Require status checks to pass before merging
    - ✅ Require branches to be up to date before merging
6. In the "Status checks that are required" section, search for and select:
    - `verify` (this includes the unit tests step)
7. Optionally, you may also want to enable:
    - ✅ Restrict who can push to matching branches
    - ✅ Do not allow bypassing the above settings
8. Click "Create" or "Save changes".

## What This Enforces

With these settings, the following workflow will be enforced:

1. All changes to the `main` branch must be made through pull requests.
2. Pull requests must have at least one approval.
3. The GitHub Actions workflow must complete successfully, including:
    - Unit tests passing
    - Linting checks passing
    - Build checks passing
    - Application startup check passing
4. The branch must be up to date with the base branch before merging.

This ensures that only code that passes all tests can be merged into the `main` branch, maintaining code quality and preventing regressions.

## Troubleshooting

If a PR is failing the required checks:

1. Check the GitHub Actions logs to see which specific check is failing.
2. If unit tests are failing, run `npm test` locally to reproduce and fix the issues.
3. If linting is failing, run `npm run lint` locally to identify and fix the issues.
4. If the build is failing, run `npm run build` locally to identify and fix the issues.
5. Update the PR with the necessary fixes and wait for the checks to run again.
