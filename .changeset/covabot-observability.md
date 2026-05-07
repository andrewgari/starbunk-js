---
"@starbunk/covabot": minor
---

Add structured observability to CovaBot: expanded ResponseReason type (self_message, bot_author, empty_message, rate_limited, llm_ignored), INFO-level structured logs for message_responded/message_skipped events with content previews, and Prometheus counter covabot_message_decisions_total with decision/reason/channel_id/profile_id labels.
