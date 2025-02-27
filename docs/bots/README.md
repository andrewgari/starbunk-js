# Starbunk Discord Bots

This directory contains documentation for all the bots in the Starbunk Discord bot system.

## Bot Types

Starbunk has two main types of bots:

1. **Reply Bots** - These bots respond to specific patterns or conditions in text messages.
2. **Voice Bots** - These bots monitor and manage voice channel activities.

## Bot Architecture

All bots in the system follow a consistent architecture:

### Reply Bots

Reply bots inherit from the `ReplyBot` base class and typically include:

- **Identity**: Name and avatar URL
- **Trigger Condition**: What causes the bot to respond (patterns, user IDs, etc.)
- **Response Generator**: What the bot says when triggered

Most reply bots are created using the `BotBuilder` class, which provides a fluent API for configuring bot behavior.

### Voice Bots

Voice bots inherit from the `VoiceBot` base class and typically include:

- **Event Handlers**: Logic for responding to voice channel events
- **Rules**: Conditions that determine when the bot should take action

## Bot List

### Reply Bots

| Bot Name | Description |
|----------|-------------|
| BabyBot | Responds to mentions of "baby" |
| BananaBot | Responds to mentions of "banana" |
| BlueBot | A complex bot that responds to mentions of "blue" with various behaviors |
| BotBot | Responds to mentions of "bot" |
| ChaosBot | Responds to mentions of "chaos" |
| CheckBot | Responds to check-related messages |
| EzioBot | Responds to mentions of "ezio" or "assassin" |
| GundamBot | Responds to mentions of Gundam and related terms |
| GuyBot | Responds to mentions of "guy" |
| HoldBot | Responds to mentions of "hold" |
| MacaroniBot | Responds to mentions of "macaroni" or "pasta" |
| MusicCorrectBot | Responds to music commands |
| NiceBot | Responds to the number "69" |
| PickleBot | Responds to pickle-related messages |
| SheeshBot | Responds to "sheesh" |
| SigGreatBot | Responds to "sig best" or "sig greatest" |
| SoggyBot | Responds to mentions of "wet bread" |
| SpiderBot | Responds to "spiderman" to correct the hyphenation |
| VennBot | Responds to mentions of "venn" |

### Voice Bots

| Bot Name | Description |
|----------|-------------|
| GuyChannelBot | Manages voice channel access for a user named "Guy" |

## Adding New Bots

To add a new bot:

1. Create a new file in `src/starbunk/bots/reply-bots/` or `src/starbunk/bots/voice-bots/`
2. Use the `BotBuilder` class for reply bots or extend `VoiceBot` for voice bots
3. Register the bot in the appropriate client class
4. Add tests for your bot in the `__tests__` directory
5. Add documentation in this directory

See individual bot documentation for examples and implementation details.
