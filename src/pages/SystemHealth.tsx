/**
 * System Health Monitoring Dashboard
 *
 * Real-time monitoring of platform health metrics, services status,
 * and infrastructure performance.
 */

import { useState, useEffect } from 'react';
import {
  Activity,
  Server,
  Database,
  Cloud,
  Zap,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Cpu,
  HardDrive,
  Network,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSystemHealth, type ServiceHealth, type SystemMetric as BaseSystemMetric, type HealthEvent, type ServiceStatus } from '@/services/systemHealth';

// Extended SystemMetric with icon for UI
interface SystemMetric extends BaseSystemMetric {
  icon: React.ComponentType<{ className?: string }>;
}

export default function SystemHealth() {
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  const [services, setServices] = useState<ServiceHealth[]>([]);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetric[]>([]);
  const [recentEvents, setRecentEvents] = useState<HealthEvent[]>([]);

  useEffect(() => {
    loadHealthData();

    // Auto-refresh every 30 seconds
    if (autoRefresh) {
      const interval = setInterval(() => {
        refreshHealthData();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  /**
   * Load health data
   */
  const loadHealthData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading system health data...');

      const healthData = await getSystemHealth();

      console.log('📊 Health data loaded:', {
        servicesCount: healthData.services.length,
        metricsCount: healthData.metrics.length,
        eventsCount: healthData.events.length,
      });

      // Add icons to metrics
      const metricsWithIcons = healthData.metrics.map(metric => ({
        ...metric,
        icon: getMetricIcon(metric.name),
      }));

      setServices(healthData.services);
      setSystemMetrics(metricsWithIcons);
      setRecentEvents(healthData.events);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('❌ Error loading health data:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Refresh health data
   */
  const refreshHealthData = async () => {
    try {
      console.log('🔄 Auto-refreshing system health data...');

      const healthData = await getSystemHealth();

      // Add icons to metrics
      const metricsWithIcons = healthData.metrics.map(metric => ({
        ...metric,
        icon: getMetricIcon(metric.name),
      }));

      setServices(healthData.services);
      setSystemMetrics(metricsWithIcons);
      setRecentEvents(healthData.events);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('❌ Error refreshing health data:', error);
    }
  };

  /**
   * Manual refresh
   */
  const handleManualRefresh = () => {
    loadHealthData();
  };

  /**
   * Get overall status
   */
  const getOverallStatus = (): ServiceStatus => {
    if (services.some(s => s.status === 'down')) return 'down';
    if (services.some(s => s.status === 'degraded')) return 'degraded';
    return 'operational';
  };

  const overallStatus = getOverallStatus();

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">System Health</h1>
          <p className="text-muted-foreground mt-1">
            Real-time platform monitoring and status
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Auto Refresh Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors',
              autoRefresh
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
            )}
          >
            <Activity className={cn('w-4 h-4', autoRefresh && 'animate-pulse')} />
            <span className="text-sm font-medium">
              {autoRefresh ? 'Auto-refresh On' : 'Auto-refresh Off'}
            </span>
          </button>

          {/* Manual Refresh */}
          <button
            onClick={handleManualRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="text-sm font-medium">Refresh</span>
          </button>
        </div>
      </div>

      {/* Overall Status Banner */}
      <div
        className={cn(
          'p-6 rounded-lg border-l-4',
          overallStatus === 'operational' &&
            'bg-green-50 dark:bg-green-950 border-green-500',
          overallStatus === 'degraded' &&
            'bg-yellow-50 dark:bg-yellow-950 border-yellow-500',
          overallStatus === 'down' && 'bg-red-50 dark:bg-red-950 border-red-500'
        )}
      >
        <div className="flex items-center gap-4">
          {overallStatus === 'operational' && (
            <CheckCircle className="w-8 h-8 text-green-600" />
          )}
          {overallStatus === 'degraded' && (
            <AlertTriangle className="w-8 h-8 text-yellow-600" />
          )}
          {overallStatus === 'down' && <XCircle className="w-8 h-8 text-red-600" />}

          <div className="flex-1">
            <h2 className="text-xl font-bold">
              {overallStatus === 'operational' && 'All Systems Operational'}
              {overallStatus === 'degraded' && 'Partial System Outage'}
              {overallStatus === 'down' && 'System Outage'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Last updated: {formatRelativeTime(lastUpdated)}
            </p>
          </div>
        </div>
      </div>

      {/* System Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {systemMetrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.id}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className={cn(
                    'w-12 h-12 rounded-lg flex items-center justify-center',
                    metric.status === 'healthy' && 'bg-green-50 dark:bg-green-950',
                    metric.status === 'warning' && 'bg-yellow-50 dark:bg-yellow-950',
                    metric.status === 'critical' && 'bg-red-50 dark:bg-red-950'
                  )}
                >
                  <Icon
                    className={cn(
                      'w-6 h-6',
                      metric.status === 'healthy' && 'text-green-600',
                      metric.status === 'warning' && 'text-yellow-600',
                      metric.status === 'critical' && 'text-red-600'
                    )}
                  />
                </div>
                <span
                  className={cn(
                    'px-2 py-1 rounded text-xs font-semibold',
                    metric.status === 'healthy' &&
                      'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300',
                    metric.status === 'warning' &&
                      'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300',
                    metric.status === 'critical' &&
                      'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                  )}
                >
                  {metric.status.toUpperCase()}
                </span>
              </div>
              <h3 className="text-sm text-muted-foreground mb-1">{metric.name}</h3>
              <p className="text-2xl font-bold">
                {metric.value.toFixed(metric.unit === '%' ? 1 : 0)}
                {metric.unit}
              </p>
              <div className="mt-3 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    metric.status === 'healthy' && 'bg-green-500',
                    metric.status === 'warning' && 'bg-yellow-500',
                    metric.status === 'critical' && 'bg-red-500'
                  )}
                  style={{
                    width: `${Math.min(100, (metric.value / metric.threshold) * 100)}%`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Services Status */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold">Services Status</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Status of all platform services
          </p>
        </div>

        <div className="divide-y divide-slate-200 dark:divide-slate-700">
          {services.map((service) => (
            <div key={service.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-semibold">{service.name}</h4>
                    <StatusBadge status={service.status} />
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {service.description}
                  </p>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Uptime:</span>
                      <span className="font-medium">{service.uptime}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Response:</span>
                      <span className="font-medium">{service.responseTime}ms</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Last checked:</span>
                      <span className="font-medium">
                        {formatRelativeTime(service.lastChecked)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Events */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold">Recent Events</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Latest system events and incidents
          </p>
        </div>

        <div className="divide-y divide-slate-200 dark:divide-slate-700">
          {recentEvents.map((event) => (
            <div key={event.id} className="p-6">
              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    'w-2 h-2 rounded-full mt-2',
                    event.type === 'incident' && 'bg-red-500',
                    event.type === 'maintenance' && 'bg-yellow-500',
                    event.type === 'resolved' && 'bg-green-500'
                  )}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{event.service}</span>
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded text-xs font-semibold',
                        event.type === 'incident' &&
                          'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300',
                        event.type === 'maintenance' &&
                          'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300',
                        event.type === 'resolved' &&
                          'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                      )}
                    >
                      {event.type.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">
                    {event.message}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatRelativeTime(event.timestamp)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Status Badge Component
 */
interface StatusBadgeProps {
  status: ServiceStatus;
}

function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold',
        status === 'operational' &&
          'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300',
        status === 'degraded' &&
          'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300',
        status === 'down' &&
          'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
      )}
    >
      {status === 'operational' && <CheckCircle className="w-3 h-3" />}
      {status === 'degraded' && <AlertTriangle className="w-3 h-3" />}
      {status === 'down' && <XCircle className="w-3 h-3" />}
      {status === 'operational' && 'Operational'}
      {status === 'degraded' && 'Degraded'}
      {status === 'down' && 'Down'}
    </span>
  );
}

/**
 * Format relative time
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

/**
 * Get icon for metric by name
 */
function getMetricIcon(metricName: string) {
  switch (metricName) {
    case 'CPU Usage':
      return Cpu;
    case 'Memory Usage':
      return HardDrive;
    case 'Active Connections':
      return Network;
    case 'Error Rate':
      return AlertTriangle;
    default:
      return Activity;
  }
}
