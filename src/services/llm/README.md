# PromptKit - Simplified LLM Prompting

PromptKit is a lightweight utility for working with LLM prompts, making it easy to request both terse yes/no responses and conversational interactions with defined personalities.

## Key Features

- 🚀 **Simplified API** - Easy-to-use interface for common LLM tasks
- 🎭 **Personality Templates** - Register and reuse AI personalities
- ✅ **Boolean Decisions** - Get simple yes/no answers with minimal tokens
- 💬 **Conversational Responses** - Generate detailed conversational responses
- 🔄 **Compatible with existing prompt registry** - Works with registered prompts

## Quick Start

```typescript
// Import PromptKit
import promptKit from '../services/llm/promptKit';
import { LLMProviderType } from '../services/llm/llmFactory';

// Register a personality
promptKit.registerPersonality({
  name: 'techExpert',
  systemPrompt: `You are a technical expert who provides accurate and thorough information about technical topics.`,
  temperature: 0.5,
  maxTokens: 300
});

// Get a yes/no response
const containsSensitiveData = await promptKit.askBoolean(
  "Does this text contain sensitive personal information?",
  `You determine if text contains sensitive personal information like addresses, phone numbers, SSNs, etc.`,
  { temperature: 0.1, maxTokens: 5 }
);

// Get a conversational response using a personality
const techExplanation = await promptKit.chat(
  "Explain how WebSockets work",
  'techExpert',
  { providerType: LLMProviderType.OLLAMA }
);
```

## Usage Guide

### 1. Registering Personalities

Personalities are reusable system prompts with associated parameters:

```typescript
promptKit.registerPersonality({
  name: 'friendlyAssistant',
  systemPrompt: `You are a friendly assistant who provides helpful and concise responses.`,
  temperature: 0.7,
  maxTokens: 150,
  defaultModel: 'llama2' // Optional default model
});
```

### 2. Getting Yes/No Responses

The `askBoolean` method is optimized for binary decisions:

```typescript
const isQuestion = await promptKit.askBoolean(
  "Is the following text a question?",
  "You determine if a given text is a question or not.",
  {
    temperature: 0.1,
    maxTokens: 5,
    providerType: LLMProviderType.OLLAMA
  }
);

if (isQuestion) {
  // Handle question case
} else {
  // Handle non-question case
}
```

### 3. Conversational Responses

Generate rich conversational responses using registered personalities:

```typescript
const userMessage = "How can I improve my app's performance?";

const response = await promptKit.chat(
  userMessage,
  'techExpert',
  {
    temperature: 0.7,
    maxTokens: 300,
    providerType: LLMProviderType.OLLAMA
  }
);

console.log(response);
```

### 4. Using Registered Prompts

Use existing prompts from the prompt registry:

```typescript
import { PromptType } from '../services/llm/promptManager';

const geraldResponse = await promptKit.prompt(
  PromptType.GERALD_RESPONSE,
  "The earth is flat.",
  {
    temperature: 0.7,
    maxTokens: 150,
    providerType: LLMProviderType.OLLAMA
  }
);
```

### 5. Direct Message Chains

For multi-turn conversations or custom message structures:

```typescript
import { LLMMessage } from '../services/llm/llmService';

const messages: LLMMessage[] = [
  {
    role: 'system',
    content: 'You are a helpful assistant'
  },
  {
    role: 'user',
    content: 'Hello!'
  },
  {
    role: 'assistant',
    content: 'Hi there! How can I help you today?'
  },
  {
    role: 'user',
    content: 'What is the capital of France?'
  }
];

const response = await promptKit.complete(messages, {
  temperature: 0.7,
  maxTokens: 150,
  provider: LLMProviderType.OLLAMA
});
```

## Best Practices

1. **Use askBoolean for classification tasks** - Perfect for content filtering, intent detection, etc.
2. **Create personalities for consistent responses** - Define AI personalities once and reuse them
3. **Use lower temperatures (0.1-0.3) for deterministic responses** - Ensure consistency in classification tasks
4. **Use higher temperatures (0.7-0.9) for creative responses** - Generate varied and creative content
5. **Keep system prompts clear and concise** - Focus on defining the AI's role and response style

## Examples

See `src/services/llm/examples/promptKitExample.ts` for complete examples demonstrating all features.
