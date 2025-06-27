#!/bin/bash

# Database Migration Script for PostgreSQL Configuration System
# This script sets up the PostgreSQL database with the new schema and seeds initial data

set -e

echo "🚀 Starting database migration for PostgreSQL configuration system..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    echo "Please set DATABASE_URL to your PostgreSQL connection string"
    echo "Example: export DATABASE_URL='postgresql://user:password@localhost:5432/starbunk'"
    exit 1
fi

echo "📊 Database URL: ${DATABASE_URL}"

# Check if we're in the project root
if [ ! -f "package.json" ]; then
    echo "❌ ERROR: This script must be run from the project root directory"
    exit 1
fi

# Install dependencies if needed
echo "📦 Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Run database migrations
echo "🗄️  Running database migrations..."
npx prisma db push --accept-data-loss

# Seed the database
echo "🌱 Seeding database with initial configuration..."
npx tsx prisma/seed.ts

echo "✅ Database migration completed successfully!"
echo ""
echo "📋 Summary:"
echo "  - PostgreSQL schema created/updated"
echo "  - Bot configurations seeded"
echo "  - User configurations seeded"
echo "  - Server configurations seeded"
echo ""
echo "🎉 Your Discord bot containers can now use database-driven configuration!"
echo ""
echo "Next steps:"
echo "1. Build and test your containers: docker-compose build"
echo "2. Start the snapshot stack: docker-compose -f docker-compose.snapshot.yml up"
echo "3. Test reply bots to ensure they're working with database configuration"
