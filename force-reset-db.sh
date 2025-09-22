#!/bin/bash

echo "🗑️  Force clearing database completely..."
echo ""

# Kill any running Expo processes
echo "🛑 Stopping Expo server..."
pkill -f "expo start" 2>/dev/null || true

# Clear Expo cache
echo "🧹 Clearing Expo cache..."
cd apps/contacto-app
rm -rf .expo 2>/dev/null || true
rm -rf node_modules/.cache 2>/dev/null || true

# Go back to root
cd ../..

echo "🗄️  Looking for database files to delete..."

# Find and delete SQLite database files
find . -name "*.db" -delete 2>/dev/null || true
find . -name "*.sqlite" -delete 2>/dev/null || true
find . -name "*.sqlite3" -delete 2>/dev/null || true

# Also check common Expo data directories
rm -rf ~/Library/Application\ Support/com.expo.*/Databases 2>/dev/null || true
rm -rf ~/Library/Developer/CoreSimulator/Devices/*/data/Containers/Data/Application/*/Documents/*.db 2>/dev/null || true

echo "✅ Database files deleted"
echo "🚀 Starting fresh Expo server..."
echo "📱 The app will create a new database and populate with initial contacts"
echo ""

# Start Expo
cd apps/contacto-app
npx expo start --clear
