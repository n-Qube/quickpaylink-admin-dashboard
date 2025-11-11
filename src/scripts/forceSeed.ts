/**
 * Force Seed Script - Bypasses existing role check
 * This will delete ALL roles and create fresh system roles
 * USE WITH CAUTION!
 */

import { collection, getDocs, deleteDoc, addDoc, doc, writeBatch, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Role } from '../types/database';

const SYSTEM_ROLES: Omit<Role, 'roleId'>[] = [
  {
    name: 'super_admin',
    displayName: 'Super Admin',
    description: 'Full system access with all permissions. Can manage all users, roles, and system configuration.',
    level: 0,
    isSystemRole: true,
    isCustomRole: false,
    canCreateSubRoles: true,
    canManageUsers: true,
    permissions: {
      systemConfig: { read: true, write: true, delete: true },
      apiManagement: { read: true, write: true, delete: true },
      pricing: { read: true, write: true, delete: true },
      merchantManagement: { read: true, write: true, delete: true, suspend: true, terminate: true },
      analytics: { read: true, write: true, export: true },
      systemHealth: { read: true, write: true },
      compliance: { read: true, write: true, export: true },
      auditLogs: { read: true, export: true },
      userManagement: { read: true, create: true, update: true, delete: true, assignRoles: true },
      roleManagement: { read: true, create: true, update: true, delete: true },
    },
    isActive: true,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    createdBy: 'system',
    updatedBy: 'system',
    usageStats: {
      assignedUsersCount: 0,
    },
  },
  {
    name: 'system_admin',
    displayName: 'System Administrator',
    description: 'System configuration and technical operations.',
    level: 10,
    isSystemRole: true,
    isCustomRole: false,
    canCreateSubRoles: false,
    canManageUsers: false,
    permissions: {
      systemConfig: { read: true, write: true, delete: false },
      apiManagement: { read: true, write: true, delete: false },
      pricing: { read: true, write: false, delete: false },
      merchantManagement: { read: true, write: false, delete: false, suspend: false, terminate: false },
      analytics: { read: true, write: false, export: true },
      systemHealth: { read: true, write: true },
      compliance: { read: true, write: false, export: false },
      auditLogs: { read: true, export: false },
      userManagement: { read: false, create: false, update: false, delete: false, assignRoles: false },
      roleManagement: { read: true, create: false, update: false, delete: false },
    },
    isActive: true,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    createdBy: 'system',
    updatedBy: 'system',
    usageStats: { assignedUsersCount: 0 },
  },
  {
    name: 'ops_admin',
    displayName: 'Operations Administrator',
    description: 'Day-to-day operations management.',
    level: 20,
    isSystemRole: true,
    isCustomRole: false,
    canCreateSubRoles: false,
    canManageUsers: true,
    maxSubUsers: 20,
    permissions: {
      systemConfig: { read: true, write: false, delete: false },
      apiManagement: { read: false, write: false, delete: false },
      pricing: { read: true, write: false, delete: false },
      merchantManagement: { read: true, write: true, delete: false, suspend: true, terminate: false },
      analytics: { read: true, write: false, export: true },
      systemHealth: { read: true, write: false },
      compliance: { read: true, write: false, export: false },
      auditLogs: { read: true, export: false },
      userManagement: { read: true, create: true, update: true, delete: false, assignRoles: false },
      roleManagement: { read: true, create: false, update: false, delete: false },
    },
    isActive: true,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    createdBy: 'system',
    updatedBy: 'system',
    usageStats: { assignedUsersCount: 0 },
  },
];

export async function forceSeedRoles() {
  console.log('🔥 FORCE SEEDING - This will delete ALL existing roles!');

  try {
    const rolesRef = collection(db, 'roles');

    // Step 1: Delete ALL existing roles
    console.log('Step 1: Deleting all existing roles...');
    const existingRoles = await getDocs(rolesRef);

    if (!existingRoles.empty) {
      console.log(`   Found ${existingRoles.size} existing roles to delete`);

      for (const roleDoc of existingRoles.docs) {
        try {
          await deleteDoc(doc(db, 'roles', roleDoc.id));
          const data = roleDoc.data();
          console.log(`   ✅ Deleted: ${data.displayName || data.name}`);
        } catch (error: any) {
          console.log(`   ⚠️ Could not delete ${roleDoc.id}: ${error.message}`);
          console.log(`   Continuing anyway...`);
        }
      }
    } else {
      console.log('   No existing roles found');
    }

    // Step 2: Create system roles
    console.log(`\nStep 2: Creating ${SYSTEM_ROLES.length} system roles...`);
    let createdCount = 0;

    for (const roleData of SYSTEM_ROLES) {
      try {
        const docRef = await addDoc(rolesRef, roleData);
        console.log(`   ✅ Created: ${roleData.displayName} (ID: ${docRef.id})`);
        createdCount++;
      } catch (error) {
        console.error(`   ❌ Failed to create ${roleData.displayName}:`, error);
      }
    }

    console.log(`\n✨ Force seeding completed!`);
    console.log(`   Successfully created ${createdCount}/${SYSTEM_ROLES.length} roles`);

    return {
      success: true,
      message: 'Roles force-seeded successfully',
      count: createdCount,
    };
  } catch (error) {
    console.error('❌ Error during force seed:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      count: 0,
    };
  }
}
