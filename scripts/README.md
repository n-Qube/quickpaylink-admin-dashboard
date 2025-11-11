# Admin Setup Script

This script automatically creates your first Super Admin account in Firestore.

## Prerequisites

1. ✅ User created in Firebase Authentication (niinortey@n-qube.com)
2. ⏳ Service Account Key (need to download)

## Step 1: Download Service Account Key

1. Go to Firebase Console: https://console.firebase.google.com/project/quicklink-pay-admin/settings/serviceaccounts/adminsdk
2. Click "Generate new private key"
3. Download the JSON file
4. Save it as: `firebase-service-account.json` in the project root (admin-dashboard/)

## Step 2: Update the Script (if needed)

Open `scripts/create-admin.js` and verify these values:
```javascript
const USER_UID = 'zCAdf8MV0kXxmty84zUH4rN7kQS2';
const EMAIL = 'niinortey@n-qube.com';
const PHONE_NUMBER = '+233XXXXXXXXX'; // Update with real phone
```

## Step 3: Run the Script

```bash
cd /Users/danielnortey/Documents/workspace/quickpaylink/admin-dashboard
node scripts/create-admin.js
```

## Expected Output

```
🚀 Creating Super Admin account...

✅ Admin document created successfully!
   User UID: zCAdf8MV0kXxmty84zUH4rN7kQS2
   Email: niinortey@n-qube.com
   Access Level: super_admin
   Permissions: * (all)

✅ Super Admin role created successfully!

🎉 Setup complete! You can now login at http://localhost:5174/login
   Email: niinortey@n-qube.com
   Password: [the password you set in Firebase Authentication]
```

## Step 4: Test Login

1. Go to http://localhost:5174/login
2. Enter your email and password
3. You should see the dashboard!

## Troubleshooting

### Error: "Could not find firebase-service-account.json"
**Solution**: Download the service account key from Firebase Console and save it in the project root.

### Error: "Permission denied"
**Solution**: Make sure the service account key is from the correct Firebase project.

### Error: "Document already exists"
**Solution**: The admin account already exists! Try logging in directly.

## Alternative: Manual Entry

If you prefer, you can manually add the fields in Firebase Console using the template in `admin-document-template.json`.
