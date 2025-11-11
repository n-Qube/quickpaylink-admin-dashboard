# Role-Based Access Control (RBAC) Implementation Guide

## Overview

This document outlines the comprehensive RBAC system implementation for the QuickPayLink Super Admin Dashboard. The system supports hierarchical user management, dynamic role creation, and granular permissions.

## Architecture

### Key Components

1. **Enhanced Database Schema** (`src/types/database.ts`)
   - Extended `Admin` interface with hierarchical fields
   - Enhanced `Role` interface with custom role support
   - Added permission management fields

2. **Permission Hooks** (`src/hooks/usePermissions.ts`)
   - `usePermissions()` - Main permission checking hook
   - `useCanAccess()` - Check specific resource/action access
   - `useHasAccessLevel()` - Check hierarchy level

3. **Role Management** (`src/pages/RoleManagement.tsx`)
   - Create, edit, delete custom roles
   - Configure granular permissions
   - Set role hierarchy and capabilities
   - View role usage statistics

4. **Role Editor** (`src/components/RoleEditor.tsx`)
   - Interactive permission matrix
   - Hierarchy configuration
   - Role capabilities settings

## Features Implemented

### ✅ Completed

1. **Database Schema Enhancement**
   - Added hierarchical fields to Admin interface:
     - `managerId` - Manager who created this admin
     - `managerName` - Manager's display name
     - `teamId` - Optional team assignment
     - `canCreateSubUsers` - Permission to create subordinates
     - `maxSubUsers` - Limit on sub-users
     - `createdSubUsersCount` - Current count

2. **Enhanced Role Structure**
   - `isSystemRole` - Protected predefined roles
   - `isCustomRole` - User-created roles
   - `parentRoleId` - Role hierarchy
   - `canCreateSubRoles` - Sub-role creation permission
   - `canManageUsers` - User management permission
   - `userManagement` permissions
   - `roleManagement` permissions

3. **Permission System**
   - Granular permissions for 10 resource types
   - Action-level controls (read, write, delete, etc.)
   - Hierarchy-based access control
   - Super admin bypass for all permissions

4. **Role Management UI**
   - Create custom roles with full permission configuration
   - Edit existing roles (except system roles)
   - Delete unused roles
   - Duplicate roles for quick setup
   - Hierarchical role display
   - Role usage statistics

## Permission Modules

The system supports the following permission modules:

1. **System Configuration** - Platform settings
2. **API Management** - API integrations and webhooks
3. **Pricing** - Plans and pricing rules
4. **Merchant Management** - Merchant operations
5. **Analytics** - Reports and insights
6. **System Health** - Monitoring and alerts
7. **Compliance** - Regulatory and audit
8. **Audit Logs** - System activity logs
9. **User Management** - Admin user operations
10. **Role Management** - Role operations

## Hierarchical Structure

### Hierarchy Levels

- **0-10**: Super Admin, System Admin
- **11-30**: Department Leads
- **31-50**: Team Managers
- **51-70**: Senior Agents
- **71-90**: Junior Agents
- **91-100**: Viewers, Read-only roles

### Rules

1. Users can only create users with levels > their own level
2. Roles can only create sub-roles with levels > their level
3. Managers can only manage users they created or users below them
4. Permission inheritance from parent roles (optional)

## Implementation Status

### ✅ Completed

All major components of the RBAC system have been implemented:

1. **User Management Page** (`src/pages/UserManagement.tsx`) ✅
   - List and hierarchy view modes
   - Create new users with hierarchy enforcement
   - Assign roles to users
   - Manage user status (active/inactive/suspended)
   - View user activity and statistics
   - Subordinate counting and limits
   - Manager-based filtering

2. **Navigation & Routes Update** ✅
   - Added `/admin/roles` - Role Management route
   - Added `/admin/users` - User Management route
   - Updated `src/App.tsx` with new routes
   - Updated `src/components/layout/Sidebar.tsx` with new navigation items
   - Permission-based menu visibility

3. **Firestore Security Rules Update** (`firestore.rules`) ✅
   - Hierarchical access control for admins
   - Manager can read/write their subordinates
   - Role-based document access
   - Custom role validation
   - System role protection
   - Permission checks for all operations

4. **Firestore Indexes Update** (`firestore.indexes.json`) ✅
   - Added composite indexes for `admins` collection:
     - `managerId + createdAt`
     - `managerId + status + createdAt`
     - `status + createdAt`
   - Added composite indexes for `roles` collection:
     - `isCustomRole + level`
     - `isSystemRole + level`
     - `parentRoleId + level`
     - `isActive + level`

5. **Seed Data Script** (`src/scripts/seedRoles.ts`) ✅
   - Created 9 default system roles
   - Configured proper permissions for each role
   - Established role hierarchy (levels 0-90)
   - Verification function to check roles
   - Comprehensive documentation in `src/scripts/README.md`

## Usage Examples

### Checking Permissions in Components

```typescript
import { usePermissions } from '@/hooks/usePermissions';

function MyComponent() {
  const { can, canManageUsers, canManageRoles } = usePermissions();

  if (!can('merchantManagement', 'read')) {
    return <AccessDenied />;
  }

  return (
    <div>
      {can('merchantManagement', 'write') && (
        <button>Edit Merchant</button>
      )}
      {canManageUsers && (
        <button>Manage Users</button>
      )}
    </div>
  );
}
```

### Creating Custom Roles

```typescript
// Via Role Management UI:
1. Navigate to /admin/roles
2. Click "Create Role"
3. Fill in role details:
   - Name: support_lead
   - Display Name: Support Team Lead
   - Description: Manages support team and handles escalations
   - Level: 35
   - Can Manage Users: Yes
   - Max Sub-Users: 10

4. Configure permissions:
   - Merchant Management: Read, Write
   - Analytics: Read, Export
   - User Management: Read, Create, Update
   - Audit Logs: Read

5. Click "Create Role"
```

### Creating Subordinate Users

```typescript
// User with "Can Create Sub Users" permission:
1. Navigate to /admin/users
2. Click "Create User"
3. Select a role with level > your level
4. User is automatically assigned to you as manager
5. You can manage this user's access and status
```

## Security Considerations

1. **System Roles Protection**
   - System roles cannot be deleted or modified
   - Ensures platform stability

2. **Hierarchy Enforcement**
   - Users cannot elevate their own permissions
   - Cannot create users with higher privileges

3. **Audit Trail**
   - All role and user changes logged
   - Who created/modified what and when

4. **Permission Validation**
   - Server-side validation required
   - Client-side checks are UI-only

## Testing Checklist

### Role Management

- [ ] Create custom role
- [ ] Edit custom role permissions
- [ ] Delete unused custom role
- [ ] Duplicate existing role
- [ ] Verify system role protection
- [ ] Test hierarchical role display
- [ ] Validate permission matrix
- [ ] Test "Grant All" and "Revoke All"

### User Management (When Implemented)

- [ ] Create user as Super Admin
- [ ] Create user as Manager
- [ ] Assign roles to users
- [ ] Test subordinate user limits
- [ ] Suspend/activate users
- [ ] Reset user passwords
- [ ] View user activity logs
- [ ] Test 2FA enablement

### Permission System

- [ ] Test permission checks across all modules
- [ ] Verify hierarchy-based access
- [ ] Test super admin bypass
- [ ] Validate read-only roles
- [ ] Test mixed permissions

## Migration Guide

### For Existing Admins

```typescript
// Run migration script to update existing admin documents:
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';

async function migrateAdmins() {
  const admins = await getDocs(collection(db, 'admins'));

  for (const adminDoc of admins.docs) {
    await updateDoc(doc(db, 'admins', adminDoc.id), {
      canCreateSubUsers: false,
      createdSubUsersCount: 0,
      // Set managerId for existing users if known
      // Otherwise leave undefined for root-level users
    });
  }
}
```

### For Existing Roles

```typescript
// Update existing role documents:
async function migrateRoles() {
  const roles = await getDocs(collection(db, 'roles'));

  for (const roleDoc of roles.docs) {
    await updateDoc(doc(db, 'roles', roleDoc.id), {
      isSystemRole: true, // Mark existing roles as system roles
      isCustomRole: false,
      canCreateSubRoles: false,
      canManageUsers: false,
      usageStats: {
        assignedUsersCount: 0,
      },
      createdBy: 'system',
      updatedBy: 'system',
      // Add new permission modules
      'permissions.userManagement': {
        read: false,
        create: false,
        update: false,
        delete: false,
        assignRoles: false,
      },
      'permissions.roleManagement': {
        read: false,
        create: false,
        update: false,
        delete: false,
      },
    });
  }
}
```

## API Reference

### usePermissions Hook

```typescript
const {
  can,              // (resource: string, action: string) => boolean
  canManageUsers,   // boolean
  canManageRoles,   // boolean
  canCreateSubUsers, // boolean
  isLoading,        // boolean
  role,             // Role | null
  accessLevel,      // string | null
} = usePermissions();
```

### Permission Resources

- `systemConfig`
- `apiManagement`
- `pricing`
- `merchantManagement`
- `analytics`
- `systemHealth`
- `compliance`
- `auditLogs`
- `userManagement`
- `roleManagement`

### Permission Actions

- `read`
- `write`
- `create`
- `update`
- `delete`
- `export`
- `suspend`
- `terminate`
- `assignRoles`

## Support

For questions or issues:
1. Check this documentation
2. Review the code comments in implementation files
3. Check Firestore console for data structure
4. Review browser console for permission errors

## Changelog

### v1.0.0 (Initial Implementation)
- Enhanced database schema with hierarchy support
- Created permission checking hooks
- Implemented Role Management page
- Created Role Editor component
- Added permission matrix UI
- Documented implementation approach
