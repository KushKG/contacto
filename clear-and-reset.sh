#!/bin/bash

echo "🔄 Clearing database and resetting with initial contacts..."
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

echo "🚀 Starting Expo server..."
echo "📱 The app will automatically populate with 5 initial contacts when it starts"
echo "📋 Contacts will have: names, phones, emails, notes"
echo "❌ No tags or conversations will be included"
echo ""
echo "Press Ctrl+C to stop the server when done"
echo ""

# Start Expo
cd apps/contacto-app
npx expo start --clear
