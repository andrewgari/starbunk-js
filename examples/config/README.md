# Config Examples

This directory contains example configuration files for all bots in the starbunk-js system.

## Setup

Run the setup script to copy these examples to your local `config/` directory:

```bash
npm run setup:config
```

Or manually:
```bash
cp -r examples/config/* config/
```

## Bot Configs

- `bluebot/` - Bluesky bot configuration
- `bunkbot/` - Discord bot configuration  
- `covabot/` - Core bot configuration
- `djcova/` - DJ Cova Discord music bot configuration

## Important

The `config/` directory is git-ignored. These examples are the source of truth for config structure. Never commit actual `config/` directory.

See `docs/DEPLOYMENT.md` for production configuration details.
