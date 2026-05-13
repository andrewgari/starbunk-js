# @starbunk/covabot

## 1.32.0

### Minor Changes

- a6d582e: Add structured observability to CovaBot: expanded ResponseReason type (self_message, bot_author, empty_message, rate_limited, llm_ignored), INFO-level structured logs for message_responded/message_skipped events with content previews, and Prometheus counter covabot_message_decisions_total with decision/reason/channel_id/profile_id labels.

### Patch Changes

- 0d73869: Increase default max_tokens from 256 to 512 to prevent mid-sentence message cutoffs
- Updated dependencies [7eddc30]
  - @starbunk/shared@1.31.1
