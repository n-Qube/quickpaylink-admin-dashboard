# Firebase Setup Guide for QuickLink Pay Super Admin

This guide will walk you through setting up Firebase for the QuickLink Pay Super Admin platform.

---

## Prerequisites

- Google account
- Firebase CLI installed (already done ✅)
- Node.js 18+ installed
- Admin access to create Firebase projects

---

## Step 1: Create Firebase Project

### 1.1 Go to Firebase Console
1. Visit https://console.firebase.google.com
2. Click "Add project" or "Create a project"

### 1.2 Project Configuration
- **Project name**: `quicklink-pay-admin` (or your preferred name)
- **Google Analytics**: Enable (recommended for production)
- **Analytics account**: Create new or use existing
- Click "Create project"

---

## Step 2: Set Up Firebase Authentication

### 2.1 Enable Authentication
1. In Firebase Console, go to **Build > Authentication**
2. Click "Get started"
3. Go to **Sign-in method** tab

### 2.2 Enable Email/Password Authentication
1. Click on "Email/Password"
2. Enable the first option (Email/Password)
3. Click "Save"

### 2.3 Optional: Enable Additional Providers
For enhanced security, you can also enable:
- Google Sign-in
- Microsoft Sign-in (for enterprise admins)
- Multi-factor authentication (2FA)

---

## Step 3: Set Up Firestore Database

### 3.1 Create Firestore Database
1. In Firebase Console, go to **Build > Firestore Database**
2. Click "Create database"

### 3.2 Choose Location
- **Database ID**: `(default)`
- **Location**: Choose closest to your target users
  - Recommended: `us-central1` or `europe-west1`
  - **Note**: Location cannot be changed later!

### 3.3 Security Rules
- Select "Start in **production mode**"
- We'll deploy our custom security rules later
- Click "Enable"

---

## Step 4: Set Up Cloud Storage

### 4.1 Enable Cloud Storage
1. Go to **Build > Storage**
2. Click "Get started"
3. Choose the same location as Firestore
4. Click "Done"

---

## Step 5: Get Firebase Configuration

### 5.1 Register Web App
1. In Firebase Console, go to **Project Overview** (gear icon)
2. Click on "Add app" button (</> icon for web)
3. Register app:
   - **App nickname**: `QuickLink Pay Admin Dashboard`
   - **Firebase Hosting**: Check this box (optional)
   - Click "Register app"

### 5.2 Copy Configuration
You'll see something like this:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "quicklink-pay-admin.firebaseapp.com",
  projectId: "quicklink-pay-admin",
  storageBucket: "quicklink-pay-admin.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

---

## Step 6: Configure Local Environment

### 6.1 Create .env.local File
In the project root (`admin-dashboard/`), create a `.env.local` file:

```bash
cp .env.example .env.local
```

### 6.2 Add Your Firebase Configuration
Edit `.env.local` and fill in your values:

```env
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=quicklink-pay-admin.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=quicklink-pay-admin
VITE_FIREBASE_STORAGE_BUCKET=quicklink-pay-admin.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

**Important**: Never commit `.env.local` to version control!

---

## Step 7: Initialize Firebase CLI

### 7.1 Login to Firebase
```bash
firebase login
```

Follow the prompts to authenticate with your Google account.

### 7.2 Initialize Firebase in Project
```bash
cd admin-dashboard
firebase init
```

### 7.3 Select Features
When prompted, select:
- ✅ Firestore: Configure security rules and indexes
- ✅ Hosting: Configure files for Firebase Hosting
- ✅ Emulators: Set up local emulators

### 7.4 Configuration Prompts

**Firestore:**
- Use existing project: Select your project
- Firestore rules file: `firestore.rules` ✅ (already created)
- Firestore indexes file: `firestore.indexes.json` ✅ (already created)

**Hosting:**
- Public directory: `dist`
- Single-page app: Yes
- Set up automatic builds: No (for now)

**Emulators:**
- Select emulators:
  - ✅ Authentication Emulator
  - ✅ Firestore Emulator
  - ✅ Storage Emulator
- Ports: Use defaults or customize
- Download emulators now: Yes

---

## Step 8: Deploy Security Rules and Indexes

### 8.1 Deploy Firestore Rules
```bash
firebase deploy --only firestore:rules
```

This deploys the `firestore.rules` file we created.

### 8.2 Deploy Firestore Indexes
```bash
firebase deploy --only firestore:indexes
```

This creates all the composite indexes for optimized queries.

**Note**: Index creation can take 5-15 minutes. Check status in Firebase Console.

---

## Step 9: Create Initial Super Admin Account

Since we have security rules enabled, we need to create the first admin account directly in Firebase.

### 9.1 Create User in Authentication
1. Go to Firebase Console > **Authentication > Users**
2. Click "Add user"
3. Enter:
   - **Email**: your.email@domain.com
   - **Password**: Strong password (min 8 characters)
4. Click "Add user"
5. **Copy the User UID** (you'll need this)

### 9.2 Create Admin Document in Firestore
1. Go to Firebase Console > **Firestore Database**
2. Click "Start collection"
3. Collection ID: `admins`
4. Document ID: Paste the **User UID** from step 9.1
5. Add the following fields:

```json
{
  "adminId": "<USER_UID>",
  "email": "your.email@domain.com",
  "phoneNumber": "+233XXXXXXXXX",
  "profile": {
    "firstName": "Your",
    "lastName": "Name",
    "displayName": "Your Name",
    "department": "Platform Operations"
  },
  "auth": {
    "passwordHash": "managed_by_firebase_auth",
    "lastPasswordChange": "<current_timestamp>",
    "twoFactorEnabled": false,
    "lastLogin": "<current_timestamp>",
    "loginCount": 0,
    "failedLoginAttempts": 0
  },
  "roleId": "super_admin_role",
  "permissions": ["*"],
  "accessLevel": "super_admin",
  "activeSessions": [],
  "stats": {
    "totalLogins": 0,
    "totalActions": 0,
    "lastActionAt": "<current_timestamp>",
    "merchantsManaged": 0
  },
  "status": "active",
  "createdAt": "<current_timestamp>",
  "createdBy": "system_initialization",
  "updatedAt": "<current_timestamp>",
  "updatedBy": "system_initialization"
}
```

### 9.3 Create Super Admin Role
1. Create a new collection: `roles`
2. Document ID: `super_admin_role`
3. Add fields:

```json
{
  "roleId": "super_admin_role",
  "name": "super_admin",
  "displayName": "Super Administrator",
  "description": "Full platform access with all permissions",
  "level": 1,
  "permissions": {
    "systemConfig": { "read": true, "write": true, "delete": true },
    "apiManagement": { "read": true, "write": true, "delete": true },
    "pricing": { "read": true, "write": true, "delete": true },
    "merchantManagement": {
      "read": true,
      "write": true,
      "delete": true,
      "suspend": true,
      "terminate": true
    },
    "analytics": { "read": true, "export": true },
    "systemHealth": { "read": true, "write": true },
    "compliance": { "read": true, "write": true, "export": true },
    "auditLogs": { "read": true }
  },
  "createdAt": "<current_timestamp>",
  "updatedAt": "<current_timestamp>",
  "isActive": true
}
```

---

## Step 10: Seed Initial Configuration Data

### 10.1 Create System Configuration
1. Collection: `systemConfig`
2. Document ID: `platform_config_v1`

```json
{
  "configId": "platform_config_v1",
  "version": "1.0.0",
  "features": {
    "whatsappCoexistence": true,
    "aiProductRecognition": true,
    "multiCurrencySupport": true,
    "apiAccess": true,
    "darkMode": true
  },
  "platformSettings": {
    "maintenanceMode": false,
    "allowNewMerchantSignup": true,
    "maxMerchantsLimit": 10000
  },
  "defaults": {
    "currency": "GHS",
    "country": "GH",
    "language": "en",
    "timezone": "Africa/Accra",
    "taxRate": 0.125
  },
  "rateLimits": {
    "otpPerHour": 3,
    "apiCallsPerMinute": 100,
    "whatsappMessagesPerDay": 1000
  },
  "createdAt": "<current_timestamp>",
  "updatedAt": "<current_timestamp>",
  "updatedBy": "system_initialization"
}
```

### 10.2 Create Ghana Country Configuration
1. Collection path: `locations/countries`
2. Document ID: `GH`

```json
{
  "countryCode": "GH",
  "name": "Ghana",
  "defaultCurrency": "GHS",
  "defaultLanguage": "en",
  "timezone": "Africa/Accra",
  "taxConfiguration": {
    "vatRate": 0.125,
    "vatLabel": "VAT",
    "witholdingTaxRate": 0.075,
    "serviceTaxRate": 0
  },
  "phoneFormat": {
    "countryCode": "+233",
    "regex": "^\\+233[0-9]{9}$",
    "example": "+233 24 123 4567"
  },
  "addressFormat": {
    "postalCodeRequired": false,
    "stateRequired": true,
    "format": ["street", "city", "region", "country"]
  },
  "active": true,
  "availableForSignup": true,
  "createdAt": "<current_timestamp>",
  "updatedAt": "<current_timestamp>",
  "updatedBy": "system_initialization"
}
```

### 10.3 Create GHS Currency
1. Collection: `currencies`
2. Document ID: `GHS`

```json
{
  "currencyCode": "GHS",
  "name": "Ghana Cedi",
  "symbol": "₵",
  "formatting": {
    "symbolPosition": "prefix",
    "decimalPlaces": 2,
    "thousandSeparator": ",",
    "decimalSeparator": "."
  },
  "exchangeRates": {
    "baseCurrency": "USD",
    "rate": 12.5,
    "lastUpdated": "<current_timestamp>",
    "source": "manual"
  },
  "pricing": {
    "minimumAmount": 1,
    "roundingRule": "nearest",
    "roundingPrecision": 0.01
  },
  "active": true,
  "defaultForCountries": ["GH"],
  "createdAt": "<current_timestamp>",
  "updatedAt": "<current_timestamp>",
  "updatedBy": "system_initialization"
}
```

---

## Step 11: Test Local Setup

### 11.1 Start Firebase Emulators
```bash
firebase emulators:start
```

This starts:
- Authentication Emulator: http://localhost:9099
- Firestore Emulator: http://localhost:8080
- Emulator UI: http://localhost:4000

### 11.2 Run Development Server
In a new terminal:

```bash
npm run dev
```

### 11.3 Test Login
1. Open http://localhost:5173
2. Try logging in with your admin credentials
3. Check Firebase Emulator UI to see data

---

## Step 12: Deploy to Production

### 12.1 Build Application
```bash
npm run build
```

### 12.2 Deploy to Firebase Hosting
```bash
firebase deploy
```

This deploys:
- Firestore rules and indexes
- Hosting (your built application)

Your app will be live at: `https://quicklink-pay-admin.web.app`

---

## Useful Commands

```bash
# Login to Firebase
firebase login

# List projects
firebase projects:list

# Use specific project
firebase use quicklink-pay-admin

# Deploy everything
firebase deploy

# Deploy only Firestore rules
firebase deploy --only firestore:rules

# Deploy only indexes
firebase deploy --only firestore:indexes

# Deploy only hosting
firebase deploy --only hosting

# Start emulators
firebase emulators:start

# Open Firebase console for current project
firebase open
```

---

## Monitoring & Maintenance

### Check Index Status
1. Go to Firebase Console > Firestore Database > Indexes
2. Wait for all indexes to show "Enabled" status
3. If any fail, check the error message and fix

### Monitor Usage
1. Go to Firebase Console > Usage and billing
2. Monitor:
   - Firestore reads/writes
   - Authentication sign-ins
   - Storage usage
   - Bandwidth

### Set Up Alerts
1. Go to Firebase Console > Project settings > Integrations
2. Set up:
   - Budget alerts (billing)
   - Performance monitoring
   - Crash reporting

---

## Troubleshooting

### Issue: Permission Denied
**Solution**: Check that:
1. Security rules are deployed
2. Admin user exists in Firestore with correct UID
3. User is logged in with correct credentials

### Issue: Indexes Not Working
**Solution**:
1. Check Firebase Console > Indexes tab
2. Wait for indexes to complete (can take 15 minutes)
3. Redeploy: `firebase deploy --only firestore:indexes`

### Issue: Environment Variables Not Loading
**Solution**:
1. Ensure `.env.local` exists
2. Restart dev server: `npm run dev`
3. Check variables start with `VITE_`

---

## Security Checklist

Before going to production:

- ✅ Enable 2FA for all admin accounts
- ✅ Review and test security rules
- ✅ Set up daily backups
- ✅ Configure monitoring and alerts
- ✅ Enable audit logging
- ✅ Set up rate limiting
- ✅ Configure CORS policies
- ✅ Enable App Check (anti-abuse)
- ✅ Review IAM permissions
- ✅ Set up budget alerts

---

## Next Steps

After Firebase is set up:

1. ✅ Test authentication flow
2. ✅ Create additional admin accounts
3. ✅ Set up remaining roles (system admin, ops admin, etc.)
4. ✅ Seed initial subscription plans
5. ✅ Configure API integrations
6. ✅ Test RBAC permissions
7. ✅ Set up monitoring dashboards

---

## Support & Resources

- **Firebase Documentation**: https://firebase.google.com/docs
- **Firestore Documentation**: https://firebase.google.com/docs/firestore
- **Firebase CLI Reference**: https://firebase.google.com/docs/cli
- **Firebase Console**: https://console.firebase.google.com

---

**Setup Version**: 1.0
**Last Updated**: November 6, 2025
**Status**: Ready for Implementation
