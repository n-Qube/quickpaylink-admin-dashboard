# 🚨 URGENT: Deploy Firestore Rules

Your app is getting "Missing or insufficient permissions" because the Firestore security rules haven't been deployed yet.

## Quick Fix (5 minutes)

### Option 1: Deploy via Firebase Console (Recommended)

1. **Go to Firestore Rules in Console**:
   https://console.firebase.google.com/project/quicklink-pay-admin/firestore/rules

2. **Copy the rules** from `firestore.rules` file in your project

3. **Paste into the Firebase Console editor**

4. **Click "Publish"**

5. **Wait 30 seconds** for rules to propagate

6. **Reload your app** and try logging in again

### Option 2: Deploy via Firebase CLI

```bash
# Login to Firebase
firebase login

# Deploy rules only
firebase deploy --only firestore:rules

# This will take 1-2 minutes
```

## What Happens After Deployment

Once the rules are deployed:
- ✅ Your admin account will be able to read its document from Firestore
- ✅ The "Missing or insufficient permissions" error will disappear
- ✅ Login will work correctly
- ✅ You'll see the dashboard after logging in

## Why This Happened

The security rules file (`firestore.rules`) exists in your project, but it hasn't been deployed to Firebase yet. By default, Firestore starts with restrictive rules that deny all access.

## Current Status

- ✅ Firebase project created
- ✅ Authentication user created (niinortey@n-qube.com)
- ✅ Admin document created in Firestore
- ✅ Super admin role created
- ⏳ **Security rules need deployment** ← You are here

## After Rules Are Deployed

Test the login:
1. Go to http://localhost:5174/login
2. Email: niinortey@n-qube.com
3. Password: [your Firebase Auth password]
4. Click "Sign In"
5. You should see the dashboard!
