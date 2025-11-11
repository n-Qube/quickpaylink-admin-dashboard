/**
 * Risk Management Page
 *
 * Comprehensive merchant risk oversight and KYC management.
 * Features:
 * - View merchant risk scores and levels
 * - Update risk assessments
 * - Configure transaction limits
 * - Review KYC documents
 * - Add internal notes
 * - Manage risk flags and tags
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertTriangle,
  Shield,
  Search,
  Filter,
  Eye,
  Edit,
  FileText,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  Activity,
  BarChart3,
  Info,
  Lightbulb,
  MessageSquare,
  Plus,
  User,
  Trash2
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
import type { Merchant } from '@/types/database';
import { calculateRiskScore, getRiskScoreColor, getRiskScoreBg, type RiskScoreBreakdown } from '@/utils/riskScoring';

interface RiskMetrics {
  totalMerchants: number;
  highRisk: number;
  mediumRisk: number;
  lowRisk: number;
  pendingKYC: number;
  flaggedMerchants: number;
}

type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
type KYCStatus = 'not_started' | 'pending' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'expired';

export default function RiskManagement() {
  const { admin } = useAuth();
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [filteredMerchants, setFilteredMerchants] = useState<Merchant[]>([]);
  const [metrics, setMetrics] = useState<RiskMetrics>({
    totalMerchants: 0,
    highRisk: 0,
    mediumRisk: 0,
    lowRisk: 0,
    pendingKYC: 0,
    flaggedMerchants: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'all'>('all');
  const [kycFilter, setKycFilter] = useState<KYCStatus | 'all'>('all');
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingLimits, setEditingLimits] = useState(false);
  const [riskScoreBreakdown, setRiskScoreBreakdown] = useState<RiskScoreBreakdown | null>(null);
  const [newLimits, setNewLimits] = useState({
    dailyLimit: 0,
    monthlyLimit: 0,
    maxInvoiceAmount: 0,
  });
  const [addingNote, setAddingNote] = useState(false);
  const [newNote, setNewNote] = useState({
    note: '',
    category: 'general',
    visibility: 'internal',
  });

  useEffect(() => {
    loadMerchantsAndMetrics();
  }, []);

  useEffect(() => {
    filterMerchants();
  }, [merchants, searchTerm, riskFilter, kycFilter]);

  const loadMerchantsAndMetrics = async () => {
    try {
      setLoading(true);
      const merchantsRef = collection(db, 'merchants');
      const merchantsSnap = await getDocs(merchantsRef);

      const merchantsList: Merchant[] = [];
      merchantsSnap.forEach((doc) => {
        merchantsList.push({ merchantId: doc.id, ...doc.data() } as Merchant);
      });

      setMerchants(merchantsList);

      // Calculate metrics
      const totalMerchants = merchantsList.length;
      const highRisk = merchantsList.filter(m => m.adminMetadata?.riskAssessment?.level === 'high' || m.adminMetadata?.riskAssessment?.level === 'critical').length;
      const mediumRisk = merchantsList.filter(m => m.adminMetadata?.riskAssessment?.level === 'medium').length;
      const lowRisk = merchantsList.filter(m => m.adminMetadata?.riskAssessment?.level === 'low' || !m.adminMetadata?.riskAssessment?.level).length;
      const pendingKYC = merchantsList.filter(m => m.kyc?.status === 'pending' || m.kyc?.status === 'submitted' || m.kyc?.status === 'under_review').length;
      const flaggedMerchants = merchantsList.filter(m => m.adminMetadata?.flags && m.adminMetadata.flags.length > 0).length;

      setMetrics({
        totalMerchants,
        highRisk,
        mediumRisk,
        lowRisk,
        pendingKYC,
        flaggedMerchants,
      });
    } catch (error) {
      console.error('Error loading merchants:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterMerchants = () => {
    let filtered = [...merchants];

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(m =>
        m.businessName.toLowerCase().includes(search) ||
        m.email.toLowerCase().includes(search) ||
        m.merchantId.toLowerCase().includes(search)
      );
    }

    // Risk level filter
    if (riskFilter !== 'all') {
      filtered = filtered.filter(m =>
        m.adminMetadata?.riskAssessment?.level === riskFilter
      );
    }

    // KYC status filter
    if (kycFilter !== 'all') {
      filtered = filtered.filter(m => m.kyc?.status === kycFilter);
    }

    setFilteredMerchants(filtered);
  };

  const getRiskBadgeColor = (level?: RiskLevel) => {
    switch (level) {
      case 'critical':
        return 'bg-red-600 text-white';
      case 'high':
        return 'bg-orange-500 text-white';
      case 'medium':
        return 'bg-yellow-500 text-white';
      case 'low':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-400 text-white';
    }
  };

  const getKYCBadgeColor = (status?: KYCStatus) => {
    switch (status) {
      case 'approved':
        return 'bg-green-500 text-white';
      case 'rejected':
        return 'bg-red-500 text-white';
      case 'under_review':
      case 'submitted':
        return 'bg-blue-500 text-white';
      case 'pending':
        return 'bg-yellow-500 text-white';
      case 'expired':
        return 'bg-gray-500 text-white';
      default:
        return 'bg-gray-400 text-white';
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

  const handleViewDetails = (merchant: Merchant) => {
    setSelectedMerchant(merchant);
    setShowDetailModal(true);
    setEditingLimits(false);

    // Calculate risk score automatically
    const scoreBreakdown = calculateRiskScore(merchant);
    setRiskScoreBreakdown(scoreBreakdown);

    // Initialize limits with current values
    if (merchant.adminMetadata?.transactionLimits) {
      setNewLimits({
        dailyLimit: merchant.adminMetadata.transactionLimits.dailyLimit,
        monthlyLimit: merchant.adminMetadata.transactionLimits.monthlyLimit,
        maxInvoiceAmount: merchant.adminMetadata.transactionLimits.maxInvoiceAmount,
      });
    } else {
      setNewLimits({
        dailyLimit: 50000,
        monthlyLimit: 1000000,
        maxInvoiceAmount: 10000,
      });
    }
  };

  const handleUpdateRiskLevel = async (merchantId: string, newLevel: RiskLevel) => {
    try {
      const merchantRef = doc(db, 'merchants', merchantId);
      await updateDoc(merchantRef, {
        'adminMetadata.riskAssessment.level': newLevel,
        'adminMetadata.riskAssessment.lastReviewDate': Timestamp.now(),
        'adminMetadata.riskAssessment.reviewedBy': admin?.adminId,
        updatedAt: Timestamp.now(),
        updatedBy: admin?.adminId,
      });

      // Reload data
      await loadMerchantsAndMetrics();

      console.log('Risk level updated successfully');
    } catch (error) {
      console.error('Error updating risk level:', error);
    }
  };

  const handleUpdateTransactionLimits = async () => {
    if (!selectedMerchant) return;

    try {
      const merchantRef = doc(db, 'merchants', selectedMerchant.merchantId);
      await updateDoc(merchantRef, {
        'adminMetadata.transactionLimits': newLimits,
        updatedAt: Timestamp.now(),
        updatedBy: admin?.adminId,
      });

      // Reload data
      await loadMerchantsAndMetrics();
      setEditingLimits(false);

      console.log('Transaction limits updated successfully');
    } catch (error) {
      console.error('Error updating transaction limits:', error);
    }
  };

  const handleAddNote = async () => {
    if (!selectedMerchant || !newNote.note.trim()) return;

    try {
      const merchantRef = doc(db, 'merchants', selectedMerchant.merchantId);
      const existingNotes = selectedMerchant.adminMetadata?.internalNotes || [];

      const note = {
        note: newNote.note,
        category: newNote.category,
        visibility: newNote.visibility,
        createdBy: admin?.profile?.displayName || admin?.email || 'Admin',
        createdAt: Timestamp.now(),
      };

      await updateDoc(merchantRef, {
        'adminMetadata.internalNotes': [...existingNotes, note],
        updatedAt: Timestamp.now(),
        updatedBy: admin?.adminId,
      });

      // Reload data
      await loadMerchantsAndMetrics();
      setAddingNote(false);
      setNewNote({ note: '', category: 'general', visibility: 'internal' });

      console.log('Note added successfully');
    } catch (error) {
      console.error('Error adding note:', error);
    }
  };

  const handleDeleteNote = async (noteIndex: number) => {
    if (!selectedMerchant) return;

    try {
      const merchantRef = doc(db, 'merchants', selectedMerchant.merchantId);
      const existingNotes = selectedMerchant.adminMetadata?.internalNotes || [];
      const updatedNotes = existingNotes.filter((_, idx) => idx !== noteIndex);

      await updateDoc(merchantRef, {
        'adminMetadata.internalNotes': updatedNotes,
        updatedAt: Timestamp.now(),
        updatedBy: admin?.adminId,
      });

      // Reload data
      await loadMerchantsAndMetrics();

      console.log('Note deleted successfully');
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Risk Management</h1>
        <p className="text-muted-foreground">
          Monitor merchant risk levels, KYC status, and compliance
        </p>
      </div>

      {/* Risk Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Merchants</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-2xl font-bold text-muted-foreground">...</div>
            ) : (
              <div className="text-2xl font-bold">{metrics.totalMerchants}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-2xl font-bold text-muted-foreground">...</div>
            ) : (
              <div className="text-2xl font-bold text-red-600">{metrics.highRisk}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Medium Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-2xl font-bold text-muted-foreground">...</div>
            ) : (
              <div className="text-2xl font-bold text-yellow-600">{metrics.mediumRisk}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Risk</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-2xl font-bold text-muted-foreground">...</div>
            ) : (
              <div className="text-2xl font-bold text-green-600">{metrics.lowRisk}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending KYC</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-2xl font-bold text-muted-foreground">...</div>
            ) : (
              <div className="text-2xl font-bold text-blue-600">{metrics.pendingKYC}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Flagged</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-2xl font-bold text-muted-foreground">...</div>
            ) : (
              <div className="text-2xl font-bold text-orange-600">{metrics.flaggedMerchants}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Merchants</CardTitle>
          <CardDescription>Search and filter by risk level, KYC status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Business name, email, ID..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="riskFilter">Risk Level</Label>
              <select
                id="riskFilter"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value as RiskLevel | 'all')}
              >
                <option value="all">All Risk Levels</option>
                <option value="low">Low Risk</option>
                <option value="medium">Medium Risk</option>
                <option value="high">High Risk</option>
                <option value="critical">Critical Risk</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="kycFilter">KYC Status</Label>
              <select
                id="kycFilter"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={kycFilter}
                onChange={(e) => setKycFilter(e.target.value as KYCStatus | 'all')}
              >
                <option value="all">All KYC Status</option>
                <option value="not_started">Not Started</option>
                <option value="pending">Pending</option>
                <option value="submitted">Submitted</option>
                <option value="under_review">Under Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Merchants List */}
      <Card>
        <CardHeader>
          <CardTitle>Merchants ({filteredMerchants.length})</CardTitle>
          <CardDescription>View and manage merchant risk profiles</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading merchants...</p>
            </div>
          ) : filteredMerchants.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No merchants found matching your filters</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMerchants.map((merchant) => (
                <div
                  key={merchant.merchantId}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{merchant.businessName}</h4>
                      <Badge className={getRiskBadgeColor(merchant.adminMetadata?.riskAssessment?.level)}>
                        {merchant.adminMetadata?.riskAssessment?.level || 'unassessed'}
                      </Badge>
                      <Badge className={getKYCBadgeColor(merchant.kyc?.status)}>
                        KYC: {merchant.kyc?.status || 'not_started'}
                      </Badge>
                      {merchant.adminMetadata?.flags && merchant.adminMetadata.flags.length > 0 && (
                        <Badge variant="outline" className="border-orange-500 text-orange-600">
                          {merchant.adminMetadata.flags.length} flags
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{merchant.email}</span>
                      <span>•</span>
                      <span>Score: {merchant.adminMetadata?.riskAssessment?.score || 'N/A'}</span>
                      {merchant.adminMetadata?.transactionLimits && (
                        <>
                          <span>•</span>
                          <span>Daily Limit: {formatCurrency(merchant.adminMetadata.transactionLimits.dailyLimit)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(merchant)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal (Simplified for now) */}
      {showDetailModal && selectedMerchant && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{selectedMerchant.businessName}</CardTitle>
                    <CardDescription>{selectedMerchant.email}</CardDescription>
                  </div>
                  <Button variant="outline" onClick={() => setShowDetailModal(false)}>
                    Close
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="risk" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="risk">Risk Assessment</TabsTrigger>
                    <TabsTrigger value="kyc">KYC Documents</TabsTrigger>
                    <TabsTrigger value="limits">Transaction Limits</TabsTrigger>
                    <TabsTrigger value="notes">Internal Notes</TabsTrigger>
                  </TabsList>

                  <TabsContent value="risk" className="space-y-6">
                    {riskScoreBreakdown ? (
                      <>
                        {/* Overall Risk Score Card */}
                        <div className={`p-6 rounded-lg border-2 ${
                          riskScoreBreakdown.level === 'critical'
                            ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900'
                            : riskScoreBreakdown.level === 'high'
                            ? 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900'
                            : riskScoreBreakdown.level === 'medium'
                            ? 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900'
                            : 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900'
                        }`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-3">
                                <Shield className={`h-8 w-8 ${
                                  riskScoreBreakdown.level === 'critical' ? 'text-red-600'
                                  : riskScoreBreakdown.level === 'high' ? 'text-orange-600'
                                  : riskScoreBreakdown.level === 'medium' ? 'text-yellow-600'
                                  : 'text-green-600'
                                }`} />
                                <div>
                                  <h3 className="text-lg font-semibold">Risk Assessment Score</h3>
                                  <Badge className={getRiskBadgeColor(riskScoreBreakdown.level)}>
                                    {riskScoreBreakdown.level.toUpperCase()} RISK
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`text-5xl font-bold ${
                                riskScoreBreakdown.level === 'critical' ? 'text-red-600'
                                : riskScoreBreakdown.level === 'high' ? 'text-orange-600'
                                : riskScoreBreakdown.level === 'medium' ? 'text-yellow-600'
                                : 'text-green-600'
                              }`}>
                                {riskScoreBreakdown.totalScore}
                              </div>
                              <p className="text-sm text-muted-foreground">out of 100</p>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="mt-4">
                            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all ${
                                  riskScoreBreakdown.level === 'critical' ? 'bg-red-600'
                                  : riskScoreBreakdown.level === 'high' ? 'bg-orange-600'
                                  : riskScoreBreakdown.level === 'medium' ? 'bg-yellow-600'
                                  : 'bg-green-600'
                                }`}
                                style={{ width: `${riskScoreBreakdown.totalScore}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground mt-1">
                              <span>0 (Low Risk)</span>
                              <span>25</span>
                              <span>50</span>
                              <span>75</span>
                              <span>100 (Critical)</span>
                            </div>
                          </div>
                        </div>

                        {/* Score Components Breakdown */}
                        <div>
                          <div className="flex items-center gap-2 mb-4">
                            <BarChart3 className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                            <h3 className="text-lg font-semibold">Score Components</h3>
                          </div>
                          <div className="space-y-4">
                            {/* KYC Score */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-blue-600" />
                                  <span className="font-medium">KYC Compliance</span>
                                  <Badge variant="outline" className="text-xs">30% weight</Badge>
                                </div>
                                <span className="text-lg font-bold">{riskScoreBreakdown.components.kycScore}/100</span>
                              </div>
                              <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-600 transition-all"
                                  style={{ width: `${riskScoreBreakdown.components.kycScore}%` }}
                                />
                              </div>
                            </div>

                            {/* Business Maturity Score */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <TrendingUp className="h-4 w-4 text-purple-600" />
                                  <span className="font-medium">Business Maturity</span>
                                  <Badge variant="outline" className="text-xs">20% weight</Badge>
                                </div>
                                <span className="text-lg font-bold">{riskScoreBreakdown.components.businessMaturityScore}/100</span>
                              </div>
                              <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-purple-600 transition-all"
                                  style={{ width: `${riskScoreBreakdown.components.businessMaturityScore}%` }}
                                />
                              </div>
                            </div>

                            {/* Transaction Score */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Activity className="h-4 w-4 text-indigo-600" />
                                  <span className="font-medium">Transaction Patterns</span>
                                  <Badge variant="outline" className="text-xs">25% weight</Badge>
                                </div>
                                <span className="text-lg font-bold">{riskScoreBreakdown.components.transactionScore}/100</span>
                              </div>
                              <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-indigo-600 transition-all"
                                  style={{ width: `${riskScoreBreakdown.components.transactionScore}%` }}
                                />
                              </div>
                            </div>

                            {/* Compliance Score */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <CheckCircle className="h-4 w-4 text-teal-600" />
                                  <span className="font-medium">Compliance Status</span>
                                  <Badge variant="outline" className="text-xs">15% weight</Badge>
                                </div>
                                <span className="text-lg font-bold">{riskScoreBreakdown.components.complianceScore}/100</span>
                              </div>
                              <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-teal-600 transition-all"
                                  style={{ width: `${riskScoreBreakdown.components.complianceScore}%` }}
                                />
                              </div>
                            </div>

                            {/* Flags Score */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                                  <span className="font-medium">Risk Flags</span>
                                  <Badge variant="outline" className="text-xs">10% weight</Badge>
                                </div>
                                <span className="text-lg font-bold">{riskScoreBreakdown.components.flagsScore}/100</span>
                              </div>
                              <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-amber-600 transition-all"
                                  style={{ width: `${riskScoreBreakdown.components.flagsScore}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Risk Factors */}
                        {riskScoreBreakdown.factors.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-4">
                              <AlertCircle className="h-5 w-5 text-orange-600" />
                              <h3 className="text-lg font-semibold">Identified Risk Factors</h3>
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                              {riskScoreBreakdown.factors.map((factor, idx) => (
                                <div key={idx} className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 rounded-lg">
                                  <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                                  <span className="text-sm">{factor}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Recommendations */}
                        {riskScoreBreakdown.recommendations.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-4">
                              <Lightbulb className="h-5 w-5 text-blue-600" />
                              <h3 className="text-lg font-semibold">Recommended Actions</h3>
                            </div>
                            <div className="space-y-2">
                              {riskScoreBreakdown.recommendations.map((recommendation, idx) => (
                                <div key={idx} className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
                                  <div className="flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 font-semibold text-xs flex-shrink-0">
                                    {idx + 1}
                                  </div>
                                  <span className="text-sm">{recommendation}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Admin Risk Flags */}
                        {selectedMerchant.adminMetadata?.flags && selectedMerchant.adminMetadata.flags.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-4">
                              <AlertCircle className="h-5 w-5 text-red-600" />
                              <h3 className="text-lg font-semibold">Admin Risk Flags</h3>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {selectedMerchant.adminMetadata.flags.map((flag, idx) => (
                                <Badge key={idx} variant="outline" className="border-red-500 text-red-600 dark:border-red-700 dark:text-red-400">
                                  {flag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Manual Risk Override */}
                        <div className="pt-4 border-t">
                          <div className="flex items-center gap-2 mb-3">
                            <Info className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                            <h3 className="text-lg font-semibold">Manual Risk Override</h3>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border">
                            <Label htmlFor="updateRisk" className="text-sm mb-2 block">
                              Override Calculated Risk Level (Optional)
                            </Label>
                            <select
                              id="updateRisk"
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                              defaultValue={selectedMerchant.adminMetadata?.riskAssessment?.level || riskScoreBreakdown.level}
                              onChange={(e) => handleUpdateRiskLevel(selectedMerchant.merchantId, e.target.value as RiskLevel)}
                            >
                              <option value="low">Low Risk</option>
                              <option value="medium">Medium Risk</option>
                              <option value="high">High Risk</option>
                              <option value="critical">Critical Risk</option>
                            </select>
                            <p className="text-xs text-muted-foreground mt-2">
                              Note: Manual overrides should be documented in Internal Notes with justification.
                            </p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <Activity className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                        <p className="text-muted-foreground">Loading risk assessment...</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="kyc" className="space-y-6">
                    {/* KYC Status Overview */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-4 w-4 text-blue-600" />
                          <Label className="text-sm">KYC Status</Label>
                        </div>
                        <Badge className={getKYCBadgeColor(selectedMerchant.kyc?.status)}>
                          {selectedMerchant.kyc?.status?.replace('_', ' ').toUpperCase() || 'NOT STARTED'}
                        </Badge>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <Label className="text-sm">Documents Submitted</Label>
                        </div>
                        <p className="text-2xl font-bold">
                          {selectedMerchant.kyc?.documentsSubmitted || 0}
                          <span className="text-sm font-normal text-muted-foreground"> / 6</span>
                        </p>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="h-4 w-4 text-teal-600" />
                          <Label className="text-sm">Documents Verified</Label>
                        </div>
                        <p className="text-2xl font-bold">
                          {selectedMerchant.kyc?.documentsVerified || 0}
                          <span className="text-sm font-normal text-muted-foreground"> / {selectedMerchant.kyc?.documentsSubmitted || 0}</span>
                        </p>
                      </div>
                    </div>

                    {/* KYC Submission Date */}
                    {selectedMerchant.kyc?.submittedAt && (
                      <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
                        <Clock className="h-4 w-4 text-blue-600" />
                        <span className="text-sm">
                          KYC submitted on {new Date(selectedMerchant.kyc.submittedAt.seconds * 1000).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                    )}

                    {/* Required Documents Checklist */}
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <FileText className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                        <h3 className="text-lg font-semibold">Required Documents</h3>
                      </div>
                      <div className="space-y-3">
                        {[
                          { name: 'Business Registration Certificate', required: true },
                          { name: 'Tax Identification Certificate', required: true },
                          { name: 'Owner ID Card', required: true },
                          { name: 'Proof of Business Address', required: true },
                          { name: 'Bank Statement (Last 3 months)', required: true },
                          { name: 'Operating License', required: false }
                        ].map((requiredDoc, idx) => {
                          const submitted = selectedMerchant.kyc?.documents?.find(
                            d => d.type?.toLowerCase().includes(requiredDoc.name.toLowerCase().split(' ')[0])
                          );

                          return (
                            <div key={idx} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                              <div className="flex items-center gap-3 flex-1">
                                {submitted ? (
                                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                                ) : (
                                  <XCircle className="h-5 w-5 text-slate-400 flex-shrink-0" />
                                )}
                                <div className="flex-1">
                                  <p className="font-medium">{requiredDoc.name}</p>
                                  {submitted && (
                                    <p className="text-xs text-muted-foreground">
                                      Uploaded: {submitted.uploadedAt ? new Date(submitted.uploadedAt.seconds * 1000).toLocaleDateString() : 'Unknown'}
                                    </p>
                                  )}
                                  {!requiredDoc.required && (
                                    <p className="text-xs text-muted-foreground">(Optional)</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {submitted ? (
                                  <>
                                    <Badge variant={submitted.verified ? 'default' : 'secondary'}>
                                      {submitted.verified ? (
                                        <><CheckCircle className="h-3 w-3 mr-1" /> Verified</>
                                      ) : (
                                        <><Clock className="h-3 w-3 mr-1" /> Pending</>
                                      )}
                                    </Badge>
                                    {submitted.url && (
                                      <Button size="sm" variant="outline" onClick={() => window.open(submitted.url, '_blank')}>
                                        <Eye className="h-3 w-3 mr-1" />
                                        View
                                      </Button>
                                    )}
                                  </>
                                ) : (
                                  <Badge variant="outline" className="text-slate-500">
                                    Not Submitted
                                  </Badge>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Empty State */}
                    {(!selectedMerchant.kyc?.documents || selectedMerchant.kyc.documents.length === 0) && (
                      <div className="text-center py-8 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-dashed">
                        <FileText className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                        <h3 className="text-lg font-medium mb-2">No KYC Documents Submitted</h3>
                        <p className="text-sm text-muted-foreground">
                          This merchant has not submitted any KYC documents yet.
                        </p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="limits" className="space-y-6">
                    {editingLimits ? (
                      <div className="space-y-6">
                        <div className="flex items-center gap-2 mb-2">
                          <Edit className="h-5 w-5 text-blue-600" />
                          <h3 className="text-lg font-semibold">Edit Transaction Limits</h3>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border space-y-3">
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-blue-600" />
                              <Label htmlFor="dailyLimit" className="font-medium">Daily Transaction Limit</Label>
                            </div>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">GHS</span>
                              <Input
                                id="dailyLimit"
                                type="number"
                                className="pl-14"
                                value={newLimits.dailyLimit}
                                onChange={(e) => setNewLimits({ ...newLimits, dailyLimit: parseFloat(e.target.value) || 0 })}
                                placeholder="0.00"
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">Maximum amount that can be transacted per day</p>
                          </div>

                          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border space-y-3">
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-green-600" />
                              <Label htmlFor="monthlyLimit" className="font-medium">Monthly Transaction Limit</Label>
                            </div>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">GHS</span>
                              <Input
                                id="monthlyLimit"
                                type="number"
                                className="pl-14"
                                value={newLimits.monthlyLimit}
                                onChange={(e) => setNewLimits({ ...newLimits, monthlyLimit: parseFloat(e.target.value) || 0 })}
                                placeholder="0.00"
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">Maximum amount that can be transacted per month</p>
                          </div>

                          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border space-y-3">
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-purple-600" />
                              <Label htmlFor="maxInvoice" className="font-medium">Maximum Invoice Amount</Label>
                            </div>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">GHS</span>
                              <Input
                                id="maxInvoice"
                                type="number"
                                className="pl-14"
                                value={newLimits.maxInvoiceAmount}
                                onChange={(e) => setNewLimits({ ...newLimits, maxInvoiceAmount: parseFloat(e.target.value) || 0 })}
                                placeholder="0.00"
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">Maximum amount for a single invoice/transaction</p>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-4 border-t">
                          <Button onClick={handleUpdateTransactionLimits} className="flex-1">
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Save Limits
                          </Button>
                          <Button variant="outline" onClick={() => setEditingLimits(false)} className="flex-1">
                            <XCircle className="h-4 w-4 mr-2" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {selectedMerchant.adminMetadata?.transactionLimits ? (
                          <div className="space-y-6">
                            {/* Current Limits Display */}
                            <div>
                              <div className="flex items-center gap-2 mb-4">
                                <DollarSign className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                                <h3 className="text-lg font-semibold">Current Transaction Limits</h3>
                              </div>
                              <div className="grid grid-cols-3 gap-4">
                                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
                                  <div className="flex items-center gap-2 mb-2">
                                    <DollarSign className="h-4 w-4 text-blue-600" />
                                    <Label className="text-sm">Daily Limit</Label>
                                  </div>
                                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                                    {formatCurrency(selectedMerchant.adminMetadata.transactionLimits.dailyLimit)}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">Per day</p>
                                </div>

                                <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                                  <div className="flex items-center gap-2 mb-2">
                                    <DollarSign className="h-4 w-4 text-green-600" />
                                    <Label className="text-sm">Monthly Limit</Label>
                                  </div>
                                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                                    {formatCurrency(selectedMerchant.adminMetadata.transactionLimits.monthlyLimit)}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">Per month</p>
                                </div>

                                <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-900">
                                  <div className="flex items-center gap-2 mb-2">
                                    <DollarSign className="h-4 w-4 text-purple-600" />
                                    <Label className="text-sm">Max Invoice</Label>
                                  </div>
                                  <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                                    {formatCurrency(selectedMerchant.adminMetadata.transactionLimits.maxInvoiceAmount)}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">Per transaction</p>
                                </div>
                              </div>
                            </div>

                            {/* Usage Statistics (if available) */}
                            {selectedMerchant.financials && (
                              <div>
                                <div className="flex items-center gap-2 mb-4">
                                  <Activity className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                                  <h3 className="text-lg font-semibold">Current Usage</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border">
                                    <Label className="text-sm mb-2 block">Monthly Volume</Label>
                                    <p className="text-xl font-bold">
                                      {formatCurrency(selectedMerchant.financials.monthlyVolume || 0)}
                                    </p>
                                    {selectedMerchant.adminMetadata.transactionLimits.monthlyLimit > 0 && (
                                      <div className="mt-3">
                                        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                          <div
                                            className="h-full bg-blue-600 transition-all"
                                            style={{
                                              width: `${Math.min(100, ((selectedMerchant.financials.monthlyVolume || 0) / selectedMerchant.adminMetadata.transactionLimits.monthlyLimit) * 100)}%`
                                            }}
                                          />
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                          {Math.round(((selectedMerchant.financials.monthlyVolume || 0) / selectedMerchant.adminMetadata.transactionLimits.monthlyLimit) * 100)}% of monthly limit
                                        </p>
                                      </div>
                                    )}
                                  </div>

                                  <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border">
                                    <Label className="text-sm mb-2 block">Total Transactions</Label>
                                    <p className="text-xl font-bold">
                                      {selectedMerchant.financials.totalTransactions?.toLocaleString() || 0}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">All time</p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Recommended Limits based on Risk */}
                            {riskScoreBreakdown && (
                              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg">
                                <div className="flex items-center gap-2 mb-3">
                                  <Info className="h-4 w-4 text-amber-600" />
                                  <h4 className="font-semibold text-sm">Recommended Limits for {riskScoreBreakdown.level.toUpperCase()} Risk</h4>
                                </div>
                                <div className="grid grid-cols-3 gap-3 text-sm">
                                  <div>
                                    <p className="text-xs text-muted-foreground">Daily</p>
                                    <p className="font-semibold">
                                      {riskScoreBreakdown.level === 'low' ? 'GHS 100,000' :
                                       riskScoreBreakdown.level === 'medium' ? 'GHS 50,000' :
                                       riskScoreBreakdown.level === 'high' ? 'GHS 20,000' : 'GHS 5,000'}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Monthly</p>
                                    <p className="font-semibold">
                                      {riskScoreBreakdown.level === 'low' ? 'GHS 2,000,000' :
                                       riskScoreBreakdown.level === 'medium' ? 'GHS 1,000,000' :
                                       riskScoreBreakdown.level === 'high' ? 'GHS 400,000' : 'GHS 100,000'}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Max Invoice</p>
                                    <p className="font-semibold">
                                      {riskScoreBreakdown.level === 'low' ? 'GHS 20,000' :
                                       riskScoreBreakdown.level === 'medium' ? 'GHS 10,000' :
                                       riskScoreBreakdown.level === 'high' ? 'GHS 5,000' : 'GHS 2,000'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                            <Button onClick={() => setEditingLimits(true)} className="w-full">
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Transaction Limits
                            </Button>
                          </div>
                        ) : (
                          <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-dashed">
                            <DollarSign className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                            <h3 className="text-lg font-medium mb-2">No Transaction Limits Configured</h3>
                            <p className="text-sm text-muted-foreground mb-6">
                              Set transaction limits to control merchant spending and reduce risk
                            </p>
                            {riskScoreBreakdown && (
                              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg max-w-md mx-auto">
                                <p className="text-sm font-medium mb-2">Recommended limits for {riskScoreBreakdown.level.toUpperCase()} risk:</p>
                                <div className="grid grid-cols-3 gap-3 text-xs">
                                  <div>
                                    <p className="text-muted-foreground">Daily</p>
                                    <p className="font-semibold">
                                      {riskScoreBreakdown.level === 'low' ? 'GHS 100K' :
                                       riskScoreBreakdown.level === 'medium' ? 'GHS 50K' :
                                       riskScoreBreakdown.level === 'high' ? 'GHS 20K' : 'GHS 5K'}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Monthly</p>
                                    <p className="font-semibold">
                                      {riskScoreBreakdown.level === 'low' ? 'GHS 2M' :
                                       riskScoreBreakdown.level === 'medium' ? 'GHS 1M' :
                                       riskScoreBreakdown.level === 'high' ? 'GHS 400K' : 'GHS 100K'}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Invoice</p>
                                    <p className="font-semibold">
                                      {riskScoreBreakdown.level === 'low' ? 'GHS 20K' :
                                       riskScoreBreakdown.level === 'medium' ? 'GHS 10K' :
                                       riskScoreBreakdown.level === 'high' ? 'GHS 5K' : 'GHS 2K'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                            <Button onClick={() => setEditingLimits(true)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Configure Limits
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </TabsContent>

                  <TabsContent value="notes" className="space-y-6">
                    {/* Add Note Form */}
                    {addingNote ? (
                      <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border">
                        <div className="flex items-center gap-2 mb-2">
                          <MessageSquare className="h-5 w-5 text-blue-600" />
                          <h3 className="text-lg font-semibold">Add New Note</h3>
                        </div>

                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="noteText">Note</Label>
                            <textarea
                              id="noteText"
                              className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              placeholder="Enter your note here..."
                              value={newNote.note}
                              onChange={(e) => setNewNote({ ...newNote, note: e.target.value })}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="noteCategory">Category</Label>
                              <select
                                id="noteCategory"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={newNote.category}
                                onChange={(e) => setNewNote({ ...newNote, category: e.target.value })}
                              >
                                <option value="general">General</option>
                                <option value="kyc">KYC Review</option>
                                <option value="risk">Risk Assessment</option>
                                <option value="compliance">Compliance</option>
                                <option value="support">Support</option>
                                <option value="fraud">Fraud Investigation</option>
                              </select>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="noteVisibility">Visibility</Label>
                              <select
                                id="noteVisibility"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={newNote.visibility}
                                onChange={(e) => setNewNote({ ...newNote, visibility: e.target.value })}
                              >
                                <option value="internal">Internal Only</option>
                                <option value="shared">Shared with Merchant</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Button onClick={handleAddNote} disabled={!newNote.note.trim()}>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Save Note
                          </Button>
                          <Button variant="outline" onClick={() => {
                            setAddingNote(false);
                            setNewNote({ note: '', category: 'general', visibility: 'internal' });
                          }}>
                            <XCircle className="h-4 w-4 mr-2" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button onClick={() => setAddingNote(true)} className="w-full">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Internal Note
                      </Button>
                    )}

                    {/* Existing Notes */}
                    {selectedMerchant.adminMetadata?.internalNotes && selectedMerchant.adminMetadata.internalNotes.length > 0 ? (
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <MessageSquare className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                          <h3 className="text-lg font-semibold">Notes History</h3>
                          <Badge variant="outline" className="ml-auto">
                            {selectedMerchant.adminMetadata.internalNotes.length} {selectedMerchant.adminMetadata.internalNotes.length === 1 ? 'note' : 'notes'}
                          </Badge>
                        </div>
                        <div className="space-y-3">
                          {selectedMerchant.adminMetadata.internalNotes
                            .slice()
                            .reverse()
                            .map((note, idx) => {
                              const originalIdx = selectedMerchant.adminMetadata!.internalNotes!.length - 1 - idx;
                              return (
                                <div
                                  key={idx}
                                  className="p-4 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                                >
                                  <div className="flex items-start justify-between gap-4 mb-3">
                                    <div className="flex items-center gap-2">
                                      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400">
                                        <User className="h-4 w-4" />
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium">{note.createdBy}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {note.createdAt ? new Date(note.createdAt.seconds * 1000).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          }) : 'Unknown'}
                                        </p>
                                      </div>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                                      onClick={() => {
                                        if (window.confirm('Are you sure you want to delete this note?')) {
                                          handleDeleteNote(originalIdx);
                                        }
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>

                                  <p className="text-sm mb-3 whitespace-pre-wrap">{note.note}</p>

                                  <div className="flex items-center gap-2">
                                    <Badge
                                      variant={note.visibility === 'internal' ? 'secondary' : 'outline'}
                                      className={note.visibility === 'internal' ? 'bg-slate-200 dark:bg-slate-800' : ''}
                                    >
                                      {note.visibility === 'internal' ? '🔒 Internal Only' : '👁️ Shared'}
                                    </Badge>
                                    {note.category && (
                                      <Badge variant="outline" className="capitalize">
                                        {note.category}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    ) : !addingNote && (
                      <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-dashed">
                        <MessageSquare className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                        <h3 className="text-lg font-medium mb-2">No Internal Notes</h3>
                        <p className="text-sm text-muted-foreground mb-6">
                          Add notes to track important information about this merchant
                        </p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
