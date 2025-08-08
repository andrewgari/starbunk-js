# Discord Bot Debug Mode Testing Suite

This document describes the comprehensive unit test suite for the Discord bot debug mode functionality across all containers (bunkbot, djcova, starbunk-dnd, covabot).

## Overview

The debug mode testing suite validates the three-tier debug configuration system:

1. **DEBUG_MODE** - Boolean flag for enabling debug behavior
2. **TESTING_SERVER_IDS** - Comma-separated list of allowed Discord server IDs
3. **TESTING_CHANNEL_IDS** - Comma-separated list of allowed Discord channel IDs

## Test Structure

### Container-Specific Tests

Each container has its own debug mode tests located in `containers/{service}/tests/`:

- **BunkBot** (`containers/bunkbot/tests/`)
  - `debug-mode.test.ts` - Core debug functionality
  - `reply-bots-debug.test.ts` - Random trigger behavior testing

- **DJCova** (`containers/djcova/tests/`)
  - `debug-mode.test.ts` - Music service debug behavior

- **Starbunk-DND** (`containers/starbunk-dnd/tests/`)
  - `debug-mode.test.ts` - D&D features and LLM isolation

- **CovaBot** (`containers/covabot/tests/`)
  - `debug-mode.test.ts` - AI responses and minimal DB isolation

- **Shared Services** (`containers/shared/tests/`)
  - `debug-mode-integration.test.ts` - Core debug functionality
  - `debug-configuration-validation.test.ts` - Environment variable validation

## Test Categories

### 1. Random Trigger Behavior Testing

**Purpose**: Verify that reply bots with random triggers work deterministically in debug mode.

**Key Tests**:
- InterruptBot triggers at 100% rate when `DEBUG_MODE=true`
- ChadBot triggers at 100% rate when `DEBUG_MODE=true` (except from real Chad)
- Normal percentage rates apply when `DEBUG_MODE=false`
- Deterministic behavior with identical message inputs in debug mode

**Implementation**: Tests the `withChance()` function in `containers/bunkbot/src/core/conditions.ts`

### 2. Snowbunk Integration Isolation

**Purpose**: Ensure no external service calls are made during debug mode testing.

**Key Tests**:
- WebhookManager calls are mocked in debug mode
- No actual Discord webhook creation occurs
- External API calls return mock responses
- No production data is affected

**Implementation**: Mocks WebhookManager and external service dependencies

### 3. Message Filtering and Posting Restrictions

**Purpose**: Validate the three-tier filtering system works correctly.

**Key Tests**:
- Guild filtering: Only process messages in `TESTING_SERVER_IDS`
- Channel filtering: Only process messages in `TESTING_CHANNEL_IDS`
- Combined filtering: Both server AND channel must match when both are set
- Complete isolation: No messages processed when neither is set
- Environment variable precedence over hardcoded values

**Implementation**: Tests MessageFilter class in `containers/shared/src/services/messageFilter.ts`

### 4. Channel Filtering with DEBUG_MODE=true

**Purpose**: Ensure that channel filtering works even when DEBUG_MODE=true, preventing bot responses in non-whitelisted channels.

**Key Tests**:
- **Non-whitelisted Channel Blocking**: Messages sent to channels NOT in `TESTING_CHANNEL_IDS` are blocked with `{ allowed: false, reason: "..." }`
- **All Message Types Blocked**: Regular messages, commands, interactions, and mentions are all blocked in non-whitelisted channels
- **No Bot Processing**: Reply bots, music commands, D&D features, and AI responses are prevented from processing blocked messages
- **No External Service Calls**: LLM APIs, database writes, webhooks, and other external services are not called for blocked messages
- **Pre-Processing Filtering**: Message filtering occurs BEFORE any bot logic, condition evaluation, or service initialization
- **Detailed Error Messages**: Blocked messages include specific channel ID and list of allowed channels in the reason

**Specific Scenarios Tested**:
- Set `DEBUG_MODE=true` and `TESTING_CHANNEL_IDS="777888999000111222,333444555666777888"`
- Send message to channel `999999999999999999` (not in whitelist)
- Verify `MessageFilter.shouldProcessMessage()` returns `{ allowed: false, reason: "Channel 999999999999999999 not in allowed testing channels [777888999000111222, 333444555666777888]" }`
- Verify no bot responses are generated across all containers
- Verify no external service calls are made

**Implementation**: Comprehensive tests in each container's debug mode test files

### 5. Pre-Processing Filtering

**Purpose**: Verify that message filtering occurs before any bot processing, ensuring complete isolation.

**Key Tests**:
- **Filtering Before Condition Evaluation**: Random trigger conditions are never evaluated for blocked messages
- **Filtering Before Service Initialization**: External services (LLM, database, webhooks) are never initialized for blocked messages
- **Filtering Before Voice Operations**: Music bot voice connections are never attempted for blocked messages
- **Filtering Before Session Loading**: D&D campaign data and conversation context are never loaded for blocked messages
- **No Side Effects**: Blocked messages produce no logs, metrics, or state changes in bot systems

**Implementation**: Mock tracking in all container test files to verify processing pipeline order

### 6. Configuration Validation

**Purpose**: Ensure environment variables are parsed and validated correctly.

**Key Tests**:
- `DEBUG_MODE` accepts `true`, `1`, `false`, `0`, case-insensitive
- Discord ID validation (17-19 digit snowflakes)
- Comma-separated list parsing with whitespace handling
- Invalid ID filtering and error handling
- Edge cases (empty strings, malformed input, special characters)

**Implementation**: Tests environment validation utilities in `containers/shared/src/utils/envValidation.ts`

## Running the Tests

### Individual Container Tests

```bash
# Run tests for a specific container
cd containers/bunkbot && npm test
cd containers/djcova && npm test
cd containers/starbunk-dnd && npm test
cd containers/covabot && npm test
cd containers/shared && npm test
```

### Comprehensive Test Suite

Use the provided test runner script:

```bash
# Run all debug mode tests across all containers
node scripts/run-debug-tests.js

# Run with verbose output
node scripts/run-debug-tests.js --verbose

# Run with detailed test breakdown
node scripts/run-debug-tests.js --detailed

# Filter to specific container
node scripts/run-debug-tests.js --container=bunkbot

# Show help
node scripts/run-debug-tests.js --help
```

### Test Coverage Goals

- **Minimum 30% code coverage** for debug mode functionality
- **100% coverage** of environment variable parsing
- **100% coverage** of message filtering logic
- **100% coverage** of random trigger behavior in debug mode

## Test Environment Setup

### Required Environment Variables for Testing

```bash
# Debug mode configuration
DEBUG_MODE=true
TESTING_SERVER_IDS=123456789012345678,987654321098765432
TESTING_CHANNEL_IDS=777888999000111222,333444555666777888

# Container-specific tokens (for integration tests)
BUNKBOT_TOKEN=your_test_token_here
DJCOVA_TOKEN=your_test_token_here
STARBUNK_DND_TOKEN=your_test_token_here
COVABOT_TOKEN=your_test_token_here
```

### Mock Configuration

The tests use comprehensive mocking to isolate functionality:

- **Discord.js objects** - Mocked Message and Interaction objects
- **External services** - WebhookManager, LLM services, database connections
- **Environment variables** - Controlled via Jest mocks
- **Random functions** - Deterministic behavior in debug mode

## Test Patterns

### AAA Pattern (Arrange-Act-Assert)

All tests follow the AAA pattern:

```typescript
test('should trigger at 100% rate when DEBUG_MODE=true', () => {
    // Arrange
    mockIsDebugMode.mockReturnValue(true);
    const condition = withChance(1); // 1% normal chance
    
    // Act & Assert
    for (let i = 0; i < 10; i++) {
        const result = condition();
        expect(result).toBe(true);
    }
});
```

### Mock Setup Pattern

Consistent mock setup across all tests:

```typescript
beforeEach(() => {
    jest.clearAllMocks();
    resetMessageFilter();
    
    // Default mock implementations
    mockGetTestingServerIds.mockReturnValue([]);
    mockGetTestingChannelIds.mockReturnValue([]);
    mockGetDebugMode.mockReturnValue(false);
});
```

## Container-Specific Debug Behaviors

### BunkBot
- Random reply bot triggers become deterministic
- Message filtering applied before bot processing
- Webhook calls are mocked

### DJCova
- Voice connections are mocked
- Music API calls return mock data
- Audio playback is simulated

### Starbunk-DND
- LLM API calls are mocked
- Database operations use mock data
- Campaign state is isolated

### CovaBot
- AI service calls are mocked
- User preferences use mock storage
- Conversation context is isolated

## Debugging Test Failures

### Common Issues

1. **Environment Variable Not Set**
   - Ensure test mocks are properly configured
   - Check `beforeEach` setup in test files

2. **Mock Not Working**
   - Verify Jest mock paths are correct
   - Check that mocks are cleared between tests

3. **Random Behavior in Tests**
   - Ensure `isDebugMode()` returns `true` in test environment
   - Verify deterministic behavior is implemented

4. **External Service Calls**
   - Check that all external dependencies are mocked
   - Verify no actual API calls are made during tests

### Debugging Commands

```bash
# Run tests with verbose Jest output
npm test -- --verbose

# Run specific test file
npm test -- debug-mode.test.ts

# Run tests with coverage report
npm test -- --coverage

# Debug specific test case
npm test -- --testNamePattern="should trigger at 100% rate"
```

## Contributing

When adding new debug mode functionality:

1. **Add corresponding tests** in the appropriate container's test directory
2. **Follow AAA pattern** for test structure
3. **Mock external dependencies** to ensure isolation
4. **Test both debug and production modes** for behavioral differences
5. **Update this documentation** with new test categories or patterns

### Test File Naming Convention

- `debug-mode.test.ts` - Core debug functionality for the container
- `{feature}-debug.test.ts` - Feature-specific debug behavior
- `debug-{category}.test.ts` - Category-specific debug tests

## Continuous Integration

The debug mode tests are integrated into the CI/CD pipeline:

- **PR Validation** - All debug tests must pass before merge
- **Container-Specific Builds** - Only affected containers are tested
- **Coverage Reporting** - Debug mode coverage is tracked separately
- **Performance Testing** - Debug mode should not significantly impact performance

## Future Enhancements

Planned improvements to the debug mode testing suite:

1. **Integration Tests** - Complete debug mode workflows
2. **Performance Benchmarks** - Debug mode overhead measurement
3. **Visual Test Reports** - HTML coverage and test result reports
4. **Automated Environment Setup** - Docker-based test environments
5. **Cross-Container Integration** - Tests spanning multiple containers
