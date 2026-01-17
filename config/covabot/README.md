# CovaBot Configuration

This directory contains configuration files for CovaBot.

## Files

Place any CovaBot configuration files here (e.g., personality settings, response templates).

## Environment Variables

- `COVABOT_CONFIG_DIR` - Points to `/app/config` (this directory in the container)
- `COVABOT_DATA_DIR` - Points to `/app/data` (separate writable data directory)

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

