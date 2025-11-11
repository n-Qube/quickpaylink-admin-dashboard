# Firebase Deployment Steps

Your Firebase project is configured! Now let's deploy the security rules and set up your first admin account.

## Step 1: Login to Firebase CLI

Run this command and follow the browser authentication:

```bash
firebase login
```

This will:
1. Open your browser
2. Ask you to sign in with your Google account
3. Grant permissions to Firebase CLI

## Step 2: Initialize Firebase Project

Link this directory to your Firebase project:

```bash
firebase use quicklink-pay-admin
```

This tells Firebase CLI which project to use.

## Step 3: Deploy Firestore Rules and Indexes

Deploy the security rules and indexes we created:

```bash
firebase deploy --only firestore
```

This will:
- Deploy `firestore.rules` (RBAC security)
- Deploy `firestore.indexes.json` (query optimization)
- Takes about 5-15 minutes for indexes to build

## Step 4: Create Your First Super Admin Account

### 4.1 Create User in Firebase Authentication

Go to Firebase Console: https://console.firebase.google.com/project/quicklink-pay-admin/authentication/users

1. Click "Add user"
2. Enter your email: `your-email@domain.com`
3. Enter a strong password (min 8 characters)
4. Click "Add user"
5. **COPY THE USER UID** - you'll need this next!

### 4.2 Create Admin Document in Firestore

Go to Firestore: https://console.firebase.google.com/project/quicklink-pay-admin/firestore

1. Click "Start collection"
2. Collection ID: `admins`
3. Document ID: **PASTE THE USER UID FROM STEP 4.1**
4. Add these fields:

| Field | Type | Value |
|-------|------|-------|
| adminId | string | [paste the User UID] |
| email | string | your-email@domain.com |
| phoneNumber | string | +233XXXXXXXXX |
| profile | map | *(add nested fields below)* |
| profile.firstName | string | Your |
| profile.lastName | string | Name |
| profile.displayName | string | Your Name |
| profile.department | string | Platform Operations |
| auth | map | *(add nested fields below)* |
| auth.passwordHash | string | managed_by_firebase_auth |
| auth.lastPasswordChange | timestamp | [click "Add field" > "timestamp" > "Now"] |
| auth.twoFactorEnabled | boolean | false |
| auth.lastLogin | timestamp | [click "Add field" > "timestamp" > "Now"] |
| auth.loginCount | number | 0 |
| auth.failedLoginAttempts | number | 0 |
| roleId | string | super_admin_role |
| permissions | array | ["*"] |
| accessLevel | string | super_admin |
| activeSessions | array | [] (empty array) |
| stats | map | *(add nested fields below)* |
| stats.totalLogins | number | 0 |
| stats.totalActions | number | 0 |
| stats.lastActionAt | timestamp | [timestamp "Now"] |
| stats.merchantsManaged | number | 0 |
| status | string | active |
| createdAt | timestamp | [timestamp "Now"] |
| createdBy | string | system_initialization |
| updatedAt | timestamp | [timestamp "Now"] |
| updatedBy | string | system_initialization |

5. Click "Save"

### 4.3 Create Super Admin Role

1. In Firestore, click "Start collection"
2. Collection ID: `roles`
3. Document ID: `super_admin_role`
4. Add these fields:

| Field | Type | Value |
|-------|------|-------|
| roleId | string | super_admin_role |
| name | string | super_admin |
| displayName | string | Super Administrator |
| description | string | Full platform access with all permissions |
| level | number | 1 |
| permissions | map | *(add nested fields below)* |
| permissions.systemConfig | map | { read: true, write: true, delete: true } |
| permissions.apiManagement | map | { read: true, write: true, delete: true } |
| permissions.pricing | map | { read: true, write: true, delete: true } |
| permissions.merchantManagement | map | { read: true, write: true, delete: true, suspend: true, terminate: true } |
| permissions.analytics | map | { read: true, export: true } |
| permissions.systemHealth | map | { read: true, write: true } |
| permissions.compliance | map | { read: true, write: true, export: true } |
| permissions.auditLogs | map | { read: true } |
| createdAt | timestamp | [timestamp "Now"] |
| updatedAt | timestamp | [timestamp "Now"] |
| isActive | boolean | true |

5. Click "Save"

## Step 5: Test the Application

Now restart your dev server to load the new environment variables:

```bash
# Kill the current dev server (Ctrl+C)
# Then restart:
npm run dev
```

Visit: http://localhost:5173

Try logging in with:
- **Email**: The email you used in step 4.1
- **Password**: The password you set in step 4.1

You should see:
1. Login success
2. Redirect to dashboard
3. Your name in the sidebar
4. All navigation items visible (you're a super admin!)

## Step 6: Verify Everything Works

Check these:
- ✅ Login successful
- ✅ Dashboard loads with your name
- ✅ Sidebar shows all menu items
- ✅ User dropdown in header works
- ✅ Can navigate between pages
- ✅ Logout works
- ✅ Debug panel shows your permissions (in dev mode)

## Optional: Add System Configuration Data

For a complete setup, you can add initial configuration data:

### System Config Document

Collection: `systemConfig`
Document ID: `platform_config_v1`

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
  "createdAt": "[timestamp Now]",
  "updatedAt": "[timestamp Now]",
  "updatedBy": "system_initialization"
}
```

### Ghana Currency

Collection: `currencies`
Document ID: `GHS`

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
    "lastUpdated": "[timestamp Now]",
    "source": "manual"
  },
  "pricing": {
    "minimumAmount": 1,
    "roundingRule": "nearest",
    "roundingPrecision": 0.01
  },
  "active": true,
  "defaultForCountries": ["GH"],
  "createdAt": "[timestamp Now]",
  "updatedAt": "[timestamp Now]",
  "updatedBy": "system_initialization"
}
```

## Troubleshooting

### Issue: Login fails with "Permission denied"
**Solution**: Make sure you deployed the Firestore rules:
```bash
firebase deploy --only firestore:rules
```

### Issue: "Admin account not found"
**Solution**: Check that:
1. The admin document ID matches the User UID exactly
2. The document is in the `admins` collection
3. The status field is set to "active"

### Issue: Indexes not working
**Solution**: Wait 5-15 minutes for indexes to build, then check:
```bash
firebase firestore:indexes
```

### Issue: Environment variables not loading
**Solution**:
1. Make sure `.env.local` exists
2. Restart dev server: `npm run dev`
3. Check all variables start with `VITE_`

## Next Steps After Setup

Once you can log in successfully:

1. ✅ **Test all navigation** - Click through each menu item
2. ✅ **Add more admin users** - Create different access levels
3. ✅ **Seed test data** - Add sample merchants, plans, etc.
4. ✅ **Build first module** - Start with System Configuration
5. ✅ **Connect real data** - Replace placeholder metrics with Firestore data

## Quick Command Reference

```bash
# Login to Firebase
firebase login

# Use project
firebase use quicklink-pay-admin

# Deploy everything
firebase deploy

# Deploy only rules
firebase deploy --only firestore:rules

# Deploy only indexes
firebase deploy --only firestore:indexes

# Check project status
firebase projects:list

# View current project
firebase use

# Open Firebase Console
firebase open
```

---

**Your Firebase Configuration is Ready!**

Project ID: `quicklink-pay-admin`
Console: https://console.firebase.google.com/project/quicklink-pay-admin

Follow the steps above to complete your setup and start using the Super Admin dashboard! 🚀
