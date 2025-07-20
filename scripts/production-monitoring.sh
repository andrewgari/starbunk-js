#!/bin/bash

# CovaBot Production Monitoring Script
# Comprehensive monitoring for production deployment

set -e

# Configuration
COVABOT_CONTAINER="starbunk-covabot-latest"
HEALTH_CHECK_URL="http://localhost:7080/api/health"
QDRANT_URL="http://192.168.50.3:6333"
LOG_FILE="/mnt/user/appdata/covabot/logs/monitoring.log"
ALERT_THRESHOLD_CPU=80
ALERT_THRESHOLD_MEMORY=85
ALERT_THRESHOLD_RESPONSE_TIME=5000  # milliseconds

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging function
log_message() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} [${level}] ${message}" | tee -a "$LOG_FILE"
}

log_info() {
    log_message "INFO" "${BLUE}$1${NC}"
}

log_success() {
    log_message "SUCCESS" "${GREEN}$1${NC}"
}

log_warning() {
    log_message "WARNING" "${YELLOW}$1${NC}"
}

log_error() {
    log_message "ERROR" "${RED}$1${NC}"
}

# Health check function
check_container_health() {
    log_info "Checking container health..."
    
    # Check if container is running
    if ! docker ps --filter name="$COVABOT_CONTAINER" --format "{{.Names}}" | grep -q "$COVABOT_CONTAINER"; then
        log_error "Container $COVABOT_CONTAINER is not running!"
        return 1
    fi
    
    # Check container status
    local status=$(docker inspect "$COVABOT_CONTAINER" --format '{{.State.Status}}')
    if [ "$status" != "running" ]; then
        log_error "Container status is $status (expected: running)"
        return 1
    fi
    
    log_success "Container is running and healthy"
    return 0
}

# Web interface health check
check_web_interface() {
    log_info "Checking web interface health..."
    
    local start_time=$(date +%s%3N)
    local response=$(curl -s -w "%{http_code}" -o /tmp/health_response "$HEALTH_CHECK_URL" 2>/dev/null || echo "000")
    local end_time=$(date +%s%3N)
    local response_time=$((end_time - start_time))
    
    if [ "$response" = "200" ]; then
        log_success "Web interface healthy (${response_time}ms)"
        
        # Check response time
        if [ "$response_time" -gt "$ALERT_THRESHOLD_RESPONSE_TIME" ]; then
            log_warning "Response time ${response_time}ms exceeds threshold ${ALERT_THRESHOLD_RESPONSE_TIME}ms"
        fi
        
        return 0
    else
        log_error "Web interface health check failed (HTTP $response)"
        return 1
    fi
}

# Qdrant connectivity check
check_qdrant_connectivity() {
    log_info "Checking Qdrant connectivity..."
    
    local response=$(curl -s -w "%{http_code}" -o /tmp/qdrant_response "$QDRANT_URL/collections" 2>/dev/null || echo "000")
    
    if [ "$response" = "200" ]; then
        local collections=$(cat /tmp/qdrant_response | jq -r '.result.collections | length' 2>/dev/null || echo "unknown")
        log_success "Qdrant connected ($collections collections)"
        return 0
    else
        log_error "Qdrant connectivity failed (HTTP $response)"
        return 1
    fi
}

# Resource usage monitoring
check_resource_usage() {
    log_info "Checking resource usage..."
    
    # Get container stats
    local stats=$(docker stats "$COVABOT_CONTAINER" --no-stream --format "{{.CPUPerc}},{{.MemPerc}},{{.MemUsage}}" 2>/dev/null)
    
    if [ -z "$stats" ]; then
        log_error "Failed to get container stats"
        return 1
    fi
    
    local cpu_percent=$(echo "$stats" | cut -d',' -f1 | sed 's/%//')
    local mem_percent=$(echo "$stats" | cut -d',' -f2 | sed 's/%//')
    local mem_usage=$(echo "$stats" | cut -d',' -f3)
    
    log_info "Resource usage: CPU ${cpu_percent}%, Memory ${mem_percent}% ($mem_usage)"
    
    # Check thresholds
    local cpu_int=$(echo "$cpu_percent" | cut -d'.' -f1)
    local mem_int=$(echo "$mem_percent" | cut -d'.' -f1)
    
    if [ "$cpu_int" -gt "$ALERT_THRESHOLD_CPU" ]; then
        log_warning "CPU usage ${cpu_percent}% exceeds threshold ${ALERT_THRESHOLD_CPU}%"
    fi
    
    if [ "$mem_int" -gt "$ALERT_THRESHOLD_MEMORY" ]; then
        log_warning "Memory usage ${mem_percent}% exceeds threshold ${ALERT_THRESHOLD_MEMORY}%"
    fi
    
    return 0
}

# Log analysis
check_error_logs() {
    log_info "Analyzing recent logs for errors..."
    
    # Check for errors in the last 5 minutes
    local error_count=$(docker logs "$COVABOT_CONTAINER" --since 5m 2>&1 | grep -i "error\|exception\|failed" | wc -l)
    
    if [ "$error_count" -gt 0 ]; then
        log_warning "Found $error_count error(s) in recent logs"
        
        # Show recent errors
        log_info "Recent errors:"
        docker logs "$COVABOT_CONTAINER" --since 5m 2>&1 | grep -i "error\|exception\|failed" | tail -5 | while read line; do
            log_warning "  $line"
        done
    else
        log_success "No errors found in recent logs"
    fi
    
    return 0
}

# Discord connectivity check
check_discord_connectivity() {
    log_info "Checking Discord connectivity..."
    
    # Check if bot is connected by looking for connection messages in logs
    local connection_status=$(docker logs "$COVABOT_CONTAINER" --since 1m 2>&1 | grep -i "ready\|connected\|logged in" | tail -1)
    
    if [ -n "$connection_status" ]; then
        log_success "Discord connection appears healthy"
        return 0
    else
        # Check for disconnection messages
        local disconnection=$(docker logs "$COVABOT_CONTAINER" --since 5m 2>&1 | grep -i "disconnect\|error.*discord" | tail -1)
        if [ -n "$disconnection" ]; then
            log_warning "Possible Discord connectivity issue: $disconnection"
        else
            log_info "Discord connection status unclear (no recent connection messages)"
        fi
        return 0
    fi
}

# Disk space check
check_disk_space() {
    log_info "Checking disk space..."
    
    local disk_usage=$(df /mnt/user/appdata/covabot | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [ "$disk_usage" -gt 90 ]; then
        log_error "Disk usage ${disk_usage}% is critically high"
        return 1
    elif [ "$disk_usage" -gt 80 ]; then
        log_warning "Disk usage ${disk_usage}% is high"
    else
        log_success "Disk usage ${disk_usage}% is normal"
    fi
    
    return 0
}

# Generate monitoring report
generate_report() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local report_file="/mnt/user/appdata/covabot/logs/monitoring_report_$(date +%Y%m%d_%H%M%S).json"
    
    # Get container stats
    local stats=$(docker stats "$COVABOT_CONTAINER" --no-stream --format "{{.CPUPerc}},{{.MemPerc}},{{.MemUsage}},{{.NetIO}},{{.BlockIO}}" 2>/dev/null || echo "N/A,N/A,N/A,N/A,N/A")
    
    # Create JSON report
    cat > "$report_file" << EOF
{
  "timestamp": "$timestamp",
  "container": "$COVABOT_CONTAINER",
  "health_checks": {
    "container_running": $(check_container_health >/dev/null 2>&1 && echo "true" || echo "false"),
    "web_interface": $(check_web_interface >/dev/null 2>&1 && echo "true" || echo "false"),
    "qdrant_connectivity": $(check_qdrant_connectivity >/dev/null 2>&1 && echo "true" || echo "false"),
    "discord_connectivity": "unknown"
  },
  "resource_usage": {
    "cpu_percent": "$(echo "$stats" | cut -d',' -f1)",
    "memory_percent": "$(echo "$stats" | cut -d',' -f2)",
    "memory_usage": "$(echo "$stats" | cut -d',' -f3)",
    "network_io": "$(echo "$stats" | cut -d',' -f4)",
    "block_io": "$(echo "$stats" | cut -d',' -f5)"
  },
  "thresholds": {
    "cpu_threshold": $ALERT_THRESHOLD_CPU,
    "memory_threshold": $ALERT_THRESHOLD_MEMORY,
    "response_time_threshold": $ALERT_THRESHOLD_RESPONSE_TIME
  }
}
EOF

    log_info "Monitoring report saved to: $report_file"
}

# Main monitoring function
run_monitoring_check() {
    log_info "Starting CovaBot production monitoring check..."
    
    local overall_status=0
    
    # Run all checks
    check_container_health || overall_status=1
    check_web_interface || overall_status=1
    check_qdrant_connectivity || overall_status=1
    check_resource_usage || overall_status=1
    check_error_logs || overall_status=1
    check_discord_connectivity || overall_status=1
    check_disk_space || overall_status=1
    
    # Generate report
    generate_report
    
    if [ $overall_status -eq 0 ]; then
        log_success "All monitoring checks passed"
    else
        log_warning "Some monitoring checks failed or showed warnings"
    fi
    
    return $overall_status
}

# Continuous monitoring mode
continuous_monitoring() {
    log_info "Starting continuous monitoring mode..."
    
    while true; do
        echo ""
        log_info "=== Monitoring Check $(date) ==="
        run_monitoring_check
        
        echo ""
        log_info "Next check in 5 minutes..."
        sleep 300  # 5 minutes
    done
}

# Usage information
show_usage() {
    echo "CovaBot Production Monitoring Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -c, --continuous    Run continuous monitoring (every 5 minutes)"
    echo "  -o, --once         Run monitoring check once and exit"
    echo "  -h, --help         Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 --once          # Run single monitoring check"
    echo "  $0 --continuous    # Run continuous monitoring"
    echo ""
}

# Main script logic
main() {
    # Create log directory if it doesn't exist
    mkdir -p "$(dirname "$LOG_FILE")"
    
    case "${1:-}" in
        -c|--continuous)
            continuous_monitoring
            ;;
        -o|--once)
            run_monitoring_check
            ;;
        -h|--help)
            show_usage
            ;;
        "")
            # Default to single check
            run_monitoring_check
            ;;
        *)
            echo "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
