/**
 * Update Admin Role Script
 * Updates the current admin's roleId to point to the new super_admin role
 */

import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../lib/firebase';

export async function updateAdminRoleId() {
  console.log('🔄 Updating admin roleId...');

  try {
    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (!currentUser) {
      console.error('❌ No authenticated user');
      return { success: false, message: 'No authenticated user' };
    }

    console.log(`   Current user: ${currentUser.email}`);

    // Find the super_admin role
    const rolesRef = collection(db, 'roles');
    const q = query(rolesRef, where('name', '==', 'super_admin'));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.error('❌ super_admin role not found');
      return { success: false, message: 'super_admin role not found' };
    }

    const superAdminRole = snapshot.docs[0];
    const roleId = superAdminRole.id;
    console.log(`   Found super_admin role: ${roleId}`);

    // Update admin document
    const adminRef = doc(db, 'admins', currentUser.uid);
    await updateDoc(adminRef, {
      roleId: roleId,
      accessLevel: 'super_admin',
      status: 'active',
    });

    console.log(`✅ Updated admin document with roleId: ${roleId}`);
    console.log(`\n🎉 Success! Please refresh the page.`);

    return {
      success: true,
      message: 'Admin roleId updated successfully',
      roleId: roleId,
      userId: currentUser.uid,
      email: currentUser.email,
    };
  } catch (error) {
    console.error('❌ Error updating admin roleId:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
