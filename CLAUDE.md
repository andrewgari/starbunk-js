# Starbunk-js Development Guide

## Commands
- Build: `npm run build` or `npm run build:clean` (cleans dist folder first)
- Start: `npm run dev` (development) or `npm start` (production)
- Lint: `npm run lint` or `npm run lint:fix` (auto-fix)
- Format: `npm run format` (prettier)
- Type check: `npm run type-check`
- Test: `npm test` or `npx jest path/to/specific/test.test.ts`

## Code Style
- **Formatting**: Tabs, 120 char width, single quotes, trailing commas
- **Classes**: Keep small (<200 lines), one class per file
- **Functions**: Pure when possible, <20 lines, max 3 parameters
- **Naming**: camelCase for methods/variables, PascalCase for classes/constants
- **Types**: Explicit return types, no any, use interfaces for contracts
- **Imports**: Sort by external → internal, group by category

## Testing
- Follow AAA pattern: Arrange, Act, Assert
- Test behaviors not implementations
- Mock external dependencies
- Use testUtils.ts for common test helpers
- Use container.clear() in beforeEach() to reset DI container

## Dependency Injection
- Use ServiceContainer for registering services
- Reference ServiceRegistry constants for service keys
- Inject dependencies via constructor parameters
- Reset container in tests with container.clear()
- Use interfaces for all services (ILogger, IWebhookService)