# DJCova Configuration

This directory contains configuration files for DJCova (music service).

## Files

Place any DJCova configuration files here (e.g., music settings, playlist configurations).

## Environment Variables

- `DJCOVA_CONFIG_DIR` - Points to `/app/config` (this directory in the container)

## Volume Mounts

In docker-compose.yml:
```yaml
volumes:
  # Configuration directory (read-only)
  - ./config/djcova:/app/config:ro
  # Data directories (read-write)
  - ${UNRAID_APPDATA_PATH:-./data}/djcova/cache:/app/cache
  - ${UNRAID_APPDATA_PATH:-./data}/djcova/temp:/tmp
```

This config directory is mounted as **read-only** in the container.
Writable data (cache, temp files) goes in the data directory.

