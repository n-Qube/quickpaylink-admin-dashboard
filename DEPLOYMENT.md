# Deployment Instructions

## Quick Deploy (Automated)

The easiest way to deploy is using the automated script:

```bash
./deploy.sh
```

This script will:
1. Build and deploy Cloud Functions
2. Build and deploy the frontend
3. Show you a summary of changes

---

## Manual Deployment

If you prefer to deploy manually, follow these steps:

### Prerequisites

1. Install Firebase CLI (if not already installed):
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

### Step 1: Deploy Cloud Functions

```bash
# Navigate to functions directory
cd functions

# Install dependencies
npm install

# Build TypeScript
npm run build

# Go back to root
cd ..

# Deploy the new Cloud Function
firebase deploy --only functions:testAPIIntegration
```

### Step 2: Deploy Frontend

```bash
# Install dependencies (if needed)
npm install

# Build the frontend
npx vite build

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

### Step 3: Deploy Everything at Once (Optional)

If you want to deploy both functions and hosting together:

```bash
firebase deploy
```

---

## What Was Deployed

### Cloud Function: `testAPIIntegration`

- **Purpose**: Securely test API integrations from the admin dashboard
- **Location**: `functions/src/index.ts` (line 851)
- **Features**:
  - Admin-only access
  - Supports all providers: Paystack, Stripe, Flutterwave, Google Gemini, Google Maps, 360Dialog, SendGrid, and Custom APIs
  - Server-side execution (no CORS issues)
  - Keeps API keys secure

### Frontend Updates

- **File**: `src/pages/APIManagement.tsx`
- **Change**: Now calls Cloud Function instead of direct API requests
- **Benefits**:
  - No more network/CORS errors
  - Secure API key handling
  - Better error messages

---

## Testing the Fix

After deployment:

1. Open your admin dashboard
2. Navigate to **API Management** page
3. Find any API integration
4. Click the **Test** button (▶️ icon)
5. You should see:
   - ✓ Connection successful message (if API key is valid)
   - Or clear error message if there's an issue

---

## Troubleshooting

### "Not authenticated with Firebase"

Run:
```bash
firebase login
```

### "Permission denied" error

Make sure you have admin access to the Firebase project:
```bash
firebase projects:list
```

### "Function deployment failed"

1. Check that functions are built:
   ```bash
   cd functions && npm run build
   ```

2. Check Firebase Functions quota/billing

### "Frontend build errors"

Use Vite directly to skip TypeScript checks:
```bash
npx vite build
```

---

## Project Information

- **Project ID**: quicklink-pay-admin
- **Dashboard URL**: https://quicklink-pay-admin.web.app
- **Functions Region**: us-central1 (default)

---

## Need Help?

If you encounter issues during deployment:

1. Check Firebase Console for deployment status
2. Review function logs: `firebase functions:log`
3. Check hosting status: `firebase hosting:channel:list`
