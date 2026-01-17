# BunkBot Configuration

This directory contains configuration files for BunkBot.

## Files

- `bots.yml` - YAML configuration defining reply bots and their triggers

## Environment Variables

- `BUNKBOT_BOTS_DIR` - Points to `/app/config` (where bot YAML files are loaded from)

## Volume Mount

In docker-compose.yml:
```yaml
volumes:
  - ./config/bunkbot:/app/config:ro
```

This directory is mounted as **read-only** in the container.

