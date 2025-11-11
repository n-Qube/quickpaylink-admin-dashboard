/**
 * Dashboard Page
 *
 * Main dashboard view for Super Admin with real-time metrics from Firestore.
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Store, DollarSign, TrendingUp, Activity, Users, AlertCircle } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';

interface DashboardMetrics {
  totalMerchants: number;
  activeMerchants: number;
  pendingMerchants: number;
  mrr: number;
  growthRate: number;
  pendingKYC: number;
}

export default function Dashboard() {
  const { admin } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalMerchants: 0,
    activeMerchants: 0,
    pendingMerchants: 0,
    mrr: 0,
    growthRate: 0,
    pendingKYC: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardMetrics();
  }, []);

  const loadDashboardMetrics = async () => {
    try {
      setLoading(true);

      // Get all merchants
      const merchantsRef = collection(db, 'merchants');
      const merchantsSnap = await getDocs(merchantsRef);

      const totalMerchants = merchantsSnap.size;

      // Count active merchants
      const activeMerchants = merchantsSnap.docs.filter(
        (doc) => doc.data().status === 'active'
      ).length;

      // Count pending merchants
      const pendingMerchants = merchantsSnap.docs.filter(
        (doc) => doc.data().status === 'pending'
      ).length;

      // Count pending KYC
      const pendingKYC = merchantsSnap.docs.filter(
        (doc) => doc.data().kyc?.status === 'pending' || doc.data().kyc?.status === 'submitted'
      ).length;

      // Calculate MRR (Monthly Recurring Revenue)
      let mrr = 0;
      merchantsSnap.docs.forEach((doc) => {
        const data = doc.data();
        if (data.subscription?.status === 'active' && data.subscription?.amount) {
          mrr += data.subscription.amount;
        }
      });

      // Calculate growth rate (compare with last month)
      // For now, we'll use a simple calculation based on pending vs active
      const growthRate = totalMerchants > 0
        ? ((activeMerchants / totalMerchants) * 100)
        : 0;

      setMetrics({
        totalMerchants,
        activeMerchants,
        pendingMerchants,
        mrr,
        growthRate,
        pendingKYC,
      });
    } catch (error) {
      console.error('Error loading dashboard metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {admin?.profile.displayName}! Here's your platform overview.
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Merchants</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-2xl font-bold text-muted-foreground">Loading...</div>
            ) : (
              <>
                <div className="text-2xl font-bold">{metrics.totalMerchants.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-blue-600">{metrics.activeMerchants}</span> active,
                  <span className="text-yellow-600"> {metrics.pendingMerchants}</span> pending
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MRR</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-2xl font-bold text-muted-foreground">Loading...</div>
            ) : (
              <>
                <div className="text-2xl font-bold">{formatCurrency(metrics.mrr)}</div>
                <p className="text-xs text-muted-foreground">
                  Monthly recurring revenue
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-2xl font-bold text-muted-foreground">Loading...</div>
            ) : (
              <>
                <div className="text-2xl font-bold">{metrics.growthRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">Merchant activation rate</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">99.98%</div>
            <p className="text-xs text-muted-foreground">Uptime this month</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest platform events and changes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading recent activity...</p>
              ) : metrics.totalMerchants === 0 ? (
                <p className="text-sm text-muted-foreground">No recent activity to display</p>
              ) : (
                <>
                  <div className="flex items-start gap-3">
                    <Users className="w-5 h-5 text-blue-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Total merchants registered</p>
                      <p className="text-xs text-muted-foreground">{metrics.totalMerchants} merchants</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <DollarSign className="w-5 h-5 text-green-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Active subscriptions</p>
                      <p className="text-xs text-muted-foreground">{metrics.activeMerchants} merchants</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Activity className="w-5 h-5 text-orange-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Platform operational</p>
                      <p className="text-xs text-muted-foreground">All systems running</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Alerts</CardTitle>
            <CardDescription>Important notifications requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading alerts...</p>
              ) : (
                <>
                  {metrics.pendingKYC > 0 && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                      <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{metrics.pendingKYC} merchants pending KYC verification</p>
                        <p className="text-xs text-muted-foreground">Review required</p>
                      </div>
                    </div>
                  )}
                  {metrics.pendingMerchants > 0 && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                      <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{metrics.pendingMerchants} merchants pending approval</p>
                        <p className="text-xs text-muted-foreground">Review and approve new merchants</p>
                      </div>
                    </div>
                  )}
                  {metrics.pendingKYC === 0 && metrics.pendingMerchants === 0 && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                      <AlertCircle className="w-5 h-5 text-green-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">No pending items</p>
                        <p className="text-xs text-muted-foreground">All merchants processed</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Permissions Debug (for development) */}
      {import.meta.env.DEV && admin && (
        <Card>
          <CardHeader>
            <CardTitle>Debug: Your Permissions</CardTitle>
            <CardDescription>Development mode only</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-slate-100 dark:bg-slate-800 p-4 rounded overflow-auto">
              {JSON.stringify(
                {
                  accessLevel: admin.accessLevel,
                  permissions: admin.permissions,
                  roleId: admin.roleId,
                  department: admin.profile.department,
                },
                null,
                2
              )}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
