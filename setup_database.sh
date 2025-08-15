#!/bin/bash

# Database setup script for InvTracker
# This script creates the database and runs the schema

echo "Setting up InvTracker PostgreSQL database..."

# Check if PostgreSQL is running
if ! pg_isready -q; then
    echo "Starting PostgreSQL server..."
    brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null || {
        echo "Error: Could not start PostgreSQL. Please make sure it's installed and configured."
        exit 1
    }
    
    # Wait a moment for PostgreSQL to start
    sleep 3
fi

# Create database if it doesn't exist
echo "Creating database 'invtracker'..."
createdb invtracker 2>/dev/null || {
    echo "Database 'invtracker' already exists or could not be created."
    echo "Continuing with existing database..."
}

# Run the schema
echo "Running database schema..."
psql -d invtracker -f database_schema.sql

if [ $? -eq 0 ]; then
    echo "✅ Database setup completed successfully!"
    echo ""
    echo "Database connection details:"
    echo "  Database: invtracker"
    echo "  Host: localhost"
    echo "  Port: 5432"
    echo "  User: $(whoami)"
    echo ""
    echo "To connect to the database:"
    echo "  psql -d invtracker"
    echo ""
    echo "To view tables:"
    echo "  \dt"
    echo ""
    echo "To view sample data (if loaded):"
    echo "  SELECT * FROM inventory;"
    echo "  SELECT * FROM events;"
else
    echo "❌ Error running database schema"
    exit 1
fi
