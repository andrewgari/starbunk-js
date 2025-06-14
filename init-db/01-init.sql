-- Starbunk Database Initialization Script
-- This script sets up the basic database structure for production deployment

-- Create extensions if they don't exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Set timezone
SET timezone = 'UTC';

-- Create basic indexes for performance
-- Note: Actual table creation is handled by Prisma migrations in the application

-- Log the initialization
DO $$
BEGIN
    RAISE NOTICE 'Starbunk database initialized successfully';
    RAISE NOTICE 'Database: %', current_database();
    RAISE NOTICE 'User: %', current_user;
    RAISE NOTICE 'Timestamp: %', now();
END $$;
