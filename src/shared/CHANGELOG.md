# @starbunk/shared

## 1.31.2

### Patch Changes

- 7eddc30: fix: remove message.reply fallback from sendMessageWithBotIdentity

  When webhook creation fails due to missing Manage Webhooks permission,
  the service now skips the response silently instead of falling back to
  message.reply() (which sent as the bot account, not the configured identity).
  Permission handling moved into WebhookService.send() where it belongs.

## 1.31.1

### Patch Changes

- 7eddc30: fix: remove message.reply fallback from sendMessageWithBotIdentity

  When webhook creation fails due to missing Manage Webhooks permission,
  the service now skips the response silently instead of falling back to
  message.reply() (which sent as the bot account, not the configured identity).
  Permission handling moved into WebhookService.send() where it belongs.
