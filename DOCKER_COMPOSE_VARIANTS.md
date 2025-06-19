# Docker Compose Variants Guide

This document explains the different Docker Compose configurations available for the Starbunk project and how to use them effectively.

## 📁 **Available Configurations**

| File | Purpose | Image Tags | Use Case |
|------|---------|------------|----------|
| `docker-compose.yml` | Main/Default | `latest` | General development and production |
| `docker-compose.snapshot.yml` | PR Testing | `pr-{number}-snapshot` | Testing specific PR builds |
| `docker-compose.latest.yml` | Production | `latest` (explicit) | Production deployment with explicit tags |

## 🔧 **Configuration Details**

### **1. docker-compose.snapshot.yml**
**Purpose:** Testing PR snapshot images with predictable naming

**Features:**
- Uses PR snapshot images: `ghcr.io/andrewgari/starbunk/{service}:pr-{number}-snapshot`
- Configurable PR number via `PR_NUMBER` environment variable
- Separate volumes and networks to avoid conflicts
- Debug mode enabled by default for testing
- Isolated PostgreSQL instance with snapshot-specific data

**Usage:**
```bash
# Set PR number and deploy
export PR_NUMBER=123
docker-compose -f docker-compose.snapshot.yml up -d

# Or inline
PR_NUMBER=123 docker-compose -f docker-compose.snapshot.yml up -d

# Using helper script
./docker-deploy.sh  # Choose option 1
```

### **2. docker-compose.latest.yml**
**Purpose:** Production deployment with explicit latest tags

**Features:**
- Explicit `:latest` tags for all services
- Production-optimized settings (info logging, debug disabled)
- Separate volumes and networks for production isolation
- Full health checks and resource limits
- Production-ready PostgreSQL configuration

**Usage:**
```bash
# Deploy latest stable images
docker-compose -f docker-compose.latest.yml up -d

# Using helper script
./docker-deploy.sh  # Choose option 2
```

### **3. docker-compose.yml (Main)**
**Purpose:** Default configuration for general use

**Features:**
- Current production configuration
- Uses latest images (implicit `:latest`)
- Standard volumes and networks
- Balanced settings for development and production

## 🚀 **Quick Start Guide**

### **Testing a PR:**
```bash
# Option 1: Helper script (recommended)
./docker-deploy.sh

# Option 2: Manual
export PR_NUMBER=123
docker-compose -f docker-compose.snapshot.yml up -d

# Option 3: Using pr-images.sh
./pr-images.sh  # Create test override
```

### **Production Deployment:**
```bash
# Option 1: Helper script
./docker-deploy.sh  # Choose option 2

# Option 2: Manual
docker-compose -f docker-compose.latest.yml up -d

# Option 3: Main configuration
docker-compose up -d
```

## 🔍 **Key Differences**

### **Volumes & Networks:**
Each configuration uses separate volumes and networks to prevent conflicts:

| Configuration | Volume Suffix | Network | Subnet |
|---------------|---------------|---------|--------|
| Main | (none) | `starbunk-network` | `172.20.0.0/16` |
| Snapshot | `_snapshot` | `starbunk-snapshot-network` | `172.21.0.0/16` |
| Latest | `_latest` | `starbunk-latest-network` | `172.22.0.0/16` |

### **Container Names:**
Each configuration uses unique container names:
- Main: `starbunk-bunkbot`, `starbunk-djcova`, etc.
- Snapshot: `starbunk-bunkbot-snapshot`, `starbunk-djcova-snapshot`, etc.
- Latest: `starbunk-bunkbot-latest`, `starbunk-djcova-latest`, etc.

### **Environment Settings:**

| Setting | Main | Snapshot | Latest |
|---------|------|----------|--------|
| `DEBUG_MODE` | `false` | `true` | `false` |
| `LOG_LEVEL` | `info` | `debug` | `info` |
| `NODE_ENV` | `production` | `production` | `production` |

## 🛠️ **Management Commands**

### **Using the Helper Script:**
```bash
./docker-deploy.sh
```

**Options:**
1. Deploy PR Snapshot Images (for testing)
2. Deploy Latest Stable Images (production)
3. Deploy Main Configuration
4. Show Status of All Deployments
5. Stop All Deployments

### **Manual Commands:**

#### **Start Services:**
```bash
# Snapshot testing
PR_NUMBER=123 docker-compose -f docker-compose.snapshot.yml up -d

# Latest production
docker-compose -f docker-compose.latest.yml up -d

# Main configuration
docker-compose up -d
```

#### **Stop Services:**
```bash
# Stop specific configuration
docker-compose -f docker-compose.snapshot.yml down
docker-compose -f docker-compose.latest.yml down
docker-compose down

# Stop all (using helper)
./docker-deploy.sh  # Choose option 5
```

#### **View Status:**
```bash
# Check specific configuration
docker-compose -f docker-compose.snapshot.yml ps
docker-compose -f docker-compose.latest.yml ps
docker-compose ps

# Check all (using helper)
./docker-deploy.sh  # Choose option 4
```

#### **View Logs:**
```bash
# All services
docker-compose -f docker-compose.snapshot.yml logs -f

# Specific service
docker-compose -f docker-compose.snapshot.yml logs -f bunkbot
```

## 📊 **Use Case Examples**

### **Scenario 1: Testing PR Changes**
```bash
# Developer wants to test PR #456
export PR_NUMBER=456
docker-compose -f docker-compose.snapshot.yml up -d

# Test the changes
curl http://localhost:3000/health

# When done testing
docker-compose -f docker-compose.snapshot.yml down
```

### **Scenario 2: Production Deployment**
```bash
# Deploy latest stable version
docker-compose -f docker-compose.latest.yml up -d

# Monitor deployment
docker-compose -f docker-compose.latest.yml ps
docker-compose -f docker-compose.latest.yml logs -f
```

### **Scenario 3: Running Multiple Configurations**
```bash
# Run production and test PR simultaneously
docker-compose -f docker-compose.latest.yml up -d
PR_NUMBER=123 docker-compose -f docker-compose.snapshot.yml up -d

# They use different ports and networks, so no conflicts
# Production: ports 3000-3003
# Snapshot: same ports but different containers
```

## ⚠️ **Important Notes**

1. **Port Conflicts:** All configurations use the same default ports. Only run one at a time unless you modify port mappings.

2. **Environment Variables:** Make sure your `.env` file contains all required variables for the configuration you're using.

3. **Image Availability:** Ensure the required images exist in GHCR before deploying:
   - Snapshot: Check if PR images were built
   - Latest: Verify latest images are published

4. **Data Persistence:** Each configuration has separate volumes, so data doesn't carry over between configurations.

5. **Network Isolation:** Each configuration uses separate Docker networks for complete isolation.

## 🔗 **Related Tools**

- `./docker-deploy.sh` - Interactive deployment helper
- `./pr-images.sh` - PR image management
- `./check-images.sh` - Image availability checker
- `./publish-images.sh` - Image publishing helper

This multi-configuration approach provides flexibility for different deployment scenarios while maintaining isolation and preventing conflicts.
