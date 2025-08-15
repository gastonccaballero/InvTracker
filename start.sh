#!/bin/bash

echo "🚀 Starting InvTracker with PostgreSQL Database..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Check if PostgreSQL is running
echo "🔍 Checking PostgreSQL connection..."
if ! pg_isready -q; then
    echo "⚠️  PostgreSQL might not be running. Please make sure PostgreSQL is started."
    echo "   You can start it with: brew services start postgresql"
fi

# Copy config file if .env doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from config.env..."
    cp config.env .env
fi

# Start the server
echo "🌐 Starting server..."
echo "   The application will be available at: http://localhost:3000"
echo "   API will be available at: http://localhost:3000/api"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

npm start
