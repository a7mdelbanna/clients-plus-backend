-- Database initialization script for Clients+ API
-- This script runs when the PostgreSQL container starts for the first time

-- Create additional databases if needed
CREATE DATABASE clientsplus_test;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE clientsplus_db TO clientsplus_user;
GRANT ALL PRIVILEGES ON DATABASE clientsplus_test TO clientsplus_user;

-- Create necessary extensions
\c clientsplus_db;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

\c clientsplus_test;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Switch back to main database
\c clientsplus_db;

-- Log successful initialization
SELECT 'Database initialization completed successfully' AS status;