#!/bin/bash

# Firebase Deployment Script for QuickLink Pay Admin Dashboard
# This script deploys Firestore security rules and Firebase configurations

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print functions
print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if Firebase CLI is installed
check_firebase_cli() {
    if ! command -v firebase &> /dev/null; then
        print_error "Firebase CLI is not installed!"
        print_info "Install it with: npm install -g firebase-tools"
        exit 1
    fi
    print_success "Firebase CLI is installed"
}

# Check if logged in to Firebase
check_firebase_login() {
    if ! firebase projects:list &> /dev/null; then
        print_error "Not logged in to Firebase!"
        print_info "Please run: firebase login"
        exit 1
    fi
    print_success "Logged in to Firebase"
}

# Main deployment function
main() {
    print_header "Firebase Deployment Script"
    
    # Check prerequisites
    print_info "Checking prerequisites..."
    check_firebase_cli
    check_firebase_login
    
    # Check if .firebaserc exists
    if [ ! -f ".firebaserc" ]; then
        print_warning ".firebaserc not found!"
        print_info "Initializing Firebase project..."
        firebase init
    fi
    
    # Get project info
    PROJECT_ID=$(firebase use | grep "active project" | awk '{print $NF}' | tr -d '()' 2>/dev/null || echo "")
    
    if [ -z "$PROJECT_ID" ]; then
        print_error "No Firebase project selected!"
        print_info "Please run: firebase use --add"
        exit 1
    fi
    
    print_success "Using Firebase project: $PROJECT_ID"
    
    # Ask for confirmation
    echo ""
    print_warning "This will deploy the following to $PROJECT_ID:"
    echo "  - Firestore security rules (firestore.rules)"
    echo ""
    read -p "Do you want to continue? (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Deployment cancelled"
        exit 0
    fi
    
    # Deploy Firestore rules
    print_header "Deploying Firestore Security Rules"
    
    if [ ! -f "firestore.rules" ]; then
        print_error "firestore.rules file not found!"
        exit 1
    fi
    
    print_info "Deploying Firestore rules..."
    if firebase deploy --only firestore:rules; then
        print_success "Firestore rules deployed successfully!"
    else
        print_error "Failed to deploy Firestore rules"
        exit 1
    fi
    
    # Summary
    print_header "Deployment Complete"
    print_success "All Firebase configurations have been deployed!"
    print_info "Project: $PROJECT_ID"
    print_info ""
    print_info "Next steps:"
    echo "  1. Verify rules in Firebase Console: https://console.firebase.google.com/project/$PROJECT_ID/firestore/rules"
    echo "  2. Deploy Cloud Functions (if needed): npm run deploy:functions"
    echo "  3. Test your application to ensure everything works correctly"
}

# Run main function
main
