# Podman Compose Files for Starbunk Services

This directory contains Podman Compose files that are equivalent to the Docker Compose files, designed to work with Podman instead of Docker.

## Files Overview

- **`podman-compose.yml`** - Main/default compose file (equivalent to `docker-compose.yml`)
- **`podman-compose.latest.yml`** - Production deployment with latest stable images
- **`podman-compose.snapshot.yml`** - PR testing with snapshot images

## Prerequisites

1. **Install Podman and Podman Compose**:
   ```bash
   # On Fedora/RHEL/CentOS
   sudo dnf install podman podman-compose
   
   # On Ubuntu/Debian
   sudo apt install podman podman-compose
   
   # On macOS
   brew install podman podman-compose
   ```

2. **Configure Environment Variables**:
   - Create a `.env` file with the same variables used for Docker Compose
   - All environment variables from your Docker setup work the same way

3. **Verify Image Access**:
   - Ensure you can pull from `ghcr.io/andrewgari/` registry
   - Login if needed: `podman login ghcr.io`

## Usage

### Main/Default Deployment
```bash
# Start all services
podman-compose up -d

# Or explicitly specify the file
podman-compose -f podman-compose.yml up -d

# View logs
podman-compose logs -f

# Stop services
podman-compose down
```

### Production Deployment (Latest Images)
```bash
# Start production services with latest stable images
podman-compose -f podman-compose.latest.yml up -d

# Monitor production logs
podman-compose -f podman-compose.latest.yml logs -f

# Stop production services
podman-compose -f podman-compose.latest.yml down
```

### PR Snapshot Testing
```bash
# Set PR number and start snapshot testing
export PR_NUMBER=123
podman-compose -f podman-compose.snapshot.yml up -d

# Or inline
PR_NUMBER=123 podman-compose -f podman-compose.snapshot.yml up -d

# Clean up snapshot testing
podman-compose -f podman-compose.snapshot.yml down
```

## Key Differences from Docker Compose

### 1. **Logging Configuration**
- **Docker**: Uses `json-file` driver with size/file rotation
- **Podman**: Uses `journald` driver with systemd journal integration
- **Benefit**: Better integration with system logging on Linux

### 2. **Version Field**
- **Docker**: Requires `version: '3.8'`
- **Podman**: Version field is optional and removed for cleaner files

### 3. **Container Runtime**
- **Docker**: Runs containers as root by default
- **Podman**: Supports rootless containers by default
- **Security**: Podman provides better security isolation

### 4. **Systemd Integration**
- **Podman**: Native systemd integration for service management
- **Docker**: Requires additional configuration for systemd

## Service Architecture

The Podman Compose files maintain the same service architecture as Docker:

- **PostgreSQL**: Shared database for persistent services
- **BunkBot**: Reply bots and admin commands (port 3000)
- **DJCova**: Music service (port 3001)
- **Starbunk-DND**: D&D features and bridge (port 3002)
- **CovaBot**: AI personality bot (port 3003)

## Network Configuration

- **Main**: `starbunk-network` (172.20.0.0/16)
- **Latest**: `starbunk-latest-network` (172.22.0.0/16)
- **Snapshot**: `starbunk-snapshot-network` (172.21.0.0/16)

## Volume Management

All volumes use local driver and maintain the same naming convention:
- Separate volume sets for each deployment type (main, latest, snapshot)
- PostgreSQL data persistence
- Service-specific cache and data volumes

## Health Checks

All services include health checks identical to Docker Compose:
- PostgreSQL: `pg_isready` check
- Node.js services: HTTP health endpoint checks
- Proper startup dependencies with `depends_on` conditions

## Resource Limits

Resource limits are preserved from Docker Compose:
- **BunkBot/CovaBot**: 512M limit, 256M reservation
- **DJCova/Starbunk-DND**: 1G limit, 512M reservation

## Troubleshooting

### Common Issues

1. **Permission Issues**:
   ```bash
   # If running rootless, ensure proper permissions
   podman unshare chown -R 999:999 ./init-db
   ```

2. **Network Conflicts**:
   ```bash
   # List existing networks
   podman network ls
   
   # Remove conflicting networks if needed
   podman network rm starbunk-network
   ```

3. **Volume Issues**:
   ```bash
   # List volumes
   podman volume ls
   
   # Inspect volume
   podman volume inspect postgres_data
   ```

4. **Image Pull Issues**:
   ```bash
   # Login to registry
   podman login ghcr.io
   
   # Manually pull image
   podman pull ghcr.io/andrewgari/bunkbot:latest
   ```

## Migration from Docker

To migrate from Docker to Podman:

1. **Stop Docker services**:
   ```bash
   docker-compose down
   ```

2. **Start Podman services**:
   ```bash
   podman-compose up -d
   ```

3. **Migrate volumes** (if needed):
   ```bash
   # Export from Docker
   docker run --rm -v docker_volume:/data -v $(pwd):/backup alpine tar czf /backup/backup.tar.gz -C /data .
   
   # Import to Podman
   podman run --rm -v podman_volume:/data -v $(pwd):/backup alpine tar xzf /backup/backup.tar.gz -C /data
   ```

## Advantages of Podman

1. **Rootless by default** - Better security
2. **No daemon** - Direct container execution
3. **Systemd integration** - Native service management
4. **OCI compliant** - Standard container format
5. **Docker compatibility** - Drop-in replacement for most use cases
