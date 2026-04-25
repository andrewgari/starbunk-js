# Logs

View Docker logs from Starbunk containers running on the remote server.

## Arguments
- `$ARGUMENTS` - Optional: container name (bunkbot, djcova, covabot, bluebot) and/or line count

## Instructions

Parse the arguments to determine:
- **Container**: bunkbot, djcova, covabot, bluebot, or "all" (default: all)
- **Lines**: number of lines to show (default: 100)

Examples of valid arguments:
- `bunkbot` - Last 100 lines from bunkbot
- `djcova 50` - Last 50 lines from djcova
- `200` - Last 200 lines from all containers
- `covabot -f` - Follow logs from covabot (streaming)

SSH into the remote server using `tower` and run docker commands from `/mnt/user/appdata/starbunk-js`:

1. **Specific container**:
   ```bash
   ssh tower "cd /mnt/user/appdata/starbunk-js && docker compose logs --tail=<lines> <container>"
   ```

2. **All containers**:
   ```bash
   ssh tower "cd /mnt/user/appdata/starbunk-js && docker compose logs --tail=<lines>"
   ```

3. **Follow mode** (if `-f` or `follow` is in arguments):
   ```bash
   ssh tower "cd /mnt/user/appdata/starbunk-js && docker compose logs -f <container>"
   ```

Available containers:
- `bunkbot` - Reply bots and admin commands
- `djcova` - Voice channel music playback
- `covabot` - AI personality emulation
- `bluebot` - Blue reference pattern matching

After showing logs, offer to filter or search for specific patterns if the output is large.
