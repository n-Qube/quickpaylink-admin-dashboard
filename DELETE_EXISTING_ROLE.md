# Quick Fix: Delete Existing Role to Allow Seeding

## Problem
You're getting "Access Denied" because:
1. There's 1 existing non-system role blocking the seed process
2. The RBAC system needs the 9 proper system roles to work
3. Your admin account likely references the wrong role

## Solution: Delete the Existing Role

### Option 1: Via Firebase Console (Easiest)

1. Open Firebase Console: https://console.firebase.google.com/project/quicklink-pay-admin/firestore/databases/-default-/data/~2Froles
2. You should see one role document named "Super Administrator"
3. Click on it and click the "Delete document" button
4. Confirm deletion

### Option 2: Via Browser Console

Open the browser console (F12) on the Admin Utility page and paste this:

```javascript
// Delete all non-system roles
const { collection, getDocs, deleteDoc, doc, query, where } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
const { db } = await import('/src/lib/firebase');

const rolesRef = collection(db, 'roles');
const q = query(rolesRef, where('isSystemRole', '==', false));
const snapshot = await getDocs(q);

console.log(`Found ${snapshot.size} non-system role(s) to delete`);

for (const roleDoc of snapshot.docs) {
  await deleteDoc(doc(db, 'roles', roleDoc.id));
  console.log(`✅ Deleted role: ${roleDoc.data().displayName}`);
}

console.log('✅ Done! Now click "Seed Roles" button again.');
```

## After Deleting the Role

1. Go back to: http://localhost:5173/admin/utility
2. Click the **"Seed Roles"** button
3. You should see success message with 9 roles created
4. Click **"Verify Setup"** to confirm
5. Your admin user will automatically get permissions once the super_admin role exists

## Why This Happened

The seedRoles script checks if ANY roles exist and skips if true. It should check for system roles specifically, but the existing check is:

```typescript
if (!existingRoles.empty) {  // This checks for ANY roles
  console.log('⚠️  Roles collection is not empty. Skipping seed.');
  return { success: false, message: 'Roles already exist' };
}
```

This is actually correct behavior to prevent accidental overwriting, but in your case you need to clean up the test role first.

## Alternative: Temporary Permission Override

If you can't delete the role right now, you can temporarily grant yourself access by updating your admin document in Firebase Console:

1. Go to: https://console.firebase.google.com/project/quicklink-pay-admin/firestore/databases/-default-/data/~2Fadmins~2FzCAdf8MV0kXxmty84zUH4rN7kOS2
2. Add/update this field:
   ```
   accessLevel: "super_admin"
   ```
3. This will bypass role checks temporarily
4. Refresh the page
5. You'll be able to access role management to clean up manually

## After Setup is Complete

Once the 9 system roles are seeded and your admin user has the proper roleId:
- Navigate to http://localhost:5173/admin/roles
- You should see all 9 system roles
- Navigate to http://localhost:5173/admin/users
- You can create additional admin users with proper roles
