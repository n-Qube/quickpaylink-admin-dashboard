/**
 * Authentication Service
 *
 * Handles admin authentication, role management, and session management.
 */

import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  sendPasswordResetEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { auth, db, COLLECTIONS } from '../lib/firebase';

// Types
export interface AdminUser {
  uid: string;
  email: string;
  displayName: string;
  role: 'super_admin' | 'admin' | 'support' | 'viewer';
  permissions: string[];
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminRole {
  id: string;
  name: string;
  displayName: string;
  description: string;
  permissions: string[];
  isActive: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Sign in admin user
 */
export async function signIn(credentials: LoginCredentials): Promise<AdminUser> {
  try {
    // Authenticate with Firebase
    const userCredential = await signInWithEmailAndPassword(
      auth,
      credentials.email,
      credentials.password
    );

    // Get admin profile from Firestore
    const adminDoc = await getDoc(doc(db, COLLECTIONS.ADMINS, userCredential.user.uid));

    if (!adminDoc.exists()) {
      throw new Error('Admin user not found');
    }

    const adminData = adminDoc.data() as AdminUser;

    // Check if admin is active
    if (!adminData.isActive) {
      await signOut(auth);
      throw new Error('Admin account is inactive');
    }

    // Update last login time
    await updateDoc(doc(db, COLLECTIONS.ADMINS, userCredential.user.uid), {
      lastLoginAt: Timestamp.now(),
    });

    return {
      uid: userCredential.user.uid,
      email: userCredential.user.email!,
      ...adminData,
      lastLoginAt: new Date(),
    };
  } catch (error: any) {
    console.error('Sign in error:', error);

    // Handle specific Firebase auth errors
    if (error.code === 'auth/user-not-found') {
      throw new Error('Invalid email or password');
    } else if (error.code === 'auth/wrong-password') {
      throw new Error('Invalid email or password');
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error('Too many failed login attempts. Please try again later.');
    }

    throw error;
  }
}

/**
 * Sign out admin user
 */
export async function signOutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Sign out error:', error);
    throw new Error('Failed to sign out');
  }
}

/**
 * Get current admin user
 */
export async function getCurrentAdmin(): Promise<AdminUser | null> {
  try {
    const user = auth.currentUser;
    if (!user) return null;

    const adminDoc = await getDoc(doc(db, COLLECTIONS.ADMINS, user.uid));
    if (!adminDoc.exists()) return null;

    const adminData = adminDoc.data();

    return {
      uid: user.uid,
      email: user.email!,
      displayName: adminData.displayName,
      role: adminData.role,
      permissions: adminData.permissions || [],
      isActive: adminData.isActive,
      lastLoginAt: adminData.lastLoginAt?.toDate(),
      createdAt: adminData.createdAt?.toDate(),
      updatedAt: adminData.updatedAt?.toDate(),
    };
  } catch (error) {
    console.error('Error getting current admin:', error);
    return null;
  }
}

/**
 * Subscribe to auth state changes
 */
export function onAuthStateChange(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

/**
 * Send password reset email
 */
export async function sendPasswordReset(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error('Password reset error:', error);
    throw new Error('Failed to send password reset email');
  }
}

/**
 * Change password (requires current password)
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  try {
    const user = auth.currentUser;
    if (!user || !user.email) {
      throw new Error('No user logged in');
    }

    // Re-authenticate user before changing password
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);

    // Update password
    await updatePassword(user, newPassword);
  } catch (error: any) {
    console.error('Change password error:', error);

    if (error.code === 'auth/wrong-password') {
      throw new Error('Current password is incorrect');
    } else if (error.code === 'auth/weak-password') {
      throw new Error('New password is too weak');
    }

    throw new Error('Failed to change password');
  }
}

/**
 * Check if user has permission
 */
export function hasPermission(admin: AdminUser, permission: string): boolean {
  // Super admins have all permissions
  if (admin.role === 'super_admin') return true;

  return admin.permissions.includes(permission);
}

/**
 * Check if user has any of the specified roles
 */
export function hasRole(admin: AdminUser, roles: string[]): boolean {
  return roles.includes(admin.role);
}

/**
 * Get all admin roles
 */
export async function getAdminRoles(): Promise<AdminRole[]> {
  try {
    const rolesSnapshot = await getDoc(doc(db, COLLECTIONS.SYSTEM_CONFIG, 'roles'));

    if (!rolesSnapshot.exists()) {
      return getDefaultRoles();
    }

    const rolesData = rolesSnapshot.data();
    return rolesData.roles || getDefaultRoles();
  } catch (error) {
    console.error('Error getting admin roles:', error);
    return getDefaultRoles();
  }
}

/**
 * Get default admin roles
 */
function getDefaultRoles(): AdminRole[] {
  return [
    {
      id: 'super_admin',
      name: 'super_admin',
      displayName: 'Super Admin',
      description: 'Full system access with all permissions',
      permissions: ['*'],
      isActive: true,
    },
    {
      id: 'admin',
      name: 'admin',
      displayName: 'Admin',
      description: 'Manage merchants, analytics, and system configuration',
      permissions: [
        'merchants.view',
        'merchants.edit',
        'analytics.view',
        'system.view',
        'system.edit',
        'support.view',
        'support.edit',
      ],
      isActive: true,
    },
    {
      id: 'support',
      name: 'support',
      displayName: 'Support',
      description: 'Handle support tickets and view merchant information',
      permissions: [
        'merchants.view',
        'support.view',
        'support.edit',
        'analytics.view',
      ],
      isActive: true,
    },
    {
      id: 'viewer',
      name: 'viewer',
      displayName: 'Viewer',
      description: 'Read-only access to analytics and reports',
      permissions: ['analytics.view', 'merchants.view'],
      isActive: true,
    },
  ];
}

/**
 * Create admin user (super admin only)
 */
export async function createAdminUser(data: {
  email: string;
  displayName: string;
  role: string;
  permissions: string[];
}): Promise<void> {
  try {
    // Note: In production, this should be done via Cloud Functions
    // to securely create Firebase Auth users with admin SDK

    console.warn('Admin user creation should be done via Cloud Functions');
    throw new Error('Admin user creation not implemented in client');
  } catch (error) {
    console.error('Error creating admin user:', error);
    throw new Error('Failed to create admin user');
  }
}

/**
 * Update admin user
 */
export async function updateAdminUser(
  uid: string,
  updates: Partial<AdminUser>
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.ADMINS, uid);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating admin user:', error);
    throw new Error('Failed to update admin user');
  }
}

/**
 * Deactivate admin user
 */
export async function deactivateAdminUser(uid: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.ADMINS, uid);
    await updateDoc(docRef, {
      isActive: false,
      deactivatedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error deactivating admin user:', error);
    throw new Error('Failed to deactivate admin user');
  }
}
