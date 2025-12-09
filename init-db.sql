-- TSS PPM Database Initialization
-- This script runs on first PostgreSQL container start

-- Create Keycloak database (Keycloak needs its own database)
CREATE DATABASE keycloak;

-- Grant permissions to the ppm user for Keycloak database
GRANT ALL PRIVILEGES ON DATABASE keycloak TO ppm;

-- Enable UUID extension for both databases
\c tss_ppm
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c keycloak
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
