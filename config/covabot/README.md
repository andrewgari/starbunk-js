# CovaBot Configuration

This directory contains configuration files for CovaBot personalities.

## Personality Configuration Files

Personality files should be in YAML format (`.yml` or `.yaml`) and follow the schema defined below.

### Example Configuration

See `example-personality.yml` for a complete working example.

### Schema

```yaml
profile:
  # Unique identifier for this personality
  id: "unique-bot-id"
  
  # Display name shown in Discord
  display_name: "Bot Display Name"
  
  # Optional: Avatar URL for webhook messages
  avatar_url: "https://example.com/avatar.png"
  
  # Identity configuration
  identity:
    type: static  # Options: static, mimic, random
    botName: "Bot Name"
    avatarUrl: "https://example.com/avatar.png"
    # For mimic type: as_member: "123456789012345678"
  
  # Personality configuration
  personality:
    system_prompt: |
      Define the bot's core personality and behavior here.
      This is the primary instruction for the AI model.
    
    # Personality traits
    traits:
      - "helpful"
      - "friendly"
      - "knowledgeable"
    
    # Topics the bot is interested in
    interests:
      - "technology"
      - "programming"
      - "gaming"
    
    # Speech patterns
    speech_patterns:
      lowercase: false          # Force lowercase responses
      sarcasm_level: 0.3       # 0.0-1.0, sarcasm tendency
      technical_bias: 0.5      # 0.0-1.0, technical language level
  
  # Response triggers
  triggers:
    - name: "greeting"
      conditions:
        any_of:
          - contains_word: "hello"
          - contains_word: "hi"
      use_llm: true
      response_chance: 0.8  # Probability of responding
  
  # Social battery (rate limiting)
  social_battery:
    max_messages: 5          # Max messages per window
    window_minutes: 10       # Time window in minutes
    cooldown_seconds: 30     # Minimum gap between messages
  
  # LLM configuration
  llm:
    model: "gpt-4o-mini"    # OpenAI model to use
    temperature: 0.4         # Response creativity (0.0-2.0)
    max_tokens: 256          # Maximum response length
  
  # Whether to ignore messages from other bots
  ignore_bots: true
```

### Trigger Conditions

Triggers support complex condition logic:

```yaml
triggers:
  - name: "example"
    conditions:
      # Simple conditions
      contains_word: "hello"
      contains_phrase: "good morning"
      matches_pattern: "^hello.*world$"
      from_user: "123456789012345678"
      with_chance: 0.5
      always: true
      
      # Logical operators
      any_of:
        - contains_word: "hello"
        - contains_word: "hi"
      all_of:
        - contains_word: "help"
        - from_user: "123456789012345678"
      none_of:
        - contains_word: "spam"
    
    use_llm: true
    response_chance: 0.8
    responses: "Optional canned response"
```

## Loading Personalities

Personalities are automatically loaded from this directory when CovaBot starts. The directory path can be configured via:

1. Constructor parameter: `new PersonalityManager('/path/to/config')`
2. Environment variable: `COVABOT_CONFIG_DIR=/path/to/config`
3. Default location: `config/covabot/` in the project root

## Environment Variables

- `COVABOT_CONFIG_DIR` - Points to this configuration directory
- `COVABOT_DATA_DIR` - Points to `/app/data` (separate writable data directory for personality notes)

## Volume Mounts

In docker-compose.yml:
```yaml
volumes:
  # Configuration directory (read-only)
  - ./config/covabot:/app/config:ro
  # Data directory for personality notes (read-write)
  - ${UNRAID_APPDATA_PATH:-./data}/covabot:/app/data
```

This config directory is mounted as **read-only** in the container.
Writable data (personality notes, conversation history) goes in the data directory.

## Adding New Personalities

1. Create a new `.yml` file in this directory
2. Follow the schema above
3. Restart CovaBot to load the new personality
4. The personality will be available by its `id` or `display_name`

## Validation

All personality files are validated against the schema on load. Invalid files will be:
- Logged as errors
- Skipped (other valid files will still load)
- Detailed error messages provided in logs


