#!/bin/bash

# Starbunk Docker Deployment Helper
# Simplifies deployment with different Docker Compose configurations

set -e

echo "🚀 Starbunk Docker Deployment Helper"
echo "===================================="

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        echo "❌ Docker is not running. Please start Docker first."
        exit 1
    fi
}

# Function to check environment file
check_env() {
    if [ ! -f .env ]; then
        echo "❌ .env file not found. Please create one based on .env.production.example"
        exit 1
    fi
}

# Function to deploy with snapshot images
deploy_snapshot() {
    local pr_number=$1
    
    if [ -z "$pr_number" ]; then
        read -p "Enter PR number: " pr_number
    fi
    
    if [ -z "$pr_number" ]; then
        echo "❌ PR number is required for snapshot deployment"
        exit 1
    fi
    
    echo "🔍 Checking if PR $pr_number snapshot images exist..."
    
    # Check if images exist
    containers=("bunkbot" "djcova" "starbunk-dnd" "covabot")
    missing_images=()
    
    for container in "${containers[@]}"; do
        image="ghcr.io/andrewgari/starbunk/${container}:pr-${pr_number}-snapshot"
        echo -n "  Checking $container... "
        if docker manifest inspect "$image" > /dev/null 2>&1; then
            echo "✅"
        else
            echo "❌"
            missing_images+=("$container")
        fi
    done
    
    if [ ${#missing_images[@]} -ne 0 ]; then
        echo "⚠️  Missing snapshot images for: ${missing_images[*]}"
        echo "   Make sure PR $pr_number has been built and published."
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    echo "🐳 Deploying PR $pr_number snapshot images..."
    export PR_NUMBER=$pr_number
    docker-compose -f docker-compose.snapshot.yml down --remove-orphans 2>/dev/null || true
    docker-compose -f docker-compose.snapshot.yml pull
    docker-compose -f docker-compose.snapshot.yml up -d
    
    echo "✅ PR $pr_number snapshot deployment started!"
    echo "📊 Check status: docker-compose -f docker-compose.snapshot.yml ps"
}

# Function to deploy with latest images
deploy_latest() {
    echo "🔍 Checking if latest images exist..."
    
    # Check if images exist
    containers=("bunkbot" "djcova" "starbunk-dnd" "covabot")
    missing_images=()
    
    for container in "${containers[@]}"; do
        image="ghcr.io/andrewgari/starbunk/${container}:latest"
        echo -n "  Checking $container... "
        if docker manifest inspect "$image" > /dev/null 2>&1; then
            echo "✅"
        else
            echo "❌"
            missing_images+=("$container")
        fi
    done
    
    if [ ${#missing_images[@]} -ne 0 ]; then
        echo "⚠️  Missing latest images for: ${missing_images[*]}"
        echo "   You may need to publish latest images first."
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    echo "🐳 Deploying latest stable images..."
    docker-compose -f docker-compose.latest.yml down --remove-orphans 2>/dev/null || true
    docker-compose -f docker-compose.latest.yml pull
    docker-compose -f docker-compose.latest.yml up -d
    
    echo "✅ Latest stable deployment started!"
    echo "📊 Check status: docker-compose -f docker-compose.latest.yml ps"
}

# Function to deploy with main docker-compose.yml
deploy_main() {
    echo "🐳 Deploying with main docker-compose.yml..."
    docker-compose down --remove-orphans 2>/dev/null || true
    docker-compose pull
    docker-compose up -d
    
    echo "✅ Main deployment started!"
    echo "📊 Check status: docker-compose ps"
}

# Function to show status of all deployments
show_status() {
    echo "📊 Deployment Status:"
    echo "===================="
    
    echo ""
    echo "🔵 Main Deployment:"
    if docker-compose ps --services > /dev/null 2>&1; then
        docker-compose ps
    else
        echo "   Not running"
    fi
    
    echo ""
    echo "📸 Snapshot Deployment:"
    if docker-compose -f docker-compose.snapshot.yml ps --services > /dev/null 2>&1; then
        docker-compose -f docker-compose.snapshot.yml ps
    else
        echo "   Not running"
    fi
    
    echo ""
    echo "🏷️  Latest Deployment:"
    if docker-compose -f docker-compose.latest.yml ps --services > /dev/null 2>&1; then
        docker-compose -f docker-compose.latest.yml ps
    else
        echo "   Not running"
    fi
}

# Function to stop all deployments
stop_all() {
    echo "🛑 Stopping all deployments..."
    
    docker-compose down --remove-orphans 2>/dev/null || true
    docker-compose -f docker-compose.snapshot.yml down --remove-orphans 2>/dev/null || true
    docker-compose -f docker-compose.latest.yml down --remove-orphans 2>/dev/null || true
    
    echo "✅ All deployments stopped!"
}

# Check prerequisites
check_docker
check_env

# Main menu
echo ""
echo "📋 Deployment Options:"
echo "1. Deploy PR Snapshot Images (for testing)"
echo "2. Deploy Latest Stable Images (production)"
echo "3. Deploy Main Configuration (current docker-compose.yml)"
echo "4. Show Status of All Deployments"
echo "5. Stop All Deployments"
echo "6. Exit"
echo ""

read -p "Choose an option (1-6): " choice

case $choice in
    1)
        deploy_snapshot "$2"
        ;;
    2)
        deploy_latest
        ;;
    3)
        deploy_main
        ;;
    4)
        show_status
        ;;
    5)
        stop_all
        ;;
    6)
        echo "👋 Goodbye!"
        exit 0
        ;;
    *)
        echo "❌ Invalid option"
        exit 1
        ;;
esac

echo ""
echo "🔗 Useful Commands:"
echo "   View logs: docker-compose -f <compose-file> logs -f [service]"
echo "   Restart service: docker-compose -f <compose-file> restart [service]"
echo "   Stop deployment: docker-compose -f <compose-file> down"
