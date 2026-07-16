---
"@starbunk/covabot": patch
"@starbunk/shared": patch
---

Fix empty affirmation responses and raise default token limit

Add explicit system prompt guidance to use the IGNORE marker instead of hollow one-word acknowledgments like "Great!" or "Fantastic!". Raise the default max_tokens fallback in all LLM providers from 500 to 1000.
