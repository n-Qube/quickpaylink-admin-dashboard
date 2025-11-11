# Quick RBAC Deployment Steps

## ✅ Already Completed

1. ✅ **Firebase Authentication** - Successfully logged in
2. ✅ **Firestore Rules Deployed** - Security rules are live
3. ✅ **Firestore Indexes Deployed** - Database indexes are building (may take 5-10 min)
4. ✅ **Code Compilation** - All TypeScript files compile without errors

## 🚀 Remaining Steps to Complete Setup

### Step 1: Seed Default System Roles

Open your browser console (F12) and paste this code:

```javascript
// Import the seed function
import('/src/scripts/seedRoles').then(async (module) => {
  console.log('Starting role seeding...');
  const result = await module.seedRoles();
  console.log('Seed result:', result);

  // Verify roles were created
  const verification = await module.verifyRoles();
  console.log(`✅ Created ${verification.count} system roles`);
  verification.roles.forEach(role => {
    console.log(`  - Level ${role.level}: ${role.displayName}`);
  });
});
```

This will create 9 system roles:
- Super Admin (Level 0) - Full system access
- System Administrator (Level 10) - Technical operations
- Operations Administrator (Level 20) - Day-to-day operations
- Finance Administrator (Level 30) - Financial operations
- Support Administrator (Level 40) - Customer support
- Audit Administrator (Level 50) - Compliance and audit
- Merchant Support Lead (Level 60) - Team lead
- Merchant Support Agent (Level 70) - Basic support
- Read-Only Viewer (Level 90) - Read-only access

### Step 2: Migrate Existing Admins (Optional)

If you have existing admin users, run this in the browser console:

```javascript
import('/src/scripts/migrateAdmins').then(async (module) => {
  console.log('Starting admin migration...');
  const result = await module.migrateAdmins();
  console.log('Migration result:', result);

  // Verify migration
  const verification = await module.verifyMigration();
  console.log('Verification:', verification);
});
```

### Step 3: Create Your First Super Admin

You need at least one super admin user to access the system.

**Option A: Via Firebase Console** (Recommended)

1. Go to [Firebase Console](https://console.firebase.google.com/project/quicklink-pay-admin)
2. Navigate to **Authentication** → Create a new user (or use existing)
3. Copy the user's UID
4. Navigate to **Firestore Database** → `roles` collection
5. Find the `super_admin` role and copy its document ID
6. Create a new document in `admins` collection with the user's UID as the document ID:

```json
{
  "email": "admin@yourcompany.com",
  "phoneNumber": "+1234567890",
  "profile": {
    "firstName": "Admin",
    "lastName": "User",
    "displayName": "Admin User",
    "department": "Administration"
  },
  "roleId": "<super_admin_role_id_from_step_5>",
  "permissions": [],
  "accessLevel": "super_admin",
  "status": "active",
  "canCreateSubUsers": true,
  "createdSubUsersCount": 0,
  "maxSubUsersAllowed": null,
  "managerId": null,
  "auth": {
    "passwordHash": "",
    "lastPasswordChange": "<Timestamp>",
    "twoFactorEnabled": false,
    "lastLogin": "<Timestamp>",
    "loginCount": 0,
    "failedLoginAttempts": 0
  },
  "createdAt": "<Timestamp>",
  "updatedAt": "<Timestamp>",
  "createdBy": "system",
  "updatedBy": "system"
}
```

**Option B: Using Browser Console**

```javascript
import('firebase/firestore').then(async (firestore) => {
  const { collection, addDoc, getDocs, query, where, Timestamp } = firestore;
  const { db } = await import('/src/lib/firebase');

  // Get super_admin role ID
  const rolesRef = collection(db, 'roles');
  const rolesQuery = query(rolesRef, where('name', '==', 'super_admin'));
  const rolesSnapshot = await getDocs(rolesQuery);
  const superAdminRole = rolesSnapshot.docs[0];

  console.log('Super Admin Role ID:', superAdminRole.id);

  // TODO: Create admin document manually with the role ID above
  console.log('Use this role ID to create your admin document in Firestore Console');
});
```

### Step 4: Test the RBAC System

1. **Login** to the application with your super admin credentials
2. **Navigate to Role Management**: http://localhost:5173/admin/roles
   - You should see all 9 system roles
   - Try viewing role details
   - Try creating a custom role
3. **Navigate to User Management**: http://localhost:5173/admin/users
   - You should see your admin user
   - Try creating a new user with limited permissions
   - Test hierarchical user creation

### Step 5: Verify Everything Works

Test these scenarios:
- ✅ View all roles in Role Management page
- ✅ Create a custom role with specific permissions
- ✅ Create a new user and assign them a role
- ✅ Login as the new user and verify they only see permitted pages
- ✅ Check that system roles cannot be deleted
- ✅ Verify hierarchical user creation works

## 📊 Check Index Status

Firestore indexes may take 5-10 minutes to build. Check status at:
https://console.firebase.google.com/project/quicklink-pay-admin/firestore/indexes

Wait for all indexes to show "Enabled" status before heavy usage.

## 🔍 Troubleshooting

### Roles Not Showing in Role Management Page
- Ensure Step 1 (Seed Roles) completed successfully
- Check browser console for errors
- Verify roles exist in Firestore Console → `roles` collection

### Cannot Login as Super Admin
- Ensure user exists in Firebase Authentication
- Ensure admin document exists in `admins` collection with correct UID
- Verify `roleId` field matches the super_admin role ID
- Check `status` field is set to "active"

### Permission Denied Errors
- Ensure Firestore rules are deployed (Step ✅ from completed tasks)
- Check that admin document has correct `roleId`
- Verify role has required permissions
- Check browser console for specific permission errors

### Blank Pages or Module Errors
- Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
- Clear browser cache
- Check browser console for errors
- Restart development server: `npm run dev`

## 📚 Documentation

- **RBAC_README.md** - Quick start guide and overview
- **DEPLOYMENT_GUIDE.md** - Detailed deployment instructions
- **RBAC_IMPLEMENTATION.md** - Technical implementation details
- **src/scripts/README.md** - Script usage and customization

## ✨ After Setup is Complete

Once everything is working:
1. Document your super admin credentials securely
2. Create additional admin users as needed
3. Set up your team structure with appropriate roles
4. Configure subordinate limits for managers
5. Review and adjust permissions based on your needs
6. Monitor audit logs for security

---

**Need Help?** Check the troubleshooting section above or review the detailed documentation files.
