/**
 * Compliance Dashboard
 *
 * Monitor compliance with regulatory requirements, KYC/AML status,
 * and generate compliance reports.
 */

import { useState, useEffect } from 'react';
import {
  Shield,
  CheckCircle,
  AlertTriangle,
  XCircle,
  FileText,
  Download,
  TrendingUp,
  Users,
  Activity,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getComplianceRequirements,
  getComplianceMetrics,
  type ComplianceRequirement,
  type ComplianceMetric,
  type ComplianceStatus,
  type RequirementCategory,
} from '@/services/compliance';

export default function Compliance() {
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<RequirementCategory | 'all'>('all');
  const [requirements, setRequirements] = useState<ComplianceRequirement[]>([]);
  const [metrics, setMetrics] = useState<ComplianceMetric[]>([]);

  useEffect(() => {
    loadComplianceData();
  }, []);

  /**
   * Load compliance data from service
   */
  const loadComplianceData = async () => {
    try {
      setLoading(true);
      console.log('🛡️ Loading compliance data...');

      const [requirementsData, metricsData] = await Promise.all([
        getComplianceRequirements(),
        getComplianceMetrics(),
      ]);

      console.log('📊 Loaded requirements:', requirementsData.length);
      console.log('📈 Loaded metrics:', metricsData.length);

      setRequirements(requirementsData);
      setMetrics(metricsData);
    } catch (error) {
      console.error('❌ Error loading compliance data:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get filtered requirements
   */
  const getFilteredRequirements = () => {
    if (selectedCategory === 'all') return requirements;
    return requirements.filter((r) => r.category === selectedCategory);
  };

  /**
   * Get compliance stats
   */
  const getComplianceStats = () => {
    return {
      compliant: requirements.filter((r) => r.status === 'compliant').length,
      warning: requirements.filter((r) => r.status === 'warning').length,
      nonCompliant: requirements.filter((r) => r.status === 'non-compliant').length,
      total: requirements.length,
    };
  };

  const stats = getComplianceStats();
  const complianceRate = ((stats.compliant / stats.total) * 100).toFixed(1);

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Compliance Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Monitor regulatory compliance and generate reports
          </p>
        </div>

        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
          <Download className="w-4 h-4" />
          <span className="text-sm font-medium">Generate Report</span>
        </button>
      </div>

      {/* Overall Compliance Score */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg p-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold mb-2">Overall Compliance Score</h2>
            <p className="text-4xl font-bold">{complianceRate}%</p>
            <p className="text-sm mt-2 opacity-90">
              {stats.compliant} of {stats.total} requirements met
            </p>
          </div>
          <div className="w-32 h-32 rounded-full border-8 border-white/30 flex items-center justify-center">
            <Shield className="w-16 h-16" />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <h4 className="font-semibold">Compliant</h4>
          </div>
          <p className="text-2xl font-bold">{stats.compliant}</p>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            <h4 className="font-semibold">Warning</h4>
          </div>
          <p className="text-2xl font-bold">{stats.warning}</p>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <XCircle className="w-5 h-5 text-red-500" />
            <h4 className="font-semibold">Non-Compliant</h4>
          </div>
          <p className="text-2xl font-bold">{stats.nonCompliant}</p>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="w-5 h-5 text-blue-500" />
            <h4 className="font-semibold">Total Requirements</h4>
          </div>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
      </div>

      {/* Compliance Metrics */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-6">Key Compliance Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics.map((metric) => (
            <div key={metric.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{metric.name}</span>
                <StatusIcon status={metric.status} />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">
                  {metric.value}
                  {metric.unit}
                </span>
                <span className="text-sm text-muted-foreground">
                  / {metric.target}
                  {metric.unit}
                </span>
              </div>
              <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    metric.status === 'compliant' && 'bg-green-500',
                    metric.status === 'warning' && 'bg-yellow-500',
                    metric.status === 'non-compliant' && 'bg-red-500'
                  )}
                  style={{
                    width: `${Math.min(100, (metric.value / metric.target) * 100)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {(['all', 'kyc', 'aml', 'data_protection', 'financial', 'security'] as const).map(
          (category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                selectedCategory === category
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              )}
            >
              {category === 'all' ? 'All' : category.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
            </button>
          )
        )}
      </div>

      {/* Requirements List */}
      <div className="space-y-4">
        {getFilteredRequirements().map((requirement) => (
          <div
            key={requirement.id}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <StatusIcon status={requirement.status} />
                  <h3 className="font-semibold">{requirement.name}</h3>
                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 capitalize">
                    {requirement.category.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  {requirement.description}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Last Checked</p>
                    <p className="font-medium">
                      {requirement.lastChecked.toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Next Review</p>
                    <p className="font-medium">
                      {requirement.nextReview.toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Responsible</p>
                    <p className="font-medium">{requirement.responsible}</p>
                  </div>
                </div>
              </div>
              <StatusBadge status={requirement.status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Status Icon Component
 */
function StatusIcon({ status }: { status: ComplianceStatus }) {
  if (status === 'compliant') {
    return <CheckCircle className="w-5 h-5 text-green-500" />;
  }
  if (status === 'warning') {
    return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
  }
  return <XCircle className="w-5 h-5 text-red-500" />;
}

/**
 * Status Badge Component
 */
function StatusBadge({ status }: { status: ComplianceStatus }) {
  return (
    <span
      className={cn(
        'px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap',
        status === 'compliant' &&
          'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300',
        status === 'warning' &&
          'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300',
        status === 'non-compliant' &&
          'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
      )}
    >
      {status === 'compliant' && 'COMPLIANT'}
      {status === 'warning' && 'WARNING'}
      {status === 'non-compliant' && 'NON-COMPLIANT'}
    </span>
  );
}
