/**
 * Seed Data Script for Default System Roles
 *
 * This script creates the initial system roles with proper permissions and hierarchy.
 * Run this script ONCE during initial setup to populate the roles collection.
 *
 * Usage:
 *   npm run seed:roles
 *
 * Or import and call from Firebase console:
 *   import { seedRoles } from './src/scripts/seedRoles';
 *   seedRoles();
 */

import { collection, addDoc, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Role } from '../types/database';

/**
 * Default system roles configuration
 */
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
    description: 'System configuration and technical operations. Can manage system settings, API integrations, and platform health.',
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
    usageStats: {
      assignedUsersCount: 0,
    },
  },
  {
    name: 'ops_admin',
    displayName: 'Operations Administrator',
    description: 'Day-to-day operations management. Can manage merchants, handle support tickets, and process payouts.',
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
    usageStats: {
      assignedUsersCount: 0,
    },
  },
  {
    name: 'finance_admin',
    displayName: 'Finance Administrator',
    description: 'Financial operations and billing management. Can manage pricing, process payouts, and view financial reports.',
    level: 30,
    isSystemRole: true,
    isCustomRole: false,
    canCreateSubRoles: false,
    canManageUsers: true,
    maxSubUsers: 10,
    permissions: {
      systemConfig: { read: false, write: false, delete: false },
      apiManagement: { read: false, write: false, delete: false },
      pricing: { read: true, write: true, delete: false },
      merchantManagement: { read: true, write: false, delete: false, suspend: false, terminate: false },
      analytics: { read: true, write: false, export: true },
      systemHealth: { read: false, write: false },
      compliance: { read: true, write: false, export: true },
      auditLogs: { read: true, export: false },
      userManagement: { read: true, create: true, update: true, delete: false, assignRoles: false },
      roleManagement: { read: true, create: false, update: false, delete: false },
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
    name: 'support_admin',
    displayName: 'Support Administrator',
    description: 'Customer support operations. Can handle merchant tickets, view basic information, and assist merchants.',
    level: 40,
    isSystemRole: true,
    isCustomRole: false,
    canCreateSubRoles: false,
    canManageUsers: true,
    maxSubUsers: 50,
    permissions: {
      systemConfig: { read: false, write: false, delete: false },
      apiManagement: { read: false, write: false, delete: false },
      pricing: { read: true, write: false, delete: false },
      merchantManagement: { read: true, write: false, delete: false, suspend: false, terminate: false },
      analytics: { read: true, write: false, export: false },
      systemHealth: { read: false, write: false },
      compliance: { read: false, write: false, export: false },
      auditLogs: { read: false, export: false },
      userManagement: { read: true, create: true, update: true, delete: false, assignRoles: false },
      roleManagement: { read: true, create: false, update: false, delete: false },
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
    name: 'audit_admin',
    displayName: 'Audit Administrator',
    description: 'Compliance and audit operations. Can view audit logs, compliance reports, and analytics.',
    level: 50,
    isSystemRole: true,
    isCustomRole: false,
    canCreateSubRoles: false,
    canManageUsers: false,
    permissions: {
      systemConfig: { read: true, write: false, delete: false },
      apiManagement: { read: false, write: false, delete: false },
      pricing: { read: true, write: false, delete: false },
      merchantManagement: { read: true, write: false, delete: false, suspend: false, terminate: false },
      analytics: { read: true, write: false, export: true },
      systemHealth: { read: true, write: false },
      compliance: { read: true, write: true, export: true },
      auditLogs: { read: true, export: true },
      userManagement: { read: false, create: false, update: false, delete: false, assignRoles: false },
      roleManagement: { read: true, create: false, update: false, delete: false },
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
    name: 'merchant_support_lead',
    displayName: 'Merchant Support Lead',
    description: 'Lead support agent with team management. Can manage support agents and escalated tickets.',
    level: 60,
    isSystemRole: true,
    isCustomRole: false,
    canCreateSubRoles: false,
    canManageUsers: true,
    maxSubUsers: 30,
    permissions: {
      systemConfig: { read: false, write: false, delete: false },
      apiManagement: { read: false, write: false, delete: false },
      pricing: { read: true, write: false, delete: false },
      merchantManagement: { read: true, write: false, delete: false, suspend: false, terminate: false },
      analytics: { read: true, write: false, export: false },
      systemHealth: { read: false, write: false },
      compliance: { read: false, write: false, export: false },
      auditLogs: { read: false, export: false },
      userManagement: { read: true, create: true, update: true, delete: false, assignRoles: false },
      roleManagement: { read: true, create: false, update: false, delete: false },
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
    name: 'merchant_support_agent',
    displayName: 'Merchant Support Agent',
    description: 'Basic support operations. Can view merchant information and handle basic support tickets.',
    level: 70,
    isSystemRole: true,
    isCustomRole: false,
    canCreateSubRoles: false,
    canManageUsers: false,
    permissions: {
      systemConfig: { read: false, write: false, delete: false },
      apiManagement: { read: false, write: false, delete: false },
      pricing: { read: true, write: false, delete: false },
      merchantManagement: { read: true, write: false, delete: false, suspend: false, terminate: false },
      analytics: { read: false, write: false, export: false },
      systemHealth: { read: false, write: false },
      compliance: { read: false, write: false, export: false },
      auditLogs: { read: false, export: false },
      userManagement: { read: false, create: false, update: false, delete: false, assignRoles: false },
      roleManagement: { read: false, create: false, update: false, delete: false },
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
    name: 'viewer',
    displayName: 'Read-Only Viewer',
    description: 'Read-only access to basic analytics and merchant information. No modification permissions.',
    level: 90,
    isSystemRole: true,
    isCustomRole: false,
    canCreateSubRoles: false,
    canManageUsers: false,
    permissions: {
      systemConfig: { read: false, write: false, delete: false },
      apiManagement: { read: false, write: false, delete: false },
      pricing: { read: true, write: false, delete: false },
      merchantManagement: { read: true, write: false, delete: false, suspend: false, terminate: false },
      analytics: { read: true, write: false, export: false },
      systemHealth: { read: false, write: false },
      compliance: { read: false, write: false, export: false },
      auditLogs: { read: false, export: false },
      userManagement: { read: false, create: false, update: false, delete: false, assignRoles: false },
      roleManagement: { read: false, create: false, update: false, delete: false },
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
];

/**
 * Seed the roles collection with default system roles
 */
export async function seedRoles() {
  console.log('🌱 Starting role seeding process...');

  try {
    // Check if roles already exist
    const rolesRef = collection(db, 'roles');
    const existingRoles = await getDocs(rolesRef);

    if (!existingRoles.empty) {
      console.log('⚠️  Roles collection is not empty. Skipping seed.');
      console.log(`   Found ${existingRoles.size} existing roles.`);

      // Optionally list existing roles
      existingRoles.forEach(doc => {
        const role = doc.data() as Role;
        console.log(`   - ${role.displayName} (Level ${role.level})`);
      });

      return {
        success: false,
        message: 'Roles already exist',
        count: existingRoles.size,
      };
    }

    // Create all system roles
    console.log(`📝 Creating ${SYSTEM_ROLES.length} system roles...`);
    let createdCount = 0;

    for (const roleData of SYSTEM_ROLES) {
      try {
        const docRef = await addDoc(rolesRef, roleData);
        console.log(`   ✅ Created: ${roleData.displayName} (ID: ${docRef.id}, Level: ${roleData.level})`);
        createdCount++;
      } catch (error) {
        console.error(`   ❌ Failed to create ${roleData.displayName}:`, error);
      }
    }

    console.log(`\n✨ Role seeding completed!`);
    console.log(`   Successfully created ${createdCount}/${SYSTEM_ROLES.length} roles`);

    return {
      success: true,
      message: 'Roles seeded successfully',
      count: createdCount,
    };
  } catch (error) {
    console.error('❌ Error seeding roles:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      count: 0,
    };
  }
}

/**
 * Verify that all system roles exist
 */
export async function verifyRoles() {
  console.log('🔍 Verifying system roles...');

  try {
    const rolesRef = collection(db, 'roles');
    const systemRolesQuery = query(rolesRef, where('isSystemRole', '==', true));
    const snapshot = await getDocs(systemRolesQuery);

    console.log(`\n📊 Found ${snapshot.size} system roles:`);

    const roles: Role[] = [];
    snapshot.forEach(doc => {
      const role = { roleId: doc.id, ...doc.data() } as Role;
      roles.push(role);
    });

    // Sort by level
    roles.sort((a, b) => a.level - b.level);

    // Display roles
    roles.forEach(role => {
      console.log(`   ${role.level.toString().padStart(3)}. ${role.displayName.padEnd(30)} | ${role.name}`);
      console.log(`        ${role.description}`);
      console.log(`        Can manage users: ${role.canManageUsers ? '✅' : '❌'} | Max sub-users: ${role.maxSubUsers || 'N/A'}`);
      console.log('');
    });

    return {
      success: true,
      count: snapshot.size,
      roles,
    };
  } catch (error) {
    console.error('❌ Error verifying roles:', error);
    return {
      success: false,
      count: 0,
      roles: [],
    };
  }
}

// If running directly as a script
if (typeof window === 'undefined') {
  // Node.js environment
  seedRoles()
    .then((result) => {
      console.log('\n' + JSON.stringify(result, null, 2));
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}
