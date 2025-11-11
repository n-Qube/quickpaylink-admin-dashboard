#!/bin/bash

###############################################################################
# SIMPLE FIREBASE DEPLOYMENT SCRIPT
#
# This script MUST be run from your regular terminal (not Claude Code CLI)
# because it requires interactive browser authentication.
#
# HOW TO USE:
# 1. Open your regular macOS Terminal app
# 2. Run: cd /Users/danielnortey/Documents/workspace/quickpaylink/admin-dashboard
# 3. Run: ./RUN_THIS_TO_DEPLOY.sh
###############################################################################

set -e  # Exit on error

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  QuickLink Pay - Firebase Deployment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "This will deploy:"
echo "  ✓ Firestore security rules (13 collections)"
echo "  ✓ Cloud Functions (7 functions)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 1: Authenticate
echo "Step 1/5: Authenticating with Firebase..."
echo "(This will open your browser for login)"
echo ""

firebase login --reauth

if [ $? -ne 0 ]; then
    echo "❌ Authentication failed"
    exit 1
fi

echo "✓ Authentication successful"
echo ""

# Step 2: Set project
echo "Step 2/5: Setting Firebase project..."
firebase use quicklink-pay-admin

if [ $? -ne 0 ]; then
    echo "❌ Failed to set project"
    echo "Please verify project 'quicklink-pay-admin' exists"
    exit 1
fi

echo "✓ Project set: quicklink-pay-admin"
echo ""

# Step 3: Build functions
echo "Step 3/5: Building Cloud Functions..."
cd functions
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

cd ..
echo "✓ Functions built successfully"
echo ""

# Step 4: Deploy security rules and indexes
echo "Step 4/6: Deploying Firestore security rules and indexes..."
firebase deploy --only firestore

if [ $? -ne 0 ]; then
    echo "❌ Firestore deployment failed"
    exit 1
fi

echo "✓ Security rules and indexes deployed"
echo ""

# Step 5: Deploy functions
echo "Step 5/6: Deploying Cloud Functions..."
echo "(This may take 2-5 minutes...)"
echo ""

firebase deploy --only functions

if [ $? -ne 0 ]; then
    echo "❌ Functions deployment failed"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✓ DEPLOYMENT COMPLETE!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "What was deployed:"
echo ""
echo "Security Rules (13 collections):"
echo "  ✓ aiPromptTemplates, aiUsageLogs"
echo "  ✓ emailTemplates, emailLogs"
echo "  ✓ whatsappTemplates, whatsappMessages"
echo "  ✓ invoices, customers, products, payments"
echo "  ✓ teamMembers, notifications, reports"
echo "  ✓ merchants (FIXED: self-access enabled)"
echo ""
echo "Cloud Functions (7 functions):"
echo "  ✓ sendOTP - Send OTP via WhatsApp/SMS"
echo "  ✓ verifyOTP - Verify OTP and create auth token"
echo "  ✓ requestPayout - Handle payout requests"
echo "  ✓ validateMerchantData - Validate merchant data"
echo "  ✓ validateInvoiceData - Validate invoice data"
echo "  ✓ updateInvoiceOnPayment - Auto-mark paid"
echo "  ✓ notifyOnTicketUpdate - Create notifications"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "NEXT STEPS:"
echo ""
echo "1. Configure external services (required for OTP):"
echo ""
echo "   # Twilio (SMS)"
echo "   firebase functions:config:set twilio.account_sid=\"YOUR_SID\""
echo "   firebase functions:config:set twilio.auth_token=\"YOUR_TOKEN\""
echo "   firebase functions:config:set twilio.phone_number=\"YOUR_PHONE\""
echo ""
echo "   # 360Dialog (WhatsApp)"
echo "   firebase functions:config:set dialog360.api_key=\"YOUR_KEY\""
echo "   firebase functions:config:set dialog360.namespace=\"YOUR_NAMESPACE\""
echo ""
echo "   # Then redeploy:"
echo "   firebase deploy --only functions"
echo ""
echo "2. Test OTP authentication flow from Flutter app"
echo ""
echo "3. Monitor function logs:"
echo "   firebase functions:log"
echo ""
echo "4. View in Firebase Console:"
echo "   https://console.firebase.google.com/project/quicklink-pay-admin"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Deployment completed successfully! 🎉"
echo ""
