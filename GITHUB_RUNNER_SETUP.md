# GitHub Actions Self-Hosted Runner Setup (Unraid)

This guide will help you set up a self-hosted GitHub Actions runner on your Unraid server using Docker Compose.

## Prerequisites

- Unraid server with Docker Compose plugin installed
- Ollama running on `localhost:11434`
- SSH access to your Unraid server

## Quick Setup

### 1. Get Your Runner Token

1. Go to: https://github.com/andrewgari/starbunk-js/settings/actions/runners/new
2. Click "New self-hosted runner"
3. Copy the token shown (it looks like: `ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890`)

### 2. Create Environment File

On your Unraid server, create the environment file:

```bash
cd /mnt/user/appdata
mkdir -p github-runner
cd github-runner

# Copy the docker-compose file here
# Then create the .env file:
cat > .env.github-runner << EOF
GITHUB_RUNNER_TOKEN=YOUR_TOKEN_HERE
EOF
```

Replace `YOUR_TOKEN_HERE` with the token from step 1.

### 3. Create Required Directories

```bash
mkdir -p /mnt/user/appdata/github-runner
chmod -R 755 /mnt/user/appdata/github-runner
```

### 4. Start the Runner

Using Unraid Docker Compose plugin:

1. Copy `docker-compose.github-runner.yml` to `/mnt/user/appdata/github-runner/docker-compose.yml`
2. Copy `.env.github-runner` to `/mnt/user/appdata/github-runner/.env.github-runner`
3. In Unraid UI, go to Docker tab → Compose
4. Add the compose file and start it

**OR** via SSH:

```bash
cd /mnt/user/appdata/github-runner
docker-compose -f docker-compose.github-runner.yml --env-file .env.github-runner up -d
```

### 5. Verify Runner is Connected

1. Check logs:
```bash
docker logs github-actions-runner
```

You should see: `✓ Connected to GitHub`

2. Check GitHub:
   - Go to: https://github.com/andrewgari/starbunk-js/settings/actions/runners
   - You should see "unraid-ollama-runner" with status "Idle" (green dot)

### 6. Verify Ollama Access

From inside the runner container:

```bash
docker exec github-actions-runner curl http://localhost:11434/api/tags
```

Should return your Ollama models.

## Troubleshooting

### Runner not connecting?

1. Check the token is correct and not expired
2. Verify network_mode: host is set
3. Check logs: `docker logs github-actions-runner`

### Can't access Ollama?

1. Verify Ollama is running: `curl http://localhost:11434/api/tags`
2. Check network_mode is set to `host`
3. Ensure Ollama is listening on all interfaces (not just 127.0.0.1)

### Runner keeps restarting?

1. Check if token is expired (tokens expire after 1 hour)
2. Generate a new token and update `.env.github-runner`
3. Restart: `docker-compose restart`

## Updating the Runner

```bash
cd /mnt/user/appdata/github-runner
docker-compose pull
docker-compose up -d
```

## Removing the Runner

```bash
cd /mnt/user/appdata/github-runner
docker-compose down

# Also remove from GitHub:
# https://github.com/andrewgari/starbunk-js/settings/actions/runners
```

## Resource Usage

The runner is configured with:
- **Limits**: 4 CPUs, 8GB RAM
- **Reservations**: 2 CPUs, 4GB RAM

Adjust in `docker-compose.github-runner.yml` if needed.

## Security Notes

- The runner has access to Docker socket (needed for container builds)
- Uses `network_mode: host` to access Ollama
- Not running in privileged mode for security
- Token is stored in `.env.github-runner` (keep this secure!)

## What Happens Next?

Once the runner is set up:

1. Push code to your PR
2. Unit tests run on GitHub-hosted runners (fast)
3. E2E tests run on your Unraid runner (uses local Ollama)
4. Both must pass for PR to be mergeable

The E2E tests will automatically use your Ollama instance at `localhost:11434`!

