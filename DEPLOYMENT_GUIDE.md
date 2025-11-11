# RBAC System Deployment Guide

This guide walks you through deploying the Role-Based Access Control (RBAC) system to your Firebase project.

## Prerequisites

Before you begin, ensure you have:

- [ ] Firebase CLI installed (`npm install -g firebase-tools`)
- [ ] Firebase project configured (`firebase.json` exists)
- [ ] Logged in to Firebase (`firebase login`)
- [ ] Selected the correct Firebase project (`firebase use <project-id>`)
- [ ] Backup of your Firestore database (recommended)

## Deployment Steps

### Step 1: Deploy Firestore Rules & Indexes

Use the automated deployment script:

```bash
# From project root directory
./deploy-rbac.sh
```

**Options:**
```bash
./deploy-rbac.sh --dry-run        # Preview what will be deployed
./deploy-rbac.sh --rules-only     # Deploy only security rules
./deploy-rbac.sh --indexes-only   # Deploy only indexes
./deploy-rbac.sh --help           # Show help
```

**Or deploy manually:**
```bash
# Deploy both rules and indexes
firebase deploy --only firestore:rules,firestore:indexes

# Deploy only rules
firebase deploy --only firestore:rules

# Deploy only indexes
firebase deploy --only firestore:indexes
```

**What this does:**
- Updates Firestore security rules with hierarchical access control
- Creates composite indexes for efficient queries on admins and roles collections
- Index creation may take several minutes

### Step 2: Migrate Existing Admin Documents (If Applicable)

If you have existing admin users in Firestore, you need to migrate them to the new schema.

**Option A - Using the migration script (Recommended):**

1. Create a temporary component or page in your app:

```typescript
import { migrateAdmins, verifyMigration } from '@/scripts/migrateAdmins';
import { useState } from 'react';

export default function MigrationPage() {
  const [result, setResult] = useState<any>(null);

  const handleMigrate = async () => {
    const migrationResult = await migrateAdmins();
    setResult(migrationResult);

    // Verify after migration
    await verifyMigration();
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Admin Migration</h1>
      <button
        onClick={handleMigrate}
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        Run Migration
      </button>
      {result && (
        <pre className="mt-4 p-4 bg-gray-100 rounded">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
```

2. Navigate to the migration page and click "Run Migration"
3. Check the console for detailed output
4. Remove the migration page after successful migration

**Option B - Manual migration via Firestore console:**

For each admin document, add these fields:
```json
{
  "canCreateSubUsers": false,
  "createdSubUsersCount": 0
}
```

### Step 3: Seed Default System Roles

Create the 9 default system roles in Firestore.

**Option A - Using the seed script (Recommended):**

1. Add to a temporary initialization component:

```typescript
import { seedRoles, verifyRoles } from '@/scripts/seedRoles';
import { useState } from 'react';

export default function SeedPage() {
  const [result, setResult] = useState<any>(null);

  const handleSeed = async () => {
    // Seed roles
    const seedResult = await seedRoles();
    setResult(seedResult);

    // Verify seeding
    await verifyRoles();
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Seed System Roles</h1>
      <button
        onClick={handleSeed}
        className="px-4 py-2 bg-green-600 text-white rounded"
      >
        Seed Roles
      </button>
      {result && (
        <pre className="mt-4 p-4 bg-gray-100 rounded">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
```

2. Navigate to the seed page and click "Seed Roles"
3. Check console output to verify all 9 roles were created
4. Remove the seed page after successful seeding

**Default Roles Created:**

| Level | Name | Display Name | Can Manage Users |
|-------|------|--------------|------------------|
| 0 | super_admin | Super Admin | Yes (Unlimited) |
| 10 | system_admin | System Administrator | No |
| 20 | ops_admin | Operations Administrator | Yes (Max 20) |
| 30 | finance_admin | Finance Administrator | Yes (Max 10) |
| 40 | support_admin | Support Administrator | Yes (Max 50) |
| 50 | audit_admin | Audit Administrator | No |
| 60 | merchant_support_lead | Merchant Support Lead | Yes (Max 30) |
| 70 | merchant_support_agent | Merchant Support Agent | No |
| 90 | viewer | Read-Only Viewer | No |

**Option B - Manual role creation:**

Use the Firestore console to manually create role documents in the `roles` collection. See `src/scripts/seedRoles.ts` for the exact structure.

### Step 4: Create Your First Super Admin

You need at least one Super Admin to manage the system.

**Via Firestore Console:**

1. Create a user in Firebase Authentication
2. Get the user's UID
3. Get the `super_admin` role ID from the `roles` collection
4. Create a new document in the `admins` collection:

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
  "roleId": "<super_admin_role_id>",
  "permissions": [],
  "accessLevel": "super_admin",
  "status": "active",
  "canCreateSubUsers": true,
  "createdSubUsersCount": 0,
  "auth": {
    "passwordHash": "",
    "lastPasswordChange": <Timestamp>,
    "twoFactorEnabled": false,
    "lastLogin": <Timestamp>,
    "loginCount": 0,
    "failedLoginAttempts": 0
  },
  "createdAt": <Timestamp>,
  "updatedAt": <Timestamp>,
  "createdBy": "system",
  "updatedBy": "system"
}
```

**Important:** Use the user's UID as the document ID!

### Step 5: Verify Deployment

1. **Check Firestore Console:**
   - Rules are updated: `https://console.firebase.google.com/project/YOUR_PROJECT/firestore/rules`
   - Indexes are building: `https://console.firebase.google.com/project/YOUR_PROJECT/firestore/indexes`
   - Roles collection has 9 documents
   - Your admin user exists in admins collection

2. **Test the Application:**
   - Login with your super admin account
   - Navigate to `/admin/roles` - Should see all 9 system roles
   - Navigate to `/admin/users` - Should see your admin user
   - Try creating a new role (custom role)
   - Try creating a new user and assigning a role

3. **Test Permissions:**
   - Create a test user with limited permissions (e.g., Viewer role)
   - Login as that user
   - Verify they can only see permitted pages
   - Verify role-specific menu items appear/disappear

## Post-Deployment

### Monitor Index Creation

Firestore indexes can take several minutes to build. Monitor their status at:
```
https://console.firebase.google.com/project/YOUR_PROJECT/firestore/indexes
```

Wait for all indexes to show status "Enabled" before heavy usage.

### Clean Up

After successful deployment:
- Remove migration and seed pages/components from your app
- Delete any test users created during verification
- Review and adjust role permissions if needed

### Security Checklist

- [ ] Firestore rules deployed and active
- [ ] All indexes are enabled
- [ ] Super admin user created and tested
- [ ] Test users with different roles behave correctly
- [ ] Sensitive pages are properly protected
- [ ] Navigation items show/hide based on permissions
- [ ] Hierarchical user creation works correctly
- [ ] System roles cannot be deleted

## Troubleshooting

### Error: "Permission denied"

**Problem:** New security rules are blocking access

**Solution:**
- Ensure you're logged in as a user with proper permissions
- Check that the admin document exists in Firestore
- Verify the roleId in the admin document matches an existing role
- Check browser console for specific permission errors

### Error: "Index not found"

**Problem:** Firestore index is still building or failed

**Solution:**
- Wait for indexes to complete building (can take 5-10 minutes)
- Check index status in Firebase Console
- If failed, try redeploying: `firebase deploy --only firestore:indexes`

### Error: "Roles collection is empty"

**Problem:** Seed script wasn't run or failed

**Solution:**
- Check browser console for seed script errors
- Manually verify roles collection in Firestore Console
- Re-run seed script: `seedRoles()`
- Check Firebase Console for any server errors

### Migration Issues

**Problem:** Some admins weren't migrated

**Solution:**
- Run `verifyMigration()` to see which admins need migration
- Check Firestore Console for any locked/corrupted documents
- Try running migration again (it will skip already-migrated users)
- Manually update unmigrated users via Firestore Console

### Can't Access New Pages

**Problem:** `/admin/roles` or `/admin/users` routes not working

**Solution:**
- Clear browser cache and reload
- Check that routes were added to `src/App.tsx`
- Verify sidebar navigation was updated in `src/components/layout/Sidebar.tsx`
- Check browser console for route errors

## Rollback Procedure

If you need to rollback the deployment:

### 1. Rollback Firestore Rules

```bash
# Restore previous rules from git
git checkout HEAD~1 firestore.rules
firebase deploy --only firestore:rules
```

### 2. Rollback Admin Migration

```typescript
import { rollbackMigration } from '@/scripts/migrateAdmins';

// WARNING: This removes hierarchical fields from all admins
await rollbackMigration();
```

### 3. Delete Custom Roles

Navigate to Firestore Console and delete any custom roles created after deployment.

### 4. Delete System Roles (Optional)

If you want to completely remove the RBAC system, delete all documents from the `roles` collection.

## Support

For issues or questions:
1. Check the [RBAC Implementation Guide](./RBAC_IMPLEMENTATION.md)
2. Review [Scripts Documentation](./src/scripts/README.md)
3. Check browser console for specific error messages
4. Review Firestore security rules for permission issues

## Additional Resources

- **Implementation Documentation:** `RBAC_IMPLEMENTATION.md`
- **Seed Script Documentation:** `src/scripts/README.md`
- **Database Schema:** `src/types/database.ts`
- **Permission Hooks:** `src/hooks/usePermissions.ts`
- **Firebase Console:** `https://console.firebase.google.com`
