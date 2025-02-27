# Starbunk Triggers System

This directory contains the trigger system for Starbunk's Discord bots.

## File Structure

- `baseTrigger.ts` - Contains the base TriggerCondition interface all triggers implement
- `index.ts` - Main export file for all triggers

### Subdirectories

- `/conditions` - User-based conditions (checking message author, roles, etc.)

    - `userConditions.ts` - Utility functions for checking user properties

- `/patterns` - Pattern-based triggers using regular expressions

    - `patternTriggers.ts` - Triggers that match text patterns

- `/composite` - Logical trigger combinations

    - `compositeTriggers.ts` - AND/OR/NOT logic for combining triggers

- `/special` - Bot-specific specialized triggers
    - `bluBotTriggers.ts` - BluBot-specific triggers, including AI detection
    - `vennTriggers.ts` - Venn-specific triggers with rate limiting

## Usage

Import triggers from the main entry point:

```typescript
import { CompositeTrigger, BlueBotMentionTrigger, isVenn } from '../triggers';
```

Create complex trigger conditions by combining simpler ones:

```typescript
// Trigger when a message mentions blue AND is not from a bot
const bluMentionTrigger = new AllConditionsTrigger([new BlueBotMentionTrigger(), new NotTrigger(isBot)]);
```
