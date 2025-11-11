#!/bin/bash

###############################################################################
# Firebase Deployment Script for QuickLink Pay
#
# This script deploys:
# 1. Firestore security rules
# 2. Cloud Functions
#
# Usage: ./deploy.sh [options]
#   Options:
#     --rules-only    Deploy only Firestore security rules
#     --functions-only Deploy only Cloud Functions
#     --all           Deploy everything (default)
#     --help          Show this help message
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
FUNCTIONS_DIR="$SCRIPT_DIR/functions"

# Default options
DEPLOY_RULES=true
DEPLOY_FUNCTIONS=true

###############################################################################
# Helper Functions
###############################################################################

print_header() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

show_help() {
    echo "Firebase Deployment Script for QuickLink Pay"
    echo ""
    echo "Usage: ./deploy.sh [options]"
    echo ""
    echo "Options:"
    echo "  --rules-only       Deploy only Firestore security rules"
    echo "  --functions-only   Deploy only Cloud Functions"
    echo "  --all              Deploy everything (default)"
    echo "  --help             Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./deploy.sh                    # Deploy everything"
    echo "  ./deploy.sh --rules-only       # Deploy only security rules"
    echo "  ./deploy.sh --functions-only   # Deploy only Cloud Functions"
    exit 0
}

check_command() {
    if ! command -v $1 &> /dev/null; then
        print_error "$1 is not installed"
        exit 1
    fi
}

###############################################################################
# Parse Arguments
###############################################################################

while [[ $# -gt 0 ]]; do
    case $1 in
        --rules-only)
            DEPLOY_RULES=true
            DEPLOY_FUNCTIONS=false
            shift
            ;;
        --functions-only)
            DEPLOY_RULES=false
            DEPLOY_FUNCTIONS=true
            shift
            ;;
        --all)
            DEPLOY_RULES=true
            DEPLOY_FUNCTIONS=true
            shift
            ;;
        --help|-h)
            show_help
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Run './deploy.sh --help' for usage information"
            exit 1
            ;;
    esac
done

###############################################################################
# Main Script
###############################################################################

clear
print_header "QuickLink Pay - Firebase Deployment"

print_info "Deployment Mode:"
if [ "$DEPLOY_RULES" = true ]; then
    echo "  • Firestore Security Rules"
fi
if [ "$DEPLOY_FUNCTIONS" = true ]; then
    echo "  • Cloud Functions"
fi
echo ""

# Check prerequisites
print_header "Checking Prerequisites"

print_info "Checking required tools..."
check_command firebase
check_command node
check_command npm
print_success "All required tools are installed"

# Check if we're in the correct directory
if [ ! -f "$SCRIPT_DIR/firebase.json" ]; then
    print_error "firebase.json not found. Please run this script from the admin-dashboard directory"
    exit 1
fi
print_success "Found firebase.json"

# Check Firebase authentication
print_header "Checking Firebase Authentication"

print_info "Checking Firebase login status..."
if firebase projects:list > /dev/null 2>&1; then
    print_success "Already authenticated with Firebase"

    # Show current project
    CURRENT_PROJECT=$(firebase use 2>&1 | grep "Active Project:" | awk '{print $3}' || echo "")
    if [ -n "$CURRENT_PROJECT" ]; then
        print_info "Current Firebase project: ${GREEN}$CURRENT_PROJECT${NC}"
    fi
else
    print_warning "Not authenticated or credentials expired"
    print_info "Opening browser for Firebase authentication..."

    if firebase login --reauth; then
        print_success "Successfully authenticated with Firebase"
    else
        print_error "Authentication failed"
        exit 1
    fi
fi

# Verify or select project
print_info "Verifying Firebase project..."
if ! firebase use > /dev/null 2>&1; then
    print_warning "No Firebase project selected"
    print_info "Please select a project:"
    firebase use --add
fi

SELECTED_PROJECT=$(firebase use 2>&1 | grep "Active Project:" | awk '{print $3}' || echo "unknown")
print_success "Using Firebase project: ${GREEN}$SELECTED_PROJECT${NC}"

# Confirm deployment
echo ""
print_warning "You are about to deploy to: ${GREEN}$SELECTED_PROJECT${NC}"
read -p "Do you want to continue? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_info "Deployment cancelled"
    exit 0
fi

###############################################################################
# Build Cloud Functions
###############################################################################

if [ "$DEPLOY_FUNCTIONS" = true ]; then
    print_header "Building Cloud Functions"

    cd "$FUNCTIONS_DIR"

    print_info "Checking if dependencies are installed..."
    if [ ! -d "node_modules" ]; then
        print_info "Installing dependencies..."
        npm install
    else
        print_success "Dependencies already installed"
    fi

    print_info "Building TypeScript code..."
    if npm run build; then
        print_success "Cloud Functions built successfully"

        # Show build output
        if [ -f "lib/index.js" ]; then
            FILE_SIZE=$(du -h lib/index.js | cut -f1)
            print_info "Build output: lib/index.js ($FILE_SIZE)"
        fi
    else
        print_error "Failed to build Cloud Functions"
        exit 1
    fi

    cd "$SCRIPT_DIR"
fi

###############################################################################
# Deploy Firestore Security Rules
###############################################################################

if [ "$DEPLOY_RULES" = true ]; then
    print_header "Deploying Firestore Security Rules"

    print_info "Validating security rules..."

    # Check if rules file exists
    if [ ! -f "$SCRIPT_DIR/firestore.rules" ]; then
        print_error "firestore.rules file not found"
        exit 1
    fi

    print_info "Deploying security rules to Firebase..."
    if firebase deploy --only firestore:rules; then
        print_success "Firestore security rules deployed successfully"

        echo ""
        print_info "Security rules now include:"
        echo "  • AI Prompt Templates (super admin only)"
        echo "  • AI Usage Logs (read by admins/merchants)"
        echo "  • Email Templates & Logs"
        echo "  • WhatsApp Templates & Messages"
        echo "  • Merchant collections (invoices, customers, products, etc.)"
        echo "  • Merchant self-access enabled"
    else
        print_error "Failed to deploy Firestore security rules"
        exit 1
    fi
fi

###############################################################################
# Deploy Cloud Functions
###############################################################################

if [ "$DEPLOY_FUNCTIONS" = true ]; then
    print_header "Deploying Cloud Functions"

    print_info "Deploying functions to Firebase..."
    echo ""
    print_info "This may take a few minutes..."

    if firebase deploy --only functions; then
        print_success "Cloud Functions deployed successfully"

        echo ""
        print_info "Deployed functions:"
        echo "  • sendOTP - Send OTP via WhatsApp/SMS"
        echo "  • verifyOTP - Verify OTP and create auth token"
        echo "  • requestPayout - Handle merchant payout requests"
        echo "  • validateMerchantData - Validate merchant data"
        echo "  • validateInvoiceData - Validate invoice data"
        echo "  • updateInvoiceOnPayment - Auto-mark invoice as paid"
        echo "  • notifyOnTicketUpdate - Create notifications"
    else
        print_error "Failed to deploy Cloud Functions"
        print_warning "Check the error messages above for details"
        exit 1
    fi
fi

###############################################################################
# Post-Deployment
###############################################################################

print_header "Deployment Complete!"

print_success "All deployments completed successfully"

echo ""
print_info "Next steps:"
echo ""

if [ "$DEPLOY_FUNCTIONS" = true ]; then
    echo "1. Configure environment variables for external services:"
    echo ""
    echo "   ${YELLOW}# Twilio (for SMS OTP)${NC}"
    echo "   firebase functions:config:set twilio.account_sid=\"YOUR_TWILIO_ACCOUNT_SID\""
    echo "   firebase functions:config:set twilio.auth_token=\"YOUR_TWILIO_AUTH_TOKEN\""
    echo "   firebase functions:config:set twilio.phone_number=\"YOUR_TWILIO_PHONE_NUMBER\""
    echo ""
    echo "   ${YELLOW}# 360Dialog (for WhatsApp OTP)${NC}"
    echo "   firebase functions:config:set dialog360.api_key=\"YOUR_360DIALOG_API_KEY\""
    echo "   firebase functions:config:set dialog360.namespace=\"YOUR_360DIALOG_NAMESPACE\""
    echo ""
    echo "2. Monitor function logs:"
    echo "   firebase functions:log"
    echo ""
    echo "3. Test OTP authentication flow from Flutter app"
    echo ""
fi

echo "4. View deployment in Firebase Console:"
echo "   https://console.firebase.google.com/project/$SELECTED_PROJECT/overview"
echo ""

print_warning "Important: Remember to remove OTP logging in production"
print_info "Edit functions/src/index.ts line 93 to remove console.log"

echo ""
print_header "Deployment Summary"
echo "  Project: ${GREEN}$SELECTED_PROJECT${NC}"
if [ "$DEPLOY_RULES" = true ]; then
    echo "  Security Rules: ${GREEN}✓ Deployed${NC}"
fi
if [ "$DEPLOY_FUNCTIONS" = true ]; then
    echo "  Cloud Functions: ${GREEN}✓ Deployed${NC}"
fi
echo ""

print_success "Done! 🎉"
