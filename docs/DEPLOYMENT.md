# 🚀 Starbunk Production Deployment Guide

Complete guide for automated deployment to Unraid server via CircleCI.

## 📋 Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
  - [1. Unraid Server Setup](#1-unraid-server-setup)
  - [2. SSH Key Configuration](#2-ssh-key-configuration)
  - [3. CircleCI Configuration](#3-circleci-configuration)
  - [4. Discord Webhook Setup](#4-discord-webhook-setup)
- [Deployment Workflow](#deployment-workflow)
- [Manual Deployment](#manual-deployment)
- [Rollback Procedures](#rollback-procedures)
- [Monitoring & Health Checks](#monitoring--health-checks)
- [Troubleshooting](#troubleshooting)

---

## Overview

The Starbunk deployment pipeline automates production deployments to your Unraid server:

```
┌─────────────────────┐
│ Push to main        │
└──────────┬──────────┘
           │
           ▼
┌──────────────────────────┐
│ CircleCI: Build & Test   │
│ • Lint, TypeCheck, Test  │
│ • Build Docker Images    │
│ • Push to GHCR           │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ Semantic Release         │
│ • Generate Version Tag   │
│ • Create GitHub Release  │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ GitHub Actions: Tag      │
│ • Tag :prod or :staging  │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ CircleCI: Deploy         │
│ • SSH to Unraid          │
│ • Pull Latest Images     │
│ • Restart Containers     │
│ • Health Check           │
│ • Discord Notification   │
└──────────────────────────┘
```

**Key Features:**
- ✅ Automated deployment on GitHub releases
- ✅ SSH-based deployment to Unraid
- ✅ Health check verification
- ✅ Discord notifications
- ✅ Automatic rollback on failure
- ✅ Backup of previous deployments

---

## Prerequisites

### Required Tools
- **Unraid Server** with Docker support
- **CircleCI Account** with access to the repository
- **GitHub Repository** access
- **SSH Access** to Unraid server
- **Discord Webhook** for notifications (optional but recommended)

### Local Development Requirements
- Node.js 20.x or higher
- Docker and Docker Compose
- Git

---

## Initial Setup

This section covers first-time setup for both local development and production deployment.

### 0. Local Configuration Setup

After cloning the repository, set up your local bot configurations:

```bash
# Clone repository
git clone https://github.com/andrewgari/starbunk-js.git
cd starbunk-js

# Copy example configs to local config directory
npm run setup:config

# Edit configs with your settings
# Edit config/bunkbot/personality.yml
# Edit config/djcova/config.yml (if exists)
# Edit config/covabot/personality.yml
# Edit config/bluebot/config.yml (if exists)
```

**Important: Config Directory Guidelines**

The `config/` directory is **git-ignored** and contains your local bot personalities and settings:

- ✅ **DO**: Edit configs in `config/` for your environment
- ✅ **DO**: Commit changes to `examples/config/` if updating templates
- ✅ **DO**: Keep sensitive data (tokens, passwords) in `.env` files, not config
- ❌ **DON'T**: Commit `config/` directory (it's ignored)
- ❌ **DON'T**: Put secrets or tokens in `examples/config/`

**Config Structure:**
```
config/                      # Local configs (git-ignored)
├── bunkbot/
│   ├── personality.yml     # Your bunkbot personality
│   └── bots.yml            # Your bot configurations
├── covabot/
│   └── personality.yml     # Your covabot personality
├── djcova/
│   └── config.yml          # Your djcova config (if applicable)
└── bluebot/
    └── config.yml          # Your bluebot config (if applicable)

examples/config/             # Templates (committed to git)
├── bunkbot/
│   ├── personality.yml     # Template personality
│   ├── bots.yml            # Template bot config
│   └── README.md
├── covabot/
│   ├── example-personality.yml
│   └── README.md
└── ...
```

**Environment Variables:**

After setting up configs, create your `.env` file:

```bash
# Create your .env file from scratch
vi .env
```

Required environment variables (or use defaults where shown):
```env
# Discord
STARBUNK_TOKEN=your_discord_bot_token

# Database
DATABASE_URL=postgresql://user:pass@postgres:5432/starbunk

# AI Services (if using CovaBot)
OPENAI_API_KEY=your_openai_key

# Redis (optional, uses default if not set)
REDIS_HOST=starbunk-redis
REDIS_PORT=6379
```

### Required Permissions
- CircleCI project admin access
- GitHub repository admin access
- Unraid server SSH access
- Access to Discord server for webhook creation

---

## Initial Setup

### 1. Unraid Server Setup

#### Create Application Directory
SSH into your Unraid server and create the application directory:

```bash
# SSH into Unraid
ssh root@your-unraid-ip

# Create application directory
mkdir -p /mnt/user/appdata/starbunk
cd /mnt/user/appdata/starbunk

# Create subdirectories
mkdir -p config/bunkbot
mkdir -p data/postgres
mkdir -p data/redis
mkdir -p data/qdrant
mkdir -p data/djcova/cache
mkdir -p data/djcova/temp
mkdir -p backups

# Set permissions
chmod -R 755 /mnt/user/appdata/starbunk
```

#### Copy Configuration Files
```bash
# Copy docker-compose.yml to Unraid
scp infrastructure/docker/docker-compose.yml root@your-unraid-ip:/mnt/user/appdata/starbunk/

# Copy bot configurations (from examples if needed)
scp -r examples/config/bunkbot/* root@your-unraid-ip:/mnt/user/appdata/starbunk/config/bunkbot/
```

#### Configure Environment Variables
Edit `.env` on your Unraid server:

```bash
ssh root@your-unraid-ip
cd /mnt/user/appdata/starbunk
nano .env
```

Fill in all required values. Most have sensible defaults if you use the same docker-compose.yml and service names.

**Critical values to set:**
- `HOST_WORKDIR=/mnt/user/appdata/starbunk`
- All Discord bot tokens
- Database passwords (change from defaults!)
- Redis password
- API keys for AI services

---

### 2. SSH Key Configuration

#### Generate Deployment SSH Key
On your local machine:

```bash
# Generate a new SSH key for deployment
ssh-keygen -t ed25519 -C "circleci-starbunk-deployment" -f ~/.ssh/starbunk_deploy

# This creates:
#   ~/.ssh/starbunk_deploy (private key)
#   ~/.ssh/starbunk_deploy.pub (public key)
```

#### Add Public Key to Unraid
```bash
# Copy public key to Unraid
ssh-copy-id -i ~/.ssh/starbunk_deploy.pub root@your-unraid-ip

# Or manually:
cat ~/.ssh/starbunk_deploy.pub | ssh root@your-unraid-ip 'cat >> ~/.ssh/authorized_keys'
```

#### Test SSH Connection
```bash
ssh -i ~/.ssh/starbunk_deploy root@your-unraid-ip "echo 'SSH connection successful'"
```

#### Add Private Key to CircleCI
1. Go to CircleCI Project Settings
2. Navigate to **SSH Keys** section
3. Click **Add SSH Key**
4. Paste the contents of `~/.ssh/starbunk_deploy` (private key)
5. Set hostname: `your-unraid-ip` or leave blank for any host
6. Note the **fingerprint** - you'll need this for the CircleCI context

---

### 3. CircleCI Configuration

#### Create CircleCI Context
CircleCI contexts store environment variables and secrets used by workflows.

1. Go to **CircleCI Organization Settings**
2. Click **Contexts**
3. Click **Create Context**
4. Name: `deployment-production`

#### Add Environment Variables to Context
In the `deployment-production` context, add these environment variables:

| Variable Name | Description | Example Value |
|--------------|-------------|---------------|
| `PROD_SERVER_HOST` | Unraid server IP or hostname | `192.168.1.100` |
| `PROD_SERVER_USER` | SSH username | `root` |
| `PROD_DOCKER_COMPOSE_DIR` | Path to compose files on server | `/mnt/user/appdata/starbunk` |
| `SSH_KEY_FINGERPRINT` | Fingerprint from SSH key added above | `SHA256:abc123...` |
| `DISCORD_WEBHOOK_URL` | Discord webhook for notifications | `https://discord.com/api/webhooks/...` |
| `GHCR_TOKEN` | GitHub personal access token | `ghp_...` |
| `GHCR_USERNAME` | GitHub username | `andrewgari` |

#### Verify Context Configuration
```bash
# List all contexts
circleci context list

# View context environment variables (names only, not values)
circleci context show deployment-production
```

---

### 4. Discord Webhook Setup

#### Create Discord Webhook
1. Open Discord server settings
2. Navigate to **Integrations** → **Webhooks**
3. Click **New Webhook**
4. Name: `Starbunk Deployments`
5. Select channel for deployment notifications
6. Click **Copy Webhook URL**
7. Save URL in CircleCI context as `DISCORD_WEBHOOK_URL`

#### Test Discord Webhook
```bash
curl -H "Content-Type: application/json" \
     -d '{"content": "🚀 Test deployment notification from Starbunk!"}' \
     YOUR_DISCORD_WEBHOOK_URL
```

---

## Deployment Workflow

### Automated Deployment (Recommended)

Deployments automatically trigger when a GitHub release is published:

1. **Push to main branch**
   ```bash
   git push origin main
   ```

2. **CircleCI builds and tests**
   - Runs lint, type-check, tests
   - Builds all Docker images
   - Pushes images to GHCR with `:main` tag

3. **Semantic Release creates version**
   - Analyzes commit messages
   - Generates new version number
   - Updates CHANGELOG
   - Creates GitHub release (triggers deployment)

4. **GitHub Actions tags images**
   - Tags images with version number
   - Tags as `:prod` or `:staging`

5. **CircleCI deploys to production**
   - SSHs to Unraid server
   - Runs deployment script
   - Pulls latest images
   - Restarts containers
   - Runs health checks
   - Sends Discord notification

### Triggering Manual Release

If you need to manually trigger a release:

```bash
# Create a release manually via GitHub CLI
gh release create v1.25.0 \
  --title "v1.25.0" \
  --notes "Manual release for deployment"

# Or via GitHub web interface:
# 1. Go to repository → Releases
# 2. Click "Draft a new release"
# 3. Create tag (e.g., v1.25.0)
# 4. Publish release
```

This will trigger the deployment workflow.

---

## Manual Deployment

If you need to deploy manually (bypass CircleCI):

### From Your Local Machine
```bash
# Copy deployment scripts to Unraid
scp scripts/deployment/deploy.sh root@your-unraid-ip:/tmp/
scp scripts/deployment/health-check.sh root@your-unraid-ip:/tmp/

# SSH to Unraid and run deployment
ssh root@your-unraid-ip << 'EOF'
  cd /mnt/user/appdata/starbunk
  bash /tmp/deploy.sh /mnt/user/appdata/starbunk main v1.25.0
  bash /tmp/health-check.sh /mnt/user/appdata/starbunk
EOF
```

### Directly on Unraid Server
```bash
# SSH to Unraid
ssh root@your-unraid-ip

# Navigate to application directory
cd /mnt/user/appdata/starbunk

# Pull latest images
docker-compose pull

# Restart containers
docker-compose up -d --force-recreate

# Check status
docker-compose ps
docker-compose logs -f
```

---

## Rollback Procedures

### Automatic Rollback
Each deployment creates a backup in `backups/deployment-YYYYMMDD-HHMMSS/`.

### Manual Rollback

#### Option 1: Use Rollback Script
```bash
# SSH to Unraid
ssh root@your-unraid-ip

# Run rollback script (restores most recent backup)
cd /mnt/user/appdata/starbunk
bash /tmp/rollback.sh /mnt/user/appdata/starbunk previous

# Or rollback to specific backup
bash /tmp/rollback.sh /mnt/user/appdata/starbunk deployment-20260127-143022
```

#### Option 2: Manual Rollback
```bash
# SSH to Unraid
ssh root@your-unraid-ip
cd /mnt/user/appdata/starbunk

# List available backups
ls -lh backups/

# Restore configuration from specific backup
BACKUP_DIR="backups/deployment-20260127-143022"
cp $BACKUP_DIR/docker-compose.yml ./
cp $BACKUP_DIR/.env ./

# Pull previous images and restart
docker-compose -f docker-compose.yml pull
docker-compose -f docker-compose.yml up -d --force-recreate
```

#### Option 3: Rollback to Specific Image Tag
```bash
# Edit infrastructure/docker/docker-compose.yml and change image tags
# From:
#   image: ghcr.io/andrewgari/bunkbot:main
# To:
#   image: ghcr.io/andrewgari/bunkbot:v1.24.0

# Then restart
docker-compose up -d --force-recreate
```

---

## Monitoring & Health Checks

### Health Check Endpoints

Services expose health endpoints on their respective ports:

```bash
# Check service health (internal docker network)
# BunkBot
curl http://starbunk-bunkbot:7081/health

# CovaBot
curl http://starbunk-covabot:7080/health

# DJCova
curl http://starbunk-djcova:7082/health

# Access from host (if ports exposed in docker-compose)
curl http://localhost:7081/health  # BunkBot (if exposed)
```

### Manual Health Check Script
```bash
# Copy and run health check script
scp scripts/deployment/health-check.sh root@your-unraid-ip:/tmp/
ssh root@your-unraid-ip "bash /tmp/health-check.sh /mnt/user/appdata/starbunk"
```

### Container Logs
```bash
# View all logs
ssh root@your-unraid-ip "cd /mnt/user/appdata/starbunk && docker-compose logs -f"

# View specific service logs
ssh root@your-unraid-ip "cd /mnt/user/appdata/starbunk && docker-compose logs -f bunkbot"

# View last 100 lines
ssh root@your-unraid-ip "cd /mnt/user/appdata/starbunk && docker-compose logs --tail=100"
```

### Container Status
```bash
# Check running containers
ssh root@your-unraid-ip "cd /mnt/user/appdata/starbunk && docker-compose ps"

# Check resource usage
ssh root@your-unraid-ip "docker stats --no-stream"
```

---

## Troubleshooting

### Deployment Fails with "Permission Denied"

**Cause:** SSH key not properly configured or wrong permissions

**Solution:**
```bash
# Verify SSH key is added to Unraid
ssh root@your-unraid-ip "cat ~/.ssh/authorized_keys | grep circleci"

# Check SSH key permissions on Unraid
ssh root@your-unraid-ip "chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys"

# Test SSH connection from CircleCI
circleci local execute --job deploy_to_production
```

### Containers Not Starting After Deployment

**Cause:** Configuration error or missing environment variables

**Solution:**
```bash
# Check container logs
ssh root@your-unraid-ip "cd /mnt/user/appdata/starbunk && docker-compose logs"

# Verify .env file has all required values
ssh root@your-unraid-ip "cat /mnt/user/appdata/starbunk/.env"

# Restart containers with fresh pull
ssh root@your-unraid-ip << 'EOF'
  cd /mnt/user/appdata/starbunk
  docker-compose down
  docker-compose pull
  docker-compose up -d
EOF
```

### Discord Notifications Not Sending

**Cause:** Invalid webhook URL or network issue

**Solution:**
```bash
# Test webhook from command line
curl -H "Content-Type: application/json" \
     -d '{"content": "Test notification"}' \
     YOUR_DISCORD_WEBHOOK_URL

# Verify webhook URL in CircleCI context
circleci context show deployment-production
```

### Health Check Fails

**Cause:** Services not fully started or health endpoints not implemented

**Solution:**
```bash
# Wait longer for services to start
sleep 30

# Check if containers are running
ssh root@your-unraid-ip "docker ps | grep starbunk"

# Check health endpoints directly
ssh root@your-unraid-ip "docker exec starbunk-bunkbot wget -qO- http://localhost:7081/health"
```

### Image Pull Fails

**Cause:** GHCR credentials invalid or image doesn't exist

**Solution:**
```bash
# Verify GHCR credentials
echo $GHCR_TOKEN | docker login ghcr.io -u $GHCR_USERNAME --password-stdin

# Check if image exists
docker manifest inspect ghcr.io/andrewgari/bunkbot:main

# Pull image manually
docker pull ghcr.io/andrewgari/bunkbot:main
```

### Rollback Fails

**Cause:** No backups available or corrupted backup

**Solution:**
```bash
# List available backups
ssh root@your-unraid-ip "ls -lh /mnt/user/appdata/starbunk/backups/"

# Manually restore known good configuration
# Use Portainer or Unraid UI to restore from previous state
```

---

## Emergency Contacts & Resources

- **CircleCI Dashboard:** https://app.circleci.com/pipelines/github/andrewgari/starbunk-js
- **GitHub Releases:** https://github.com/andrewgari/starbunk-js/releases
- **GHCR Packages:** https://github.com/andrewgari?tab=packages
- **Unraid Logs:** `/var/log/syslog` or via Unraid UI

---

## Security Best Practices

1. ✅ **Rotate SSH keys** every 90 days
2. ✅ **Use strong database passwords** (not defaults!)
3. ✅ **Store secrets in CircleCI contexts** (never commit to repo)
4. ✅ **Enable 2FA** on GitHub and CircleCI accounts
5. ✅ **Limit SSH access** to specific IPs if possible
6. ✅ **Review deployment logs** regularly for anomalies
7. ✅ **Keep Unraid OS updated** with latest security patches
8. ✅ **Backup Discord tokens** in secure password manager

---

## Maintenance Schedule

| Task | Frequency | Owner |
|------|-----------|-------|
| Review deployment logs | Weekly | DevOps |
| Test rollback procedure | Monthly | DevOps |
| Rotate SSH keys | Quarterly | Security |
| Update dependencies | As needed | Development |
| Backup verification | Monthly | DevOps |
| Clean old backups (>30 days) | Monthly | DevOps |

---

## Support & Contribution

For deployment issues:
1. Check [Troubleshooting](#troubleshooting) section
2. Review CircleCI build logs
3. Check Unraid container logs
4. Open GitHub issue with deployment details

---

**Last Updated:** January 27, 2026
**Maintained By:** @andrewgari
**Version:** 1.0.0
