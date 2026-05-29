# @starbunk/shared

## 1.36.0

### Minor Changes

- a95ddca: Surface finish_reason/stop_reason from all LLM providers; suppress truncated responses in CovaBot; promote Gemini to first-priority provider

### Patch Changes

- ccb4863: Fix empty affirmation responses and raise default token limit

  Add explicit system prompt guidance to use the IGNORE marker instead of hollow one-word acknowledgments like "Great!" or "Fantastic!". Raise the default max_tokens fallback in all LLM providers from 500 to 1000.

- 7eddc30: fix: remove message.reply fallback from sendMessageWithBotIdentity

  When webhook creation fails due to missing Manage Webhooks permission,
  the service now skips the response silently instead of falling back to
  message.reply() (which sent as the bot account, not the configured identity).
  Permission handling moved into WebhookService.send() where it belongs.

## 1.35.0

### Minor Changes

- a95ddca: Surface finish_reason/stop_reason from all LLM providers; suppress truncated responses in CovaBot; promote Gemini to first-priority provider

### Patch Changes

- ccb4863: Fix empty affirmation responses and raise default token limit

  Add explicit system prompt guidance to use the IGNORE marker instead of hollow one-word acknowledgments like "Great!" or "Fantastic!". Raise the default max_tokens fallback in all LLM providers from 500 to 1000.

- 7eddc30: fix: remove message.reply fallback from sendMessageWithBotIdentity

  When webhook creation fails due to missing Manage Webhooks permission,
  the service now skips the response silently instead of falling back to
  message.reply() (which sent as the bot account, not the configured identity).
  Permission handling moved into WebhookService.send() where it belongs.

## 1.34.0

### Minor Changes

- a95ddca: Surface finish_reason/stop_reason from all LLM providers; suppress truncated responses in CovaBot; promote Gemini to first-priority provider

### Patch Changes

- ccb4863: Fix empty affirmation responses and raise default token limit

  Add explicit system prompt guidance to use the IGNORE marker instead of hollow one-word acknowledgments like "Great!" or "Fantastic!". Raise the default max_tokens fallback in all LLM providers from 500 to 1000.

- 7eddc30: fix: remove message.reply fallback from sendMessageWithBotIdentity

  When webhook creation fails due to missing Manage Webhooks permission,
  the service now skips the response silently instead of falling back to
  message.reply() (which sent as the bot account, not the configured identity).
  Permission handling moved into WebhookService.send() where it belongs.

## 1.33.0

### Minor Changes

- a95ddca: Surface finish_reason/stop_reason from all LLM providers; suppress truncated responses in CovaBot; promote Gemini to first-priority provider

### Patch Changes

- ccb4863: Fix empty affirmation responses and raise default token limit

  Add explicit system prompt guidance to use the IGNORE marker instead of hollow one-word acknowledgments like "Great!" or "Fantastic!". Raise the default max_tokens fallback in all LLM providers from 500 to 1000.

- 7eddc30: fix: remove message.reply fallback from sendMessageWithBotIdentity

  When webhook creation fails due to missing Manage Webhooks permission,
  the service now skips the response silently instead of falling back to
  message.reply() (which sent as the bot account, not the configured identity).
  Permission handling moved into WebhookService.send() where it belongs.

## 1.32.0

### Minor Changes

- a95ddca: Surface finish_reason/stop_reason from all LLM providers; suppress truncated responses in CovaBot; promote Gemini to first-priority provider

### Patch Changes

- ccb4863: Fix empty affirmation responses and raise default token limit

  Add explicit system prompt guidance to use the IGNORE marker instead of hollow one-word acknowledgments like "Great!" or "Fantastic!". Raise the default max_tokens fallback in all LLM providers from 500 to 1000.

- 7eddc30: fix: remove message.reply fallback from sendMessageWithBotIdentity

  When webhook creation fails due to missing Manage Webhooks permission,
  the service now skips the response silently instead of falling back to
  message.reply() (which sent as the bot account, not the configured identity).
  Permission handling moved into WebhookService.send() where it belongs.

## 1.31.4

### Patch Changes

- ccb4863: Fix empty affirmation responses and raise default token limit

  Add explicit system prompt guidance to use the IGNORE marker instead of hollow one-word acknowledgments like "Great!" or "Fantastic!". Raise the default max_tokens fallback in all LLM providers from 500 to 1000.

- 7eddc30: fix: remove message.reply fallback from sendMessageWithBotIdentity

  When webhook creation fails due to missing Manage Webhooks permission,
  the service now skips the response silently instead of falling back to
  message.reply() (which sent as the bot account, not the configured identity).
  Permission handling moved into WebhookService.send() where it belongs.

## 1.31.3

### Patch Changes

- 7eddc30: fix: remove message.reply fallback from sendMessageWithBotIdentity

  When webhook creation fails due to missing Manage Webhooks permission,
  the service now skips the response silently instead of falling back to
  message.reply() (which sent as the bot account, not the configured identity).
  Permission handling moved into WebhookService.send() where it belongs.

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
