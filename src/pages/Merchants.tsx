/**
 * Merchant Management Page
 *
 * Comprehensive merchant management with:
 * - Merchant onboarding and verification
 * - KYC document management
 * - Business information
 * - Status management (pending, active, suspended, rejected)
 * - Risk assessment
 * - Support tickets
 * - Admin notes
 */

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  where
} from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import {
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  Store,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  Shield,
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  Users,
  Filter,
  Download
} from 'lucide-react';
import MerchantWizard from '@/components/MerchantWizard';

// Types
interface Merchant {
  merchantId: string;
  businessName: string;
  tradingName?: string;
  businessType: string;
  registrationNumber: string;
  taxId: string;

  contactInfo: {
    email: string;
    phone: string;
    website?: string;
  };

  address: {
    street: string;
    city: string;
    region: string;
    country: string;
    postalCode: string;
  };

  bankDetails: {
    accountName: string;
    accountNumber: string;
    bankName: string;
    bankCode?: string;
    swiftCode?: string;
  };

  representatives: Array<{
    name: string;
    position: string;
    email: string;
    phone: string;
    idNumber: string;
  }>;

  kyc: {
    status: 'pending' | 'under_review' | 'approved' | 'rejected';
    verifiedAt?: any;
    verifiedBy?: string;
    rejectionReason?: string;
    documentsSubmitted: number;
    documentsVerified: number;
  };

  riskProfile: {
    level: 'low' | 'medium' | 'high' | 'critical';
    score: number;
    lastAssessment?: any;
    flags?: string[];
  };

  subscription: {
    planId: string;
    status: 'trial' | 'active' | 'suspended' | 'cancelled';
    startDate: any;
    expiryDate?: any;
  };

  financials: {
    monthlyVolume: number;
    totalTransactions: number;
    totalRevenue: number;
    currency: string;
  };

  status: 'pending' | 'active' | 'suspended' | 'rejected' | 'closed';
  onboardedAt?: any;
  onboardedBy?: string;
  lastActivityAt?: any;

  createdAt?: any;
  updatedAt?: any;
  createdBy?: string;
  updatedBy?: string;
}

export default function Merchants() {
  const { admin } = useAuth();
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [filteredMerchants, setFilteredMerchants] = useState<Merchant[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [kycFilter, setKycFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingMerchant, setEditingMerchant] = useState<Merchant | null>(null);
  const [viewingMerchant, setViewingMerchant] = useState<Merchant | null>(null);

  // Dynamic data loading states
  const [businessTypes, setBusinessTypes] = useState<any[]>([]);
  const [countries, setCountries] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');

  // Load merchants
  useEffect(() => {
    loadMerchants();
    loadBusinessTypes();
    loadCountries();
    loadCurrencies();
  }, []);

  // Load regions when country changes
  useEffect(() => {
    if (selectedCountry) {
      loadRegions(selectedCountry);
    } else {
      setRegions([]);
      setCities([]);
    }
  }, [selectedCountry]);

  // Load cities when region changes
  useEffect(() => {
    if (selectedCountry && selectedRegion) {
      loadCities(selectedCountry, selectedRegion);
    } else {
      setCities([]);
    }
  }, [selectedCountry, selectedRegion]);

  // Apply filters
  useEffect(() => {
    let filtered = merchants;

    // Search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.businessName.toLowerCase().includes(search) ||
          m.tradingName?.toLowerCase().includes(search) ||
          m.contactInfo.email.toLowerCase().includes(search) ||
          m.registrationNumber.toLowerCase().includes(search)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((m) => m.status === statusFilter);
    }

    // KYC filter
    if (kycFilter !== 'all') {
      filtered = filtered.filter((m) => m.kyc.status === kycFilter);
    }

    // Risk filter
    if (riskFilter !== 'all') {
      filtered = filtered.filter((m) => m.riskProfile.level === riskFilter);
    }

    setFilteredMerchants(filtered);
  }, [searchTerm, statusFilter, kycFilter, riskFilter, merchants]);

  const loadMerchants = async () => {
    try {
      const q = query(collection(db, 'merchants'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        merchantId: doc.id,
        ...doc.data(),
      })) as Merchant[];
      setMerchants(data);
    } catch (error) {
      console.error('Error loading merchants:', error);
    }
  };

  const loadBusinessTypes = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'businessTypes'));
      const data = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((item: any) => item.isActive)
        .sort((a: any, b: any) => a.name.localeCompare(b.name));
      setBusinessTypes(data);
    } catch (error) {
      console.error('Error loading business types:', error);
    }
  };

  const loadCountries = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'countries'));
      const data = snapshot.docs
        .map((doc) => ({
          code: doc.id,
          ...doc.data(),
        }))
        .filter((item: any) => item.isActive)
        .sort((a: any, b: any) => a.name.localeCompare(b.name));
      setCountries(data);
    } catch (error) {
      console.error('Error loading countries:', error);
    }
  };

  const loadRegions = async (countryCode: string) => {
    try {
      const regionsRef = collection(db, `countries/${countryCode}/regions`);
      const snapshot = await getDocs(regionsRef);
      const data = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .sort((a: any, b: any) => a.name.localeCompare(b.name));
      setRegions(data);
    } catch (error) {
      console.error('Error loading regions:', error);
      setRegions([]);
    }
  };

  const loadCities = async (countryCode: string, regionId: string) => {
    try {
      const citiesRef = collection(db, `countries/${countryCode}/cities`);
      const snapshot = await getDocs(citiesRef);
      const data = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((city: any) => city.regionId === regionId)
        .sort((a: any, b: any) => a.name.localeCompare(b.name));
      setCities(data);
    } catch (error) {
      console.error('Error loading cities:', error);
      setCities([]);
    }
  };

  const loadCurrencies = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'currencies'));
      const data = snapshot.docs
        .map((doc) => ({
          code: doc.id,
          ...doc.data(),
        }))
        .filter((item: any) => item.isActive)
        .sort((a: any, b: any) => a.code.localeCompare(b.code));
      setCurrencies(data);
    } catch (error) {
      console.error('Error loading currencies:', error);
    }
  };

  const saveMerchant = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const merchantData: Partial<Merchant> = {
      businessName: formData.get('businessName') as string,
      tradingName: formData.get('tradingName') as string || '',
      businessType: formData.get('businessType') as string,
      registrationNumber: formData.get('registrationNumber') as string || '',
      taxId: formData.get('taxId') as string || '',

      contactInfo: {
        email: formData.get('email') as string,
        phone: formData.get('phone') as string,
        website: formData.get('website') as string || '',
      },

      address: {
        street: formData.get('street') as string,
        city: formData.get('city') as string,
        region: formData.get('region') as string,
        country: formData.get('country') as string,
        postalCode: formData.get('postalCode') as string,
      },

      bankDetails: {
        accountName: formData.get('accountName') as string || '',
        accountNumber: formData.get('accountNumber') as string || '',
        bankName: formData.get('bankName') as string || '',
        bankCode: formData.get('bankCode') as string || '',
        swiftCode: formData.get('swiftCode') as string || '',
      },

      representatives: editingMerchant?.representatives || [],

      kyc: editingMerchant?.kyc || {
        status: 'pending',
        documentsSubmitted: 0,
        documentsVerified: 0,
      },

      riskProfile: editingMerchant?.riskProfile || {
        level: 'medium',
        score: 50,
      },

      subscription: editingMerchant?.subscription || {
        planId: 'trial',
        status: 'trial',
        startDate: serverTimestamp(),
      },

      financials: editingMerchant?.financials || {
        monthlyVolume: 0,
        totalTransactions: 0,
        totalRevenue: 0,
        currency: 'GHS',
      },

      status: formData.get('status') as any,
      updatedAt: serverTimestamp(),
      updatedBy: admin?.adminId,
    };

    try {
      console.log('Attempting to save merchant with data:', merchantData);

      const merchantId = editingMerchant?.merchantId || `mer_${Date.now()}`;

      if (!editingMerchant) {
        merchantData.merchantId = merchantId;
        merchantData.createdAt = serverTimestamp();
        merchantData.createdBy = admin?.adminId;
        merchantData.onboardedAt = serverTimestamp();
        merchantData.onboardedBy = admin?.adminId;
      }

      console.log('Final merchant data:', merchantData);
      await setDoc(doc(db, 'merchants', merchantId), merchantData, { merge: true });

      setShowModal(false);
      setEditingMerchant(null);
      loadMerchants();
    } catch (error: any) {
      console.error('Error saving merchant:', error);
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
      alert(`Failed to save merchant: ${error.message || 'Unknown error'}`);
    }
  };

  const deleteMerchant = async (merchantId: string) => {
    if (!confirm('Are you sure you want to delete this merchant? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'merchants', merchantId));
      loadMerchants();
    } catch (error) {
      console.error('Error deleting merchant:', error);
      alert('Failed to delete merchant');
    }
  };

  const updateMerchantStatus = async (merchantId: string, status: Merchant['status']) => {
    try {
      await setDoc(
        doc(db, 'merchants', merchantId),
        {
          status,
          updatedAt: serverTimestamp(),
          updatedBy: admin?.adminId,
        },
        { merge: true }
      );
      loadMerchants();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  const updateKYCStatus = async (merchantId: string, kycStatus: Merchant['kyc']['status']) => {
    try {
      const updates: any = {
        'kyc.status': kycStatus,
        updatedAt: serverTimestamp(),
        updatedBy: admin?.adminId,
      };

      if (kycStatus === 'approved') {
        updates['kyc.verifiedAt'] = serverTimestamp();
        updates['kyc.verifiedBy'] = admin?.adminId;
      }

      await setDoc(doc(db, 'merchants', merchantId), updates, { merge: true });
      loadMerchants();
    } catch (error) {
      console.error('Error updating KYC status:', error);
      alert('Failed to update KYC status');
    }
  };

  const getStatusBadge = (status: string) => {
    const config = {
      pending: { icon: Clock, color: 'text-yellow-600 bg-yellow-50' },
      active: { icon: CheckCircle2, color: 'text-green-600 bg-green-50' },
      suspended: { icon: AlertTriangle, color: 'text-orange-600 bg-orange-50' },
      rejected: { icon: XCircle, color: 'text-red-600 bg-red-50' },
      closed: { icon: XCircle, color: 'text-gray-600 bg-gray-50' },
      under_review: { icon: Clock, color: 'text-blue-600 bg-blue-50' },
      approved: { icon: CheckCircle2, color: 'text-green-600 bg-green-50' },
    };

    const statusConfig = config[status as keyof typeof config] || config.pending;
    const Icon = statusConfig.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${statusConfig.color}`}>
        <Icon className="w-3 h-3" />
        {status.replace('_', ' ')}
      </span>
    );
  };

  const getRiskBadge = (level: string) => {
    const colors = {
      low: 'text-green-600 bg-green-50',
      medium: 'text-yellow-600 bg-yellow-50',
      high: 'text-orange-600 bg-orange-50',
      critical: 'text-red-600 bg-red-50',
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[level as keyof typeof colors]}`}>
        {level.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Merchant Management</h1>
        <p className="text-muted-foreground">
          Manage merchant accounts, verification, and operations
        </p>
      </div>

      {/* Filters and Actions */}
      <div className="mb-6 space-y-4">
        {/* Search */}
        <div className="flex justify-between items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input
              type="text"
              placeholder="Search merchants..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-slate-200 dark:border-slate-700 rounded-lg"
            />
          </div>
          <button
            onClick={() => {
              setEditingMerchant(null);
              setShowModal(true);
            }}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Merchant
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-4 items-center">
          <Filter className="w-4 h-4 text-muted-foreground" />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="rejected">Rejected</option>
            <option value="closed">Closed</option>
          </select>

          <select
            value={kycFilter}
            onChange={(e) => setKycFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="all">All KYC Status</option>
            <option value="pending">KYC Pending</option>
            <option value="under_review">KYC Under Review</option>
            <option value="approved">KYC Approved</option>
            <option value="rejected">KYC Rejected</option>
          </select>

          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="all">All Risk Levels</option>
            <option value="low">Low Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="high">High Risk</option>
            <option value="critical">Critical Risk</option>
          </select>

          <div className="ml-auto text-sm text-muted-foreground">
            {filteredMerchants.length} of {merchants.length} merchants
          </div>
        </div>
      </div>

      {/* Merchants Grid */}
      <div className="grid gap-4">
        {filteredMerchants.map((merchant) => (
          <div
            key={merchant.merchantId}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                {/* Header */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Store className="w-6 h-6 text-primary" />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold">{merchant.businessName}</h3>
                      {getStatusBadge(merchant.status)}
                      {getStatusBadge(merchant.kyc.status)}
                      {getRiskBadge(merchant.riskProfile.level)}
                    </div>
                    {merchant.tradingName && (
                      <p className="text-sm text-muted-foreground">Trading as: {merchant.tradingName}</p>
                    )}
                    <p className="text-xs text-muted-foreground">{merchant.businessType}</p>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="truncate">{merchant.contactInfo.email}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{merchant.contactInfo.phone}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span>{merchant.address.city}, {merchant.address.country}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <span>{merchant.financials.currency} {merchant.financials.totalRevenue.toLocaleString()}</span>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex gap-6 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 text-xs text-muted-foreground">
                  <span>Transactions: {merchant.financials.totalTransactions}</span>
                  <span>KYC Docs: {merchant.kyc.documentsVerified}/{merchant.kyc.documentsSubmitted}</span>
                  <span>Risk Score: {merchant.riskProfile.score}/100</span>
                  <span>Plan: {merchant.subscription.planId}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => {
                    setViewingMerchant(merchant);
                    setShowDetailModal(true);
                  }}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                  title="View Details"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setEditingMerchant(merchant);
                    setShowModal(true);
                  }}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                  title="Edit"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteMerchant(merchant.merchantId)}
                  className="p-2 hover:bg-red-100 dark:hover:bg-red-900 text-red-600 rounded transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredMerchants.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            {merchants.length === 0 ? (
              <div>
                <Store className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No merchants yet. Add your first merchant to get started.</p>
              </div>
            ) : (
              <p>No merchants match your filters.</p>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Merchant Wizard */}
      <MerchantWizard
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingMerchant(null);
        }}
        onSuccess={() => {
          loadMerchants();
        }}
        initialData={editingMerchant || undefined}
        isEditing={!!editingMerchant}
      />

      {/* Detail View Modal */}
      {showDetailModal && viewingMerchant && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold">{viewingMerchant.businessName}</h2>
                  <p className="text-muted-foreground">{viewingMerchant.merchantId}</p>
                </div>
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setViewingMerchant(null);
                  }}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Status Section */}
                <div>
                  <h3 className="font-semibold mb-3">Status</h3>
                  <div className="flex gap-2 mb-3">
                    {getStatusBadge(viewingMerchant.status)}
                    {getStatusBadge(viewingMerchant.kyc.status)}
                    {getRiskBadge(viewingMerchant.riskProfile.level)}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateKYCStatus(viewingMerchant.merchantId, 'approved')}
                      className="px-3 py-1.5 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200 transition-colors"
                    >
                      Approve KYC
                    </button>
                    <button
                      onClick={() => updateKYCStatus(viewingMerchant.merchantId, 'rejected')}
                      className="px-3 py-1.5 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 transition-colors"
                    >
                      Reject KYC
                    </button>
                    <button
                      onClick={() => updateMerchantStatus(viewingMerchant.merchantId, 'suspended')}
                      className="px-3 py-1.5 bg-orange-100 text-orange-700 rounded text-sm hover:bg-orange-200 transition-colors"
                    >
                      Suspend
                    </button>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                    <div className="text-2xl font-bold">{viewingMerchant.financials.totalTransactions}</div>
                    <div className="text-xs text-muted-foreground">Total Transactions</div>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                    <div className="text-2xl font-bold">
                      {viewingMerchant.financials.currency} {viewingMerchant.financials.totalRevenue.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">Total Revenue</div>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                    <div className="text-2xl font-bold">{viewingMerchant.riskProfile.score}</div>
                    <div className="text-xs text-muted-foreground">Risk Score</div>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                    <div className="text-2xl font-bold">
                      {viewingMerchant.kyc.documentsVerified}/{viewingMerchant.kyc.documentsSubmitted}
                    </div>
                    <div className="text-xs text-muted-foreground">KYC Documents</div>
                  </div>
                </div>

                {/* Full Details in compact format */}
                <div className="text-sm space-y-2">
                  <div><strong>Registration:</strong> {viewingMerchant.registrationNumber}</div>
                  <div><strong>Tax ID:</strong> {viewingMerchant.taxId}</div>
                  <div><strong>Email:</strong> {viewingMerchant.contactInfo.email}</div>
                  <div><strong>Phone:</strong> {viewingMerchant.contactInfo.phone}</div>
                  <div><strong>Address:</strong> {viewingMerchant.address.street}, {viewingMerchant.address.city}, {viewingMerchant.address.region}, {viewingMerchant.address.country}</div>
                  <div><strong>Bank:</strong> {viewingMerchant.bankDetails.bankName} - {viewingMerchant.bankDetails.accountNumber}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
