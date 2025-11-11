/**
 * Admin Migration Script
 *
 * This script updates existing admin documents to include the new
 * hierarchical fields required by the RBAC system.
 *
 * Usage:
 *   Import and run from Firebase console or app initialization
 *
 * IMPORTANT: Run this AFTER deploying the new security rules and indexes
 */

import { collection, getDocs, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Admin } from '../types/database';

/**
 * Migration result interface
 */
interface MigrationResult {
  success: boolean;
  totalAdmins: number;
  updatedAdmins: number;
  skippedAdmins: number;
  errors: Array<{ adminId: string; error: string }>;
}

/**
 * Migrate existing admin documents to include hierarchical fields
 */
export async function migrateAdmins(): Promise<MigrationResult> {
  console.log('🔄 Starting admin migration...');

  const result: MigrationResult = {
    success: true,
    totalAdmins: 0,
    updatedAdmins: 0,
    skippedAdmins: 0,
    errors: [],
  };

  try {
    // Get all admin documents
    const adminsRef = collection(db, 'admins');
    const snapshot = await getDocs(adminsRef);

    result.totalAdmins = snapshot.size;
    console.log(`📊 Found ${result.totalAdmins} admin documents`);

    if (result.totalAdmins === 0) {
      console.log('⚠️  No admin documents found. Nothing to migrate.');
      return result;
    }

    // Process each admin document
    for (const adminDoc of snapshot.docs) {
      const adminData = adminDoc.data() as Partial<Admin>;
      const adminId = adminDoc.id;

      try {
        // Check if already migrated
        if (
          'canCreateSubUsers' in adminData &&
          'createdSubUsersCount' in adminData
        ) {
          console.log(`   ⏭️  Skipping ${adminData.email} (already migrated)`);
          result.skippedAdmins++;
          continue;
        }

        // Prepare update data
        const updateData: Partial<Admin> = {
          // Hierarchical fields
          canCreateSubUsers: false, // Default to false, super admins can enable later
          createdSubUsersCount: 0,

          // Keep managerId and managerName undefined for existing root-level users
          // These will be set when creating new subordinates

          // Update timestamp
          updatedAt: Timestamp.now(),
        };

        // Update the document
        await updateDoc(doc(db, 'admins', adminId), updateData);

        console.log(`   ✅ Updated: ${adminData.email || adminId}`);
        result.updatedAdmins++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`   ❌ Failed to update ${adminData.email || adminId}:`, errorMessage);
        result.errors.push({
          adminId,
          error: errorMessage,
        });
        result.success = false;
      }
    }

    console.log('');
    console.log('✨ Migration completed!');
    console.log(`   Total admins: ${result.totalAdmins}`);
    console.log(`   Updated: ${result.updatedAdmins}`);
    console.log(`   Skipped: ${result.skippedAdmins}`);
    console.log(`   Errors: ${result.errors.length}`);

    if (result.errors.length > 0) {
      console.log('');
      console.log('❌ Errors encountered:');
      result.errors.forEach(({ adminId, error }) => {
        console.log(`   - ${adminId}: ${error}`);
      });
    }

    return result;
  } catch (error) {
    console.error('❌ Migration failed:', error);
    result.success = false;
    return result;
  }
}

/**
 * Verify migration status
 */
export async function verifyMigration(): Promise<{
  success: boolean;
  totalAdmins: number;
  migratedAdmins: number;
  unmigrated: string[];
}> {
  console.log('🔍 Verifying migration status...');

  try {
    const adminsRef = collection(db, 'admins');
    const snapshot = await getDocs(adminsRef);

    const unmigrated: string[] = [];
    let migratedCount = 0;

    snapshot.forEach(doc => {
      const adminData = doc.data() as Partial<Admin>;

      if (
        'canCreateSubUsers' in adminData &&
        'createdSubUsersCount' in adminData
      ) {
        migratedCount++;
      } else {
        unmigrated.push(adminData.email || doc.id);
      }
    });

    console.log('');
    console.log('📊 Migration Status:');
    console.log(`   Total admins: ${snapshot.size}`);
    console.log(`   Migrated: ${migratedCount}`);
    console.log(`   Unmigrated: ${unmigrated.length}`);

    if (unmigrated.length > 0) {
      console.log('');
      console.log('⚠️  Unmigrated admins:');
      unmigrated.forEach(email => {
        console.log(`   - ${email}`);
      });
    } else {
      console.log('');
      console.log('✅ All admins have been migrated!');
    }

    return {
      success: true,
      totalAdmins: snapshot.size,
      migratedAdmins: migratedCount,
      unmigrated,
    };
  } catch (error) {
    console.error('❌ Verification failed:', error);
    return {
      success: false,
      totalAdmins: 0,
      migratedAdmins: 0,
      unmigrated: [],
    };
  }
}

/**
 * Rollback migration (use with caution!)
 */
export async function rollbackMigration(): Promise<MigrationResult> {
  console.log('⚠️  WARNING: Rolling back admin migration...');
  console.log('This will remove the hierarchical fields from all admin documents.');

  const result: MigrationResult = {
    success: true,
    totalAdmins: 0,
    updatedAdmins: 0,
    skippedAdmins: 0,
    errors: [],
  };

  try {
    const adminsRef = collection(db, 'admins');
    const snapshot = await getDocs(adminsRef);

    result.totalAdmins = snapshot.size;

    for (const adminDoc of snapshot.docs) {
      const adminId = adminDoc.id;
      const adminData = adminDoc.data() as Partial<Admin>;

      try {
        // Remove hierarchical fields
        const updateData: any = {
          canCreateSubUsers: null,
          createdSubUsersCount: null,
          managerId: null,
          managerName: null,
          teamId: null,
          maxSubUsers: null,
          updatedAt: Timestamp.now(),
        };

        await updateDoc(doc(db, 'admins', adminId), updateData);

        console.log(`   ✅ Rolled back: ${adminData.email || adminId}`);
        result.updatedAdmins++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`   ❌ Failed to rollback ${adminData.email || adminId}:`, errorMessage);
        result.errors.push({
          adminId,
          error: errorMessage,
        });
        result.success = false;
      }
    }

    console.log('');
    console.log('✨ Rollback completed!');
    console.log(`   Total admins: ${result.totalAdmins}`);
    console.log(`   Rolled back: ${result.updatedAdmins}`);
    console.log(`   Errors: ${result.errors.length}`);

    return result;
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    result.success = false;
    return result;
  }
}

// If running directly as a script
if (typeof window === 'undefined') {
  // Node.js environment
  migrateAdmins()
    .then((result) => {
      console.log('\n' + JSON.stringify(result, null, 2));
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}
