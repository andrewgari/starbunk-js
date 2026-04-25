# Docker

Manage Docker containers for Starbunk.

## Arguments
- `$ARGUMENTS` - Command: up, down, logs, build, ps, restart

## Instructions

Execute Docker operations based on the argument:

1. **up** (or no argument): Start all containers
   ```bash
   docker compose up -d
   ```

2. **down**: Stop all containers
   ```bash
   docker compose down
   ```

3. **logs**: Show recent logs (optionally for a specific service)
   ```bash
   docker compose logs --tail=50
   ```

4. **build**: Build Docker images
   ```bash
   npm run docker:build
   ```

5. **ps**: Show container status
   ```bash
   docker compose ps
   ```

6. **restart**: Restart all containers
   ```bash
   docker compose restart
   ```

Report the status of the operation and any errors encountered.
