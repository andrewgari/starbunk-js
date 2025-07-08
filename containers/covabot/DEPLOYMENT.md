# CovaBot Memory Management - Production Deployment Guide

## 🚀 Quick Start

The CovaBot memory management web frontend is **production-ready** and can be deployed immediately.

### Option 1: Docker Compose (Recommended)

```bash
# 1. Set environment variables
export COVABOT_API_KEY="your-secure-api-key"
export COVABOT_WEB_PORT="7080"
export USE_DATABASE="true"  # For production
export DATABASE_URL="postgresql://user:password@host:5432/database"

# 2. Start with Docker Compose
docker-compose up covabot

# 3. Access the interface
open http://localhost:7080
```

### Option 2: Development Mode

```bash
# 1. Install dependencies
cd containers/covabot
npm install

# 2. Start development server
npm run dev:web

# 3. Access the interface
open http://localhost:7080
```

## 🔧 Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `COVABOT_API_KEY` | No* | - | API key for authentication (*optional in dev) |
| `COVABOT_WEB_PORT` | No | 7080 | Port for web interface |
| `USE_DATABASE` | No | false | Use PostgreSQL instead of file storage |
| `DATABASE_URL` | Yes** | - | PostgreSQL connection string (**if USE_DATABASE=true) |
| `COVABOT_DATA_DIR` | No | ./data | Directory for file storage |
| `NODE_ENV` | No | development | Environment mode |

### Unraid Configuration

```yaml
# docker-compose.yml excerpt for Unraid
covabot:
  image: ghcr.io/andrewgari/covabot:latest
  container_name: starbunk-covabot
  environment:
    - USE_DATABASE=true
    - COVABOT_API_KEY=your-secure-key
    - DATABASE_URL=postgresql://user:pass@postgres:5432/db
  volumes:
    - /mnt/user/appdata/covabot:/app/data
  ports:
    - "7080:7080"
```

## 🌐 Web Interface Features

### Dashboard
- System overview and statistics
- Quick actions (toggle bot, refresh stats)
- Import/export configuration

### Configuration
- Master enable/disable toggle
- Response frequency control
- Real-time configuration updates

### Personality Management
- Core personality description
- Load from high-priority notes
- Comprehensive personality tips

### Detailed Notes
- CRUD operations for personality notes
- Category filtering (instruction, personality, behavior, knowledge, context)
- Priority system (high, medium, low)
- Search and filtering
- Real-time statistics

### LLM Context Preview
- Live preview of context sent to LLM
- Real-time updates
- Copy functionality

## 🔐 Security

### Authentication
- API key authentication for production
- Development mode bypass
- Rate limiting (100 requests/minute)
- Request logging

### Production Security Checklist
- [ ] Set strong `COVABOT_API_KEY`
- [ ] Use HTTPS in production
- [ ] Configure proper CORS origins
- [ ] Set up database with proper credentials
- [ ] Enable request logging
- [ ] Monitor rate limiting

## 📊 API Endpoints

### Core Endpoints
- `GET /api/health` - Health check
- `GET /api/notes` - Get all notes (with filtering)
- `POST /api/notes` - Create new note
- `PUT /api/notes/:id` - Update note
- `DELETE /api/notes/:id` - Delete note
- `GET /api/stats` - Get statistics
- `GET /api/context` - Get LLM context

### Configuration Endpoints
- `GET /api/configuration` - Get bot configuration
- `PUT /api/configuration` - Update configuration
- `POST /api/configuration/reset` - Reset to defaults

### Data Management
- `GET /api/export` - Export all data
- `POST /api/import` - Import data

## 🧪 Testing

### Quick Test
```bash
npm run test:web
```

### Manual Testing
1. Start the web interface
2. Open http://localhost:7080
3. Test CRUD operations on notes
4. Verify configuration changes
5. Check LLM context preview
6. Test import/export functionality

### Health Check
```bash
curl http://localhost:7080/api/health
```

## 🔄 Migration

### File to Database Migration
```bash
# Set database environment
export USE_DATABASE=true
export DATABASE_URL="postgresql://user:pass@host:5432/db"

# Run migration
npm run migrate-notes
```

## 📈 Monitoring

### Health Checks
- Web interface: `http://localhost:7080/api/health`
- Database connectivity included in health check
- Docker health check configured

### Logs
- Request logging with timing
- Error logging with context
- Authentication attempt logging

## 🚨 Troubleshooting

### Common Issues

**Port Already in Use**
```bash
# Change port
export COVABOT_WEB_PORT=3002
```

**Database Connection Failed**
```bash
# Check database URL
echo $DATABASE_URL
# Test connection
npm run test:persistence
```

**Authentication Issues**
```bash
# Development mode (no auth)
export NODE_ENV=development
# Or set API key
export COVABOT_API_KEY=your-key
```

**File Permissions (Unraid)**
```bash
# Fix permissions
chown -R 1000:1000 /mnt/user/appdata/covabot
```

## 🎯 Production Checklist

- [ ] Environment variables configured
- [ ] Database set up and migrated
- [ ] API key configured
- [ ] Health checks passing
- [ ] Web interface accessible
- [ ] CRUD operations working
- [ ] Import/export tested
- [ ] Backup strategy in place
- [ ] Monitoring configured
- [ ] Security review completed

## 📞 Support

For issues or questions:
1. Check logs: `docker logs starbunk-covabot`
2. Test health: `curl http://localhost:7080/api/health`
3. Review configuration
4. Check database connectivity

The CovaBot memory management system is production-ready and fully functional!
