# Branch Protection Setup

## Overview

The PR validation workflow has been configured to ensure comprehensive validation of all changes before merging to the `main` branch. This document describes the validation process and how to set up branch protection rules.

## Validation Workflow

The `pr-validation.yml` workflow includes the following checks:

### Required Checks (Must Always Pass)
- **🔍 Type Check**: TypeScript type checking across the entire codebase
- **🎨 Lint**: Code style and quality checks using ESLint

### Container Checks (Conditional - Can Pass or Skip)
Each container has independent test, build, and docker build jobs that run when changes affect that container:

#### Test & Build Jobs
- **🧪 Test & Build - Bunkbot**: Tests and builds for the Bunkbot container
- **🧪 Test & Build - DJCova**: Tests and builds for the DJCova container
- **🧪 Test & Build - Starbunk DnD**: Tests and builds for the Starbunk DnD container
- **🧪 Test & Build - Covabot**: Tests and builds for the Covabot container

#### Docker Build Jobs
- **🐳 Docker Build - Bunkbot**: Docker image build and push for Bunkbot (PR only)
- **🐳 Docker Build - DJCova**: Docker image build and push for DJCova (PR only)
- **🐳 Docker Build - Starbunk DnD**: Docker image build and push for Starbunk DnD (PR only)
- **🐳 Docker Build - Covabot**: Docker image build and push for Covabot (PR only)

### Validation Success Check
The **✅ PR Validation Success** job is the final gate that:
- Waits for all validation jobs to complete (including docker builds)
- Requires type-check and lint to succeed
- Allows container test/build checks to either succeed or be skipped (based on change detection)
- Allows docker build checks to either succeed or be skipped (based on test/build success and PR context)
- Fails if any check fails
- Provides detailed logging of all check statuses

## How It Works

1. **Change Detection**: Each container has a change detection job that checks if relevant files were modified
2. **Conditional Execution**: Container test/build jobs only run if changes are detected for that container
3. **Docker Builds**: Docker build jobs only run if the test/build succeeds and it's a pull request event
4. **Validation Gate**: The `pr-validation-success` job evaluates all results:
   - ✅ **Success**: If type-check and lint pass, and all container test/build and docker build checks either succeed or skip
   - ❌ **Failure**: If any check fails or is cancelled

### Example Scenarios

#### Scenario 1: Changes to Bunkbot only
- ✅ Type check runs and passes
- ✅ Lint runs and passes
- ✅ Bunkbot test/build runs and passes
- ✅ Bunkbot docker build runs and passes (PR only)
- ⏭️ DJCova test/build skipped (no changes)
- ⏭️ DJCova docker build skipped (no test/build)
- ⏭️ Starbunk DnD test/build skipped (no changes)
- ⏭️ Starbunk DnD docker build skipped (no test/build)
- ⏭️ Covabot test/build skipped (no changes)
- ⏭️ Covabot docker build skipped (no test/build)
- **Result**: PR validation succeeds

#### Scenario 2: Changes to shared package
- ✅ Type check runs and passes
- ✅ Lint runs and passes
- ✅ All container test/build jobs run and pass (shared package affects all)
- ✅ All docker build jobs run and pass (PR only)
- **Result**: PR validation succeeds

#### Scenario 3: Container test failure
- ✅ Type check runs and passes
- ✅ Lint runs and passes
- ❌ Bunkbot test/build runs and fails
- ⏭️ Bunkbot docker build skipped (test/build failed)
- **Result**: PR validation fails (container check failed)

#### Scenario 4: Docker build failure
- ✅ Type check runs and passes
- ✅ Lint runs and passes
- ✅ Bunkbot test/build runs and passes
- ❌ Bunkbot docker build runs and fails
- **Result**: PR validation fails (docker build failed)

## Setting Up Branch Protection

To enforce these checks on the `main` branch, configure the following branch protection rule:

### Steps
1. Go to repository **Settings** → **Branches**
2. Add or edit the branch protection rule for `main`
3. Enable **Require status checks to pass before merging**
4. Add the following required status check:
   - `✅ PR Validation Success`

### Recommended Additional Settings
- ✅ Require branches to be up to date before merging
- ✅ Require conversation resolution before merging
- ✅ Do not allow bypassing the above settings

## Force Building All Containers

To force all containers to build and test regardless of change detection:

1. **Using PR Label**: Add the `force-validation` label to the PR
2. **Using Workflow Dispatch**: Trigger the workflow manually with the `force_all` input set to `true`

## Benefits

This validation approach provides:
- **Independent Container Development**: Each container can be developed and tested independently
- **Efficient CI/CD**: Only affected containers are built and tested
- **Comprehensive Validation**: All critical checks must pass before merge
- **Clear Status Reporting**: Detailed logging shows the status of each check
- **Flexibility**: Containers can be skipped when not affected by changes
