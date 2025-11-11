/**
 * Analytics Service
 *
 * Handles platform-wide analytics including revenue, transactions,
 * merchant growth, and system metrics.
 */

import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  QueryConstraint,
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../lib/firebase';

// Types
export interface PlatformAnalytics {
  totalMerchants: number;
  activeMerchants: number;
  totalRevenue: number;
  totalTransactions: number;
  averageTransactionValue: number;
  revenueGrowth: number;
  merchantGrowth: number;
  transactionGrowth: number;
}

export interface RevenueData {
  date: string;
  revenue: number;
  transactions: number;
}

export interface MerchantGrowthData {
  date: string;
  newMerchants: number;
  totalMerchants: number;
}

export interface TransactionMetrics {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  pendingTransactions: number;
  totalVolume: number;
  averageValue: number;
}

export interface PaymentMethodStats {
  method: string;
  transactions: number;
  volume: number;
  percentage: number;
}

export interface TopMerchant {
  merchantId: string;
  businessName: string;
  revenue: number;
  transactions: number;
}

export interface DateRangeParams {
  startDate: Date;
  endDate: Date;
}

/**
 * Get platform-wide analytics
 */
export async function getPlatformAnalytics(
  dateRange?: DateRangeParams
): Promise<PlatformAnalytics> {
  try {
    // Get all merchants
    const merchantsSnapshot = await getDocs(collection(db, COLLECTIONS.MERCHANTS));

    let totalMerchants = merchantsSnapshot.size;
    let activeMerchants = 0;
    let totalRevenue = 0;
    let totalTransactions = 0;

    merchantsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.status === 'active') activeMerchants++;
      totalRevenue += data.totalRevenue || 0;
      totalTransactions += data.totalTransactions || 0;
    });

    // Calculate average transaction value
    const averageTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    // Calculate growth rates (comparing with previous period)
    // For now, returning mock growth rates
    // TODO: Implement actual growth calculation from historical data
    const revenueGrowth = 12.5;
    const merchantGrowth = 8.3;
    const transactionGrowth = 15.2;

    return {
      totalMerchants,
      activeMerchants,
      totalRevenue,
      totalTransactions,
      averageTransactionValue,
      revenueGrowth,
      merchantGrowth,
      transactionGrowth,
    };
  } catch (error) {
    console.error('Error getting platform analytics:', error);
    throw new Error('Failed to fetch platform analytics');
  }
}

/**
 * Get revenue data over time
 */
export async function getRevenueData(
  dateRange: DateRangeParams,
  granularity: 'day' | 'week' | 'month' = 'day'
): Promise<RevenueData[]> {
  try {
    // This is a simplified implementation
    // In production, you would query a dedicated analytics collection
    // that stores pre-aggregated data for performance

    const merchantsSnapshot = await getDocs(collection(db, COLLECTIONS.MERCHANTS));

    // Generate date labels based on granularity
    const data: RevenueData[] = [];
    const daysBetween = Math.ceil(
      (dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // For now, return mock data with proper date range
    for (let i = 0; i <= daysBetween; i++) {
      const date = new Date(dateRange.startDate);
      date.setDate(date.getDate() + i);

      // Mock revenue calculation (in production, query actual transactions)
      const revenue = Math.random() * 50000 + 10000;
      const transactions = Math.floor(Math.random() * 100 + 20);

      data.push({
        date: date.toISOString().split('T')[0],
        revenue: Math.round(revenue * 100) / 100,
        transactions,
      });
    }

    return data;
  } catch (error) {
    console.error('Error getting revenue data:', error);
    throw new Error('Failed to fetch revenue data');
  }
}

/**
 * Get merchant growth data over time
 */
export async function getMerchantGrowthData(
  dateRange: DateRangeParams
): Promise<MerchantGrowthData[]> {
  try {
    const constraints: QueryConstraint[] = [
      where('createdAt', '>=', Timestamp.fromDate(dateRange.startDate)),
      where('createdAt', '<=', Timestamp.fromDate(dateRange.endDate)),
      orderBy('createdAt', 'asc'),
    ];

    const q = query(collection(db, COLLECTIONS.MERCHANTS), ...constraints);
    const snapshot = await getDocs(q);

    // Group merchants by date
    const merchantsByDate = new Map<string, number>();
    let cumulativeTotal = 0;

    snapshot.docs.forEach((doc) => {
      const createdAt = doc.data().createdAt?.toDate();
      if (createdAt) {
        const dateKey = createdAt.toISOString().split('T')[0];
        merchantsByDate.set(dateKey, (merchantsByDate.get(dateKey) || 0) + 1);
      }
    });

    // Convert to array and calculate cumulative
    const data: MerchantGrowthData[] = [];
    const sortedDates = Array.from(merchantsByDate.keys()).sort();

    sortedDates.forEach((date) => {
      const newMerchants = merchantsByDate.get(date) || 0;
      cumulativeTotal += newMerchants;
      data.push({
        date,
        newMerchants,
        totalMerchants: cumulativeTotal,
      });
    });

    return data;
  } catch (error) {
    console.error('Error getting merchant growth data:', error);
    throw new Error('Failed to fetch merchant growth data');
  }
}

/**
 * Get transaction metrics
 */
export async function getTransactionMetrics(
  dateRange?: DateRangeParams
): Promise<TransactionMetrics> {
  try {
    // In production, query from a transactions collection
    // For now, aggregate from merchant data

    const merchantsSnapshot = await getDocs(collection(db, COLLECTIONS.MERCHANTS));

    let totalTransactions = 0;
    let totalVolume = 0;

    merchantsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      totalTransactions += data.totalTransactions || 0;
      totalVolume += data.totalRevenue || 0;
    });

    // Mock success/failed/pending distribution
    const successfulTransactions = Math.floor(totalTransactions * 0.92);
    const failedTransactions = Math.floor(totalTransactions * 0.05);
    const pendingTransactions = totalTransactions - successfulTransactions - failedTransactions;

    const averageValue = totalTransactions > 0 ? totalVolume / totalTransactions : 0;

    return {
      totalTransactions,
      successfulTransactions,
      failedTransactions,
      pendingTransactions,
      totalVolume,
      averageValue: Math.round(averageValue * 100) / 100,
    };
  } catch (error) {
    console.error('Error getting transaction metrics:', error);
    throw new Error('Failed to fetch transaction metrics');
  }
}

/**
 * Get payment method statistics
 */
export async function getPaymentMethodStats(
  dateRange?: DateRangeParams
): Promise<PaymentMethodStats[]> {
  try {
    // In production, query from a dedicated analytics collection
    // For now, return mock data based on common payment methods

    const totalVolume = 1000000; // Mock total volume

    const stats: PaymentMethodStats[] = [
      {
        method: 'Mobile Money',
        transactions: 1250,
        volume: totalVolume * 0.45,
        percentage: 45,
      },
      {
        method: 'Card Payment',
        transactions: 850,
        volume: totalVolume * 0.30,
        percentage: 30,
      },
      {
        method: 'Bank Transfer',
        transactions: 450,
        volume: totalVolume * 0.18,
        percentage: 18,
      },
      {
        method: 'Cash',
        transactions: 200,
        volume: totalVolume * 0.07,
        percentage: 7,
      },
    ];

    return stats;
  } catch (error) {
    console.error('Error getting payment method stats:', error);
    throw new Error('Failed to fetch payment method statistics');
  }
}

/**
 * Get top merchants by revenue
 */
export async function getTopMerchants(limit: number = 10): Promise<TopMerchant[]> {
  try {
    const constraints: QueryConstraint[] = [
      where('status', '==', 'active'),
      orderBy('totalRevenue', 'desc'),
    ];

    // Note: In Firestore, we can't use limit with composite queries easily
    // So we fetch all and limit client-side
    const q = query(collection(db, COLLECTIONS.MERCHANTS), ...constraints);
    const snapshot = await getDocs(q);

    const topMerchants: TopMerchant[] = snapshot.docs
      .slice(0, limit)
      .map((doc) => ({
        merchantId: doc.id,
        businessName: doc.data().businessName,
        revenue: doc.data().totalRevenue || 0,
        transactions: doc.data().totalTransactions || 0,
      }));

    return topMerchants;
  } catch (error) {
    console.error('Error getting top merchants:', error);
    throw new Error('Failed to fetch top merchants');
  }
}

/**
 * Get subscription plan distribution
 */
export async function getSubscriptionDistribution(): Promise<
  Array<{ plan: string; count: number; percentage: number }>
> {
  try {
    const snapshot = await getDocs(collection(db, COLLECTIONS.MERCHANTS));

    const planCounts = new Map<string, number>();
    const total = snapshot.size;

    snapshot.docs.forEach((doc) => {
      const plan = doc.data().subscriptionPlan || 'Unknown';
      planCounts.set(plan, (planCounts.get(plan) || 0) + 1);
    });

    const distribution = Array.from(planCounts.entries()).map(([plan, count]) => ({
      plan,
      count,
      percentage: Math.round((count / total) * 10000) / 100,
    }));

    return distribution.sort((a, b) => b.count - a.count);
  } catch (error) {
    console.error('Error getting subscription distribution:', error);
    throw new Error('Failed to fetch subscription distribution');
  }
}

/**
 * Get merchant status distribution
 */
export async function getMerchantStatusDistribution(): Promise<
  Array<{ status: string; count: number; percentage: number }>
> {
  try {
    const snapshot = await getDocs(collection(db, COLLECTIONS.MERCHANTS));

    const statusCounts = new Map<string, number>();
    const total = snapshot.size;

    snapshot.docs.forEach((doc) => {
      const status = doc.data().status || 'Unknown';
      statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
    });

    const distribution = Array.from(statusCounts.entries()).map(([status, count]) => ({
      status,
      count,
      percentage: Math.round((count / total) * 10000) / 100,
    }));

    return distribution;
  } catch (error) {
    console.error('Error getting merchant status distribution:', error);
    throw new Error('Failed to fetch merchant status distribution');
  }
}
