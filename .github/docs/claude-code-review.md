# Claude Container-Aware Code Review System

## Overview

The Claude code review workflow provides intelligent, container-specific PR reviews for the Starbunk-JS Discord bot system. It leverages path-based filtering to analyze only the containers that have been modified and provides targeted feedback based on each container's specific functionality.

## Activation

### Reviewer-Triggered Activation
The workflow only runs when Claude is explicitly requested as a reviewer:

```bash
# Add Claude as a reviewer via GitHub CLI
gh pr review --request-reviewer claude

# Or through GitHub web interface:
# 1. Go to the PR page
# 2. Click "Reviewers" in the right sidebar
# 3. Search for and add "claude" as a reviewer
```

### Supported Trigger Events
- `review_requested` - When Claude is added as a reviewer
- `synchronize` - When new commits are pushed to a PR with Claude as reviewer
- `dismissed` - When Claude's review is dismissed (workflow exits gracefully)

## Container-Specific Analysis

### Path-Based Detection
The workflow uses `.github/path-filters.yml` to detect which containers are affected:

```yaml
# Example: Changes to containers/covabot/ trigger CovaBot-specific review
covabot:
  - 'containers/covabot/**'
  - 'containers/shared/**'  # Shared changes affect all containers
```

### Container Focus Areas

#### 🤖 BunkBot Container
**Functionality**: Reply bots + admin commands
**Review Focus**:
- Reply bot patterns and message matching logic
- Admin command implementations and permission handling
- Shared library integration
- Discord slash command registration
- Error handling and logging patterns

#### 🧠 CovaBot Container
**Functionality**: AI personality with Qdrant vector database
**Review Focus**:
- AI personality system and LLM integration
- Qdrant vector database operations
- Conversation memory management
- Web interface functionality (port 7080)
- Identity service and server-specific personalities
- Debug mode safety (TESTING_CHANNEL_IDS whitelist)

#### 🎵 DJCova Container
**Functionality**: Music bot with voice channel management
**Review Focus**:
- Music bot functionality and audio processing
- Voice channel management and connection handling
- Audio stream handling and queue management
- Auto-disconnect features (30-second timeout)
- Resource cleanup on disconnect

#### 🎲 Starbunk-DnD Container
**Functionality**: D&D game mechanics and character management
**Review Focus**:
- D&D game mechanics and rule implementations
- Character management and persistence
- Dice rolling systems and randomization
- Campaign and session management
- Game state persistence

#### ❄️ Snowbunk Container
**Functionality**: Specialized functionality with minimal resources
**Review Focus**:
- Minimal resource usage optimization
- Production-only deployment considerations
- Lightweight service architecture
- Efficient Discord API usage

#### 📚 Shared Library
**Functionality**: Core utilities affecting all containers
**Review Focus**:
- Cross-container utility functions
- Common Discord.js patterns and helpers
- Environment configuration management
- Message filtering and debug mode safety
- Breaking changes affecting multiple containers

## Security & Safety Checks

### Critical Safety Requirements
- ✅ **Discord Token Security**: No hardcoded tokens
- ✅ **Environment Variable Validation**: Proper configuration handling
- ✅ **Debug Mode Safety**: TESTING_CHANNEL_IDS whitelist enforcement
- ✅ **Input Sanitization**: Validation of user inputs
- ✅ **SQL Injection Prevention**: Safe database queries
- ✅ **Rate Limiting**: Abuse prevention mechanisms

### Performance Requirements
- ✅ **Container Resource Limits**: Compliance with Docker constraints
- ✅ **Memory Leak Prevention**: Proper resource cleanup
- ✅ **Efficient Discord API Usage**: Rate limiting and optimization
- ✅ **Database Query Optimization**: Performance considerations
- ✅ **Error Handling**: Graceful failure recovery

## CI/CD Integration

### Pre-Review Checks
The workflow runs container-specific checks before Claude review:

```bash
# For each affected container:
npm run lint          # Code quality and style
npm run type-check    # TypeScript validation
npm test             # Unit test execution
```

### Status Reporting
Claude receives real-time CI/CD status:
- **Linting**: ✅ All passed / ⚠️ Issues in [container]
- **Type Checking**: ✅ All passed / ⚠️ Issues in [container]
- **Tests**: ✅ All passed / ⚠️ Failures in [container]

## Configuration

### Environment Variables
```yaml
ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}  # Required
GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}            # Auto-provided
```

### Workflow Settings
```yaml
timeout-minutes: 20        # Maximum review time
model: "claude-3-5-sonnet-20241022"  # Claude model version
max_tokens: 8000          # Response length limit
```

### Permissions
```yaml
permissions:
  contents: read          # Repository access
  pull-requests: write    # Comment on PRs
  issues: read           # Issue context
  id-token: write        # Secure authentication
```

## Error Handling

### API Failure Recovery
- **Retry Strategy**: 60-second backoff on Claude API failures
- **Graceful Degradation**: Continues with reduced scope if needed
- **Rate Limit Protection**: 30-second delays on repeated failures

### Cleanup Procedures
- **Temporary Files**: Automatic cleanup of lint/test outputs
- **Resource Management**: Proper container resource cleanup
- **Error Logging**: Comprehensive failure reporting

## Usage Examples

### Basic Usage
```bash
# 1. Create a PR with container changes
git checkout -b feature/covabot-improvements
# ... make changes to containers/covabot/ ...
git push origin feature/covabot-improvements

# 2. Create PR and request Claude review
gh pr create --title "feat: improve CovaBot AI responses"
gh pr review --request-reviewer claude

# 3. Claude will automatically analyze CovaBot-specific changes
```

### Multi-Container Changes
```bash
# Changes affecting multiple containers
git checkout -b feature/shared-library-update
# ... make changes to containers/shared/ ...
# ... make changes to containers/covabot/ ...
git push origin feature/shared-library-update

# Claude will review both shared library and CovaBot impacts
gh pr create --title "feat: update shared library with new utilities"
gh pr review --request-reviewer claude
```

## Integration with CI/CD Pipeline

### Compatibility with PR #252
The workflow integrates seamlessly with the comprehensive CI/CD improvements:
- Uses the same path filters for consistency
- Respects container-specific build triggers
- Provides feedback aligned with build results

### Workflow Dependencies
```yaml
needs: detect-changes  # Uses path-based change detection
```

### Performance Optimization
- **Parallel Execution**: Container checks run in parallel
- **Selective Analysis**: Only reviews modified containers
- **Efficient Caching**: Leverages npm and dependency caches
- **Resource Limits**: Prevents runaway processes

## Troubleshooting

### Common Issues

#### Claude Not Triggered
**Problem**: Workflow doesn't run when expected
**Solution**: Ensure Claude is explicitly added as a reviewer

#### API Rate Limits
**Problem**: Claude API requests fail
**Solution**: Workflow includes automatic retry with backoff

#### Container Detection Issues
**Problem**: Wrong containers analyzed
**Solution**: Verify path filters in `.github/path-filters.yml`

### Debug Information
The workflow provides comprehensive logging:
- Container change detection results
- CI/CD check status for each container
- Claude API request/response status
- Error details and retry attempts

## Best Practices

### For Developers
1. **Request Claude Early**: Add Claude as reviewer when creating PR
2. **Container Focus**: Make changes to specific containers when possible
3. **Test Coverage**: Ensure new functionality has tests
4. **Documentation**: Update container-specific docs with changes

### For Maintainers
1. **Monitor API Usage**: Track Claude API consumption
2. **Update Prompts**: Refine container-specific review prompts
3. **Path Filter Maintenance**: Keep path filters accurate
4. **Security Reviews**: Regularly audit security check effectiveness

---

This container-aware Claude review system provides intelligent, targeted feedback while maintaining the modular architecture principles of the Starbunk-JS Discord bot system.
