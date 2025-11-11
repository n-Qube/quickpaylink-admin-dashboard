# Database Scripts

This directory contains scripts for seeding initial data and migrating existing data in Firestore.

## Available Scripts

### `seedRoles.ts`

Seeds the default system roles into the Firestore `roles` collection.

### `migrateAdmins.ts`

Migrates existing admin documents to include new hierarchical fields required by the RBAC system.

**Default Roles Created:**

| Level | Role Name | Display Name | Can Manage Users | Max Sub-Users |
|-------|-----------|--------------|------------------|---------------|
| 0 | super_admin | Super Admin | ✅ | Unlimited |
| 10 | system_admin | System Administrator | ❌ | 0 |
| 20 | ops_admin | Operations Administrator | ✅ | 20 |
| 30 | finance_admin | Finance Administrator | ✅ | 10 |
| 40 | support_admin | Support Administrator | ✅ | 50 |
| 50 | audit_admin | Audit Administrator | ❌ | 0 |
| 60 | merchant_support_lead | Merchant Support Lead | ✅ | 30 |
| 70 | merchant_support_agent | Merchant Support Agent | ❌ | 0 |
| 90 | viewer | Read-Only Viewer | ❌ | 0 |

---

## Usage - Seed Roles Script

### Option 1: Run from Firebase Console (Recommended)

1. Open your Firebase project console
2. Go to Firestore Database
3. Open the browser console (F12)
4. Copy and paste the contents of `seedRoles.ts`
5. Call `seedRoles()` in the console

### Option 2: Import in Your Application

```typescript
import { seedRoles, verifyRoles } from '@/scripts/seedRoles';

// In a component or initialization script
async function initialize() {
  const result = await seedRoles();
  console.log('Seed result:', result);

  // Verify roles were created
  const verification = await verifyRoles();
  console.log('Verification:', verification);
}
```

### Option 3: Create NPM Script

Add to `package.json`:

```json
{
  "scripts": {
    "seed:roles": "tsx src/scripts/seedRoles.ts"
  }
}
```

Then run:
```bash
npm run seed:roles
```

## Important Notes

1. **Run Only Once**: The seed script checks if roles already exist and will skip seeding if the collection is not empty.

2. **System Roles**: All seeded roles are marked as `isSystemRole: true`, which prevents them from being deleted or having certain fields modified through the UI.

3. **Permissions**: Each role has a carefully configured permission set. Review the permissions in `seedRoles.ts` before running.

4. **Backup**: Always backup your Firestore database before running seed scripts in production.

5. **Firebase Configuration**: Ensure your Firebase configuration in `src/config/firebase.ts` points to the correct project.

## Verification

After seeding, verify the roles were created correctly:

```typescript
import { verifyRoles } from '@/scripts/seedRoles';

verifyRoles().then(result => {
  console.log(`✅ Found ${result.count} system roles`);
  result.roles.forEach(role => {
    console.log(`- ${role.displayName} (Level ${role.level})`);
  });
});
```

## Customization

To modify the default roles:

1. Edit the `SYSTEM_ROLES` array in `seedRoles.ts`
2. Adjust permissions, levels, or role capabilities as needed
3. Run the seed script in a test environment first
4. Once verified, run in production

## Troubleshooting

**Error: "Roles already exist"**
- The script detected existing roles and skipped seeding
- To reseed, manually delete all documents in the `roles` collection first (BE CAREFUL!)

**Error: "Permission denied"**
- Ensure your Firestore security rules allow creating roles
- Check that you're authenticated as a user with sufficient permissions

**Error: "Firebase not initialized"**
- Verify `src/config/firebase.ts` is properly configured
- Check that Firebase credentials are correctly set up

---

## Usage - Admin Migration Script

### Running the Migration

```typescript
import { migrateAdmins, verifyMigration } from '@/scripts/migrateAdmins';

// Migrate all existing admin documents
const result = await migrateAdmins();
console.log('Migration result:', result);

// Verify migration completed successfully
const verification = await verifyMigration();
console.log('Verification:', verification);
```

### What the Migration Does

Adds the following fields to existing admin documents:
- `canCreateSubUsers: false` - Default to false (can be enabled later)
- `createdSubUsersCount: 0` - Initialize counter

Existing admins without a `managerId` are treated as root-level users.

### Rollback Migration (Use with Caution!)

```typescript
import { rollbackMigration } from '@/scripts/migrateAdmins';

// WARNING: This removes hierarchical fields from all admins
const result = await rollbackMigration();
console.log('Rollback result:', result);
```

---

## Related Documentation

- [RBAC Implementation Guide](../../RBAC_IMPLEMENTATION.md)
- [Deployment Guide](../../DEPLOYMENT_GUIDE.md)
- [Database Schema](../types/database.ts)
- [Permission Hooks](../hooks/usePermissions.ts)
