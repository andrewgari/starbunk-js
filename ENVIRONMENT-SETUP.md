# Environment Configuration Guide

This guide explains how to properly configure environment variables for the Starbunk Discord Bot containers.

## Environment File Location

All Docker Compose files now explicitly reference the `.env` file located in the repository root directory. This ensures consistent environment variable loading across all deployment scenarios.

### File Structure
```
starbunk-js/
├── .env                          # Main environment file (THIS FILE)
├── docker-compose.latest.yml     # Production deployment
├── docker-compose.snapshot.yml   # PR testing deployment
├── docker-compose.yml           # Development with local PostgreSQL
└── ...
```

## Required Environment Variables

The following environment variables must be defined in the `.env` file:

### Discord Bot Configuration
```bash
STARBUNK_TOKEN=your_discord_bot_token_here
SNOWBUNK_TOKEN=your_secondary_bot_token_here
CLIENT_ID=your_discord_application_client_id
GUILD_ID=your_discord_server_guild_id
```

### Database Configuration
```bash
DATABASE_URL="postgresql://username:password@host:port/database?schema=public"

# PostgreSQL credentials (for local development)
POSTGRES_DB=starbunk
POSTGRES_USER=starbunk
POSTGRES_PASSWORD=your_postgres_password
POSTGRES_PORT=5432
```

### AI/LLM Configuration
```bash
OPENAI_API_KEY=your_openai_api_key
OPENAI_DEFAULT_MODEL=gpt-4o-mini

# Optional: Ollama configuration for local LLM
OLLAMA_API_URL=http://your_ollama_host:11434
OLLAMA_DEFAULT_MODEL=llama3:8b
```

### Optional Configuration
```bash
WEBHOOK_URL=                      # Optional webhook URL
DEBUG_MODE=false                  # Set to true for debug logging
LOG_LEVEL=info                   # Logging level: debug, info, warn, error
```

## Unraid Plugin Integration

For Unraid users, ensure that:

1. **Environment File Path**: The `.env` file should be placed in the same directory as your Docker Compose files
2. **File Permissions**: Ensure the `.env` file is readable by the Docker daemon
3. **Variable Validation**: All required variables must have valid values (no empty required fields)

### Unraid Template Configuration

When setting up the Unraid template, map the environment file location to:
```
Host Path: /path/to/your/starbunk-js/.env
Container Path: /app/.env (if needed by specific containers)
```

## Container-Specific Environment Variables

Each container only requires specific environment variables:

### BunkBot Container
- `STARBUNK_TOKEN`, `CLIENT_ID`, `GUILD_ID`
- `DATABASE_URL` (for persistence)
- `OPENAI_API_KEY` (optional, for AI features)
- `WEBHOOK_URL` (optional)

### DJCova Container
- `STARBUNK_TOKEN`, `CLIENT_ID`, `GUILD_ID`
- No database or AI requirements

### Starbunk-DND Container
- `STARBUNK_TOKEN`, `SNOWBUNK_TOKEN`, `CLIENT_ID`, `GUILD_ID`
- `DATABASE_URL` (required for D&D data)
- `OPENAI_API_KEY` (required for AI features)
- `OLLAMA_API_URL`, `OLLAMA_DEFAULT_MODEL` (optional)

### CovaBot Container
- `STARBUNK_TOKEN`, `CLIENT_ID`, `GUILD_ID`
- `DATABASE_URL` (for personality data)
- `OPENAI_API_KEY` (required for AI personality)

## Troubleshooting

### Common Issues

1. **Environment variables not loading**
   - Verify `.env` file is in the same directory as the Docker Compose file
   - Check file permissions (should be readable by Docker)
   - Ensure no syntax errors in `.env` file (no spaces around `=`)

2. **Missing required variables**
   - Check that all required variables are defined
   - Verify no empty values for required fields
   - Use `docker compose config` to validate configuration

3. **Unraid-specific issues**
   - Ensure the Unraid plugin has access to the `.env` file location
   - Check that the Docker Compose file path is correctly configured
   - Verify network connectivity for external services (database, APIs)

### Validation Commands

Test your configuration:
```bash
# Validate Docker Compose configuration
docker compose -f docker-compose.latest.yml config --quiet

# Check environment variable substitution
docker compose -f docker-compose.latest.yml config | grep -A 10 environment
```

## Security Notes

- Never commit real tokens/passwords to version control
- Use strong, unique passwords for database connections
- Regularly rotate API keys and bot tokens
- Restrict database access to necessary IP ranges only
