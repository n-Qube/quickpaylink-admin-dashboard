/**
 * Payouts & Settlements Page
 *
 * Comprehensive payout management for merchant settlements via Paystack Transfer API.
 * Features:
 * - View all payouts and settlements
 * - Process manual payouts
 * - Monitor payout status
 * - View payout history and breakdown
 * - Configure merchant payout settings
 * - Handle failed payouts and retries
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  DollarSign,
  Search,
  Filter,
  Eye,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  Download,
  RefreshCw,
  Calendar,
  CreditCard,
  Building2,
  Smartphone,
  ArrowUpRight,
  ArrowDownRight,
  Info
} from 'lucide-react';
import { db, app } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import type { Merchant } from '@/types/database';
import { getMerchants } from '@/services/merchants';

interface PayoutMetrics {
  totalPayouts: number;
  successfulPayouts: number;
  pendingPayouts: number;
  failedPayouts: number;
  totalAmount: number;
  totalFees: number;
}

type PayoutStatus = 'pending' | 'queued' | 'processing' | 'success' | 'failed' | 'reversed';

interface Payout {
  payoutId: string;
  merchantId: string;
  merchantName?: string;
  settlementId?: string;
  amount: number;
  currency: string;
  fee: number;
  netAmount: number;
  recipient: {
    type: 'bank' | 'mobile_money';
    recipientCode: string;
    accountNumber: string;
    accountName: string;
    bankCode?: string;
    bankName?: string;
    mobileProvider?: string;
  };
  paystack: {
    transferCode: string;
    reference: string;
    status: PayoutStatus;
    integration: number;
    domain: 'live' | 'test';
    reason?: string;
    createdAt: string;
    updatedAt: string;
    transferredAt?: string;
    failureReason?: string;
  };
  initiatedBy: 'system' | 'admin' | 'merchant';
  initiatedByAdminId?: string;
  type: 'settlement' | 'refund' | 'adjustment' | 'manual';
  description?: string;
  createdAt: Timestamp;
  processedAt?: Timestamp;
  completedAt?: Timestamp;
  failedAt?: Timestamp;
}

export default function Payouts() {
  const { admin } = useAuth();
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [filteredPayouts, setFilteredPayouts] = useState<Payout[]>([]);
  const [metrics, setMetrics] = useState<PayoutMetrics>({
    totalPayouts: 0,
    successfulPayouts: 0,
    pendingPayouts: 0,
    failedPayouts: 0,
    totalAmount: 0,
    totalFees: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<PayoutStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<'settlement' | 'refund' | 'adjustment' | 'manual' | 'all'>('all');
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [processingPayout, setProcessingPayout] = useState(false);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [processingError, setProcessingError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterPayouts();
  }, [payouts, searchTerm, statusFilter, typeFilter]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load merchants using the service (same as Support Tickets and Merchants pages)
      const { merchants: merchantsData } = await getMerchants({}, 1000); // Get all merchants
      console.log('✅ Loaded merchants from database:', merchantsData.length);
      setMerchants(merchantsData as Merchant[]);

      // Load payouts (limited to last 100 for performance)
      const payoutsRef = collection(db, 'payouts');
      const payoutsQuery = query(payoutsRef, orderBy('createdAt', 'desc'), limit(100));
      const payoutsSnap = await getDocs(payoutsQuery);

      const payoutsList: Payout[] = [];
      payoutsSnap.forEach((doc) => {
        const payoutData = doc.data() as Payout;
        const merchant = merchantsData.find(m => m.id === payoutData.merchantId);
        payoutsList.push({
          ...payoutData,
          payoutId: doc.id,
          merchantName: merchant?.businessName || merchant?.tradingName || 'Unknown Merchant',
        });
      });
      setPayouts(payoutsList);

      // Calculate metrics
      const totalPayouts = payoutsList.length;
      const successfulPayouts = payoutsList.filter(p => p.paystack.status === 'success').length;
      const pendingPayouts = payoutsList.filter(p => ['pending', 'queued', 'processing'].includes(p.paystack.status)).length;
      const failedPayouts = payoutsList.filter(p => p.paystack.status === 'failed').length;
      const totalAmount = payoutsList.reduce((sum, p) => sum + p.amount, 0);
      const totalFees = payoutsList.reduce((sum, p) => sum + p.fee, 0);

      setMetrics({
        totalPayouts,
        successfulPayouts,
        pendingPayouts,
        failedPayouts,
        totalAmount,
        totalFees,
      });
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterPayouts = () => {
    let filtered = [...payouts];

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.merchantName?.toLowerCase().includes(search) ||
        p.payoutId.toLowerCase().includes(search) ||
        p.recipient.accountNumber.includes(search) ||
        p.paystack.reference.toLowerCase().includes(search)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.paystack.status === statusFilter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(p => p.type === typeFilter);
    }

    setFilteredPayouts(filtered);
  };

  const getStatusBadgeColor = (status: PayoutStatus) => {
    switch (status) {
      case 'success':
        return 'bg-green-500 text-white';
      case 'failed':
        return 'bg-red-500 text-white';
      case 'processing':
      case 'queued':
        return 'bg-blue-500 text-white';
      case 'pending':
        return 'bg-yellow-500 text-white';
      case 'reversed':
        return 'bg-gray-500 text-white';
      default:
        return 'bg-gray-400 text-white';
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'settlement':
        return 'bg-purple-500 text-white';
      case 'refund':
        return 'bg-orange-500 text-white';
      case 'adjustment':
        return 'bg-blue-500 text-white';
      case 'manual':
        return 'bg-gray-600 text-white';
      default:
        return 'bg-gray-400 text-white';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (timestamp: Timestamp | string | undefined) => {
    if (!timestamp) return 'N/A';

    let date: Date;
    if (typeof timestamp === 'string') {
      date = new Date(timestamp);
    } else if (timestamp && 'seconds' in timestamp) {
      date = new Date(timestamp.seconds * 1000);
    } else {
      return 'N/A';
    }

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleViewDetails = (payout: Payout) => {
    setSelectedPayout(payout);
    setShowDetailModal(true);
  };

  const handleProcessManualPayout = async (merchantId: string, amount?: number, description?: string) => {
    if (!admin) return;

    try {
      setProcessingPayout(true);
      setProcessingError('');

      // Initialize Firebase Functions
      const functions = getFunctions(app);
      const processManualPayoutFn = httpsCallable(functions, 'processManualPayout');

      // Call the cloud function
      const result = await processManualPayoutFn({
        merchantId,
        amount, // optional - if not provided, processes all available balance
        description: description || 'Manual payout initiated from admin dashboard',
        initiatedByAdminId: admin.adminId,
      });

      const data = result.data as any;

      if (data.success) {
        alert(`Payout initiated successfully! Transfer Code: ${data.transferCode}`);
        setShowProcessModal(false);
        await loadData(); // Reload data to show the new payout
      } else {
        setProcessingError(data.error || 'Failed to initiate payout');
      }
    } catch (error: any) {
      console.error('Error processing manual payout:', error);
      setProcessingError(error.message || 'An unexpected error occurred');
    } finally {
      setProcessingPayout(false);
    }
  };

  const handleRetryPayout = async (payoutId: string) => {
    // This would call a Cloud Function to retry the failed payout
    console.log('Retrying payout:', payoutId);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payouts & Settlements</h1>
          <p className="text-muted-foreground">
            Manage merchant payouts and settlements via Paystack Transfer API
          </p>
        </div>
        <Button onClick={() => setShowProcessModal(true)} className="flex items-center gap-2">
          <Send className="h-4 w-4" />
          Process Manual Payout
        </Button>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payouts</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-2xl font-bold text-muted-foreground">...</div>
            ) : (
              <div className="text-2xl font-bold">{metrics.totalPayouts}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Successful</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-2xl font-bold text-muted-foreground">...</div>
            ) : (
              <div className="text-2xl font-bold text-green-600">{metrics.successfulPayouts}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-2xl font-bold text-muted-foreground">...</div>
            ) : (
              <div className="text-2xl font-bold text-yellow-600">{metrics.pendingPayouts}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-2xl font-bold text-muted-foreground">...</div>
            ) : (
              <div className="text-2xl font-bold text-red-600">{metrics.failedPayouts}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-2xl font-bold text-muted-foreground">...</div>
            ) : (
              <div className="text-2xl font-bold text-blue-600">{formatCurrency(metrics.totalAmount)}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Fees</CardTitle>
            <CreditCard className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-2xl font-bold text-muted-foreground">...</div>
            ) : (
              <div className="text-2xl font-bold text-purple-600">{formatCurrency(metrics.totalFees)}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Payouts</CardTitle>
          <CardDescription>Search and filter by status, type, merchant</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Merchant, ID, account..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="statusFilter">Status</Label>
              <select
                id="statusFilter"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as PayoutStatus | 'all')}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="queued">Queued</option>
                <option value="processing">Processing</option>
                <option value="success">Success</option>
                <option value="failed">Failed</option>
                <option value="reversed">Reversed</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="typeFilter">Type</Label>
              <select
                id="typeFilter"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
              >
                <option value="all">All Types</option>
                <option value="settlement">Settlement</option>
                <option value="refund">Refund</option>
                <option value="adjustment">Adjustment</option>
                <option value="manual">Manual</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payouts List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Payouts ({filteredPayouts.length})</CardTitle>
              <CardDescription>View and manage all payout transactions</CardDescription>
            </div>
            <Button onClick={loadData} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading payouts...</p>
            </div>
          ) : filteredPayouts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No payouts found matching your filters</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPayouts.map((payout) => (
                <div
                  key={payout.payoutId}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{payout.merchantName}</h4>
                      <Badge className={getStatusBadgeColor(payout.paystack.status)}>
                        {payout.paystack.status.toUpperCase()}
                      </Badge>
                      <Badge className={getTypeBadgeColor(payout.type)}>
                        {payout.type}
                      </Badge>
                      {payout.recipient.type === 'mobile_money' ? (
                        <Badge variant="outline" className="gap-1">
                          <Smartphone className="h-3 w-3" />
                          Mobile Money
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1">
                          <Building2 className="h-3 w-3" />
                          Bank Transfer
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium">Amount:</span> {formatCurrency(payout.amount)}
                      </div>
                      <div>
                        <span className="font-medium">Fee:</span> {formatCurrency(payout.fee)}
                      </div>
                      <div>
                        <span className="font-medium">Net:</span> {formatCurrency(payout.netAmount)}
                      </div>
                      <div>
                        <span className="font-medium">Date:</span> {formatDate(payout.createdAt)}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium">Account:</span> {payout.recipient.accountNumber} • {payout.recipient.accountName}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(payout)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    {payout.paystack.status === 'failed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRetryPayout(payout.payoutId)}
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Retry
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      {showDetailModal && selectedPayout && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Payout Details</CardTitle>
                    <CardDescription>{selectedPayout.payoutId}</CardDescription>
                  </div>
                  <Button variant="outline" onClick={() => setShowDetailModal(false)}>
                    Close
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Status Banner */}
                <div className={`p-4 rounded-lg border-2 ${
                  selectedPayout.paystack.status === 'success'
                    ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900'
                    : selectedPayout.paystack.status === 'failed'
                    ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900'
                    : selectedPayout.paystack.status === 'processing'
                    ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900'
                    : 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {selectedPayout.paystack.status === 'success' ? (
                        <CheckCircle className="h-8 w-8 text-green-600" />
                      ) : selectedPayout.paystack.status === 'failed' ? (
                        <XCircle className="h-8 w-8 text-red-600" />
                      ) : selectedPayout.paystack.status === 'processing' ? (
                        <Clock className="h-8 w-8 text-blue-600 animate-pulse" />
                      ) : (
                        <AlertCircle className="h-8 w-8 text-yellow-600" />
                      )}
                      <div>
                        <p className="font-semibold text-lg">
                          {selectedPayout.paystack.status === 'success'
                            ? 'Payout Successful'
                            : selectedPayout.paystack.status === 'failed'
                            ? 'Payout Failed'
                            : selectedPayout.paystack.status === 'processing'
                            ? 'Processing Payout'
                            : 'Payout Pending'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {selectedPayout.paystack.status === 'success' && selectedPayout.completedAt
                            ? `Completed ${formatDate(selectedPayout.completedAt)}`
                            : selectedPayout.paystack.status === 'failed' && selectedPayout.failedAt
                            ? `Failed ${formatDate(selectedPayout.failedAt)}`
                            : `Initiated ${formatDate(selectedPayout.createdAt)}`}
                        </p>
                      </div>
                    </div>
                    <Badge className={getStatusBadgeColor(selectedPayout.paystack.status)}>
                      {selectedPayout.paystack.status.toUpperCase()}
                    </Badge>
                  </div>
                  {selectedPayout.paystack.failureReason && (
                    <div className="mt-3 p-3 bg-red-100 dark:bg-red-950/50 rounded border border-red-200 dark:border-red-900">
                      <p className="text-sm font-medium text-red-900 dark:text-red-100">Failure Reason:</p>
                      <p className="text-sm text-red-800 dark:text-red-200">{selectedPayout.paystack.failureReason}</p>
                    </div>
                  )}
                </div>

                {/* Amount Details */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Payment Breakdown</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border">
                      <div className="flex items-center gap-2 mb-2">
                        <ArrowUpRight className="h-4 w-4 text-blue-600" />
                        <Label className="text-sm">Gross Amount</Label>
                      </div>
                      <p className="text-2xl font-bold">{formatCurrency(selectedPayout.amount)}</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border">
                      <div className="flex items-center gap-2 mb-2">
                        <ArrowDownRight className="h-4 w-4 text-orange-600" />
                        <Label className="text-sm">Transfer Fee</Label>
                      </div>
                      <p className="text-2xl font-bold text-orange-600">{formatCurrency(selectedPayout.fee)}</p>
                    </div>
                    <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <Label className="text-sm">Net Amount</Label>
                      </div>
                      <p className="text-2xl font-bold text-green-900 dark:text-green-100">{formatCurrency(selectedPayout.netAmount)}</p>
                    </div>
                  </div>
                </div>

                {/* Recipient Details */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Recipient Information</h3>
                  <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border">
                    <div className="flex items-center gap-2">
                      {selectedPayout.recipient.type === 'mobile_money' ? (
                        <Smartphone className="h-5 w-5 text-blue-600" />
                      ) : (
                        <Building2 className="h-5 w-5 text-blue-600" />
                      )}
                      <Badge variant="outline">
                        {selectedPayout.recipient.type === 'mobile_money' ? 'Mobile Money' : 'Bank Account'}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <Label className="text-xs text-muted-foreground">Account Name</Label>
                        <p className="font-medium">{selectedPayout.recipient.accountName}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Account Number</Label>
                        <p className="font-medium">{selectedPayout.recipient.accountNumber}</p>
                      </div>
                      {selectedPayout.recipient.type === 'bank' && (
                        <>
                          <div>
                            <Label className="text-xs text-muted-foreground">Bank Name</Label>
                            <p className="font-medium">{selectedPayout.recipient.bankName}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Bank Code</Label>
                            <p className="font-medium">{selectedPayout.recipient.bankCode}</p>
                          </div>
                        </>
                      )}
                      {selectedPayout.recipient.type === 'mobile_money' && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Provider</Label>
                          <p className="font-medium">{selectedPayout.recipient.mobileProvider}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Paystack Details */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Paystack Transaction</h3>
                  <div className="space-y-2 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border text-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Transfer Code</Label>
                        <p className="font-mono font-medium">{selectedPayout.paystack.transferCode || 'N/A'}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Reference</Label>
                        <p className="font-mono font-medium">{selectedPayout.paystack.reference}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Domain</Label>
                        <p className="font-medium uppercase">{selectedPayout.paystack.domain}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Recipient Code</Label>
                        <p className="font-mono font-medium">{selectedPayout.recipient.recipientCode}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Merchant & Transaction Details */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Transaction Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border">
                      <Label className="text-xs text-muted-foreground">Merchant</Label>
                      <p className="font-medium">{selectedPayout.merchantName}</p>
                      <p className="text-xs text-muted-foreground font-mono">{selectedPayout.merchantId}</p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border">
                      <Label className="text-xs text-muted-foreground">Payout Type</Label>
                      <Badge className={getTypeBadgeColor(selectedPayout.type)}>
                        {selectedPayout.type.toUpperCase()}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">Initiated by: {selectedPayout.initiatedBy}</p>
                    </div>
                    {selectedPayout.settlementId && (
                      <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border">
                        <Label className="text-xs text-muted-foreground">Settlement ID</Label>
                        <p className="font-mono text-xs">{selectedPayout.settlementId}</p>
                      </div>
                    )}
                    {selectedPayout.description && (
                      <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border">
                        <Label className="text-xs text-muted-foreground">Description</Label>
                        <p className="text-xs">{selectedPayout.description}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Timeline */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Timeline</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border">
                      <Calendar className="h-4 w-4 text-slate-600" />
                      <div>
                        <p className="text-sm font-medium">Created</p>
                        <p className="text-xs text-muted-foreground">{formatDate(selectedPayout.createdAt)}</p>
                      </div>
                    </div>
                    {selectedPayout.processedAt && (
                      <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border">
                        <Send className="h-4 w-4 text-blue-600" />
                        <div>
                          <p className="text-sm font-medium">Sent to Paystack</p>
                          <p className="text-xs text-muted-foreground">{formatDate(selectedPayout.processedAt)}</p>
                        </div>
                      </div>
                    )}
                    {selectedPayout.completedAt && (
                      <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <div>
                          <p className="text-sm font-medium text-green-900 dark:text-green-100">Completed</p>
                          <p className="text-xs text-muted-foreground">{formatDate(selectedPayout.completedAt)}</p>
                        </div>
                      </div>
                    )}
                    {selectedPayout.failedAt && (
                      <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900">
                        <XCircle className="h-4 w-4 text-red-600" />
                        <div>
                          <p className="text-sm font-medium text-red-900 dark:text-red-100">Failed</p>
                          <p className="text-xs text-muted-foreground">{formatDate(selectedPayout.failedAt)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Process Manual Payout Modal */}
      {showProcessModal && (
        <ProcessManualPayoutModal
          merchants={merchants}
          onClose={() => {
            setShowProcessModal(false);
            setProcessingError('');
          }}
          onSubmit={handleProcessManualPayout}
          processing={processingPayout}
          error={processingError}
        />
      )}
    </div>
  );
}

// ============================================================================
// Process Manual Payout Modal Component
// ============================================================================

interface ProcessManualPayoutModalProps {
  merchants: Merchant[];
  onClose: () => void;
  onSubmit: (merchantId: string, amount?: number, description?: string) => void;
  processing: boolean;
  error: string;
}

function ProcessManualPayoutModal({
  merchants,
  onClose,
  onSubmit,
  processing,
  error,
}: ProcessManualPayoutModalProps) {
  const [merchantId, setMerchantId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(
      merchantId,
      amount ? parseFloat(amount) : undefined,
      description || undefined
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg max-w-lg w-full">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Process Manual Payout
            </CardTitle>
            <CardDescription>
              Initiate a manual payout to a merchant. Leave amount empty to process full available balance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="merchant">Merchant *</Label>
                <select
                  id="merchant"
                  value={merchantId}
                  onChange={(e) => setMerchantId(e.target.value)}
                  required
                  disabled={processing}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select a merchant</option>
                  {merchants.map((m: any) => (
                    <option key={m.id} value={m.id}>
                      {m.businessName || m.tradingName || m.id}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount (GHS)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Leave empty to process full balance"
                  disabled={processing}
                />
                <p className="text-xs text-muted-foreground">
                  Optional: Specify amount to pay out. If left empty, the full available balance will be processed.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Manual payout from admin dashboard"
                  disabled={processing}
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={processing}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={processing || !merchantId}>
                  {processing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Process Payout
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
