/**
 * Merchants Service
 *
 * Handles all merchant-related operations including CRUD, status management,
 * verification, and merchant analytics.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  Timestamp,
  DocumentSnapshot,
  QueryConstraint,
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../lib/firebase';

// Types
export interface Merchant {
  id: string;
  businessName: string;
  email: string;
  phoneNumber: string;
  ownerName: string;
  businessType: string;
  country: string;
  currency: string;
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  verificationStatus: 'pending' | 'verified' | 'rejected';
  subscriptionPlan: string;
  subscriptionStatus: 'active' | 'cancelled' | 'expired' | 'trial';
  subscriptionStartDate?: Date;
  subscriptionEndDate?: Date;
  apiKeyStatus: 'active' | 'inactive';
  totalRevenue: number;
  totalTransactions: number;
  createdAt: Date;
  lastActiveAt?: Date;
  settings?: {
    allowedPaymentMethods?: string[];
    webhookUrl?: string;
    notificationsEnabled?: boolean;
  };
}

export interface MerchantFilters {
  status?: string;
  verificationStatus?: string;
  subscriptionPlan?: string;
  country?: string;
  searchQuery?: string;
}

export interface MerchantStats {
  totalMerchants: number;
  activeMerchants: number;
  pendingVerification: number;
  suspendedMerchants: number;
  totalRevenue: number;
  totalTransactions: number;
}

/**
 * Get all merchants with optional filtering and pagination
 */
export async function getMerchants(
  filters: MerchantFilters = {},
  limitCount: number = 50,
  lastDoc?: DocumentSnapshot
): Promise<{ merchants: Merchant[]; lastDocument: DocumentSnapshot | null }> {
  try {
    const constraints: QueryConstraint[] = [];

    // Apply filters
    if (filters.status) {
      constraints.push(where('status', '==', filters.status));
    }
    if (filters.verificationStatus) {
      constraints.push(where('verificationStatus', '==', filters.verificationStatus));
    }
    if (filters.subscriptionPlan) {
      constraints.push(where('subscriptionPlan', '==', filters.subscriptionPlan));
    }
    if (filters.country) {
      constraints.push(where('country', '==', filters.country));
    }

    // Add ordering
    constraints.push(orderBy('createdAt', 'desc'));

    // Add pagination
    constraints.push(limit(limitCount));
    if (lastDoc) {
      constraints.push(startAfter(lastDoc));
    }

    const q = query(collection(db, COLLECTIONS.MERCHANTS), ...constraints);
    const snapshot = await getDocs(q);

    const merchants = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      lastActiveAt: doc.data().lastActiveAt?.toDate(),
      subscriptionStartDate: doc.data().subscriptionStartDate?.toDate(),
      subscriptionEndDate: doc.data().subscriptionEndDate?.toDate(),
    })) as Merchant[];

    // Apply search filter (client-side for now)
    let filteredMerchants = merchants;
    if (filters.searchQuery) {
      const searchLower = filters.searchQuery.toLowerCase();
      filteredMerchants = merchants.filter(
        (m) =>
          m.businessName.toLowerCase().includes(searchLower) ||
          m.email.toLowerCase().includes(searchLower) ||
          m.phoneNumber.includes(searchLower) ||
          m.ownerName.toLowerCase().includes(searchLower)
      );
    }

    const lastDocument = snapshot.docs[snapshot.docs.length - 1] || null;

    return { merchants: filteredMerchants, lastDocument };
  } catch (error) {
    console.error('Error getting merchants:', error);
    throw new Error('Failed to fetch merchants');
  }
}

/**
 * Get a single merchant by ID
 */
export async function getMerchantById(merchantId: string): Promise<Merchant | null> {
  try {
    const docRef = doc(db, COLLECTIONS.MERCHANTS, merchantId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return {
      id: docSnap.id,
      ...docSnap.data(),
      createdAt: docSnap.data().createdAt?.toDate(),
      lastActiveAt: docSnap.data().lastActiveAt?.toDate(),
      subscriptionStartDate: docSnap.data().subscriptionStartDate?.toDate(),
      subscriptionEndDate: docSnap.data().subscriptionEndDate?.toDate(),
    } as Merchant;
  } catch (error) {
    console.error('Error getting merchant:', error);
    throw new Error('Failed to fetch merchant');
  }
}

/**
 * Create a new merchant
 */
export async function createMerchant(merchantData: Omit<Merchant, 'id' | 'createdAt'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, COLLECTIONS.MERCHANTS), {
      ...merchantData,
      createdAt: Timestamp.now(),
      totalRevenue: 0,
      totalTransactions: 0,
      status: 'pending',
      verificationStatus: 'pending',
    });

    return docRef.id;
  } catch (error) {
    console.error('Error creating merchant:', error);
    throw new Error('Failed to create merchant');
  }
}

/**
 * Update merchant information
 */
export async function updateMerchant(
  merchantId: string,
  updates: Partial<Merchant>
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.MERCHANTS, merchantId);

    // Convert dates to Timestamps
    const updateData: any = { ...updates };
    if (updates.subscriptionStartDate) {
      updateData.subscriptionStartDate = Timestamp.fromDate(updates.subscriptionStartDate);
    }
    if (updates.subscriptionEndDate) {
      updateData.subscriptionEndDate = Timestamp.fromDate(updates.subscriptionEndDate);
    }
    if (updates.lastActiveAt) {
      updateData.lastActiveAt = Timestamp.fromDate(updates.lastActiveAt);
    }

    // Remove id and createdAt from updates
    delete updateData.id;
    delete updateData.createdAt;

    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('Error updating merchant:', error);
    throw new Error('Failed to update merchant');
  }
}

/**
 * Delete a merchant (soft delete by setting status to inactive)
 */
export async function deleteMerchant(merchantId: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.MERCHANTS, merchantId);
    await updateDoc(docRef, {
      status: 'inactive',
      deletedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error deleting merchant:', error);
    throw new Error('Failed to delete merchant');
  }
}

/**
 * Update merchant status
 */
export async function updateMerchantStatus(
  merchantId: string,
  status: 'active' | 'inactive' | 'suspended' | 'pending'
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.MERCHANTS, merchantId);
    await updateDoc(docRef, {
      status,
      lastStatusUpdate: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating merchant status:', error);
    throw new Error('Failed to update merchant status');
  }
}

/**
 * Update merchant verification status
 */
export async function updateMerchantVerification(
  merchantId: string,
  verificationStatus: 'pending' | 'verified' | 'rejected',
  notes?: string
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.MERCHANTS, merchantId);
    await updateDoc(docRef, {
      verificationStatus,
      verificationNotes: notes || '',
      verificationDate: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating merchant verification:', error);
    throw new Error('Failed to update merchant verification');
  }
}

/**
 * Get merchant statistics
 */
export async function getMerchantStats(): Promise<MerchantStats> {
  try {
    const snapshot = await getDocs(collection(db, COLLECTIONS.MERCHANTS));

    const stats: MerchantStats = {
      totalMerchants: snapshot.size,
      activeMerchants: 0,
      pendingVerification: 0,
      suspendedMerchants: 0,
      totalRevenue: 0,
      totalTransactions: 0,
    };

    snapshot.docs.forEach((doc) => {
      const data = doc.data();

      if (data.status === 'active') stats.activeMerchants++;
      if (data.status === 'suspended') stats.suspendedMerchants++;
      if (data.verificationStatus === 'pending') stats.pendingVerification++;

      stats.totalRevenue += data.totalRevenue || 0;
      stats.totalTransactions += data.totalTransactions || 0;
    });

    return stats;
  } catch (error) {
    console.error('Error getting merchant stats:', error);
    throw new Error('Failed to fetch merchant statistics');
  }
}

/**
 * Update merchant API key status
 */
export async function updateMerchantAPIKeyStatus(
  merchantId: string,
  apiKeyStatus: 'active' | 'inactive'
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.MERCHANTS, merchantId);
    await updateDoc(docRef, {
      apiKeyStatus,
      apiKeyStatusUpdatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating API key status:', error);
    throw new Error('Failed to update API key status');
  }
}

/**
 * Update merchant subscription
 */
export async function updateMerchantSubscription(
  merchantId: string,
  subscriptionPlan: string,
  subscriptionStatus: 'active' | 'cancelled' | 'expired' | 'trial',
  subscriptionStartDate?: Date,
  subscriptionEndDate?: Date
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.MERCHANTS, merchantId);
    await updateDoc(docRef, {
      subscriptionPlan,
      subscriptionStatus,
      subscriptionStartDate: subscriptionStartDate ? Timestamp.fromDate(subscriptionStartDate) : null,
      subscriptionEndDate: subscriptionEndDate ? Timestamp.fromDate(subscriptionEndDate) : null,
      subscriptionUpdatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating merchant subscription:', error);
    throw new Error('Failed to update merchant subscription');
  }
}
