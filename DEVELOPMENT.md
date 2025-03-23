# Development Guide for Starbunk-JS

This document provides information on how to set up and run the bot application in various environments.

## Environment Setup

The application uses environment variables for configuration. You can create a `.env` file in the root of the project with the following variables:

```
STARBUNK_TOKEN=your_discord_token
SNOWBUNK_TOKEN=your_discord_token
CLIENT_ID=your_discord_client_id
GUILD_ID=your_discord_guild_id
OPENAI_API_KEY=your_openai_api_key
NODE_ENV=development
DEBUG=true
TESTING_MODE=false
```

## Running the Application

There are several ways to run the application:

### Standard Development Mode

Requires valid Discord API tokens and environment variables:

```bash
npm run dev
```

### Testing Mode

For running with mocked services but still requiring environment variables:

```bash
npm run dev:testing
```

### Mock Development Mode

For full local development without any API tokens or external services:

```bash
npm run dev:mock
```

This creates a temporary environment file with mock tokens and runs the application in testing mode, which skips Discord connections.

## Testing

Run the test suite:

```bash
npm test
```

Run the full validation suite:

```bash
npm run check:all
```

This will:
- Check types
- Run linters
- Run all tests
- Build the application
- Check Docker image builds
- Verify Docker container boots correctly

## Environment Abstraction

The application uses an environment abstraction layer (`src/environment.ts`) that:

1. Centralizes environment variable access
2. Provides type-safe access to variables
3. Validates variables during startup
4. Provides default values for test environments
5. Includes helper functions like `isTest()`, `isDebugMode()`, etc.

When writing new code, always use these helper functions instead of directly accessing `process.env`.

Example:
```typescript
// Don't do this:
if (process.env.DEBUG_MODE === 'true') {
  // ...
}

// Do this instead:
import { isDebugMode } from './environment';

if (isDebugMode()) {
  // ...
}
```

## Testing Features

The application includes special handling for test environments:

1. When `isTest()` or `isTestingMode()` is true, external services like Discord won't be called
2. Mock environment values are provided automatically
3. Discord login is skipped entirely in testing mode
4. Logger is automatically mocked in tests

This allows for reliable testing without external dependencies.
