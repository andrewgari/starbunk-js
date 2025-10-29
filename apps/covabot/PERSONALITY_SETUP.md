# CovaBot Personality Setup Guide

## Overview

CovaBot uses an external personality file to define how the bot responds to messages. This keeps sensitive personality data out of version control and makes it easy to customize the bot's behavior.

## Quick Start

### 1. Create Your Personality File

Copy the example personality file to create your own:

```bash
cd apps/covabot/data
cp personality.example.txt personality.txt
```

### 2. Customize the Personality

Edit `personality.txt` to match your bot's character:

```bash
# Edit with your preferred editor
nano personality.txt
# or
vim personality.txt
```

### 3. Run the Bot

The bot will automatically load `personality.txt` at startup:

```bash
npm run dev:covabot
# or with Docker
docker-compose -f apps/covabot/docker-compose.yml up
```

## File Structure

```
apps/covabot/data/
├── personality.example.txt    # Template (tracked in git)
└── personality.txt            # Your custom personality (gitignored)
```

## What Gets Loaded

The bot loads personality in this order:

1. **First**: Tries to load `apps/covabot/data/personality.txt`
2. **Fallback**: If file not found, uses a minimal default personality
3. **Caching**: Personality is cached in memory after first load

## Personality File Format

The personality file is plain text with sections:

```
# Cova's Personality Profile

You are Cova, a senior software developer...

## Core Identity
- Senior TypeScript/JavaScript developer
- Creator of Starbunk Discord bot framework
- ...

## Communication Style
- Direct and casual
- Uses contractions extensively
- ...

## Response Decision Framework

### RESPOND: YES (High Priority)
- Direct technical questions
- ...

### RESPOND: NO (Don't Respond)
- Spam or low-effort content
- ...

## Critical Rules
1. NEVER use generic responses
2. NEVER force topics
3. ...
```

## Customization Tips

### For a Different Bot Character

1. Change the "Core Identity" section to match your bot
2. Update "Communication Style" to reflect how your bot should talk
3. Modify "Response Decision Framework" for what topics to respond to
4. Add your own "Example Response Patterns"

### For Different Personalities

You can create multiple personality files and switch between them:

```bash
# Create different personalities
cp personality.example.txt personality.casual.txt
cp personality.example.txt personality.formal.txt

# Switch by renaming
mv personality.txt personality.backup.txt
mv personality.casual.txt personality.txt
```

### Testing Changes

After editing `personality.txt`:

1. Restart the bot (it will reload the file)
2. Test in Discord to see the new behavior
3. Adjust as needed

## Important Notes

⚠️ **Never commit `personality.txt` to GitHub**
- It's in `.gitignore` for a reason
- Keep it local to your deployment
- Each deployment can have its own personality

✅ **Always commit `personality.example.txt`**
- This is the template for new deployments
- Update it when you want to change the default template

## Troubleshooting

### Bot not responding to messages

1. Check that `personality.txt` exists:
   ```bash
   ls -la apps/covabot/data/personality.txt
   ```

2. Check the bot logs for errors:
   ```bash
   docker logs covabot
   ```

3. Verify the personality file is valid (no syntax errors)

### Bot using default personality

If you see "Using default personality" in logs:
- The `personality.txt` file was not found
- Create it by copying `personality.example.txt`
- Restart the bot

### Changes not taking effect

1. Restart the bot (it caches personality on startup)
2. Check that you edited the correct file
3. Verify the file has no syntax errors

## Environment Variables

The personality loader doesn't require any environment variables. It automatically:
- Looks for `apps/covabot/data/personality.txt`
- Falls back to default if not found
- Caches the personality in memory

## API Reference

### Loading Personality

```typescript
import { getPersonalityPrompt } from '../services/personalityLoader';

const personality = getPersonalityPrompt();
// Returns the personality prompt as a string
```

### Reloading Personality

```typescript
import { reloadPersonality } from '../services/personalityLoader';

// Reload from file (useful for hot-reloading)
const newPersonality = reloadPersonality();
```

### Clearing Cache

```typescript
import { clearPersonalityCache } from '../services/personalityLoader';

// Clear the cached personality
clearPersonalityCache();
```

## Best Practices

1. **Keep it concise**: The personality prompt is sent with every LLM call
2. **Be specific**: Generic descriptions lead to generic responses
3. **Include examples**: Show the bot what good responses look like
4. **Test thoroughly**: Try different message types to verify behavior
5. **Version your personalities**: Keep backups of working personalities

## See Also

- [DESIGN_PLAN_CLEAN_SLATE.md](./DESIGN_PLAN_CLEAN_SLATE.md) - Overall design
- [CLEAN_SLATE_IMPLEMENTATION_SUMMARY.md](./CLEAN_SLATE_IMPLEMENTATION_SUMMARY.md) - Implementation details
- [.env.example](./.env.example) - Environment configuration

