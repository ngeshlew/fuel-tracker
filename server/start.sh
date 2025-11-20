#!/bin/bash

echo "🚀 Starting Fuel Tracker Backend..."

# Generate Prisma client
echo "📦 Generating Prisma client..."
npm run db:generate

# Push database schema
echo "🗄️ Setting up database schema..."
npm run db:push

# Start the server
echo "🌟 Starting server..."
node dist/index.js
