#!/bin/bash

# Interview Platform Deployment Script

echo "🚀 Interview Platform Deployment Script"
echo "======================================"

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo "❌ Error: .env.production file not found!"
    echo "Please copy .env.production.template to .env.production and fill in the values."
    exit 1
fi

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Error: Docker is not running!"
    echo "Please start Docker and try again."
    exit 1
fi

echo "📋 Pre-deployment checklist:"
echo "✓ Docker is running"
echo "✓ Environment file exists"

# Build the Docker image
echo "🔨 Building Docker image..."
docker build -t interview-platform .

if [ $? -ne 0 ]; then
    echo "❌ Docker build failed!"
    exit 1
fi

# Start the application
echo "🚀 Starting application..."
docker-compose --env-file .env.production up -d

if [ $? -eq 0 ]; then
    echo "✅ Application deployed successfully!"
    echo "🌐 Access your app at: http://localhost:3000"
    echo ""
    echo "📊 To check logs: docker-compose logs -f"
    echo "🛑 To stop: docker-compose down"
else
    echo "❌ Deployment failed!"
    exit 1
fi
