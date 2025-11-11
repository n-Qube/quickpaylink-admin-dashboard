/**
 * Cleanup Duplicate Roles Script
 * Removes duplicate system roles while keeping one of each
 */

import { collection, getDocs, deleteDoc, doc, query, where, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Role } from '../types/database';

export async function cleanupDuplicateRoles() {
  console.log('🧹 Starting duplicate role cleanup...');

  try {
    const rolesRef = collection(db, 'roles');
    const snapshot = await getDocs(rolesRef);

    console.log(`   Found ${snapshot.size} total roles`);

    // Group roles by name
    const rolesByName = new Map<string, Role[]>();

    snapshot.forEach(doc => {
      const role = { roleId: doc.id, ...doc.data() } as Role;
      const existing = rolesByName.get(role.name) || [];
      existing.push(role);
      rolesByName.set(role.name, existing);
    });

    let deletedCount = 0;
    let keptCount = 0;

    // Process each group
    for (const [name, roles] of rolesByName.entries()) {
      if (roles.length > 1) {
        console.log(`\n📦 Found ${roles.length} roles with name: ${name}`);

        // Sort by creation date (keep the oldest/first one)
        roles.sort((a, b) => {
          const aTime = a.createdAt?.seconds || 0;
          const bTime = b.createdAt?.seconds || 0;
          return aTime - bTime;
        });

        // Keep the first one, delete the rest
        const [keepRole, ...duplicates] = roles;

        console.log(`   ✅ Keeping: ${keepRole.displayName} (ID: ${keepRole.roleId})`);
        keptCount++;

        for (const duplicate of duplicates) {
          try {
            await deleteDoc(doc(db, 'roles', duplicate.roleId));
            console.log(`   🗑️  Deleted duplicate: ${duplicate.displayName} (ID: ${duplicate.roleId})`);
            deletedCount++;
          } catch (error: any) {
            console.log(`   ⚠️  Could not delete ${duplicate.roleId}: ${error.message}`);
          }
        }
      } else {
        console.log(`   ✅ No duplicates for: ${name}`);
        keptCount++;
      }
    }

    console.log(`\n✨ Cleanup completed!`);
    console.log(`   Kept: ${keptCount} unique roles`);
    console.log(`   Deleted: ${deletedCount} duplicates`);

    return {
      success: true,
      message: 'Duplicate cleanup completed',
      kept: keptCount,
      deleted: deletedCount,
    };
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      kept: 0,
      deleted: 0,
    };
  }
}
