# BlueBot - Development Instructions

## Goals & Purpose
BlueBot is a specialized pattern-matching bot that specifically detects and replies to mentions of "blue" or Blue Mage references within Discord.

## Major Features
- Advanced pattern matching for triggering keywords.
- LLM-enhanced contextual detection to avoid false positives.
- Contextual and character-specific rapid responses.

## Inputs & Outputs
- **Input:** All message streams in applicable channels. It actively parses messages looking for triggers.
- **Output:** Witty or thematic Discord responses upon positive pattern match.

## Dependencies & Architecture
- **Primary Dependencies:** Discord.js, Postgres Database, optional OpenAI connectivity for contextual validation.
- Very lightweight footprint unless the LLM validation triggers. Processing is optimized for regex/matching speed.

## Edge Cases to Consider
- Rapid message saturation (avoiding spamming the channel).
- Properly differentiating between colloquial uses of "blue" vs explicitly triggered contexts.
- Ensuring the Regex engine evaluates efficiently and doesn't introduce ReDoS (Regex Denial of Service) vulnerabilities.
