# Firestore Security Rules for Templates Module

## Issue
The Templates page is showing "Permission denied. Please check Firestore security rules" because the Firestore collections `emailTemplates` and `whatsappTemplates` don't have proper access rules configured.

## Solution

You need to add security rules to your Firestore database to allow authenticated admins to access the templates collections.

### Step 1: Access Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **quicklink-pay-admin**
3. Navigate to **Firestore Database** in the left sidebar
4. Click on the **Rules** tab

### Step 2: Update Firestore Security Rules

Add the following rules to allow authenticated admin users to read and write templates:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }

    // Helper function to check if user is an admin
    function isAdmin() {
      return isAuthenticated() &&
             exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }

    // Helper function to get admin document
    function getAdmin() {
      return get(/databases/$(database)/documents/admins/$(request.auth.uid)).data;
    }

    // Helper function to check if user is super admin
    function isSuperAdmin() {
      return isAdmin() && getAdmin().accessLevel == 'super_admin';
    }

    // Existing admin rules
    match /admins/{adminId} {
      allow read: if isAuthenticated() && request.auth.uid == adminId;
      allow write: if isSuperAdmin();
    }

    // Email Templates - Only super admins can manage
    match /emailTemplates/{templateId} {
      allow read: if isSuperAdmin();
      allow create: if isSuperAdmin();
      allow update: if isSuperAdmin();
      allow delete: if isSuperAdmin();
    }

    // WhatsApp Templates - Only super admins can manage
    match /whatsappTemplates/{templateId} {
      allow read: if isSuperAdmin();
      allow create: if isSuperAdmin();
      allow update: if isSuperAdmin();
      allow delete: if isSuperAdmin();
    }

    // Default deny all other collections
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### Step 3: Publish the Rules

1. After pasting the rules, click **Publish** button
2. Wait for the rules to deploy (usually takes a few seconds)

### Step 4: Verify the Fix

1. Refresh your admin dashboard at `http://localhost:5173/templates`
2. Click the "Try again" button or the "Refresh" button
3. The templates should now load successfully (showing "No email templates yet" if you haven't created any)

---

## Alternative: Temporary Development Rules (NOT FOR PRODUCTION)

If you want to quickly test during development, you can use these more permissive rules. **IMPORTANT: These rules should NEVER be used in production!**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // DEVELOPMENT ONLY - Allow all authenticated users
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**Warning:** The above rules allow ANY authenticated user to read/write ALL data. Only use during development and replace with proper rules before going to production.

---

## Understanding the Rules

### Email Templates Rules
```javascript
match /emailTemplates/{templateId} {
  allow read: if isSuperAdmin();    // Only super admins can read
  allow create: if isSuperAdmin();  // Only super admins can create
  allow update: if isSuperAdmin();  // Only super admins can update
  allow delete: if isSuperAdmin();  // Only super admins can delete
}
```

### WhatsApp Templates Rules
```javascript
match /whatsappTemplates/{templateId} {
  allow read: if isSuperAdmin();    // Only super admins can read
  allow create: if isSuperAdmin();  // Only super admins can create
  allow update: if isSuperAdmin();  // Only super admins can update
  allow delete: if isSuperAdmin();  // Only super admins can delete
}
```

---

## Testing After Setup

After setting up the rules, test the following:

1. **Load Templates:**
   - Navigate to `/templates`
   - Should see "No email templates yet" instead of permission error

2. **Create Template:**
   - Click "Create Template"
   - Fill in template details
   - Click "Save"
   - Should successfully create template

3. **Edit Template:**
   - Click edit icon on any template
   - Modify template
   - Save changes
   - Should update successfully

4. **Delete Template:**
   - Click delete icon
   - Confirm deletion
   - Template should be removed

---

## Troubleshooting

### Still Getting Permission Denied?

1. **Check User Authentication:**
   - Open browser console (F12)
   - Look for Firebase auth token
   - Verify you're logged in as a super admin

2. **Check Admin Document:**
   - Go to Firestore console
   - Navigate to `admins` collection
   - Find your user document by UID
   - Verify `accessLevel` field is set to `super_admin`

3. **Check Rules Deployment:**
   - Go to Firestore Rules tab
   - Verify your rules are showing correctly
   - Check the "Last published" timestamp

4. **Clear Cache:**
   - Clear browser cache
   - Log out and log back in
   - Try again

### Rules Not Taking Effect?

- Wait 1-2 minutes for rules to fully propagate
- Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
- Check Firebase Console for any rule validation errors

---

## Security Best Practices

1. **Never use wildcard rules in production:**
   ```javascript
   // ❌ BAD - Don't do this in production
   match /{document=**} {
     allow read, write: if true;
   }
   ```

2. **Always validate user permissions:**
   ```javascript
   // ✅ GOOD - Check user role and permissions
   match /emailTemplates/{templateId} {
     allow read, write: if isSuperAdmin();
   }
   ```

3. **Use helper functions for complex checks:**
   ```javascript
   function isSuperAdmin() {
     return isAdmin() && getAdmin().accessLevel == 'super_admin';
   }
   ```

4. **Test rules before deploying:**
   - Use Firebase Rules Simulator in console
   - Test different user scenarios
   - Verify proper access control

---

## Additional Collections (Future)

When you add more collections, follow the same pattern:

```javascript
// Merchants collection
match /merchants/{merchantId} {
  allow read: if isAdmin();
  allow write: if isSuperAdmin();
}

// Settings collection
match /settings/{settingId} {
  allow read: if isAdmin();
  allow write: if isSuperAdmin();
}

// Audit logs collection (read-only for most admins)
match /auditLogs/{logId} {
  allow read: if isAdmin();
  allow write: if false; // Only backend can write
}
```

---

## Need Help?

If you continue to experience issues:

1. Check Firebase Console for error messages
2. Review browser console for detailed error logs
3. Verify your admin user has correct permissions in Firestore
4. Ensure Firebase SDK is properly initialized in your app

---

**Last Updated:** 2025-11-06
**Status:** Ready to Deploy
