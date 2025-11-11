# QuickLink Pay Admin Dashboard - Deployment Guide

Complete deployment guide for the QuickLink Pay Admin Dashboard and Firebase backend.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Quick Start](#quick-start)
4. [Detailed Deployment Steps](#detailed-deployment-steps)
5. [Available Scripts](#available-scripts)
6. [What's Been Implemented](#whats-been-implemented)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

This project includes:
- **Frontend**: React + TypeScript + Vite admin dashboard
- **Backend**: Firebase (Firestore + Cloud Functions + Authentication)
- **Security**: Comprehensive Firestore security rules with RBAC
- **Features**: Support tickets, Payouts, Merchant management, Analytics, and more

---

## ✅ Prerequisites

### Required Software

1. **Node.js** (v18 or higher)
   ```bash
   node --version  # Should be v18+
   ```

2. **Firebase CLI**
   ```bash
   npm install -g firebase-tools
   ```

3. **Git**
   ```bash
   git --version
   ```

### Required Accounts

1. **Firebase Project**
   - Create at [Firebase Console](https://console.firebase.google.com/)
   - Enable Firestore Database
   - Enable Authentication (Email/Password)

2. **Firebase Service Account Key**
   - Download from Firebase Console → Project Settings → Service Accounts
   - Save as `firebase-service-account.json` in project root
   - **⚠️ Never commit this file to Git!**

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create `.env.local` file:

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

### 3. Login to Firebase

```bash
firebase login
```

### 4. Select Firebase Project

```bash
firebase use --add
# Select your project and give it an alias (e.g., "default")
```

### 5. Deploy Firestore Rules

```bash
./deploy-firebase.sh
```

Or manually:

```bash
firebase deploy --only firestore:rules
```

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## 📝 Detailed Deployment Steps

### Step 1: Check Current Status

```bash
./check-firebase-status.sh
```

This script verifies:
- Firebase CLI installation
- Login status
- Current project
- Configuration files

### Step 2: Initialize Firebase (First Time Only)

If `.firebaserc` doesn't exist:

```bash
firebase init
```

Select:
- ✅ Firestore
- ✅ Functions (if deploying Cloud Functions)

When asked about `firestore.rules`, keep the existing file.

### Step 3: Deploy Security Rules

```bash
./deploy-firebase.sh
```

This deploys:
- Firestore security rules with RBAC
- Support for all collections (admins, merchants, tickets, payouts, etc.)

### Step 4: Deploy Cloud Functions (Optional)

For payout processing and ticket management:

```bash
# See PAYOUT_IMPLEMENTATION_GUIDE.md
# See TICKET_MANAGEMENT_GUIDE.md
cd functions
npm install
firebase deploy --only functions
```

### Step 5: Create Initial Super Admin

```bash
# First, create Firebase Auth user in Firebase Console
# Then run:
node create-correct-admin.js
```

---

## 🛠️ Available Scripts

### Development

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### Firebase Deployment

```bash
./deploy-firebase.sh              # Deploy Firestore rules
./check-firebase-status.sh        # Check deployment status
firebase deploy --only firestore  # Manual deploy
firebase deploy --only functions  # Deploy Cloud Functions
```

### Database Management

```bash
node create-correct-admin.js      # Create super admin
node seed-test-data.js            # Seed test data (if available)
node verify-admin.js              # Verify admin exists
```

---

## ✨ What's Been Implemented

### ✅ Complete Features

#### 1. Admin Management
- **Location**: `src/pages/AdminUsers.tsx`
- Create/edit admin users with different access levels
- Support for: `super_admin`, `system_admin`, `ops_admin`, `finance_admin`, `support_admin`, `audit_admin`, `merchant_support_lead`, `merchant_support_agent`

#### 2. Support Ticket Management
- **Location**: `src/pages/SupportTickets.tsx`
- **NEW**: Create ticket modal (lines 969-1228)
- Features:
  - Create new tickets with merchant selection
  - Category selection (10 categories)
  - Priority levels (low, medium, high, urgent, critical)
  - SLA tracking
  - Ticket assignment
  - Two-way messaging (internal notes + merchant communication)
  - Escalation system

#### 3. Payout Processing
- **Location**: `src/pages/Payouts.tsx`
- **NEW**: Process manual payout functionality (lines 279-313, 840-970)
- Features:
  - Process manual payouts to merchants
  - Optional amount (or full balance)
  - Integration with Firebase Cloud Functions
  - Status tracking
  - Payout history

#### 4. Firestore Security Rules
- **Location**: `firestore.rules`
- **UPDATED**: Added support for `supportTickets` and `payouts` collections
- Features:
  - Role-based access control (RBAC)
  - Permission-based access for specific actions
  - Immutable audit logs
  - Super admin full access

### 📋 Other Features

- Dashboard with metrics
- Merchant management
- System configuration (locations, currencies, business types, tax rules)
- Subscription plans and pricing
- Analytics
- System health monitoring
- Alerts
- Audit logs
- Compliance reports

---

## 🐛 Troubleshooting

### Issue: "Firebase CLI not found"

```bash
npm install -g firebase-tools
```

### Issue: "Not logged in to Firebase"

```bash
firebase login
firebase login:list  # Verify login
```

### Issue: "No project selected"

```bash
firebase use --add
```

### Issue: "Permission denied in Firestore"

1. Check your admin document exists in Firestore
2. Verify admin status is `active`
3. Verify admin has correct permissions
4. Check Firestore rules were deployed correctly

### Issue: "Function not found: processManualPayout"

Cloud Functions need to be deployed separately:

```bash
cd functions
npm install
firebase deploy --only functions
```

### Issue: "Cannot connect to Firestore"

1. Check `.env.local` has correct Firebase configuration
2. Verify Firebase project is active
3. Check internet connection
4. Verify Firestore is enabled in Firebase Console

---

## 📚 Additional Documentation

- **Firebase Deployment**: See `FIREBASE_DEPLOYMENT_GUIDE.md`
- **Payout Implementation**: See `PAYOUT_IMPLEMENTATION_GUIDE.md`
- **Ticket Management**: See `TICKET_MANAGEMENT_GUIDE.md`
- **Quick Start Payouts**: See `QUICK_START_PAYOUTS.md`

---

## 🔐 Security Notes

1. **Never commit**:
   - `firebase-service-account.json`
   - `.env.local`
   - Any API keys or secrets

2. **Always**:
   - Use environment variables for sensitive data
   - Test security rules before deploying to production
   - Use Firebase emulators for local development
   - Review audit logs regularly

3. **Firestore Rules**:
   - All data requires authentication
   - Role-based access control enforced
   - Audit logs are immutable
   - Super admin has full access

---

## 🎉 Success Checklist

After deployment, verify:

- [ ] Can login to admin dashboard
- [ ] Can view merchants
- [ ] Can create support tickets
- [ ] Can process payouts
- [ ] Firestore rules are active
- [ ] All required collections accessible
- [ ] Different admin roles have correct permissions
- [ ] Audit logs are being created

---

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Firebase Console logs
3. Check browser console for errors
4. Verify environment variables are set correctly
5. Ensure all dependencies are installed

---

## 🚀 Next Steps

1. **Customize branding**: Update logo, colors, and theme
2. **Add more features**: Based on your requirements
3. **Set up CI/CD**: Automate deployments
4. **Configure monitoring**: Set up Firebase Performance Monitoring
5. **Add analytics**: Integrate Google Analytics or similar
6. **Test thoroughly**: Test all features with different admin roles
7. **Document custom workflows**: Add documentation for your specific use cases

---

**Happy deploying! 🎉**
