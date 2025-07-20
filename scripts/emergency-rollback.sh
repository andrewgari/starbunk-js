#!/bin/bash

# CovaBot Emergency Rollback Script
# Quick rollback procedures for production issues

set -e

# Configuration
BACKUP_DIR="/mnt/user/appdata/covabot/backups"
DATA_DIR="/mnt/user/appdata/covabot"
COMPOSE_FILE="docker-compose.latest.yml"
CONTAINER_NAME="starbunk-covabot-latest"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Emergency stop function
emergency_stop() {
    log_warning "EMERGENCY STOP: Stopping all CovaBot services immediately"
    
    # Stop docker-compose services
    if [ -f "$COMPOSE_FILE" ]; then
        docker-compose -f "$COMPOSE_FILE" down --timeout 10 2>/dev/null || true
    fi
    
    # Force stop any remaining containers
    docker stop $(docker ps -q --filter name=covabot) 2>/dev/null || true
    docker stop $(docker ps -q --filter name=starbunk) 2>/dev/null || true
    
    log_success "Emergency stop completed"
}

# Create emergency backup
create_emergency_backup() {
    log_info "Creating emergency backup before rollback..."
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local emergency_backup_dir="$BACKUP_DIR/emergency_$timestamp"
    
    mkdir -p "$emergency_backup_dir"
    
    # Backup current data
    if [ -d "$DATA_DIR/data" ]; then
        cp -r "$DATA_DIR/data" "$emergency_backup_dir/" 2>/dev/null || true
    fi
    
    # Backup current configuration
    cp .env "$emergency_backup_dir/" 2>/dev/null || true
    cp "$COMPOSE_FILE" "$emergency_backup_dir/" 2>/dev/null || true
    
    # Backup current logs
    if [ -d "$DATA_DIR/logs" ]; then
        cp -r "$DATA_DIR/logs" "$emergency_backup_dir/" 2>/dev/null || true
    fi
    
    # Get current container image info
    docker inspect "$CONTAINER_NAME" --format '{{.Config.Image}}' > "$emergency_backup_dir/current_image.txt" 2>/dev/null || echo "unknown" > "$emergency_backup_dir/current_image.txt"
    
    log_success "Emergency backup created: $emergency_backup_dir"
    echo "$emergency_backup_dir"
}

# Quick container rollback
quick_rollback() {
    local previous_image=${1:-"ghcr.io/andrewgari/covabot:previous"}
    
    log_warning "QUICK ROLLBACK: Rolling back to previous container image"
    
    # Stop current services
    emergency_stop
    
    # Create emergency backup
    local backup_dir=$(create_emergency_backup)
    
    # Pull previous image
    log_info "Pulling previous image: $previous_image"
    docker pull "$previous_image" || {
        log_error "Failed to pull previous image: $previous_image"
        return 1
    }
    
    # Update docker-compose to use previous image
    if [ -f "$COMPOSE_FILE" ]; then
        sed -i.bak "s|image: ghcr.io/andrewgari/covabot:.*|image: $previous_image|g" "$COMPOSE_FILE"
        log_info "Updated docker-compose file to use previous image"
    fi
    
    # Restart services
    log_info "Starting services with previous image..."
    docker-compose -f "$COMPOSE_FILE" up -d
    
    # Wait for services to start
    log_info "Waiting for services to start..."
    sleep 30
    
    # Verify rollback
    if docker ps --filter name="$CONTAINER_NAME" --format "{{.Names}}" | grep -q "$CONTAINER_NAME"; then
        log_success "Quick rollback completed successfully"
        log_info "Emergency backup available at: $backup_dir"
        return 0
    else
        log_error "Quick rollback failed - container not running"
        return 1
    fi
}

# Full data rollback
full_rollback() {
    local backup_name=${1:-"latest"}
    local backup_path="$BACKUP_DIR/$backup_name"
    
    if [ ! -d "$backup_path" ]; then
        log_error "Backup not found: $backup_path"
        list_available_backups
        return 1
    fi
    
    log_warning "FULL ROLLBACK: Rolling back to backup: $backup_name"
    log_warning "This will restore data, configuration, and container image"
    
    # Confirmation prompt
    read -p "Are you sure you want to proceed with full rollback? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        log_info "Rollback cancelled"
        return 1
    fi
    
    # Stop services
    emergency_stop
    
    # Create emergency backup
    local emergency_backup_dir=$(create_emergency_backup)
    
    # Restore data
    if [ -d "$backup_path/data" ]; then
        log_info "Restoring data directory..."
        rm -rf "$DATA_DIR/data"
        cp -r "$backup_path/data" "$DATA_DIR/"
        log_success "Data directory restored"
    fi
    
    # Restore configuration
    if [ -f "$backup_path/.env" ]; then
        log_info "Restoring environment configuration..."
        cp "$backup_path/.env" ".env"
        log_success "Environment configuration restored"
    fi
    
    if [ -f "$backup_path/$COMPOSE_FILE" ]; then
        log_info "Restoring docker-compose configuration..."
        cp "$backup_path/$COMPOSE_FILE" "$COMPOSE_FILE"
        log_success "Docker-compose configuration restored"
    fi
    
    # Restore container image if specified
    if [ -f "$backup_path/current_image.txt" ]; then
        local backup_image=$(cat "$backup_path/current_image.txt")
        if [ "$backup_image" != "unknown" ]; then
            log_info "Pulling backup image: $backup_image"
            docker pull "$backup_image" || log_warning "Failed to pull backup image"
        fi
    fi
    
    # Restart services
    log_info "Starting services with restored configuration..."
    docker-compose -f "$COMPOSE_FILE" up -d
    
    # Wait for services to start
    log_info "Waiting for services to start..."
    sleep 30
    
    # Verify rollback
    if docker ps --filter name="$CONTAINER_NAME" --format "{{.Names}}" | grep -q "$CONTAINER_NAME"; then
        log_success "Full rollback completed successfully"
        log_info "Emergency backup available at: $emergency_backup_dir"
        return 0
    else
        log_error "Full rollback failed - container not running"
        return 1
    fi
}

# List available backups
list_available_backups() {
    log_info "Available backups:"
    
    if [ ! -d "$BACKUP_DIR" ]; then
        log_warning "No backup directory found: $BACKUP_DIR"
        return 1
    fi
    
    local backup_count=0
    for backup in "$BACKUP_DIR"/*; do
        if [ -d "$backup" ]; then
            local backup_name=$(basename "$backup")
            local backup_date="Unknown"
            
            # Try to get backup date from directory name or backup_info.txt
            if [ -f "$backup/backup_info.txt" ]; then
                backup_date=$(grep "Backup Created:" "$backup/backup_info.txt" | cut -d':' -f2- | xargs)
            fi
            
            echo "  📦 $backup_name ($backup_date)"
            backup_count=$((backup_count + 1))
        fi
    done
    
    if [ $backup_count -eq 0 ]; then
        log_warning "No backups found in $BACKUP_DIR"
        return 1
    fi
    
    log_info "Total backups: $backup_count"
}

# Health check after rollback
post_rollback_health_check() {
    log_info "Running post-rollback health check..."
    
    # Wait a bit more for services to fully start
    sleep 30
    
    # Check container status
    if ! docker ps --filter name="$CONTAINER_NAME" --format "{{.Names}}" | grep -q "$CONTAINER_NAME"; then
        log_error "Container is not running after rollback"
        return 1
    fi
    
    # Check web interface
    local health_url="http://localhost:7080/api/health"
    local max_attempts=6
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        log_info "Health check attempt $attempt/$max_attempts..."
        
        if curl -s -f "$health_url" >/dev/null 2>&1; then
            log_success "Web interface is responding"
            break
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            log_error "Web interface health check failed after $max_attempts attempts"
            return 1
        fi
        
        sleep 10
        attempt=$((attempt + 1))
    done
    
    # Check Qdrant connectivity
    if curl -s -f "http://192.168.50.3:6333/collections" >/dev/null 2>&1; then
        log_success "Qdrant connectivity verified"
    else
        log_warning "Qdrant connectivity check failed"
    fi
    
    # Check recent logs for errors
    local error_count=$(docker logs "$CONTAINER_NAME" --since 2m 2>&1 | grep -i "error\|exception" | wc -l)
    if [ "$error_count" -eq 0 ]; then
        log_success "No errors found in recent logs"
    else
        log_warning "Found $error_count error(s) in recent logs"
    fi
    
    log_success "Post-rollback health check completed"
    return 0
}

# Show usage
show_usage() {
    echo "CovaBot Emergency Rollback Script"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  stop                    Emergency stop all services"
    echo "  quick [IMAGE]          Quick rollback to previous container image"
    echo "  full [BACKUP_NAME]     Full rollback including data and configuration"
    echo "  list                   List available backups"
    echo "  health                 Run health check"
    echo ""
    echo "Examples:"
    echo "  $0 stop                                    # Emergency stop"
    echo "  $0 quick                                   # Quick rollback to previous image"
    echo "  $0 quick ghcr.io/andrewgari/covabot:v1.0  # Quick rollback to specific image"
    echo "  $0 full latest                             # Full rollback to latest backup"
    echo "  $0 list                                    # List available backups"
    echo ""
}

# Main script logic
main() {
    case "${1:-}" in
        stop)
            emergency_stop
            ;;
        quick)
            quick_rollback "$2"
            post_rollback_health_check
            ;;
        full)
            full_rollback "$2"
            post_rollback_health_check
            ;;
        list)
            list_available_backups
            ;;
        health)
            post_rollback_health_check
            ;;
        -h|--help|help)
            show_usage
            ;;
        "")
            log_error "No command specified"
            show_usage
            exit 1
            ;;
        *)
            log_error "Unknown command: $1"
            show_usage
            exit 1
            ;;
    esac
}

# Trap for emergency stop on Ctrl+C
trap 'log_warning "Interrupted by user"; exit 130' INT

# Run main function
main "$@"
