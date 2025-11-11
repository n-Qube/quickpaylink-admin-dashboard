#!/bin/bash

###############################################################################
# RBAC System Deployment Script
#
# This script automates the deployment of Firestore security rules and indexes
# for the Role-Based Access Control (RBAC) system.
#
# Usage:
#   ./deploy-rbac.sh [options]
#
# Options:
#   --rules-only     Deploy only Firestore security rules
#   --indexes-only   Deploy only Firestore indexes
#   --dry-run        Show what would be deployed without actually deploying
#   --help           Show this help message
#
# Examples:
#   ./deploy-rbac.sh                    # Deploy both rules and indexes
#   ./deploy-rbac.sh --rules-only       # Deploy only rules
#   ./deploy-rbac.sh --dry-run          # Preview deployment
###############################################################################

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script variables
DEPLOY_RULES=true
DEPLOY_INDEXES=true
DRY_RUN=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --rules-only)
      DEPLOY_INDEXES=false
      shift
      ;;
    --indexes-only)
      DEPLOY_RULES=false
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --help)
      grep "^#" "$0" | grep -v "#!/bin/bash" | sed 's/^# *//'
      exit 0
      ;;
    *)
      echo -e "${RED}Error: Unknown option: $1${NC}"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

###############################################################################
# Helper Functions
###############################################################################

print_header() {
  echo ""
  echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}  $1${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
  echo ""
}

print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
  echo -e "${RED}✗ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
  echo -e "${BLUE}ℹ $1${NC}"
}

###############################################################################
# Pre-deployment Checks
###############################################################################

print_header "RBAC System Deployment"

# Check if firebase CLI is installed
if ! command -v firebase &> /dev/null; then
  print_error "Firebase CLI is not installed"
  echo ""
  echo "Please install Firebase CLI:"
  echo "  npm install -g firebase-tools"
  echo ""
  exit 1
fi

print_success "Firebase CLI is installed"

# Check if firebase.json exists
if [ ! -f "firebase.json" ]; then
  print_error "firebase.json not found in current directory"
  echo ""
  echo "Please run this script from the project root directory"
  echo ""
  exit 1
fi

print_success "firebase.json found"

# Check if firestore.rules exists
if [ ! -f "firestore.rules" ]; then
  print_error "firestore.rules not found"
  exit 1
fi

print_success "firestore.rules found"

# Check if firestore.indexes.json exists
if [ ! -f "firestore.indexes.json" ]; then
  print_error "firestore.indexes.json not found"
  exit 1
fi

print_success "firestore.indexes.json found"

# Check if user is logged in to Firebase
if ! firebase projects:list &> /dev/null; then
  print_error "Not logged in to Firebase"
  echo ""
  echo "Please login to Firebase:"
  echo "  firebase login"
  echo ""
  exit 1
fi

print_success "Logged in to Firebase"

# Get current Firebase project
FIREBASE_PROJECT=$(firebase use | grep "active project" | awk '{print $NF}' | tr -d '()')

if [ -z "$FIREBASE_PROJECT" ]; then
  print_error "No active Firebase project"
  echo ""
  echo "Please select a Firebase project:"
  echo "  firebase use <project-id>"
  echo ""
  exit 1
fi

print_success "Active Firebase project: $FIREBASE_PROJECT"

###############################################################################
# Display Deployment Plan
###############################################################################

print_header "Deployment Plan"

echo "Target Project: $FIREBASE_PROJECT"
echo ""

if [ "$DRY_RUN" = true ]; then
  print_warning "DRY RUN MODE - No changes will be made"
  echo ""
fi

if [ "$DEPLOY_RULES" = true ]; then
  print_info "Will deploy: Firestore Security Rules"
fi

if [ "$DEPLOY_INDEXES" = true ]; then
  print_info "Will deploy: Firestore Indexes"
fi

echo ""

# Show summary of changes
if [ "$DEPLOY_RULES" = true ]; then
  echo -e "${BLUE}Security Rules Summary:${NC}"
  echo "  • Hierarchical access control for admins"
  echo "  • Manager-subordinate read/write permissions"
  echo "  • Role-based document access"
  echo "  • System role protection"
  echo ""
fi

if [ "$DEPLOY_INDEXES" = true ]; then
  echo -e "${BLUE}Indexes Summary:${NC}"
  echo "  • Admins collection: 4 new composite indexes"
  echo "  • Roles collection: 4 new composite indexes"
  echo ""
fi

# Confirmation prompt (skip in dry-run mode)
if [ "$DRY_RUN" = false ]; then
  echo -e "${YELLOW}⚠ WARNING: This will update production Firestore rules/indexes${NC}"
  echo ""
  read -p "Do you want to continue? (yes/no): " -r
  echo ""

  if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    print_warning "Deployment cancelled"
    exit 0
  fi
fi

###############################################################################
# Deployment
###############################################################################

print_header "Starting Deployment"

DEPLOYMENT_FAILED=false

# Deploy Firestore Rules
if [ "$DEPLOY_RULES" = true ]; then
  echo ""
  print_info "Deploying Firestore Security Rules..."
  echo ""

  if [ "$DRY_RUN" = true ]; then
    print_info "DRY RUN: Would execute: firebase deploy --only firestore:rules"
  else
    if firebase deploy --only firestore:rules; then
      print_success "Firestore Security Rules deployed successfully"
    else
      print_error "Failed to deploy Firestore Security Rules"
      DEPLOYMENT_FAILED=true
    fi
  fi
fi

# Deploy Firestore Indexes
if [ "$DEPLOY_INDEXES" = true ]; then
  echo ""
  print_info "Deploying Firestore Indexes..."
  echo ""

  if [ "$DRY_RUN" = true ]; then
    print_info "DRY RUN: Would execute: firebase deploy --only firestore:indexes"
  else
    if firebase deploy --only firestore:indexes; then
      print_success "Firestore Indexes deployed successfully"
      echo ""
      print_warning "Note: Index creation may take several minutes to complete"
      print_info "Monitor index status at: https://console.firebase.google.com/project/$FIREBASE_PROJECT/firestore/indexes"
    else
      print_error "Failed to deploy Firestore Indexes"
      DEPLOYMENT_FAILED=true
    fi
  fi
fi

###############################################################################
# Post-deployment Summary
###############################################################################

echo ""
print_header "Deployment Summary"

if [ "$DRY_RUN" = true ]; then
  print_info "DRY RUN completed - No changes were made"
  exit 0
fi

if [ "$DEPLOYMENT_FAILED" = true ]; then
  print_error "Deployment completed with errors"
  echo ""
  echo "Please check the error messages above and try again"
  echo ""
  exit 1
fi

print_success "Deployment completed successfully!"

echo ""
print_header "Next Steps"

echo "1. Verify Security Rules:"
echo "   https://console.firebase.google.com/project/$FIREBASE_PROJECT/firestore/rules"
echo ""

echo "2. Monitor Index Creation:"
echo "   https://console.firebase.google.com/project/$FIREBASE_PROJECT/firestore/indexes"
echo ""

echo "3. Seed Default Roles (if not done yet):"
echo "   • Open your app and run the seed script"
echo "   • Or use Firebase console to import roles manually"
echo "   • See: src/scripts/README.md for instructions"
echo ""

echo "4. Create Your First Super Admin User:"
echo "   • Create user in Firebase Authentication"
echo "   • Add admin document to 'admins' collection"
echo "   • Assign 'super_admin' role"
echo ""

echo "5. Test the System:"
echo "   • Navigate to /admin/roles to verify roles"
echo "   • Navigate to /admin/users to create users"
echo "   • Test permissions and hierarchy"
echo ""

print_success "RBAC deployment complete! 🎉"
echo ""
