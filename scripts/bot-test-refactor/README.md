# Bot Test Refactoring Scripts

This folder contains scripts to help refactor the bot tests to use constants from model files.

## Overview

The goal of these scripts is to make the bot tests more maintainable by:

1. Using constants from model files in both unit tests and Cypress tests
2. Creating a shared helper file (`botConstants.ts`) that imports and exports all constants
3. Using helper functions to create flexible regex patterns for matching bot responses
4. Handling differences between bot names in code and in Discord

## Scripts

### Main Script

- `refactor-bot-tests.sh`: Runs all the steps to refactor the bot tests

### Individual Scripts

- `generate-bot-constants.sh`: Generates the `botConstants.ts` file
- `fix-cypress-types.sh`: Fixes the Cypress types by updating the `index.d.ts` file
- `update-cypress-tests.sh`: Creates templates for the bot test files
- `run-bot-tests.sh`: Runs the bot tests in Cypress

## Usage

### Refactoring Bot Tests

To run all the refactoring steps:

```bash
./scripts/bot-test-refactor/refactor-bot-tests.sh
```

This will:

1. Generate the `botConstants.ts` file
2. Fix the Cypress types
3. Create templates for the bot test files

### Running Bot Tests

To run all bot tests:

```bash
./scripts/bot-test-refactor/run-bot-tests.sh --all
```

To run tests for a specific bot:

```bash
./scripts/bot-test-refactor/run-bot-tests.sh --bot niceBot
```

## Commit Plan

Here's a suggested plan for breaking the changes into bite-sized commits:

1. **Add bot test refactoring scripts**

    - Add scripts to generate constants, fix types, and create templates
    - Add README explaining the approach

2. **Generate botConstants.ts file**

    - Run the script to generate the file
    - Fix any issues with imports or exports

3. **Fix Cypress types**

    - Add type definitions for custom commands
    - Fix type errors in test files

4. **Update example bot tests**

    - Update `niceBot.cy.ts` and `spiderBot.cy.ts` as examples
    - Show how to use constants and handle differences

5. **Update allBots.cy.ts**

    - Use constants and helper functions
    - Create a mapping between bot names in code and in Discord

6. **Add documentation**
    - Add comments explaining the approach
    - Update README with troubleshooting tips
