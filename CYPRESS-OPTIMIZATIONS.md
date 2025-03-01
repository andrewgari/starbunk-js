# Cypress Test Optimization Guide

This document outlines the optimizations implemented to speed up Cypress tests in the Starbunk-js project.

## Configuration Optimizations

We've made the following changes to `cypress.config.ts`:

1. **Disabled Video Recording**:

    ```js
    video: false;
    ```

2. **Disabled Screenshots on Failure**:

    ```js
    screenshotOnRunFailure: false;
    ```

3. **Reduced Timeouts**:

    ```js
    defaultCommandTimeout: 5000,
    requestTimeout: 5000,
    responseTimeout: 10000,
    pageLoadTimeout: 10000
    ```

4. **Disabled Animations**:

    ```js
    animationDistanceThreshold: 5,
    waitForAnimations: false
    ```

5. **Enabled Experimental Features**:

    ```js
    experimentalRunAllSpecs: true,
    experimentalModifyObstructiveThirdPartyCode: true,
    experimentalMemoryManagement: true
    ```

6. **Disabled Retries**:
    ```js
    retries: {
      runMode: 0,
      openMode: 0
    }
    ```

## Script Optimizations

We've created several scripts to optimize Cypress test execution:

1. **Parallel Test Execution** (`scripts/run-parallel-tests.sh`):

    - Divides tests into groups and runs them in parallel
    - Uses available CPU cores (up to 4) for maximum efficiency
    - Ensures Cypress is installed before running tests
    - Uses unique Xvfb displays for each parallel process to avoid conflicts

2. **Cypress Optimization** (`scripts/optimize-cypress.sh`):

    - Ensures Cypress is properly installed
    - Clears Cypress cache for better performance
    - Creates optimized Cypress environment configuration

3. **Updated Test Scripts** in `package.json`:
    - Added `test:e2e:parallel` script for parallel test execution
    - Added `cypress:optimize` script for Cypress optimization

## Environment Optimizations

We've created a `cypress.env.json` file with the following optimizations:

```json
{
	"numTestsKeptInMemory": 5,
	"experimentalMemoryManagement": true,
	"experimentalInteractiveRunEvents": true,
	"defaultCommandTimeout": 5000,
	"requestTimeout": 5000,
	"responseTimeout": 10000,
	"pageLoadTimeout": 10000
}
```

## Usage

To get the maximum performance from your Cypress tests:

1. Run the optimization script:

    ```
    npm run cypress:optimize
    ```

2. Run tests in parallel:
    ```
    npm run test:e2e:parallel
    ```

## Additional Recommendations

1. **Minimize DOM Queries**: Reduce the number of DOM queries in your tests
2. **Use Data Attributes**: Use data-\* attributes for test selectors instead of CSS classes or IDs
3. **Avoid Waiting for Animations**: Set `waitForAnimations: false` in your configuration
4. **Limit Test Scope**: Keep tests focused on specific functionality
5. **Use Stub/Mock Where Possible**: Stub network requests when possible to avoid external dependencies
6. **Clean Up Test Data**: Ensure tests clean up after themselves
7. **Avoid Unnecessary Screenshots**: Only capture screenshots when needed for debugging

## Troubleshooting

If you encounter issues with parallel test execution:

1. **Xvfb Display Conflicts**: The parallel test script now uses unique display numbers for each Cypress instance to avoid conflicts. If you still see Xvfb errors, you can:

    - Install Xvfb if it's not already installed: `sudo apt-get install xvfb` (Ubuntu/Debian) or `sudo dnf install xorg-x11-server-Xvfb` (Fedora)
    - Manually clean up stale lock files: `rm /tmp/.X*-lock` if needed
    - Reduce the number of parallel processes by modifying the `CORES` variable in `run-parallel-tests.sh`

2. **Memory Issues**: If your system runs out of memory when running tests in parallel:

    - Reduce the number of parallel processes
    - Close other memory-intensive applications
    - Set `numTestsKeptInMemory` to a lower value in `cypress.env.json`

3. **Port Conflicts**: If you see errors about ports already being in use:
    - Ensure no other Cypress instances are running
    - Kill any zombie Cypress processes: `pkill -f cypress`

## GitHub Actions Integration

We've optimized Cypress tests for GitHub Actions CI/CD pipelines with the following improvements:

1. **Parallel Test Execution Workflow** (`.github/workflows/cypress-parallel.yml`):

    - Runs tests in parallel using GitHub Actions matrix strategy
    - Splits tests into 4 groups for faster execution
    - Uses unique Xvfb displays for each test group to avoid conflicts
    - Includes proper cleanup of Xvfb processes and lock files
    - Can be triggered manually or automatically on relevant file changes

2. **Optimized Existing Workflows**:

    - Updated `.github/workflows/main.yml` and `.github/workflows/pr-checks.yml` with Xvfb optimizations
    - Added proper display configuration to avoid Xvfb conflicts
    - Implemented cleanup of stale Xvfb lock files
    - Added optimized Cypress environment configuration

3. **Usage in CI/CD**:

    - Tests run automatically on pull requests that modify bot-related code
    - Tests run on merged PRs to main/develop branches
    - Manual workflow trigger available for on-demand testing

4. **CI-Specific Optimizations**:
    - Disabled video recording to reduce artifacts size and speed up tests
    - Disabled screenshots except on test failures
    - Optimized memory usage with `numTestsKeptInMemory` setting
    - Implemented proper cleanup to avoid resource leaks

These optimizations ensure that Cypress tests run efficiently in both local development environments and in GitHub Actions CI/CD pipelines, with special attention to the unique requirements of headless environments.
