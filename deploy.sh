#!/bin/bash

# QuickLink Pay Admin Dashboard - Deployment Script
# This script deploys both Cloud Functions and Frontend to Firebase

set -e  # Exit on error

echo "======================================"
echo "QuickLink Pay - Firebase Deployment"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Firebase CLI is authenticated
echo "Checking Firebase authentication..."
if ! firebase projects:list &> /dev/null; then
    echo -e "${RED}❌ Not authenticated with Firebase${NC}"
    echo ""
    echo "Please run: firebase login"
    echo "Then re-run this script."
    exit 1
fi

echo -e "${GREEN}✓ Firebase authentication verified${NC}"
echo ""

# Deploy Cloud Functions
echo "======================================"
echo "Step 1: Deploying Cloud Functions"
echo "======================================"
echo ""

echo "Building Cloud Functions..."
cd functions
npm install
npm run build
cd ..

echo ""
echo "Deploying testAPIIntegration function..."
firebase deploy --only functions:testAPIIntegration

echo -e "${GREEN}✓ Cloud Functions deployed successfully${NC}"
echo ""

# Deploy Frontend
echo "======================================"
echo "Step 2: Deploying Frontend"
echo "======================================"
echo ""

echo "Building frontend..."
npm install
npx vite build

echo ""
echo "Deploying to Firebase Hosting..."
firebase deploy --only hosting

echo -e "${GREEN}✓ Frontend deployed successfully${NC}"
echo ""

# Summary
echo "======================================"
echo "Deployment Complete!"
echo "======================================"
echo ""
echo "Your admin dashboard has been deployed with the following updates:"
echo "  ✓ Cloud Function: testAPIIntegration"
echo "  ✓ Frontend: Latest build with API integration fix"
echo ""
echo "What was fixed:"
echo "  • API integration testing now works through secure Cloud Function"
echo "  • No more CORS or network errors"
echo "  • API keys are kept secure on the server"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Open your admin dashboard"
echo "  2. Go to API Management page"
echo "  3. Click the Test button (▶️) on any API integration"
echo "  4. You should see successful results!"
echo ""
echo "Project: quicklink-pay-admin"
echo "Dashboard URL: https://quicklink-pay-admin.web.app"
echo ""
