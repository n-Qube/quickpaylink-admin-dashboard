/**
 * Authentication Context for QuickLink Pay Super Admin
 *
 * Provides authentication state and methods throughout the application.
 * Manages Firebase Authentication and Firestore admin data.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updatePassword,
} from 'firebase/auth';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, COLLECTIONS } from '@/lib/firebase';
import type { Admin } from '@/types/database';

// ============================================================================
// Types
// ============================================================================

interface AuthContextType {
  // State
  user: User | null;
  admin: Admin | null;
  loading: boolean;
  error: string | null;

  // Methods
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
  refreshAdminData: () => Promise<void>;

  // Permission helpers
  hasPermission: (resource: string, action: string) => boolean;
  isSuperAdmin: () => boolean;
  isSystemAdmin: () => boolean;
}

// ============================================================================
// Context
// ============================================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================================================
// Provider Component
// ============================================================================

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch admin data from Firestore
   */
  const fetchAdminData = async (uid: string): Promise<Admin | null> => {
    try {
      console.log('[AuthContext] Fetching admin data for UID:', uid);
      const startTime = Date.now();

      const adminRef = doc(db, COLLECTIONS.ADMINS, uid);

      // Add timeout protection (10 seconds)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Firestore query timeout after 10 seconds')), 10000);
      });

      const adminSnap = await Promise.race([
        getDoc(adminRef),
        timeoutPromise
      ]);

      const elapsed = Date.now() - startTime;
      console.log(`[AuthContext] Firestore query completed in ${elapsed}ms`);

      if (!adminSnap.exists()) {
        console.error('Admin document not found for UID:', uid);
        return null;
      }

      const adminData = adminSnap.data() as Admin;

      // Check if admin account is active
      if (adminData.status !== 'active') {
        throw new Error(`Account is ${adminData.status}. Please contact support.`);
      }

      console.log('[AuthContext] Admin data loaded successfully');
      return adminData;
    } catch (err) {
      console.error('Error fetching admin data:', err);
      throw err;
    }
  };

  /**
   * Update last login timestamp and stats
   */
  const updateLastLogin = async (uid: string) => {
    try {
      const adminRef = doc(db, COLLECTIONS.ADMINS, uid);

      // First fetch current admin data to get the current counts
      const adminSnap = await getDoc(adminRef);
      if (!adminSnap.exists()) {
        console.error('Admin document not found for UID:', uid);
        return;
      }

      const currentData = adminSnap.data();
      const currentLoginCount = currentData.auth?.loginCount || 0;
      const currentTotalLogins = currentData.stats?.totalLogins || 0;

      // Update both auth.loginCount and stats.totalLogins
      await updateDoc(adminRef, {
        'auth.lastLogin': serverTimestamp(),
        'auth.loginCount': currentLoginCount + 1,
        'auth.failedLoginAttempts': 0,
        'stats.totalLogins': currentTotalLogins + 1,
        'stats.lastActionAt': serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      console.log(`✅ Login stats updated: login count now ${currentLoginCount + 1}`);
    } catch (err) {
      console.error('Error updating last login:', err);
      // Non-critical error, don't throw
    }
  };

  /**
   * Login with email and password
   */
  const login = async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);

      // Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const { user: firebaseUser } = userCredential;

      // Fetch admin data from Firestore
      const adminData = await fetchAdminData(firebaseUser.uid);

      if (!adminData) {
        await firebaseSignOut(auth);
        throw new Error('Admin account not found. Please contact support.');
      }

      // Update last login
      await updateLastLogin(firebaseUser.uid);

      setUser(firebaseUser);
      setAdmin(adminData);
    } catch (err: any) {
      console.error('Login error:', err);

      // Handle specific Firebase Auth errors
      let errorMessage = 'Failed to login. Please try again.';

      if (err.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email.';
      } else if (err.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password.';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address.';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Logout
   */
  const logout = async () => {
    try {
      setError(null);
      await firebaseSignOut(auth);
      setUser(null);
      setAdmin(null);
    } catch (err: any) {
      console.error('Logout error:', err);
      setError('Failed to logout. Please try again.');
      throw err;
    }
  };

  /**
   * Send password reset email
   */
  const resetPassword = async (email: string) => {
    try {
      setError(null);
      await sendPasswordResetEmail(auth, email);
    } catch (err: any) {
      console.error('Password reset error:', err);

      let errorMessage = 'Failed to send reset email.';
      if (err.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email.';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address.';
      }

      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  /**
   * Change password for current user
   */
  const changePassword = async (newPassword: string) => {
    try {
      setError(null);

      if (!user) {
        throw new Error('No user logged in');
      }

      await updatePassword(user, newPassword);

      // Update password change timestamp in Firestore
      if (admin) {
        const adminRef = doc(db, COLLECTIONS.ADMINS, user.uid);
        await updateDoc(adminRef, {
          'auth.lastPasswordChange': serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err: any) {
      console.error('Change password error:', err);

      let errorMessage = 'Failed to change password.';
      if (err.code === 'auth/requires-recent-login') {
        errorMessage = 'Please log out and log back in before changing your password.';
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'Password should be at least 8 characters.';
      }

      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  /**
   * Refresh admin data from Firestore
   */
  const refreshAdminData = async () => {
    try {
      if (!user) {
        throw new Error('No user logged in');
      }

      const adminData = await fetchAdminData(user.uid);
      if (adminData) {
        setAdmin(adminData);
      }
    } catch (err: any) {
      console.error('Refresh admin data error:', err);
      setError('Failed to refresh admin data.');
      throw err;
    }
  };

  /**
   * Check if admin has specific permission
   */
  const hasPermission = (resource: string, action: string): boolean => {
    if (!admin) return false;

    // Super admin has all permissions
    if (admin.accessLevel === 'super_admin') return true;

    // Check if permission exists in admin's permissions array
    const permissionKey = `${resource}.${action}`;
    return admin.permissions.includes(permissionKey) || admin.permissions.includes('*');
  };

  /**
   * Check if current user is super admin
   */
  const isSuperAdmin = (): boolean => {
    return admin?.accessLevel === 'super_admin';
  };

  /**
   * Check if current user is system admin or higher
   */
  const isSystemAdmin = (): boolean => {
    return admin?.accessLevel === 'super_admin' || admin?.accessLevel === 'system_admin';
  };

  // ============================================================================
  // Effects
  // ============================================================================

  /**
   * Listen to auth state changes
   */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // User is signed in
          const adminData = await fetchAdminData(firebaseUser.uid);
          setUser(firebaseUser);
          setAdmin(adminData);
        } else {
          // User is signed out
          setUser(null);
          setAdmin(null);
        }
      } catch (err: any) {
        console.error('Auth state change error:', err);
        setError(err.message);
        // If there's an error fetching admin data, sign out
        await firebaseSignOut(auth);
      } finally {
        setLoading(false);
      }
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  // ============================================================================
  // Context Value
  // ============================================================================

  const value: AuthContextType = {
    user,
    admin,
    loading,
    error,
    login,
    logout,
    resetPassword,
    changePassword,
    refreshAdminData,
    hasPermission,
    isSuperAdmin,
    isSystemAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ============================================================================
// Hook
// ============================================================================

/**
 * Custom hook to use auth context
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};
