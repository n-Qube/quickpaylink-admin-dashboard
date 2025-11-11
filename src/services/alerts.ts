/**
 * Alerts Service
 *
 * Monitors system health and merchant activities to generate real-time alerts.
 * Tracks alert status and provides alert management functionality.
 */

import { db } from '@/lib/firebase';
import {
  collection,
  query,
  getDocs,
  orderBy,
  limit,
  where,
  doc,
  updateDoc,
  Timestamp,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';

export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved';
export type AlertCategory = 'system' | 'security' | 'performance' | 'payment' | 'merchant';

export interface Alert {
  id: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  status: AlertStatus;
  category: AlertCategory;
  source: string;
  timestamp: Date;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
}

/**
 * Get all alerts from the database
 */
export async function getAlerts(): Promise<Alert[]> {
  console.log('🔔 Fetching alerts...');

  try {
    const alerts: Alert[] = [];

    // Try to fetch alerts from database
    const alertsRef = collection(db, 'alerts');
    const alertsQuery = query(alertsRef, orderBy('timestamp', 'desc'), limit(50));
    const alertsSnapshot = await getDocs(alertsQuery);

    if (!alertsSnapshot.empty) {
      alertsSnapshot.forEach(doc => {
        const data = doc.data();
        alerts.push({
          id: doc.id,
          title: data.title,
          message: data.message,
          severity: data.severity as AlertSeverity,
          status: data.status as AlertStatus,
          category: data.category as AlertCategory,
          source: data.source,
          timestamp: data.timestamp?.toDate() || new Date(),
          acknowledgedBy: data.acknowledgedBy,
          acknowledgedAt: data.acknowledgedAt?.toDate(),
          resolvedAt: data.resolvedAt?.toDate(),
        });
      });

      console.log(`✅ Loaded ${alerts.length} alerts from database`);
      return alerts;
    }

    // If no alerts in database, generate based on system data
    console.log('📊 No alerts in database, generating from system data...');
    const generatedAlerts = await generateAlertsFromSystemData();

    console.log(`✅ Generated ${generatedAlerts.length} alerts from system data`);
    return generatedAlerts;

  } catch (error) {
    console.error('❌ Error fetching alerts:', error);
    // Return empty array on error
    return [];
  }
}

/**
 * Generate alerts based on current system data
 */
async function generateAlertsFromSystemData(): Promise<Alert[]> {
  const alerts: Alert[] = [];

  try {
    // Check merchant-related issues
    const merchantsRef = collection(db, 'merchants');
    const merchantsSnapshot = await getDocs(merchantsRef);

    // Check for pending verifications
    const pendingMerchants = merchantsSnapshot.docs.filter(
      doc => doc.data().status === 'pending'
    );

    if (pendingMerchants.length > 0) {
      alerts.push({
        id: `merchant-pending-${Date.now()}`,
        title: 'Merchant Verification Pending',
        message: `${pendingMerchants.length} merchant account${pendingMerchants.length > 1 ? 's' : ''} awaiting manual verification`,
        severity: pendingMerchants.length > 10 ? 'warning' : 'info',
        status: 'active',
        category: 'merchant',
        source: 'Merchant Onboarding',
        timestamp: new Date(),
      });
    }

    // Check for suspended merchants
    const suspendedMerchants = merchantsSnapshot.docs.filter(
      doc => doc.data().status === 'suspended'
    );

    if (suspendedMerchants.length > 0) {
      alerts.push({
        id: `merchant-suspended-${Date.now()}`,
        title: 'Suspended Merchant Accounts',
        message: `${suspendedMerchants.length} merchant account${suspendedMerchants.length > 1 ? 's' : ''} currently suspended`,
        severity: 'warning',
        status: 'active',
        category: 'merchant',
        source: 'Risk Management',
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
      });
    }

    // Check merchant activity
    const activeMerchants = merchantsSnapshot.docs.filter(
      doc => doc.data().status === 'active'
    );

    const inactiveMerchants = activeMerchants.filter(doc => {
      const lastTransaction = doc.data().stats?.lastTransactionDate;
      if (!lastTransaction) return true;

      const daysSinceLastTransaction = (Date.now() - lastTransaction.toDate().getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceLastTransaction > 30;
    });

    if (inactiveMerchants.length > 5) {
      alerts.push({
        id: `merchant-inactive-${Date.now()}`,
        title: 'Inactive Merchants Detected',
        message: `${inactiveMerchants.length} active merchants have no transactions in the last 30 days`,
        severity: 'info',
        status: 'active',
        category: 'performance',
        source: 'Analytics Monitor',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      });
    }

    // Check admin activity
    const adminsRef = collection(db, 'admins');
    const adminsSnapshot = await getDocs(query(adminsRef, where('status', '==', 'active')));

    if (adminsSnapshot.size < 2) {
      alerts.push({
        id: `admin-count-${Date.now()}`,
        title: 'Low Admin User Count',
        message: 'Only 1 active admin user. Consider adding more administrators for redundancy.',
        severity: 'warning',
        status: 'active',
        category: 'system',
        source: 'Admin Management',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
      });
    }

    // Check for high-value merchants
    const highValueMerchants = activeMerchants.filter(doc => {
      const totalRevenue = doc.data().stats?.totalRevenue || 0;
      return totalRevenue > 100000; // Example threshold
    });

    if (highValueMerchants.length > 0) {
      alerts.push({
        id: `merchant-high-value-${Date.now()}`,
        title: 'High-Value Merchants Detected',
        message: `${highValueMerchants.length} merchant${highValueMerchants.length > 1 ? 's' : ''} with revenue exceeding $100,000. Monitor for compliance.`,
        severity: 'info',
        status: 'active',
        category: 'merchant',
        source: 'Compliance Monitor',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
      });
    }

    // System health check
    const systemConfigRef = collection(db, 'systemConfig');
    try {
      const start = Date.now();
      await getDocs(query(systemConfigRef, limit(1)));
      const responseTime = Date.now() - start;

      if (responseTime > 1000) {
        alerts.push({
          id: `system-slow-${Date.now()}`,
          title: 'Slow Database Response',
          message: `Database response time is ${responseTime}ms. Performance degradation detected.`,
          severity: 'warning',
          status: 'active',
          category: 'performance',
          source: 'Database Monitor',
          timestamp: new Date(Date.now() - 15 * 60 * 1000),
        });
      }
    } catch (error) {
      alerts.push({
        id: `system-error-${Date.now()}`,
        title: 'Database Connection Issue',
        message: 'Unable to connect to system configuration. Check database connectivity.',
        severity: 'critical',
        status: 'active',
        category: 'system',
        source: 'Database Monitor',
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
      });
    }

  } catch (error) {
    console.error('Error generating alerts from system data:', error);
  }

  return alerts;
}

/**
 * Acknowledge an alert
 */
export async function acknowledgeAlert(alertId: string, adminName: string): Promise<void> {
  console.log(`✅ Acknowledging alert: ${alertId}`);

  try {
    const alertRef = doc(db, 'alerts', alertId);
    await updateDoc(alertRef, {
      status: 'acknowledged',
      acknowledgedBy: adminName,
      acknowledgedAt: serverTimestamp(),
    });

    console.log(`✅ Alert ${alertId} acknowledged`);
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    throw error;
  }
}

/**
 * Resolve an alert
 */
export async function resolveAlert(alertId: string): Promise<void> {
  console.log(`✅ Resolving alert: ${alertId}`);

  try {
    const alertRef = doc(db, 'alerts', alertId);
    await updateDoc(alertRef, {
      status: 'resolved',
      resolvedAt: serverTimestamp(),
    });

    console.log(`✅ Alert ${alertId} resolved`);
  } catch (error) {
    console.error('Error resolving alert:', error);
    throw error;
  }
}

/**
 * Create a new alert
 */
export async function createAlert(alert: Omit<Alert, 'id' | 'timestamp'>): Promise<string> {
  console.log('🆕 Creating new alert:', alert.title);

  try {
    const alertsRef = collection(db, 'alerts');
    const docRef = await addDoc(alertsRef, {
      ...alert,
      timestamp: serverTimestamp(),
    });

    console.log(`✅ Alert created with ID: ${docRef.id}`);
    return docRef.id;
  } catch (error) {
    console.error('Error creating alert:', error);
    throw error;
  }
}
