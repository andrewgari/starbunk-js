# BlueBot Configuration

This directory contains configuration files for BlueBot (blue detection and response bot).

## Files

Place any BlueBot configuration files here (e.g., detection patterns, response settings).

## Environment Variables

- `BLUEBOT_CONFIG_DIR` - Points to `/app/config` (this directory in the container)

## Volume Mount

In docker-compose.yml:
```yaml
volumes:
  - ./config/bluebot:/app/config:ro
```

This directory is mounted as **read-only** in the container.

