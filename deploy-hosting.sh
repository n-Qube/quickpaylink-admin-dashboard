#!/bin/bash

# Firebase Hosting Deployment Script for Admin Dashboard
# This script builds and deploys the React app to Firebase Hosting

set -e  # Exit on error

echo "🚀 Starting deployment to Firebase Hosting..."
echo ""

# Step 1: Build the app
echo "📦 Building the application..."
npm run build

if [ $? -ne 0 ]; then
  echo "❌ Build failed. Deployment aborted."
  exit 1
fi

echo "✅ Build completed successfully!"
echo ""

# Step 2: Deploy to Firebase Hosting
echo "🌐 Deploying to Firebase Hosting..."
firebase deploy --only hosting

if [ $? -ne 0 ]; then
  echo "❌ Deployment failed."
  exit 1
fi

echo ""
echo "✨ Deployment completed successfully!"
echo ""
echo "Your app is now live at:"
echo "https://quicklink-pay-admin.web.app"
echo "or"
echo "https://quicklink-pay-admin.firebaseapp.com"
echo ""
