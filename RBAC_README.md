# RBAC System - Quick Start Guide

This document provides a quick overview of the Role-Based Access Control (RBAC) system implementation.

## 📋 What Was Implemented

A complete hierarchical RBAC system with:

✅ **User Management Interface** - Create, edit, and manage admin users
✅ **Role Management Interface** - Create custom roles with granular permissions
✅ **Hierarchical Access Control** - Managers can create and manage subordinates
✅ **Permission System** - 10 resource modules × 9 action types = fine-grained control
✅ **Firestore Security Rules** - Server-side enforcement of all permissions
✅ **Database Indexes** - Optimized queries for hierarchical data
✅ **9 Default System Roles** - From Super Admin to Read-Only Viewer
✅ **Deployment Scripts** - Automated deployment and migration tools

## 🚀 Quick Start

### 1. Deploy to Firebase

```bash
# Run the automated deployment script
./deploy-rbac.sh

# Or deploy manually
firebase deploy --only firestore:rules,firestore:indexes
```

### 2. Seed Default Roles

Import in your app and run once:

```typescript
import { seedRoles } from '@/scripts/seedRoles';
await seedRoles();
```

### 3. Migrate Existing Admins (If Applicable)

If you have existing admin users:

```typescript
import { migrateAdmins } from '@/scripts/migrateAdmins';
await migrateAdmins();
```

### 4. Create Your First Super Admin

Use Firebase Console to:
1. Create user in Authentication
2. Add admin document in Firestore `admins` collection
3. Assign `super_admin` role

### 5. Access the New Pages

- **Role Management:** `/admin/roles`
- **User Management:** `/admin/users`

## 📚 Documentation

- **[Deployment Guide](./DEPLOYMENT_GUIDE.md)** - Complete deployment instructions
- **[Implementation Guide](./RBAC_IMPLEMENTATION.md)** - Technical details and architecture
- **[Scripts Documentation](./src/scripts/README.md)** - Seed and migration scripts

## 🔑 Default System Roles

| Level | Role | Description | Manages Users |
|-------|------|-------------|---------------|
| 0 | Super Admin | Full system access | Unlimited |
| 10 | System Admin | Technical operations | No |
| 20 | Operations Admin | Day-to-day operations | Max 20 |
| 30 | Finance Admin | Financial operations | Max 10 |
| 40 | Support Admin | Customer support | Max 50 |
| 50 | Audit Admin | Compliance and audit | No |
| 60 | Support Lead | Team lead | Max 30 |
| 70 | Support Agent | Basic support | No |
| 90 | Viewer | Read-only access | No |

## 🎯 Key Features

### Hierarchical User Management
- Managers create subordinates
- Subordinate limits enforced
- Level-based access control

### Dynamic Role Creation
- Create custom roles via UI
- Configure granular permissions
- System roles are protected

### Permission Modules
- System Configuration
- API Management
- Pricing
- Merchant Management
- Analytics
- System Health
- Compliance
- Audit Logs
- User Management
- Role Management

### Permission Actions
- read, write, create, update, delete
- export, suspend, terminate, assignRoles

## 🔒 Security

- ✅ Client-side UI guards
- ✅ Server-side Firestore rules
- ✅ Real-time permission checking
- ✅ System role protection
- ✅ Hierarchical enforcement
- ✅ Complete audit trail

## 📁 Key Files

**Pages & Components:**
- `src/pages/RoleManagement.tsx` - Role CRUD interface
- `src/pages/UserManagement.tsx` - User CRUD interface
- `src/components/RoleEditor.tsx` - Role editor modal
- `src/components/UserEditor.tsx` - User editor modal

**Configuration:**
- `firestore.rules` - Security rules
- `firestore.indexes.json` - Database indexes
- `src/types/database.ts` - Type definitions
- `src/hooks/usePermissions.ts` - Permission hooks

**Scripts:**
- `deploy-rbac.sh` - Deployment automation
- `src/scripts/seedRoles.ts` - Seed default roles
- `src/scripts/migrateAdmins.ts` - Migrate existing admins

## ⚠️ Important Notes

1. **Firestore Indexes:** May take 5-10 minutes to build after deployment
2. **Security Rules:** Deploy before testing to avoid permission errors
3. **Super Admin:** Create at least one super admin before testing
4. **Migration:** Run only if you have existing admin users
5. **Testing:** Test with different roles before production use

## 🆘 Troubleshooting

**Can't access new pages?**
- Check routes in `src/App.tsx`
- Verify sidebar navigation in `src/components/layout/Sidebar.tsx`
- Clear browser cache

**Permission denied errors?**
- Ensure Firestore rules are deployed
- Check user has proper role assigned
- Verify role has required permissions

**Indexes not working?**
- Wait for indexes to finish building (check Firebase Console)
- Redeploy if needed: `firebase deploy --only firestore:indexes`

**Roles not showing?**
- Run seed script: `seedRoles()`
- Check Firestore Console for `roles` collection

## 📞 Support

For detailed help, see:
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Full deployment steps
- [RBAC_IMPLEMENTATION.md](./RBAC_IMPLEMENTATION.md) - Technical documentation
- [src/scripts/README.md](./src/scripts/README.md) - Script usage

## ✨ Next Steps

After deployment:
1. ✅ Test with different user roles
2. ✅ Create custom roles as needed
3. ✅ Set up your team structure
4. ✅ Configure subordinate limits
5. ✅ Review and adjust permissions
6. ✅ Monitor audit logs

---

**Ready to deploy?** Start with the [Deployment Guide](./DEPLOYMENT_GUIDE.md)!
