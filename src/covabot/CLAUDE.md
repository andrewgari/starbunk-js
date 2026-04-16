# CovaBot - Development Instructions

## Goals & Purpose
CovaBot acts as the AI personality for StarBunk, supplying context-aware, LLM-driven responses designed to mimic and interact with actual users. 

## Major Features
- Personality-driven AI generation.
- Dynamic conversation context modeling.
- Semantic search memory integration.

## Inputs & Outputs
- **Input:** Specific conversational mentions or active discussions within Discord.
- **Output:** Synthesized text responses formatted as Discord replies, injected with accurate personality traits.

## Dependencies & Architecture
- **Primary Dependencies:** LLM APIs (Gemini primary, Ollama fallback, OpenAI fallback), Postgres (conversation memory + social battery).
- Redis and Qdrant have been removed — social battery is stored in Postgres; interest matching uses keyword-based scoring.
- Scaled for LLM interactions. API calls should be heavily asynchronous and timeout-resistant.

## Edge Cases to Consider
- LLM API rate limits, timeouts, and hallucination management.
- All three LLM providers failing simultaneously (Gemini + Ollama + OpenAI).
- Parsing extremely long contextual threads efficiently.
- Avoiding infinite loops when interacting with other bots.
