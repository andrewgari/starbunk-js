# @starbunk/covabot

## 1.42.0

### Minor Changes

- a6d582e: Add structured observability to CovaBot: expanded ResponseReason type (self_message, bot_author, empty_message, rate_limited, llm_ignored), INFO-level structured logs for message_responded/message_skipped events with content previews, and Prometheus counter covabot_message_decisions_total with decision/reason/channel_id/profile_id labels.

### Patch Changes

- 0d73869: Increase default max_tokens from 256 to 512 to prevent mid-sentence message cutoffs
- ccb4863: Fix empty affirmation responses and raise default token limit

  Add explicit system prompt guidance to use the IGNORE marker instead of hollow one-word acknowledgments like "Great!" or "Fantastic!". Raise the default max_tokens fallback in all LLM providers from 500 to 1000.

- a95ddca: Surface finish_reason/stop_reason from all LLM providers; suppress truncated responses in CovaBot; promote Gemini to first-priority provider
- Updated dependencies [ccb4863]
- Updated dependencies [7eddc30]
- Updated dependencies [a95ddca]
  - @starbunk/shared@1.38.0

## 1.41.0

### Minor Changes

- a6d582e: Add structured observability to CovaBot: expanded ResponseReason type (self_message, bot_author, empty_message, rate_limited, llm_ignored), INFO-level structured logs for message_responded/message_skipped events with content previews, and Prometheus counter covabot_message_decisions_total with decision/reason/channel_id/profile_id labels.

### Patch Changes

- 0d73869: Increase default max_tokens from 256 to 512 to prevent mid-sentence message cutoffs
- ccb4863: Fix empty affirmation responses and raise default token limit

  Add explicit system prompt guidance to use the IGNORE marker instead of hollow one-word acknowledgments like "Great!" or "Fantastic!". Raise the default max_tokens fallback in all LLM providers from 500 to 1000.

- a95ddca: Surface finish_reason/stop_reason from all LLM providers; suppress truncated responses in CovaBot; promote Gemini to first-priority provider
- Updated dependencies [ccb4863]
- Updated dependencies [7eddc30]
- Updated dependencies [a95ddca]
  - @starbunk/shared@1.37.0

## 1.40.0

### Minor Changes

- a6d582e: Add structured observability to CovaBot: expanded ResponseReason type (self_message, bot_author, empty_message, rate_limited, llm_ignored), INFO-level structured logs for message_responded/message_skipped events with content previews, and Prometheus counter covabot_message_decisions_total with decision/reason/channel_id/profile_id labels.

### Patch Changes

- 0d73869: Increase default max_tokens from 256 to 512 to prevent mid-sentence message cutoffs
- ccb4863: Fix empty affirmation responses and raise default token limit

  Add explicit system prompt guidance to use the IGNORE marker instead of hollow one-word acknowledgments like "Great!" or "Fantastic!". Raise the default max_tokens fallback in all LLM providers from 500 to 1000.

- a95ddca: Surface finish_reason/stop_reason from all LLM providers; suppress truncated responses in CovaBot; promote Gemini to first-priority provider
- Updated dependencies [ccb4863]
- Updated dependencies [7eddc30]
- Updated dependencies [a95ddca]
  - @starbunk/shared@1.36.0

## 1.39.0

### Minor Changes

- a6d582e: Add structured observability to CovaBot: expanded ResponseReason type (self_message, bot_author, empty_message, rate_limited, llm_ignored), INFO-level structured logs for message_responded/message_skipped events with content previews, and Prometheus counter covabot_message_decisions_total with decision/reason/channel_id/profile_id labels.

### Patch Changes

- 0d73869: Increase default max_tokens from 256 to 512 to prevent mid-sentence message cutoffs
- ccb4863: Fix empty affirmation responses and raise default token limit

  Add explicit system prompt guidance to use the IGNORE marker instead of hollow one-word acknowledgments like "Great!" or "Fantastic!". Raise the default max_tokens fallback in all LLM providers from 500 to 1000.

- a95ddca: Surface finish_reason/stop_reason from all LLM providers; suppress truncated responses in CovaBot; promote Gemini to first-priority provider
- Updated dependencies [ccb4863]
- Updated dependencies [7eddc30]
- Updated dependencies [a95ddca]
  - @starbunk/shared@1.35.0

## 1.38.0

### Minor Changes

- a6d582e: Add structured observability to CovaBot: expanded ResponseReason type (self_message, bot_author, empty_message, rate_limited, llm_ignored), INFO-level structured logs for message_responded/message_skipped events with content previews, and Prometheus counter covabot_message_decisions_total with decision/reason/channel_id/profile_id labels.

### Patch Changes

- 0d73869: Increase default max_tokens from 256 to 512 to prevent mid-sentence message cutoffs
- ccb4863: Fix empty affirmation responses and raise default token limit

  Add explicit system prompt guidance to use the IGNORE marker instead of hollow one-word acknowledgments like "Great!" or "Fantastic!". Raise the default max_tokens fallback in all LLM providers from 500 to 1000.

- a95ddca: Surface finish_reason/stop_reason from all LLM providers; suppress truncated responses in CovaBot; promote Gemini to first-priority provider
- Updated dependencies [ccb4863]
- Updated dependencies [7eddc30]
- Updated dependencies [a95ddca]
  - @starbunk/shared@1.34.0

## 1.37.0

### Minor Changes

- a6d582e: Add structured observability to CovaBot: expanded ResponseReason type (self_message, bot_author, empty_message, rate_limited, llm_ignored), INFO-level structured logs for message_responded/message_skipped events with content previews, and Prometheus counter covabot_message_decisions_total with decision/reason/channel_id/profile_id labels.

### Patch Changes

- 0d73869: Increase default max_tokens from 256 to 512 to prevent mid-sentence message cutoffs
- ccb4863: Fix empty affirmation responses and raise default token limit

  Add explicit system prompt guidance to use the IGNORE marker instead of hollow one-word acknowledgments like "Great!" or "Fantastic!". Raise the default max_tokens fallback in all LLM providers from 500 to 1000.

- a95ddca: Surface finish_reason/stop_reason from all LLM providers; suppress truncated responses in CovaBot; promote Gemini to first-priority provider
- Updated dependencies [ccb4863]
- Updated dependencies [7eddc30]
- Updated dependencies [a95ddca]
  - @starbunk/shared@1.33.0

## 1.36.0

### Minor Changes

- a6d582e: Add structured observability to CovaBot: expanded ResponseReason type (self_message, bot_author, empty_message, rate_limited, llm_ignored), INFO-level structured logs for message_responded/message_skipped events with content previews, and Prometheus counter covabot_message_decisions_total with decision/reason/channel_id/profile_id labels.

### Patch Changes

- 0d73869: Increase default max_tokens from 256 to 512 to prevent mid-sentence message cutoffs
- ccb4863: Fix empty affirmation responses and raise default token limit

  Add explicit system prompt guidance to use the IGNORE marker instead of hollow one-word acknowledgments like "Great!" or "Fantastic!". Raise the default max_tokens fallback in all LLM providers from 500 to 1000.

- a95ddca: Surface finish_reason/stop_reason from all LLM providers; suppress truncated responses in CovaBot; promote Gemini to first-priority provider
- Updated dependencies [ccb4863]
- Updated dependencies [7eddc30]
- Updated dependencies [a95ddca]
  - @starbunk/shared@1.32.0

## 1.35.0

### Minor Changes

- a6d582e: Add structured observability to CovaBot: expanded ResponseReason type (self_message, bot_author, empty_message, rate_limited, llm_ignored), INFO-level structured logs for message_responded/message_skipped events with content previews, and Prometheus counter covabot_message_decisions_total with decision/reason/channel_id/profile_id labels.

### Patch Changes

- 0d73869: Increase default max_tokens from 256 to 512 to prevent mid-sentence message cutoffs
- ccb4863: Fix empty affirmation responses and raise default token limit

  Add explicit system prompt guidance to use the IGNORE marker instead of hollow one-word acknowledgments like "Great!" or "Fantastic!". Raise the default max_tokens fallback in all LLM providers from 500 to 1000.

- Updated dependencies [ccb4863]
- Updated dependencies [7eddc30]
  - @starbunk/shared@1.31.4

## 1.34.0

### Minor Changes

- a6d582e: Add structured observability to CovaBot: expanded ResponseReason type (self_message, bot_author, empty_message, rate_limited, llm_ignored), INFO-level structured logs for message_responded/message_skipped events with content previews, and Prometheus counter covabot_message_decisions_total with decision/reason/channel_id/profile_id labels.

### Patch Changes

- 0d73869: Increase default max_tokens from 256 to 512 to prevent mid-sentence message cutoffs
- Updated dependencies [7eddc30]
  - @starbunk/shared@1.31.3

## 1.33.0

### Minor Changes

- a6d582e: Add structured observability to CovaBot: expanded ResponseReason type (self_message, bot_author, empty_message, rate_limited, llm_ignored), INFO-level structured logs for message_responded/message_skipped events with content previews, and Prometheus counter covabot_message_decisions_total with decision/reason/channel_id/profile_id labels.

### Patch Changes

- 0d73869: Increase default max_tokens from 256 to 512 to prevent mid-sentence message cutoffs
- Updated dependencies [7eddc30]
  - @starbunk/shared@1.31.2

## 1.32.0

### Minor Changes

- a6d582e: Add structured observability to CovaBot: expanded ResponseReason type (self_message, bot_author, empty_message, rate_limited, llm_ignored), INFO-level structured logs for message_responded/message_skipped events with content previews, and Prometheus counter covabot_message_decisions_total with decision/reason/channel_id/profile_id labels.

### Patch Changes

- 0d73869: Increase default max_tokens from 256 to 512 to prevent mid-sentence message cutoffs
- Updated dependencies [7eddc30]
  - @starbunk/shared@1.31.1
