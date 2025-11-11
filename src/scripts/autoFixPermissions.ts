/**
 * Auto-Fix Permissions Script
 *
 * This script automatically fixes the RBAC setup by:
 * 1. Granting temporary super admin access to current user
 * 2. Deleting non-system roles blocking seed
 * 3. Seeding the 9 system roles
 * 4. Updating admin document with proper super_admin roleId
 */

import { collection, getDocs, deleteDoc, doc, updateDoc, query, where, Timestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../lib/firebase';
import { seedRoles } from './seedRoles';

export async function autoFixPermissions() {
  console.log('🔧 Starting automated permission fix...\n');

  const results = {
    step1: { success: false, message: '' },
    step2: { success: false, message: '' },
    step3: { success: false, message: '' },
    step4: { success: false, message: '' },
  };

  try {
    // Step 1: Get current user and grant temporary super admin access
    console.log('Step 1: Granting temporary super admin access...');
    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (!currentUser) {
      results.step1 = { success: false, message: 'No authenticated user found' };
      console.error('❌ No authenticated user');
      return results;
    }

    const adminDocRef = doc(db, 'admins', currentUser.uid);
    await updateDoc(adminDocRef, {
      accessLevel: 'super_admin',
      updatedAt: Timestamp.now(),
    });

    results.step1 = { success: true, message: `Granted super_admin access to ${currentUser.email}` };
    console.log(`✅ ${results.step1.message}\n`);

    // Step 2: Delete all non-system roles
    console.log('Step 2: Deleting non-system roles...');
    const rolesRef = collection(db, 'roles');
    const nonSystemQuery = query(rolesRef, where('isSystemRole', '==', false));
    const nonSystemSnapshot = await getDocs(nonSystemQuery);

    if (nonSystemSnapshot.empty) {
      results.step2 = { success: true, message: 'No non-system roles to delete' };
      console.log(`✅ ${results.step2.message}\n`);
    } else {
      let deletedCount = 0;
      for (const roleDoc of nonSystemSnapshot.docs) {
        await deleteDoc(doc(db, 'roles', roleDoc.id));
        console.log(`   Deleted: ${roleDoc.data().displayName}`);
        deletedCount++;
      }
      results.step2 = { success: true, message: `Deleted ${deletedCount} non-system role(s)` };
      console.log(`✅ ${results.step2.message}\n`);
    }

    // Also check for any roles without isSystemRole field (legacy)
    const allRolesSnapshot = await getDocs(rolesRef);
    const legacyRoles = allRolesSnapshot.docs.filter(
      d => d.data().isSystemRole === undefined
    );

    if (legacyRoles.length > 0) {
      console.log(`   Found ${legacyRoles.length} legacy role(s) without isSystemRole field`);
      for (const roleDoc of legacyRoles) {
        await deleteDoc(doc(db, 'roles', roleDoc.id));
        console.log(`   Deleted legacy: ${roleDoc.data().displayName || roleDoc.id}`);
      }
    }

    // Step 3: Seed the 9 system roles
    console.log('Step 3: Seeding system roles...');
    const seedResult = await seedRoles();

    if (seedResult.success) {
      results.step3 = { success: true, message: `Created ${seedResult.count} system roles` };
      console.log(`✅ ${results.step3.message}\n`);
    } else {
      results.step3 = { success: false, message: seedResult.message || 'Seeding failed' };
      console.error(`❌ ${results.step3.message}\n`);
      return results;
    }

    // Step 4: Update admin document with super_admin roleId
    console.log('Step 4: Updating admin document with super_admin roleId...');

    // Find the super_admin role
    const superAdminQuery = query(rolesRef, where('name', '==', 'super_admin'));
    const superAdminSnapshot = await getDocs(superAdminQuery);

    if (superAdminSnapshot.empty) {
      results.step4 = { success: false, message: 'super_admin role not found after seeding' };
      console.error(`❌ ${results.step4.message}\n`);
      return results;
    }

    const superAdminRole = superAdminSnapshot.docs[0];
    await updateDoc(adminDocRef, {
      roleId: superAdminRole.id,
      accessLevel: 'super_admin',
      status: 'active',
      updatedAt: Timestamp.now(),
    });

    results.step4 = {
      success: true,
      message: `Updated admin with roleId: ${superAdminRole.id}`
    };
    console.log(`✅ ${results.step4.message}\n`);

    // Final summary
    console.log('✨ Automated fix completed successfully!\n');
    console.log('📋 Summary:');
    console.log(`   ✅ User: ${currentUser.email}`);
    console.log(`   ✅ Access Level: super_admin`);
    console.log(`   ✅ Role ID: ${superAdminRole.id}`);
    console.log(`   ✅ System Roles: ${seedResult.count}/9 created`);
    console.log('\n🔄 Please refresh the page to apply changes.');

    return results;

  } catch (error) {
    console.error('❌ Error during automated fix:', error);
    return {
      ...results,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check current setup status
 */
export async function checkSetupStatus() {
  console.log('🔍 Checking setup status...\n');

  try {
    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (!currentUser) {
      console.log('❌ No authenticated user');
      return;
    }

    // Check admin document
    console.log('Admin User:');
    console.log(`   Email: ${currentUser.email}`);
    console.log(`   UID: ${currentUser.uid}`);

    // Check roles
    const rolesRef = collection(db, 'roles');
    const allRolesSnapshot = await getDocs(rolesRef);
    const systemRolesSnapshot = await getDocs(
      query(rolesRef, where('isSystemRole', '==', true))
    );

    console.log('\nRoles Collection:');
    console.log(`   Total roles: ${allRolesSnapshot.size}`);
    console.log(`   System roles: ${systemRolesSnapshot.size}/9`);
    console.log(`   Non-system roles: ${allRolesSnapshot.size - systemRolesSnapshot.size}`);

    if (allRolesSnapshot.size > 0) {
      console.log('\nExisting Roles:');
      allRolesSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`   - ${data.displayName || data.name} (Level ${data.level}, isSystemRole: ${data.isSystemRole})`);
      });
    }

    return {
      user: {
        email: currentUser.email,
        uid: currentUser.uid,
      },
      roles: {
        total: allRolesSnapshot.size,
        system: systemRolesSnapshot.size,
        nonSystem: allRolesSnapshot.size - systemRolesSnapshot.size,
      },
    };

  } catch (error) {
    console.error('❌ Error checking status:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
