# Unraid Server Setup Guide for Starbunk Discord Bot

This guide provides step-by-step instructions for deploying the Starbunk Discord Bot stack on an Unraid server using Docker Compose with persistent storage.

## 🏗️ Overview

The Starbunk bot stack consists of four main containers:
- **PostgreSQL**: Database for persistent configuration and data
- **BunkBot**: Reply bots and admin commands
- **DJCova**: Music service with voice capabilities
- **Starbunk-DND**: D&D features and bridge functionality
- **CovaBot**: AI personality bot with web management interface

All containers are configured to use Unraid's standard `/mnt/user/` path structure for persistent data storage.

## 📁 Unraid Share Structure

### 1. Create Unraid Shares

Create the following shares in Unraid's web interface (Main → Shares):

```
Share Name: appdata
Use Cache: Yes (Prefer)
Path: /mnt/user/appdata/

Share Name: docker (optional, if not using appdata)
Use Cache: Yes (Prefer)  
Path: /mnt/user/docker/
```

### 2. Directory Structure

The bot stack will create the following directory structure:

```
/mnt/user/appdata/starbunk/
├── postgres/                 # PostgreSQL database files
├── covabot/                  # CovaBot personality notes and data
│   └── personality-notes.json
├── djcova/                   # DJCova music service data
│   ├── cache/
│   └── temp/
└── starbunk-dnd/            # D&D service data
    ├── data/
    ├── campaigns/
    └── context/
```

## 🔧 Environment Configuration

### 1. Create Environment File

Create a `.env` file in your project directory with the following variables:

```bash
# Unraid Configuration
UNRAID_APPDATA_PATH=/mnt/user/appdata/starbunk

# Discord Bot Tokens
STARBUNK_TOKEN=your_discord_bot_token_here
SNOWBUNK_TOKEN=your_secondary_bot_token_here
CLIENT_ID=your_discord_client_id
GUILD_ID=your_discord_server_id

# Database Configuration
POSTGRES_DB=starbunk
POSTGRES_USER=starbunk
POSTGRES_PASSWORD=your_secure_database_password
POSTGRES_PORT=5432

# OpenAI Configuration (for AI features)
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_DEFAULT_MODEL=gpt-4o-mini

# CovaBot Web Interface
COVABOT_WEB_PORT=3001
COVABOT_API_KEY=your_secure_api_key_for_web_interface
USE_DATABASE=false  # Set to true to use PostgreSQL instead of file storage

# Debug and Testing (optional)
DEBUG_MODE=false
TESTING_SERVER_IDS=your_test_server_ids_comma_separated
TESTING_CHANNEL_IDS=your_test_channel_ids_comma_separated
LOG_LEVEL=info

# Webhook URL (optional)
WEBHOOK_URL=your_discord_webhook_url_for_notifications
```

### 2. File Permissions

Ensure proper permissions for the data directories:

```bash
# SSH into your Unraid server and run:
mkdir -p /mnt/user/appdata/starbunk
chown -R 99:100 /mnt/user/appdata/starbunk
chmod -R 755 /mnt/user/appdata/starbunk
```

## 🚀 Deployment Options

### Option 1: Standard Deployment (Recommended)

Use the main docker-compose.yml for production deployment:

```bash
# Set environment variable for Unraid paths
export UNRAID_APPDATA_PATH=/mnt/user/appdata/starbunk

# Deploy the stack
docker-compose up -d
```

### Option 2: Latest Stable Images

Use pre-built latest images from GitHub Container Registry:

```bash
# Deploy with latest stable images
docker-compose -f docker-compose.latest.yml up -d
```

### Option 3: Snapshot Testing

Use snapshot images for testing new features:

```bash
# Deploy with snapshot images for testing
export SNAPSHOT_TAG=pr-123-snapshot
docker-compose -f docker-compose.snapshot.yml up -d
```

## 🗄️ CovaBot Personality Management

### File Storage Mode (Default)

CovaBot stores personality notes in JSON files by default:

- **Storage Location**: `/mnt/user/appdata/starbunk/covabot/personality-notes.json`
- **Web Interface**: `http://your-unraid-ip:3001`
- **Persistence**: Files survive container restarts and updates
- **Backup**: Easy to backup/restore JSON files

### Database Storage Mode (Optional)

To use PostgreSQL for personality notes:

1. Set `USE_DATABASE=true` in your `.env` file
2. Restart the CovaBot container
3. Use the migration tool to transfer existing notes:

```bash
# Access the CovaBot container
docker exec -it starbunk-covabot bash

# Run migration (if you have existing file-based notes)
npm run migrate-notes
```

## 🔍 Monitoring and Management

### Health Checks

All containers include health checks accessible via:

```bash
# Check container health
docker-compose ps

# View container logs
docker-compose logs covabot
docker-compose logs djcova
docker-compose logs starbunk-dnd
docker-compose logs bunkbot
```

### Web Interfaces

- **CovaBot Management**: `http://your-unraid-ip:3001`
- **PostgreSQL**: Connect via any PostgreSQL client on port 5432

### Backup Strategy

#### Automatic Backups

1. **Database Backup**:
```bash
# Create database backup
docker exec starbunk-postgres pg_dump -U starbunk starbunk > backup.sql
```

2. **File-based Data Backup**:
```bash
# Backup all persistent data
tar -czf starbunk-backup-$(date +%Y%m%d).tar.gz /mnt/user/appdata/starbunk/
```

#### Unraid User Scripts

Create a User Script in Unraid for automated backups:

```bash
#!/bin/bash
# Starbunk Bot Backup Script

BACKUP_DIR="/mnt/user/backups/starbunk"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

# Backup database
docker exec starbunk-postgres pg_dump -U starbunk starbunk > "$BACKUP_DIR/database_$DATE.sql"

# Backup file data
tar -czf "$BACKUP_DIR/data_$DATE.tar.gz" /mnt/user/appdata/starbunk/

# Keep only last 7 days of backups
find "$BACKUP_DIR" -name "*.sql" -mtime +7 -delete
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

## 🔧 Troubleshooting

### Common Issues

1. **Permission Denied Errors**:
```bash
# Fix permissions
chown -R 99:100 /mnt/user/appdata/starbunk
chmod -R 755 /mnt/user/appdata/starbunk
```

2. **CovaBot Web Interface Not Accessible**:
- Check if port 3001 is exposed: `docker-compose ps`
- Verify firewall settings on Unraid
- Check container logs: `docker-compose logs covabot`

3. **Database Connection Issues**:
- Ensure PostgreSQL container is healthy: `docker-compose ps`
- Check database logs: `docker-compose logs postgres`
- Verify environment variables in `.env` file

4. **Personality Notes Not Persisting**:
- Verify volume mount: `docker inspect starbunk-covabot`
- Check file permissions in `/mnt/user/appdata/starbunk/covabot/`
- Review CovaBot logs for file access errors

### Log Analysis

```bash
# View real-time logs for all services
docker-compose logs -f

# View logs for specific service
docker-compose logs -f covabot

# Check last 100 lines of logs
docker-compose logs --tail=100 covabot
```

## 🔄 Updates and Maintenance

### Updating Containers

```bash
# Pull latest images
docker-compose pull

# Recreate containers with new images
docker-compose up -d

# Remove old images
docker image prune
```

### Migrating Data

When switching between file and database storage for CovaBot:

```bash
# File to Database
docker exec -it starbunk-covabot npm run migrate-notes

# Database to File (export from web interface)
# Access http://your-unraid-ip:3001 and use Export function
```

## 📊 Performance Optimization

### Resource Limits

The docker-compose files include memory limits:
- **BunkBot**: 512MB limit, 256MB reserved
- **DJCova**: 1GB limit, 512MB reserved  
- **Starbunk-DND**: 1GB limit, 512MB reserved
- **CovaBot**: 512MB limit, 256MB reserved

### Cache Configuration

For optimal performance on Unraid:
- Use SSD cache for `/mnt/user/appdata/`
- Set cache preference to "Yes (Prefer)" for the appdata share
- Consider using "Yes (Only)" for frequently accessed data

## 🔐 Security Considerations

1. **API Keys**: Store securely in `.env` file with restricted permissions
2. **Database**: Use strong passwords and consider network isolation
3. **Web Interface**: Configure `COVABOT_API_KEY` for web interface access
4. **Firewall**: Limit external access to necessary ports only
5. **Updates**: Regularly update container images for security patches

## 📞 Support

For issues specific to this Unraid setup:
1. Check container logs for error messages
2. Verify environment variables and file permissions
3. Ensure Unraid shares are properly configured
4. Review the troubleshooting section above

For bot functionality issues, refer to the main project documentation.
