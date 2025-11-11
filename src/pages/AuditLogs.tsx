/**
 * Audit Logs Page
 *
 * Comprehensive audit trail of all admin actions and system events.
 * Provides detailed logging for compliance and security monitoring.
 */

import { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Filter,
  Download,
  Calendar,
  User,
  Activity,
  Shield,
  Settings,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getAuditLogs,
  getAuditLogStats,
  type AuditLog,
  type ActionType,
  type ResourceType,
} from '@/services/auditLogs';

export default function AuditLogs() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState<ActionType | 'all'>('all');
  const [filterResource, setFilterResource] = useState<ResourceType | 'all'>('all');
  const [dateRange, setDateRange] = useState<'today' | '7days' | '30days' | 'all'>('7days');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    loadLogs();
  }, [dateRange]);

  useEffect(() => {
    filterLogsList();
  }, [logs, searchTerm, filterAction, filterResource]);

  /**
   * Load audit logs
   */
  const loadLogs = async () => {
    try {
      setLoading(true);
      console.log('📋 Loading audit logs...');

      const logsData = await getAuditLogs({
        dateRange,
        action: filterAction !== 'all' ? filterAction : undefined,
        resource: filterResource !== 'all' ? filterResource : undefined,
      });

      console.log(`✅ Loaded ${logsData.length} audit logs`);
      setLogs(logsData);
    } catch (error) {
      console.error('❌ Error loading logs:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Filter logs based on criteria
   */
  const filterLogsList = () => {
    let filtered = [...logs];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.adminName.toLowerCase().includes(term) ||
          log.resourceName.toLowerCase().includes(term) ||
          log.details?.toLowerCase().includes(term) ||
          log.ipAddress.includes(term)
      );
    }

    // Action filter
    if (filterAction !== 'all') {
      filtered = filtered.filter((log) => log.action === filterAction);
    }

    // Resource filter
    if (filterResource !== 'all') {
      filtered = filtered.filter((log) => log.resource === filterResource);
    }

    setFilteredLogs(filtered);
  };

  /**
   * Export logs
   */
  const exportLogs = () => {
    // In production, generate CSV/PDF
    console.log('Exporting logs...');
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="h-32 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Audit Logs</h1>
          <p className="text-muted-foreground mt-1">
            Complete audit trail of all admin actions
          </p>
        </div>

        <button
          onClick={exportLogs}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Download className="w-4 h-4" />
          <span className="text-sm font-medium">Export Logs</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Action Filter */}
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value as ActionType | 'all')}
            className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Actions</option>
            <option value="create">Create</option>
            <option value="read">Read</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
            <option value="login">Login</option>
            <option value="logout">Logout</option>
            <option value="approve">Approve</option>
            <option value="reject">Reject</option>
          </select>

          {/* Resource Filter */}
          <select
            value={filterResource}
            onChange={(e) => setFilterResource(e.target.value as ResourceType | 'all')}
            className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Resources</option>
            <option value="admin">Admin</option>
            <option value="merchant">Merchant</option>
            <option value="transaction">Transaction</option>
            <option value="config">Config</option>
            <option value="pricing">Pricing</option>
            <option value="location">Location</option>
            <option value="currency">Currency</option>
          </select>

          {/* Date Range */}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="today">Today</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="w-5 h-5 text-blue-500" />
            <h4 className="font-semibold">Total Actions</h4>
          </div>
          <p className="text-2xl font-bold">{filteredLogs.length}</p>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <User className="w-5 h-5 text-green-500" />
            <h4 className="font-semibold">Unique Admins</h4>
          </div>
          <p className="text-2xl font-bold">
            {new Set(filteredLogs.map((l) => l.adminId)).size}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="w-5 h-5 text-purple-500" />
            <h4 className="font-semibold">Updates</h4>
          </div>
          <p className="text-2xl font-bold">
            {filteredLogs.filter((l) => l.action === 'update').length}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-5 h-5 text-orange-500" />
            <h4 className="font-semibold">Security Events</h4>
          </div>
          <p className="text-2xl font-bold">
            {filteredLogs.filter((l) => ['login', 'logout'].includes(l.action)).length}
          </p>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="text-left py-3 px-6 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  Timestamp
                </th>
                <th className="text-left py-3 px-6 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  Admin
                </th>
                <th className="text-left py-3 px-6 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  Action
                </th>
                <th className="text-left py-3 px-6 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  Resource
                </th>
                <th className="text-left py-3 px-6 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  Details
                </th>
                <th className="text-left py-3 px-6 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  IP Address
                </th>
                <th className="text-left py-3 px-6 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredLogs.map((log) => (
                <tr
                  key={log.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <td className="py-4 px-6 text-sm">
                    {log.timestamp.toLocaleString()}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-xs font-semibold text-primary">
                          {log.adminName.split(' ').map((n) => n[0]).join('')}
                        </span>
                      </div>
                      <span className="text-sm font-medium">{log.adminName}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <ActionBadge action={log.action} />
                  </td>
                  <td className="py-4 px-6">
                    <div>
                      <p className="text-sm font-medium capitalize">{log.resource}</p>
                      <p className="text-xs text-muted-foreground">
                        {log.resourceName}
                      </p>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-sm text-muted-foreground max-w-xs truncate">
                    {log.details}
                  </td>
                  <td className="py-4 px-6 text-sm font-mono">{log.ipAddress}</td>
                  <td className="py-4 px-6">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-xl font-bold">Audit Log Details</h2>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Timestamp</p>
                  <p className="font-medium">{selectedLog.timestamp.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Admin</p>
                  <p className="font-medium">{selectedLog.adminName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Action</p>
                  <ActionBadge action={selectedLog.action} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Resource</p>
                  <p className="font-medium capitalize">{selectedLog.resource}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Resource ID</p>
                  <p className="font-medium font-mono text-sm">
                    {selectedLog.resourceId}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">IP Address</p>
                  <p className="font-medium font-mono">{selectedLog.ipAddress}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Details</p>
                <p className="text-sm">{selectedLog.details}</p>
              </div>

              {selectedLog.changes && selectedLog.changes.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Changes</p>
                  <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 space-y-2">
                    {selectedLog.changes.map((change, index) => (
                      <div key={index} className="text-sm">
                        <span className="font-medium">{change.field}:</span>{' '}
                        <span className="text-red-600 dark:text-red-400">
                          {change.before}
                        </span>{' '}
                        →{' '}
                        <span className="text-green-600 dark:text-green-400">
                          {change.after}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Action Badge Component
 */
function ActionBadge({ action }: { action: ActionType }) {
  return (
    <span
      className={cn(
        'inline-block px-2 py-0.5 rounded text-xs font-semibold',
        action === 'create' && 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300',
        action === 'read' && 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
        action === 'update' && 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300',
        action === 'delete' && 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300',
        ['login', 'logout'].includes(action) &&
          'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300',
        ['approve', 'reject'].includes(action) &&
          'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300'
      )}
    >
      {action.toUpperCase()}
    </span>
  );
}
