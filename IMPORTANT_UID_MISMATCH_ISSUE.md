# UID Mismatch Issue - MUST FIX

## Problem

The admin document was created with the wrong UID. There's a mismatch between:
- **Firebase Authentication UID**: `zCAdf8MV0kXxmty84zUH4rN7kOS2` (ends with 'O')
- **Firestore Admin Document ID**: `zCAdf8MV0kXxmty84zUH4rN7kQS2` (ends with 'Q')

## Solution

You need to create an admin document with the CORRECT UID (the one from Firebase Auth ending in 'O').

### Option 1: Manual Fix in Firebase Console (RECOMMENDED - 5 minutes)

1. Go to Firestore Database: https://console.firebase.google.com/project/quicklink-pay-admin/firestore/databases/-default-/data/~2Fadmins

2. Click "Add document"

3. **Document ID**: `zCAdf8MV0kXxmty84zUH4rN7kOS2` (with 'O' - copy this exactly!)

4. Add these fields (copy from the existing document but change adminId):

```
adminId: "zCAdf8MV0kXxmty84zUH4rN7kOS2"
email: "niinortey@n-qube.com"
phoneNumber: "+233XXXXXXXXX"
accessLevel: "super_admin"
status: "active"
roleId: "super_admin_role"
permissions: ["*"]
profile: (map)
  - firstName: "Nii"
  - lastName: "Nortey"
  - displayName: "Nii Nortey"
  - department: "Platform Operations"
auth: (map)
  - passwordHash: "managed_by_firebase_auth"
  - twoFactorEnabled: false
  - loginCount: 0
  - failedLoginAttempts: 0
  - lastLogin: (timestamp - now)
  - lastPasswordChange: (timestamp - now)
activeSessions: []
stats: (map)
  - totalLogins: 0
  - totalActions: 0
  - merchantsManaged: 0
  - lastActionAt: (timestamp - now)
createdAt: (timestamp - now)
createdBy: "system_initialization"
updatedAt: (timestamp - now)
updatedBy: "system_initialization"
```

5. Click "Save"

6. Try logging in again!

### Option 2: Using Provided Script

Run this command if the automated scripts work for you:
```bash
node create-correct-admin.js
```

## After Fix

Once the document is created with the correct UID, login will work immediately. You can then delete the old document with the wrong UID (ending in 'Q').

## Why This Happened

The UID was likely misread when creating the initial setup script. The characters 'O' (letter O) and 'Q' (letter Q) look similar in some fonts, causing the confusion.
