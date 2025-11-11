/**
 * Audit Logs Service
 *
 * Manages audit trail of admin actions and system events.
 * Provides comprehensive logging for compliance and security monitoring.
 */

import { db } from '@/lib/firebase';
import {
  collection,
  query,
  getDocs,
  orderBy,
  limit,
  where,
  addDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

export type ActionType =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'login'
  | 'logout'
  | 'approve'
  | 'reject';

export type ResourceType =
  | 'admin'
  | 'merchant'
  | 'transaction'
  | 'config'
  | 'pricing'
  | 'location'
  | 'currency';

export interface AuditLog {
  id: string;
  timestamp: Date;
  adminId: string;
  adminName: string;
  action: ActionType;
  resource: ResourceType;
  resourceId: string;
  resourceName: string;
  ipAddress: string;
  userAgent: string;
  details?: string;
  changes?: { field: string; before: string; after: string }[];
}

export interface AuditLogFilters {
  action?: ActionType;
  resource?: ResourceType;
  dateRange?: 'today' | '7days' | '30days' | 'all';
  searchTerm?: string;
}

/**
 * Get audit logs with optional filters
 */
export async function getAuditLogs(filters?: AuditLogFilters): Promise<AuditLog[]> {
  console.log('📋 Fetching audit logs...', filters);

  try {
    const logsRef = collection(db, 'auditLogs');
    let q = query(logsRef, orderBy('timestamp', 'desc'), limit(100));

    // Apply date range filter
    if (filters?.dateRange && filters.dateRange !== 'all') {
      const now = new Date();
      let startDate: Date;

      switch (filters.dateRange) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case '7days':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30days':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(0);
      }

      q = query(
        logsRef,
        where('timestamp', '>=', Timestamp.fromDate(startDate)),
        orderBy('timestamp', 'desc'),
        limit(100)
      );
    }

    const logsSnapshot = await getDocs(q);

    if (logsSnapshot.empty) {
      console.log('📋 No audit logs found in database, returning empty array');
      return [];
    }

    const logs: AuditLog[] = logsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        timestamp: data.timestamp?.toDate() || new Date(),
        adminId: data.adminId || '',
        adminName: data.adminName || 'Unknown',
        action: data.action as ActionType,
        resource: data.resource as ResourceType,
        resourceId: data.resourceId || '',
        resourceName: data.resourceName || '',
        ipAddress: data.ipAddress || '',
        userAgent: data.userAgent || '',
        details: data.details,
        changes: data.changes,
      };
    });

    console.log(`✅ Loaded ${logs.length} audit logs`);
    return logs;

  } catch (error) {
    console.error('❌ Error fetching audit logs:', error);
    return [];
  }
}

/**
 * Log an admin action
 */
export async function logAdminAction(log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
  console.log('📝 Logging admin action:', log.action, log.resource);

  try {
    const logsRef = collection(db, 'auditLogs');
    await addDoc(logsRef, {
      ...log,
      timestamp: serverTimestamp(),
    });

    console.log(`✅ Audit log created: ${log.action} ${log.resource}`);
  } catch (error) {
    console.error('❌ Error creating audit log:', error);
    // Don't throw error - audit logging should not break user actions
  }
}

/**
 * Get audit log statistics
 */
export async function getAuditLogStats(dateRange: 'today' | '7days' | '30days' = '7days') {
  console.log('📊 Fetching audit log statistics...');

  try {
    const now = new Date();
    let startDate: Date;

    switch (dateRange) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case '7days':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    const logsRef = collection(db, 'auditLogs');
    const q = query(
      logsRef,
      where('timestamp', '>=', Timestamp.fromDate(startDate)),
      orderBy('timestamp', 'desc')
    );

    const logsSnapshot = await getDocs(q);

    const stats = {
      totalActions: logsSnapshot.size,
      byAction: {} as Record<ActionType, number>,
      byResource: {} as Record<ResourceType, number>,
      activeAdmins: new Set<string>(),
    };

    logsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const action = data.action as ActionType;
      const resource = data.resource as ResourceType;

      stats.byAction[action] = (stats.byAction[action] || 0) + 1;
      stats.byResource[resource] = (stats.byResource[resource] || 0) + 1;
      stats.activeAdmins.add(data.adminId);
    });

    console.log(`✅ Audit log stats calculated: ${stats.totalActions} actions`);
    return {
      ...stats,
      activeAdminsCount: stats.activeAdmins.size,
    };

  } catch (error) {
    console.error('❌ Error fetching audit log stats:', error);
    return {
      totalActions: 0,
      byAction: {},
      byResource: {},
      activeAdminsCount: 0,
    };
  }
}
