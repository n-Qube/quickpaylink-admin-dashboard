#!/bin/bash

# Script to check Firebase deployment status

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Firebase Deployment Status${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo -e "${YELLOW}⚠️  Firebase CLI is not installed${NC}"
    echo "   Install with: npm install -g firebase-tools"
    exit 1
fi

# Check login status
echo -e "${BLUE}📝 Login Status:${NC}"
firebase login:list 2>/dev/null || echo "Not logged in - run: firebase login"
echo ""

# Check current project
echo -e "${BLUE}📦 Current Project:${NC}"
firebase use 2>/dev/null || echo "No project selected - run: firebase use --add"
echo ""

# Check .firebaserc
if [ -f ".firebaserc" ]; then
    echo -e "${GREEN}✅ .firebaserc exists${NC}"
    echo "Content:"
    cat .firebaserc
else
    echo -e "${YELLOW}⚠️  .firebaserc not found${NC}"
fi
echo ""

# Check firestore.rules
if [ -f "firestore.rules" ]; then
    echo -e "${GREEN}✅ firestore.rules exists${NC}"
    LINE_COUNT=$(wc -l < firestore.rules)
    echo "   Lines: $LINE_COUNT"
else
    echo -e "${YELLOW}⚠️  firestore.rules not found${NC}"
fi
echo ""

# Check firebase.json
if [ -f "firebase.json" ]; then
    echo -e "${GREEN}✅ firebase.json exists${NC}"
    echo "Content:"
    cat firebase.json
else
    echo -e "${YELLOW}⚠️  firebase.json not found - run: firebase init${NC}"
fi
echo ""

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}To deploy, run: ./deploy-firebase.sh${NC}"
echo -e "${BLUE}========================================${NC}"
