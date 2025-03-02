# Bot Refactoring Progress

This document tracks the progress of refactoring bots to the new architecture.

## Completed Bots

- [x] BlueBot - Complex bot with multiple conditions, responses, and dynamic identity
- [x] SpiderBot - Simple bot with a single condition and response
- [x] NiceBot - Simple bot with a single condition and response
- [x] HoldBot - Simple bot with a single condition and response
- [x] GuyBot - Complex bot with combined conditions, random responses, and dynamic identity

## Pending Bots

- [ ] AttitudeBot
- [ ] BabyBot
- [ ] BananaBot
- [ ] BotBot
- [ ] ChaosBot
- [ ] CheckBot
- [ ] EzioBot
- [ ] GundamBot
- [ ] MacaroniBot
- [ ] MusicCorrectBot
- [ ] PickleBot
- [ ] SheeshBot
- [ ] SigGreatBot
- [ ] VennBot

## Refactoring Steps

For each bot:

1. Create the directory structure:

    ```bash
    mkdir -p src/starbunk/bots/reply-bots/[botName]/{conditions,responses,identity,utils}
    ```

2. Extract conditions to separate files in the `conditions` directory

3. Extract response generators to separate files in the `responses` directory

4. Extract identity updaters (if applicable) to separate files in the `identity` directory

5. Update the main bot file to use the new components

6. Update tests to use the new components

## Testing

After refactoring each bot, run the tests to ensure everything still works:

```bash
npm test -- -t "[BotName]"
```
