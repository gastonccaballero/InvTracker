-- Setup postgres user for InvTracker database
-- Run this from your other database connection

-- 1. Set password for postgres user
ALTER USER postgres PASSWORD 'postgres';

-- 2. Grant all privileges on InvTracker database to postgres user
GRANT ALL PRIVILEGES ON DATABASE "InvTracker" TO postgres;

-- 3. Connect to InvTracker database and grant schema privileges
-- (You'll need to run this after connecting to the InvTracker database)
-- GRANT ALL ON SCHEMA public TO postgres;
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
