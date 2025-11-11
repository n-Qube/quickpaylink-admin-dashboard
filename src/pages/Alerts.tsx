/**
 * Alerts Management Page
 *
 * Manage and monitor system alerts, notifications, and warnings.
 * Allows admins to view, acknowledge, and configure alert rules.
 */

import { useState, useEffect } from 'react';
import {
  Bell,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Clock,
  Filter,
  Search,
  X,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import {
  getAlerts,
  acknowledgeAlert as acknowledgeAlertService,
  resolveAlert as resolveAlertService,
  type Alert,
  type AlertSeverity,
  type AlertStatus,
  type AlertCategory,
} from '@/services/alerts';

export default function Alerts() {
  const { admin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<Alert[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<AlertSeverity | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<AlertStatus | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<AlertCategory | 'all'>('all');
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);

  useEffect(() => {
    loadAlerts();
  }, []);

  useEffect(() => {
    filterAlertsList();
  }, [alerts, searchTerm, filterSeverity, filterStatus, filterCategory]);

  /**
   * Load alerts from database
   */
  const loadAlerts = async () => {
    try {
      setLoading(true);
      console.log('🔔 Loading alerts...');

      const alertsData = await getAlerts();

      console.log(`✅ Loaded ${alertsData.length} alerts`);
      setAlerts(alertsData);
    } catch (error) {
      console.error('❌ Error loading alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Filter alerts based on search and filters
   */
  const filterAlertsList = () => {
    let filtered = [...alerts];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (alert) =>
          alert.title.toLowerCase().includes(term) ||
          alert.message.toLowerCase().includes(term) ||
          alert.source.toLowerCase().includes(term)
      );
    }

    // Severity filter
    if (filterSeverity !== 'all') {
      filtered = filtered.filter((alert) => alert.severity === filterSeverity);
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter((alert) => alert.status === filterStatus);
    }

    // Category filter
    if (filterCategory !== 'all') {
      filtered = filtered.filter((alert) => alert.category === filterCategory);
    }

    setFilteredAlerts(filtered);
  };

  /**
   * Acknowledge an alert
   */
  const acknowledgeAlert = async (alertId: string) => {
    try {
      const adminName = admin?.profile?.displayName || 'Admin User';
      console.log(`✅ Acknowledging alert ${alertId} by ${adminName}`);

      await acknowledgeAlertService(alertId, adminName);

      // Update local state
      setAlerts((prev) =>
        prev.map((alert) =>
          alert.id === alertId
            ? {
                ...alert,
                status: 'acknowledged' as AlertStatus,
                acknowledgedBy: adminName,
                acknowledgedAt: new Date(),
              }
            : alert
        )
      );

      console.log(`✅ Alert ${alertId} acknowledged successfully`);
    } catch (error) {
      console.error('❌ Error acknowledging alert:', error);
    }
  };

  /**
   * Resolve an alert
   */
  const resolveAlert = async (alertId: string) => {
    try {
      console.log(`✅ Resolving alert ${alertId}`);

      await resolveAlertService(alertId);

      // Update local state
      setAlerts((prev) =>
        prev.map((alert) =>
          alert.id === alertId
            ? {
                ...alert,
                status: 'resolved' as AlertStatus,
                resolvedAt: new Date(),
              }
            : alert
        )
      );

      console.log(`✅ Alert ${alertId} resolved successfully`);
    } catch (error) {
      console.error('❌ Error resolving alert:', error);
    }
  };

  /**
   * Get alert counts by status
   */
  const getAlertCounts = () => {
    return {
      active: alerts.filter((a) => a.status === 'active').length,
      acknowledged: alerts.filter((a) => a.status === 'acknowledged').length,
      resolved: alerts.filter((a) => a.status === 'resolved').length,
      critical: alerts.filter((a) => a.severity === 'critical').length,
    };
  };

  const counts = getAlertCounts();

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Alerts</h1>
        <p className="text-muted-foreground mt-1">
          Monitor and manage system alerts and notifications
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Active Alerts"
          value={counts.active}
          icon={Bell}
          color="text-blue-600"
          bgColor="bg-blue-50 dark:bg-blue-950"
        />
        <StatCard
          title="Critical"
          value={counts.critical}
          icon={AlertTriangle}
          color="text-red-600"
          bgColor="bg-red-50 dark:bg-red-950"
        />
        <StatCard
          title="Acknowledged"
          value={counts.acknowledged}
          icon={CheckCircle}
          color="text-yellow-600"
          bgColor="bg-yellow-50 dark:bg-yellow-950"
        />
        <StatCard
          title="Resolved"
          value={counts.resolved}
          icon={XCircle}
          color="text-green-600"
          bgColor="bg-green-50 dark:bg-green-950"
        />
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search alerts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Severity Filter */}
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value as AlertSeverity | 'all')}
            className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as AlertStatus | 'all')}
            className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="resolved">Resolved</option>
          </select>

          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as AlertCategory | 'all')}
            className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Categories</option>
            <option value="system">System</option>
            <option value="security">Security</option>
            <option value="performance">Performance</option>
            <option value="payment">Payment</option>
            <option value="merchant">Merchant</option>
          </select>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-12 text-center">
            <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No alerts found</p>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={cn(
                'bg-white dark:bg-slate-800 border-l-4 rounded-lg p-4 transition-all hover:shadow-md',
                alert.severity === 'critical' && 'border-red-500',
                alert.severity === 'warning' && 'border-yellow-500',
                alert.severity === 'info' && 'border-blue-500'
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getSeverityIcon(alert.severity)}
                    <h3 className="font-semibold">{alert.title}</h3>
                    <SeverityBadge severity={alert.severity} />
                    <StatusBadge status={alert.status} />
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {alert.message}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatRelativeTime(alert.timestamp)}
                    </span>
                    <span>•</span>
                    <span>{alert.source}</span>
                    <span>•</span>
                    <span className="capitalize">{alert.category}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedAlert(alert)}
                    className="px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  {alert.status === 'active' && (
                    <button
                      onClick={() => acknowledgeAlert(alert.id)}
                      className="px-3 py-1.5 text-sm bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
                    >
                      Acknowledge
                    </button>
                  )}
                  {alert.status === 'acknowledged' && (
                    <button
                      onClick={() => resolveAlert(alert.id)}
                      className="px-3 py-1.5 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Alert Details Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-xl font-bold">Alert Details</h2>
              <button
                onClick={() => setSelectedAlert(null)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  {getSeverityIcon(selectedAlert.severity)}
                  <h3 className="text-lg font-semibold">{selectedAlert.title}</h3>
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <SeverityBadge severity={selectedAlert.severity} />
                  <StatusBadge status={selectedAlert.status} />
                </div>
                <p className="text-muted-foreground">{selectedAlert.message}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <div>
                  <p className="text-sm text-muted-foreground">Source</p>
                  <p className="font-medium">{selectedAlert.source}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Category</p>
                  <p className="font-medium capitalize">{selectedAlert.category}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Timestamp</p>
                  <p className="font-medium">
                    {selectedAlert.timestamp.toLocaleString()}
                  </p>
                </div>
                {selectedAlert.acknowledgedBy && (
                  <div>
                    <p className="text-sm text-muted-foreground">Acknowledged By</p>
                    <p className="font-medium">{selectedAlert.acknowledgedBy}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Stat Card Component
 */
interface StatCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

function StatCard({ title, value, icon: Icon, color, bgColor }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          <p className="text-3xl font-bold">{value}</p>
        </div>
        <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center', bgColor)}>
          <Icon className={cn('w-6 h-6', color)} />
        </div>
      </div>
    </div>
  );
}

/**
 * Severity Badge
 */
function SeverityBadge({ severity }: { severity: AlertSeverity }) {
  return (
    <span
      className={cn(
        'px-2 py-0.5 rounded text-xs font-semibold',
        severity === 'critical' && 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300',
        severity === 'warning' &&
          'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300',
        severity === 'info' && 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
      )}
    >
      {severity.toUpperCase()}
    </span>
  );
}

/**
 * Status Badge
 */
function StatusBadge({ status }: { status: AlertStatus }) {
  return (
    <span
      className={cn(
        'px-2 py-0.5 rounded text-xs font-semibold',
        status === 'active' && 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300',
        status === 'acknowledged' &&
          'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300',
        status === 'resolved' &&
          'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
      )}
    >
      {status.toUpperCase()}
    </span>
  );
}

/**
 * Get severity icon
 */
function getSeverityIcon(severity: AlertSeverity) {
  const iconClass = 'w-5 h-5';
  switch (severity) {
    case 'critical':
      return <XCircle className={cn(iconClass, 'text-red-500')} />;
    case 'warning':
      return <AlertTriangle className={cn(iconClass, 'text-yellow-500')} />;
    case 'info':
      return <Info className={cn(iconClass, 'text-blue-500')} />;
  }
}

/**
 * Format relative time
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}
