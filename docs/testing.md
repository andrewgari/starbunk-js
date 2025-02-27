# Testing Guide for Starbunk-JS

This document provides instructions for running tests, linting, building, and using Docker for the Starbunk-JS project.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Using the Test Script](#using-the-test-script)
- [Comprehensive Check](#comprehensive-check)
- [Running Tests Locally](#running-tests-locally)
- [Running Tests in Docker](#running-tests-in-docker)
- [Continuous Integration](#continuous-integration)
- [TypeScript Configuration](#typescript-configuration)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (v16 or higher)
- npm
- Docker (for containerized testing)
- Git

## Using the Test Script

We've created a convenient script to run various testing and build commands. The script is located at `scripts/run-tests.sh`.

To use the script:

```bash
# Make the script executable (if not already)
chmod +x scripts/run-tests.sh

# View available commands
./scripts/run-tests.sh

# Run a specific command
./scripts/run-tests.sh [command]
```

Available commands:

- `lint` - Run ESLint on the codebase
- `test` - Run Jest unit tests
- `build` - Build the TypeScript project
- `start` - Start the application
- `cypress` - Run Cypress tests
- `cypress:open` - Open Cypress test runner
- `cypress:snowbunk` - Run Snowbunk-specific Cypress tests
- `docker:build` - Build Docker image
- `docker:test` - Run tests in Docker container
- `docker:cypress` - Run Cypress tests in Docker container
- `docker:start` - Start application in Docker container
- `all` - Run lint, test, build, and cypress tests
- `ci` - Run all tests in CI mode (non-interactive)

## Comprehensive Check

We've created a comprehensive check script that verifies all aspects of the project in one command. This is useful for ensuring everything is working correctly before committing changes or deploying to production.

To run the comprehensive check:

```bash
npm run check:all
```

If you want to see what checks would be performed without actually running them:

```bash
npm run check:demo
```

This demo command will display all the checks that would be run by the `check:all` command, without actually executing them. It's a quick way to understand the verification process.

The full `check:all` command will:

1. **Lint the code** - Check for style and potential errors using ESLint
2. **Type check** - Verify TypeScript types are correct
3. **Build the project** - Compile TypeScript to JavaScript
4. **Run unit tests** - Execute Jest tests and generate coverage reports
5. **Verify application start** - Check that the application starts without errors
6. **Test Docker setup** - Build and run the Docker image
7. **Run Cypress tests** - Execute Snowbunk-specific Cypress tests

The script provides a detailed report of all checks, including:
- Pass/fail status for each check
- Command output
- Total duration
- Summary of results

If any check fails, the script will exit with a non-zero status code, making it suitable for CI/CD pipelines.

## Running Tests Locally

### Linting

To check your code for style and potential errors:

```bash
npm run lint
```

To automatically fix linting issues:

```bash
npm run lint:fix
```

### Unit Tests

To run Jest unit tests:

```bash
npm run test
```

For test coverage:

```bash
npm run test:coverage
```

### End-to-End Tests with Cypress

To open the Cypress test runner:

```bash
npm run cypress:open
```

To run Cypress tests in headless mode:

```bash
npm run cypress:run
```

To run only Snowbunk-related tests:

```bash
npm run cypress:run -- --spec "cypress/e2e/snowbunk/*.cy.ts"
```

### Building the Project

To compile TypeScript to JavaScript:

```bash
npm run build
```

### Starting the Application

To start the application:

```bash
npm run start
```

### Type Checking

The project uses TypeScript for type safety. We have separate TypeScript configurations for the main application code and Cypress test code:

```bash
# Check types for main application code
npm run type-check:main

# Check types for Cypress test code
npm run type-check:cypress

# Check all types (both main and Cypress)
npm run type-check
```

This separation allows us to have different TypeScript settings for different parts of the codebase, ensuring appropriate type checking for each context.

## Running Tests in Docker

### Building the Docker Image

```bash
docker build -t starbunk-js:latest .
```

### Running Unit Tests in Docker

```bash
docker run --rm -v "$(pwd)":/app starbunk-js:latest npm test
```

### Running Cypress Tests in Docker

We've created a dedicated Docker setup for Cypress tests:

```bash
# Build and run using docker-compose
docker-compose -f docker-compose.cypress.yml up --build

# Or use our script
./scripts/run-tests.sh docker:cypress
```

### Starting the Application in Docker

```bash
docker-compose up -d
```

## Continuous Integration

This project uses GitHub Actions for CI/CD. The following workflows are available:

- **PR Unit Tests**: Runs unit tests on pull requests
- **PR E2E Tests**: Runs end-to-end tests on pull requests
- **PR Lint**: Runs linting on pull requests
- **PR Build**: Builds the project on pull requests
- **CI**: Comprehensive CI workflow that runs on pushes to main and develop branches

## TypeScript Configuration

The project uses multiple TypeScript configuration files:

- `tsconfig.json` - Main configuration for application code
- `tsconfig.cypress.json` - Configuration for Cypress test files

### Main TypeScript Configuration

The main configuration (`tsconfig.json`) is used for the application code and enforces strict type checking:

- Strict mode enabled
- No implicit any types
- Unused locals and parameters are flagged
- Source maps are generated for debugging

### Cypress TypeScript Configuration

The Cypress configuration (`tsconfig.cypress.json`) is tailored for testing:

- Allows implicit any types for testing flexibility
- Doesn't flag unused variables (useful for test setup)
- Includes Cypress and Jest type definitions
- Relaxes some strict checks to accommodate testing patterns

This dual configuration approach ensures that our application code maintains high type safety standards while allowing our tests the flexibility they need.

## Troubleshooting

### Common Issues

#### Cypress Test Failures

If Cypress tests are failing:

1. Check that your environment variables are set correctly
2. Ensure the application is running if tests expect it to be
3. Look at the screenshots and videos in the `cypress/screenshots` and `cypress/videos` directories

#### Docker Issues

If you encounter Docker-related issues:

1. Ensure Docker is running
2. Check if there are any port conflicts
3. Try rebuilding the image with `--no-cache` option

#### Node.js Version Issues

This project requires Node.js v16 or higher. If you encounter issues:

1. Check your Node.js version with `node --version`
2. Use a version manager like nvm to switch to a compatible version

For more help, please open an issue on GitHub.
