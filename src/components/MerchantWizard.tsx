/**
 * Merchant Wizard Component
 *
 * Multi-step wizard for creating and editing merchants with:
 * - 6 step process
 * - Save draft functionality
 * - KYC document upload
 * - Mobile Money wallet support (MTN, Vodafone, AirtelTigo)
 * - Bank account option
 * - Progress tracking
 * - Enhanced UI/UX
 */

import { useState, useEffect } from 'react';
import { db, storage } from '@/lib/firebase';
import {
  collection,
  doc,
  setDoc,
  getDocs,
  serverTimestamp,
  query,
  where
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/contexts/AuthContext';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Save,
  Check,
  Upload,
  FileText,
  Building2,
  User,
  MapPin,
  Wallet,
  Shield,
  Eye,
  Smartphone,
  CreditCard,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Types
interface KYCDocument {
  id: string;
  type: string;
  name: string;
  url?: string;
  file?: File;
  status: 'pending' | 'uploaded' | 'verified' | 'rejected';
  uploadedAt?: any;
}

interface MobileMoneyWallet {
  provider: 'MTN' | 'Vodafone' | 'AirtelTigo';
  number: string;
  accountName: string;
}

interface BankAccount {
  accountName: string;
  accountNumber: string;
  bankName: string;
  bankCode?: string;
  swiftCode?: string;
}

interface MerchantFormData {
  // Step 1: Business Information
  businessName: string;
  tradingName?: string;
  businessType: string;
  businessLogo?: string;
  registrationNumber: string;
  taxId: string;
  status: 'pending' | 'active' | 'suspended' | 'rejected';

  // Step 2: Contact Information
  contactInfo: {
    email: string;
    phone: string;
    website?: string;
  };

  // Step 3: Address
  address: {
    street: string;
    city: string;
    region: string;
    country: string;
    postalCode: string;
  };

  // Step 4: Payment Methods
  paymentMethod: 'bank' | 'mobile_money';
  bankDetails?: BankAccount;
  mobileMoneyWallet?: MobileMoneyWallet;

  // Step 5: KYC Documents
  kycDocuments: KYCDocument[];

  // Metadata
  draftId?: string;
  completedSteps: number[];
}

interface MerchantWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Partial<MerchantFormData>;
  isEditing?: boolean;
}

const STEPS = [
  { id: 1, title: 'Business Info', icon: Building2, description: 'Basic business details' },
  { id: 2, title: 'Contact', icon: User, description: 'Contact information' },
  { id: 3, title: 'Address', icon: MapPin, description: 'Location details' },
  { id: 4, title: 'Payment', icon: Wallet, description: 'Bank or Mobile Money' },
  { id: 5, title: 'KYC Documents', icon: Shield, description: 'Upload verification documents' },
  { id: 6, title: 'Review', icon: Eye, description: 'Review and submit' },
];

const GHANA_MOBILE_NETWORKS = [
  { value: 'MTN', label: 'MTN Mobile Money', prefix: ['024', '054', '055', '059'] },
  { value: 'Vodafone', label: 'Vodafone Cash', prefix: ['020', '050'] },
  { value: 'AirtelTigo', label: 'AirtelTigo Money', prefix: ['027', '057', '026', '056'] },
];

const KYC_DOCUMENT_TYPES = [
  { value: 'business_registration', label: 'Business Registration Certificate' },
  { value: 'tax_certificate', label: 'Tax Identification Certificate' },
  { value: 'owner_id', label: 'Owner ID Card (Ghana Card/Passport/Driver License)' },
  { value: 'proof_of_address', label: 'Proof of Business Address' },
  { value: 'bank_statement', label: 'Bank Statement (Last 3 months)' },
  { value: 'operating_license', label: 'Operating License (if applicable)' },
];

export default function MerchantWizard({
  isOpen,
  onClose,
  onSuccess,
  initialData,
  isEditing = false
}: MerchantWizardProps) {
  const { admin } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Dynamic data
  const [businessTypes, setBusinessTypes] = useState<any[]>([]);
  const [countries, setCountries] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);

  // Form data
  const [formData, setFormData] = useState<MerchantFormData>({
    businessName: '',
    tradingName: '',
    businessType: '',
    registrationNumber: '',
    taxId: '',
    status: 'pending',
    contactInfo: {
      email: '',
      phone: '',
      website: '',
    },
    address: {
      street: '',
      city: '',
      region: '',
      country: 'Ghana',
      postalCode: '',
    },
    paymentMethod: 'mobile_money',
    mobileMoneyWallet: {
      provider: 'MTN',
      number: '',
      accountName: '',
    },
    kycDocuments: [],
    completedSteps: [],
    ...initialData,
  });

  const [useSamePhoneForMomo, setUseSamePhoneForMomo] = useState(false);

  // Load initial data when editing
  useEffect(() => {
    if (isOpen && initialData) {
      setFormData(prev => ({
        ...prev,
        businessName: initialData.businessName || '',
        tradingName: initialData.tradingName || '',
        businessType: initialData.businessType || '',
        businessLogo: initialData.businessLogo,
        registrationNumber: initialData.registrationNumber || '',
        taxId: initialData.taxId || '',
        status: initialData.status || 'pending',
        contactInfo: {
          email: initialData.contactInfo?.email || '',
          phone: initialData.contactInfo?.phone || '',
          website: initialData.contactInfo?.website || '',
        },
        address: {
          street: initialData.address?.street || '',
          city: initialData.address?.city || '',
          region: initialData.address?.region || '',
          country: initialData.address?.country || 'Ghana',
          postalCode: initialData.address?.postalCode || '',
        },
        paymentMethod: initialData.paymentMethod || 'mobile_money',
        bankDetails: initialData.bankDetails,
        mobileMoneyWallet: initialData.mobileMoneyWallet || {
          provider: 'MTN',
          number: '',
          accountName: '',
        },
        kycDocuments: initialData.kycDocuments || [],
        completedSteps: initialData.completedSteps || [],
      }));
    }
  }, [isOpen, initialData]);

  // Load dynamic data
  useEffect(() => {
    if (isOpen) {
      loadBusinessTypes();
      loadCountries();
    }
  }, [isOpen]);

  useEffect(() => {
    if (formData.address.country) {
      loadRegions(formData.address.country);
    }
  }, [formData.address.country]);

  useEffect(() => {
    if (formData.address.country && formData.address.region) {
      loadCities(formData.address.country, formData.address.region);
    }
  }, [formData.address.country, formData.address.region]);

  // Auto-fill Mobile Money number from phone if checkbox is checked
  useEffect(() => {
    if (useSamePhoneForMomo && formData.contactInfo.phone && formData.paymentMethod === 'mobile_money') {
      setFormData(prev => ({
        ...prev,
        mobileMoneyWallet: {
          ...prev.mobileMoneyWallet!,
          number: prev.contactInfo.phone,
        }
      }));
    }
  }, [useSamePhoneForMomo, formData.contactInfo.phone, formData.paymentMethod]);

  const loadBusinessTypes = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'businessTypes'));
      const types = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBusinessTypes(types);
    } catch (error) {
      console.error('Error loading business types:', error);
    }
  };

  const loadCountries = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'countries'));
      const countriesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCountries(countriesList);
    } catch (error) {
      console.error('Error loading countries:', error);
    }
  };

  const loadRegions = async (countryCode: string) => {
    try {
      const regionsRef = collection(db, `countries/${countryCode}/regions`);
      const snapshot = await getDocs(regionsRef);
      const regionsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRegions(regionsList);
    } catch (error) {
      console.error('Error loading regions:', error);
      setRegions([]);
    }
  };

  const loadCities = async (countryCode: string, regionId: string) => {
    try {
      const citiesRef = collection(db, `countries/${countryCode}/cities`);
      const q = query(citiesRef, where('regionId', '==', regionId));
      const snapshot = await getDocs(q);
      const citiesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCities(citiesList);
    } catch (error) {
      console.error('Error loading cities:', error);
      setCities([]);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => {
      const keys = field.split('.');
      if (keys.length === 1) {
        return { ...prev, [field]: value };
      } else if (keys.length === 2) {
        return {
          ...prev,
          [keys[0]]: {
            ...(prev[keys[0] as keyof MerchantFormData] as any),
            [keys[1]]: value,
          }
        };
      }
      return prev;
    });
  };

  const markStepComplete = (step: number) => {
    setFormData(prev => ({
      ...prev,
      completedSteps: [...new Set([...prev.completedSteps, step])],
    }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(
          formData.businessName &&
          formData.businessType
        );
      case 2:
        return !!(
          formData.contactInfo.phone
        );
      case 3:
        return !!(
          formData.address.city &&
          formData.address.region &&
          formData.address.country
        );
      case 4:
        if (formData.paymentMethod === 'bank') {
          return !!(
            formData.bankDetails?.accountName &&
            formData.bankDetails?.accountNumber &&
            formData.bankDetails?.bankName
          );
        } else {
          return !!(
            formData.mobileMoneyWallet?.provider &&
            formData.mobileMoneyWallet?.number &&
            formData.mobileMoneyWallet?.accountName
          );
        }
      case 5:
        // KYC documents are optional for draft
        return true;
      case 6:
        return true;
      default:
        return true;
    }
  };

  const saveDraft = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const draftId = formData.draftId || `draft_${Date.now()}`;
      const draftData = {
        ...formData,
        draftId,
        isDraft: true,
        lastSaved: serverTimestamp(),
        savedBy: admin?.adminId,
      };

      await setDoc(doc(db, 'merchantDrafts', draftId), draftData);

      setFormData(prev => ({ ...prev, draftId }));
      setMessage({ type: 'success', text: 'Draft saved successfully!' });

      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error saving draft:', error);
      setMessage({ type: 'error', text: 'Failed to save draft' });
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (file: File, documentType: string) => {
    try {
      const timestamp = Date.now();
      const fileName = `${documentType}_${timestamp}_${file.name}`;
      const storageRef = ref(storage, `merchant-kyc/${fileName}`);

      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      const newDocument: KYCDocument = {
        id: `${documentType}_${timestamp}`,
        type: documentType,
        name: file.name,
        url,
        status: 'uploaded',
        uploadedAt: new Date(),
      };

      setFormData(prev => ({
        ...prev,
        kycDocuments: [...prev.kycDocuments, newDocument],
      }));

      setMessage({ type: 'success', text: `${file.name} uploaded successfully!` });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error uploading file:', error);
      setMessage({ type: 'error', text: 'Failed to upload file' });
    }
  };

  const removeDocument = (documentId: string) => {
    setFormData(prev => ({
      ...prev,
      kycDocuments: prev.kycDocuments.filter(doc => doc.id !== documentId),
    }));
  };

  const handleLogoUpload = async (file: File) => {
    try {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setMessage({ type: 'error', text: 'Please upload a valid image file (JPG, PNG, WEBP)' });
        setTimeout(() => setMessage(null), 3000);
        return;
      }

      // Validate file size (max 3MB)
      const maxSize = 3 * 1024 * 1024; // 3MB in bytes
      if (file.size > maxSize) {
        setMessage({ type: 'error', text: 'Logo file size must be less than 3MB' });
        setTimeout(() => setMessage(null), 3000);
        return;
      }

      const timestamp = Date.now();
      const fileName = `business_logo_${timestamp}_${file.name}`;
      const storageRef = ref(storage, `merchant-logos/${fileName}`);

      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      setFormData(prev => ({
        ...prev,
        businessLogo: url,
      }));

      setMessage({ type: 'success', text: 'Logo uploaded successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error uploading logo:', error);
      setMessage({ type: 'error', text: 'Failed to upload logo' });
    }
  };

  const removeLogo = () => {
    setFormData(prev => ({
      ...prev,
      businessLogo: undefined,
    }));
  };

  const goToStep = (step: number) => {
    if (step >= 1 && step <= 6) {
      setCurrentStep(step);
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      markStepComplete(currentStep);
      if (currentStep < 6) {
        setCurrentStep(currentStep + 1);
      }
    } else {
      setMessage({ type: 'error', text: 'Please fill in all required fields' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setMessage(null);

    try {
      // Use existing merchantId when editing, generate new one when creating
      const merchantId = isEditing && initialData?.merchantId
        ? initialData.merchantId
        : `merchant_${Date.now()}`;

      const merchantData: any = {
        merchantId,
        businessName: formData.businessName,
        tradingName: formData.tradingName,
        businessType: formData.businessType,
        businessLogo: formData.businessLogo,
        registrationNumber: formData.registrationNumber,
        taxId: formData.taxId,
        contactInfo: formData.contactInfo,
        address: formData.address,
        paymentMethod: formData.paymentMethod,
        ...(formData.paymentMethod === 'bank'
          ? { bankDetails: formData.bankDetails }
          : { mobileMoneyWallet: formData.mobileMoneyWallet }
        ),
        representatives: isEditing && initialData?.representatives ? initialData.representatives : [],
        kyc: {
          status: formData.kycDocuments.length > 0 ? 'pending' : 'pending',
          documentsSubmitted: formData.kycDocuments.length,
          documentsVerified: isEditing && initialData?.kyc?.documentsVerified ? initialData.kyc.documentsVerified : 0,
        },
        riskProfile: isEditing && initialData?.riskProfile ? initialData.riskProfile : {
          level: 'medium' as const,
          score: 50,
          lastAssessment: serverTimestamp(),
          flags: [],
        },
        subscription: isEditing && initialData?.subscription ? initialData.subscription : {
          planId: 'basic',
          status: 'trial' as const,
          startDate: serverTimestamp(),
        },
        financials: isEditing && initialData?.financials ? initialData.financials : {
          monthlyVolume: 0,
          totalTransactions: 0,
          totalRevenue: 0,
          currency: 'GHS',
        },
        status: formData.status,
        lastActivityAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        updatedBy: admin?.adminId,
      };

      // Only set creation fields for new merchants
      if (!isEditing) {
        merchantData.onboardedAt = serverTimestamp();
        merchantData.onboardedBy = admin?.adminId;
        merchantData.createdAt = serverTimestamp();
        merchantData.createdBy = admin?.adminId;
      }

      await setDoc(doc(db, 'merchants', merchantId), merchantData, { merge: true });

      // Upload KYC documents
      if (formData.kycDocuments.length > 0) {
        for (const kycDoc of formData.kycDocuments) {
          const docId = `${merchantId}_${kycDoc.type}`;
          await setDoc(doc(db, `merchants/${merchantId}/kycDocuments`, docId), {
            documentId: docId,
            merchantId,
            type: kycDoc.type,
            fileName: kycDoc.name,
            fileUrl: kycDoc.url,
            status: 'pending',
            uploadedAt: serverTimestamp(),
            uploadedBy: admin?.adminId,
          });
        }
      }

      setMessage({
        type: 'success',
        text: isEditing ? 'Merchant updated successfully!' : 'Merchant created successfully!'
      });
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (error) {
      console.error(`Error ${isEditing ? 'updating' : 'creating'} merchant:`, error);
      setMessage({
        type: 'error',
        text: isEditing ? 'Failed to update merchant' : 'Failed to create merchant'
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-5xl w-full max-h-[95vh] flex flex-col my-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              {isEditing ? 'Edit Merchant' : 'Add New Merchant'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1].description}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={saveDraft}
              disabled={saving}
              className="px-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = formData.completedSteps.includes(step.id);
              const isCurrent = currentStep === step.id;
              const isClickable = isCompleted || isCurrent;

              return (
                <div key={step.id} className="flex items-center flex-1">
                  <button
                    onClick={() => isClickable && goToStep(step.id)}
                    disabled={!isClickable}
                    className={cn(
                      "flex flex-col items-center gap-2 p-2 rounded-lg transition-all",
                      isCurrent && "bg-primary/10",
                      isClickable && "hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer",
                      !isClickable && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                      isCompleted && "bg-green-500 text-white",
                      isCurrent && !isCompleted && "bg-primary text-primary-foreground",
                      !isCurrent && !isCompleted && "bg-slate-200 dark:bg-slate-700"
                    )}>
                      {isCompleted ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <Icon className="w-5 h-5" />
                      )}
                    </div>
                    <span className={cn(
                      "text-xs font-medium text-center hidden sm:block",
                      isCurrent && "text-primary",
                      isCompleted && "text-green-600 dark:text-green-400"
                    )}>
                      {step.title}
                    </span>
                  </button>
                  {index < STEPS.length - 1 && (
                    <div className={cn(
                      "flex-1 h-0.5 mx-2",
                      isCompleted ? "bg-green-500" : "bg-slate-200 dark:bg-slate-700"
                    )} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={cn(
            "mx-6 mt-4 p-3 rounded-lg flex items-center gap-2",
            message.type === 'success' && "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300",
            message.type === 'error' && "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"
          )}>
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <span className="text-sm">{message.text}</span>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Business Information */}
          {currentStep === 1 && (
            <div className="space-y-4 max-w-2xl mx-auto">
              <div className="text-center mb-6">
                <Building2 className="w-12 h-12 mx-auto text-primary mb-2" />
                <h3 className="text-xl font-semibold">Business Information</h3>
                <p className="text-sm text-muted-foreground">Tell us about your business</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">
                    Business Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.businessName}
                    onChange={(e) => handleInputChange('businessName', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg"
                    placeholder="Enter registered business name"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">
                    Trading Name <span className="text-slate-400">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.tradingName}
                    onChange={(e) => handleInputChange('tradingName', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg"
                    placeholder="Enter trading name if different"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Business Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.businessType}
                    onChange={(e) => handleInputChange('businessType', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg"
                  >
                    <option value="">Select Business Type</option>
                    {businessTypes.map(type => (
                      <option key={type.id} value={type.id}>{type.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Registration Number <span className="text-slate-400">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.registrationNumber}
                    onChange={(e) => handleInputChange('registrationNumber', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg"
                    placeholder="Business registration number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Tax ID <span className="text-slate-400">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.taxId}
                    onChange={(e) => handleInputChange('taxId', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg"
                    placeholder="Tax identification number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg"
                  >
                    <option value="pending">Pending</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                {/* Business Logo Upload */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">
                    Business Logo <span className="text-slate-400">(Optional)</span>
                  </label>
                  <div className="mt-2">
                    {formData.businessLogo ? (
                      <div className="flex items-center gap-4">
                        <div className="w-24 h-24 rounded-lg overflow-hidden border-2 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
                          <img
                            src={formData.businessLogo}
                            alt="Business Logo"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <p className="text-sm text-muted-foreground">Logo uploaded successfully</p>
                          <button
                            type="button"
                            onClick={removeLogo}
                            className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                          >
                            Remove Logo
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 text-center">
                        <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground mb-2">
                          Upload your business logo (JPG, PNG, WEBP - Max 3MB)
                        </p>
                        <label className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg cursor-pointer hover:bg-primary/90 transition-colors">
                          <Upload className="w-4 h-4" />
                          <span>Choose File</span>
                          <input
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/webp"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleLogoUpload(file);
                                e.target.value = ''; // Reset input
                              }
                            }}
                            className="hidden"
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Contact Information */}
          {currentStep === 2 && (
            <div className="space-y-4 max-w-2xl mx-auto">
              <div className="text-center mb-6">
                <User className="w-12 h-12 mx-auto text-primary mb-2" />
                <h3 className="text-xl font-semibold">Contact Information</h3>
                <p className="text-sm text-muted-foreground">How can we reach you?</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">
                    Email Address <span className="text-slate-400">(Optional)</span>
                  </label>
                  <input
                    type="email"
                    value={formData.contactInfo.email}
                    onChange={(e) => handleInputChange('contactInfo.email', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg"
                    placeholder="business@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.contactInfo.phone}
                    onChange={(e) => handleInputChange('contactInfo.phone', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg"
                    placeholder="+233 XX XXX XXXX"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    This number will be used for authentication and notifications
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Website <span className="text-slate-400">(Optional)</span>
                  </label>
                  <input
                    type="url"
                    value={formData.contactInfo.website}
                    onChange={(e) => handleInputChange('contactInfo.website', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg"
                    placeholder="https://www.example.com"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Address */}
          {currentStep === 3 && (
            <div className="space-y-4 max-w-2xl mx-auto">
              <div className="text-center mb-6">
                <MapPin className="w-12 h-12 mx-auto text-primary mb-2" />
                <h3 className="text-xl font-semibold">Business Address</h3>
                <p className="text-sm text-muted-foreground">Where is your business located?</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">
                    Street Address <span className="text-slate-400">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.address.street}
                    onChange={(e) => handleInputChange('address.street', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg"
                    placeholder="Street address, building name, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Country <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.address.country}
                    onChange={(e) => handleInputChange('address.country', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg"
                  >
                    <option value="">Select Country</option>
                    {countries.map(country => (
                      <option key={country.id} value={country.id}>{country.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Region <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.address.region}
                    onChange={(e) => handleInputChange('address.region', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg"
                    disabled={!formData.address.country}
                  >
                    <option value="">Select Region</option>
                    {regions.map(region => (
                      <option key={region.id} value={region.id}>{region.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    City <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.address.city}
                    onChange={(e) => handleInputChange('address.city', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg"
                    disabled={!formData.address.region}
                  >
                    <option value="">Select City</option>
                    {cities.map(city => (
                      <option key={city.id} value={city.id}>{city.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Postal Code <span className="text-slate-400">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.address.postalCode}
                    onChange={(e) => handleInputChange('address.postalCode', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg"
                    placeholder="Postal/ZIP code"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Payment Methods */}
          {currentStep === 4 && (
            <div className="space-y-6 max-w-2xl mx-auto">
              <div className="text-center mb-6">
                <Wallet className="w-12 h-12 mx-auto text-primary mb-2" />
                <h3 className="text-xl font-semibold">Payment Methods</h3>
                <p className="text-sm text-muted-foreground">Choose how you want to receive payments</p>
              </div>

              {/* Payment Method Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => {
                    handleInputChange('paymentMethod', 'mobile_money');
                    if (!formData.mobileMoneyWallet) {
                      setFormData(prev => ({
                        ...prev,
                        mobileMoneyWallet: {
                          provider: 'MTN',
                          number: '',
                          accountName: '',
                        }
                      }));
                    }
                  }}
                  className={cn(
                    "p-6 border-2 rounded-xl transition-all hover:shadow-md",
                    formData.paymentMethod === 'mobile_money'
                      ? "border-primary bg-primary/5"
                      : "border-slate-200 dark:border-slate-700"
                  )}
                >
                  <Smartphone className="w-10 h-10 mx-auto mb-3 text-primary" />
                  <h4 className="font-semibold mb-1">Mobile Money</h4>
                  <p className="text-xs text-muted-foreground">
                    MTN, Vodafone, or AirtelTigo
                  </p>
                </button>

                <button
                  onClick={() => {
                    handleInputChange('paymentMethod', 'bank');
                    if (!formData.bankDetails) {
                      setFormData(prev => ({
                        ...prev,
                        bankDetails: {
                          accountName: '',
                          accountNumber: '',
                          bankName: '',
                          bankCode: '',
                          swiftCode: '',
                        }
                      }));
                    }
                  }}
                  className={cn(
                    "p-6 border-2 rounded-xl transition-all hover:shadow-md",
                    formData.paymentMethod === 'bank'
                      ? "border-primary bg-primary/5"
                      : "border-slate-200 dark:border-slate-700"
                  )}
                >
                  <CreditCard className="w-10 h-10 mx-auto mb-3 text-primary" />
                  <h4 className="font-semibold mb-1">Bank Account</h4>
                  <p className="text-xs text-muted-foreground">
                    Traditional bank account
                  </p>
                </button>
              </div>

              {/* Mobile Money Form */}
              {formData.paymentMethod === 'mobile_money' && (
                <div className="space-y-4 p-6 bg-slate-50 dark:bg-slate-900 rounded-lg">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-primary" />
                    Mobile Money Details
                  </h4>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Mobile Money Provider <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.mobileMoneyWallet?.provider}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        mobileMoneyWallet: {
                          ...prev.mobileMoneyWallet!,
                          provider: e.target.value as any,
                        }
                      }))}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg"
                    >
                      {GHANA_MOBILE_NETWORKS.map(network => (
                        <option key={network.value} value={network.value}>
                          {network.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                      Mobile Money Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={formData.mobileMoneyWallet?.number}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        mobileMoneyWallet: {
                          ...prev.mobileMoneyWallet!,
                          number: e.target.value,
                        }
                      }))}
                      disabled={useSamePhoneForMomo}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg disabled:bg-slate-100 dark:disabled:bg-slate-800"
                      placeholder="0XX XXX XXXX"
                    />

                    <label className="flex items-center gap-2 mt-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useSamePhoneForMomo}
                        onChange={(e) => setUseSamePhoneForMomo(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300"
                      />
                      <span className="text-sm text-muted-foreground">
                        Use the same phone number from contact information
                      </span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Account Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.mobileMoneyWallet?.accountName}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        mobileMoneyWallet: {
                          ...prev.mobileMoneyWallet!,
                          accountName: e.target.value,
                        }
                      }))}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg"
                      placeholder="Name on mobile money account"
                    />
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex gap-2">
                      <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-blue-700 dark:text-blue-300">
                        <p className="font-medium mb-1">Mobile Money in Ghana</p>
                        <p>Make sure the mobile money account is registered and active. This account will be used for receiving payouts.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Bank Account Form */}
              {formData.paymentMethod === 'bank' && (
                <div className="space-y-4 p-6 bg-slate-50 dark:bg-slate-900 rounded-lg">
                  <h4 className="font-semibold flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary" />
                    Bank Account Details
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Account Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.bankDetails?.accountName}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          bankDetails: {
                            ...prev.bankDetails!,
                            accountName: e.target.value,
                          }
                        }))}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg"
                        placeholder="Account holder name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Account Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.bankDetails?.accountNumber}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          bankDetails: {
                            ...prev.bankDetails!,
                            accountNumber: e.target.value,
                          }
                        }))}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg"
                        placeholder="Account number"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Bank Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.bankDetails?.bankName}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          bankDetails: {
                            ...prev.bankDetails!,
                            bankName: e.target.value,
                          }
                        }))}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg"
                        placeholder="Bank name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Bank Code <span className="text-slate-400">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={formData.bankDetails?.bankCode}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          bankDetails: {
                            ...prev.bankDetails!,
                            bankCode: e.target.value,
                          }
                        }))}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg"
                        placeholder="Bank code"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-1">
                        SWIFT Code <span className="text-slate-400">(Optional - for international transfers)</span>
                      </label>
                      <input
                        type="text"
                        value={formData.bankDetails?.swiftCode}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          bankDetails: {
                            ...prev.bankDetails!,
                            swiftCode: e.target.value,
                          }
                        }))}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg"
                        placeholder="SWIFT/BIC code"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 5: KYC Documents */}
          {currentStep === 5 && (
            <div className="space-y-6 max-w-2xl mx-auto">
              <div className="text-center mb-6">
                <Shield className="w-12 h-12 mx-auto text-primary mb-2" />
                <h3 className="text-xl font-semibold">KYC Documents</h3>
                <p className="text-sm text-muted-foreground">
                  Upload verification documents (You can skip and upload later)
                </p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                <div className="flex gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-700 dark:text-blue-300">
                    <p className="font-medium mb-1">Document Requirements</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Documents should be clear and readable</li>
                      <li>Accepted formats: PDF, JPG, PNG (max 5MB per file)</li>
                      <li>Upload originals or certified copies</li>
                      <li>You can upload documents later from the merchant profile</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Document Upload Area */}
              <div className="space-y-4">
                {KYC_DOCUMENT_TYPES.map(docType => (
                  <div key={docType.value} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-primary" />
                        <span className="font-medium text-sm">{docType.label}</span>
                      </div>

                      {formData.kycDocuments.find(doc => doc.type === docType.value) ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" />
                            Uploaded
                          </span>
                          <button
                            onClick={() => {
                              const doc = formData.kycDocuments.find(d => d.type === docType.value);
                              if (doc) removeDocument(doc.id);
                            }}
                            className="text-xs text-red-600 hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                if (file.size > 5 * 1024 * 1024) {
                                  setMessage({ type: 'error', text: 'File size must be less than 5MB' });
                                  return;
                                }
                                handleFileUpload(file, docType.value);
                              }
                            }}
                            className="hidden"
                          />
                          <div className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-xs hover:bg-primary/90 transition-colors flex items-center gap-1">
                            <Upload className="w-3 h-3" />
                            Upload
                          </div>
                        </label>
                      )}
                    </div>

                    {formData.kycDocuments.find(doc => doc.type === docType.value)?.name && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {formData.kycDocuments.find(doc => doc.type === docType.value)?.name}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <div className="text-center text-sm text-muted-foreground">
                <p>
                  {formData.kycDocuments.length} of {KYC_DOCUMENT_TYPES.length} documents uploaded
                </p>
              </div>
            </div>
          )}

          {/* Step 6: Review & Submit */}
          {currentStep === 6 && (
            <div className="space-y-6 max-w-2xl mx-auto">
              <div className="text-center mb-6">
                <Eye className="w-12 h-12 mx-auto text-primary mb-2" />
                <h3 className="text-xl font-semibold">Review & Submit</h3>
                <p className="text-sm text-muted-foreground">Please review all information before submitting</p>
              </div>

              {/* Business Information Summary */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="w-5 h-5 text-primary" />
                  <h4 className="font-semibold">Business Information</h4>
                  <button
                    onClick={() => goToStep(1)}
                    className="ml-auto text-xs text-primary hover:underline"
                  >
                    Edit
                  </button>
                </div>
                {formData.businessLogo && (
                  <div className="mb-4 flex justify-center">
                    <div className="w-20 h-20 rounded-lg overflow-hidden border-2 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
                      <img
                        src={formData.businessLogo}
                        alt="Business Logo"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Business Name:</span>
                    <p className="font-medium">{formData.businessName}</p>
                  </div>
                  {formData.tradingName && (
                    <div>
                      <span className="text-muted-foreground">Trading Name:</span>
                      <p className="font-medium">{formData.tradingName}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Business Type:</span>
                    <p className="font-medium">{formData.businessType}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Registration #:</span>
                    <p className="font-medium">{formData.registrationNumber}</p>
                  </div>
                </div>
              </div>

              {/* Contact Information Summary */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <User className="w-5 h-5 text-primary" />
                  <h4 className="font-semibold">Contact Information</h4>
                  <button
                    onClick={() => goToStep(2)}
                    className="ml-auto text-xs text-primary hover:underline"
                  >
                    Edit
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Email:</span>
                    <p className="font-medium">{formData.contactInfo.email}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Phone:</span>
                    <p className="font-medium">{formData.contactInfo.phone}</p>
                  </div>
                  {formData.contactInfo.website && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Website:</span>
                      <p className="font-medium">{formData.contactInfo.website}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Address Summary */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-5 h-5 text-primary" />
                  <h4 className="font-semibold">Business Address</h4>
                  <button
                    onClick={() => goToStep(3)}
                    className="ml-auto text-xs text-primary hover:underline"
                  >
                    Edit
                  </button>
                </div>
                <div className="text-sm">
                  <p className="font-medium">{formData.address.street}</p>
                  <p className="text-muted-foreground">
                    {formData.address.city}, {formData.address.region}
                  </p>
                  <p className="text-muted-foreground">
                    {formData.address.country} {formData.address.postalCode}
                  </p>
                </div>
              </div>

              {/* Payment Method Summary */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Wallet className="w-5 h-5 text-primary" />
                  <h4 className="font-semibold">Payment Method</h4>
                  <button
                    onClick={() => goToStep(4)}
                    className="ml-auto text-xs text-primary hover:underline"
                  >
                    Edit
                  </button>
                </div>
                <div className="text-sm">
                  {formData.paymentMethod === 'mobile_money' ? (
                    <>
                      <div className="flex items-center gap-2 mb-2">
                        <Smartphone className="w-4 h-4 text-primary" />
                        <span className="font-medium">Mobile Money - {formData.mobileMoneyWallet?.provider}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-muted-foreground">Number:</span>
                          <p className="font-medium">{formData.mobileMoneyWallet?.number}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Account Name:</span>
                          <p className="font-medium">{formData.mobileMoneyWallet?.accountName}</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-2">
                        <CreditCard className="w-4 h-4 text-primary" />
                        <span className="font-medium">Bank Account</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-muted-foreground">Bank:</span>
                          <p className="font-medium">{formData.bankDetails?.bankName}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Account:</span>
                          <p className="font-medium">{formData.bankDetails?.accountNumber}</p>
                        </div>
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Account Name:</span>
                          <p className="font-medium">{formData.bankDetails?.accountName}</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* KYC Documents Summary */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-5 h-5 text-primary" />
                  <h4 className="font-semibold">KYC Documents</h4>
                  <button
                    onClick={() => goToStep(5)}
                    className="ml-auto text-xs text-primary hover:underline"
                  >
                    Edit
                  </button>
                </div>
                <div className="text-sm">
                  {formData.kycDocuments.length > 0 ? (
                    <ul className="space-y-2">
                      {formData.kycDocuments.map(doc => (
                        <li key={doc.id} className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          <span>{doc.name}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground">No documents uploaded yet</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer with Navigation */}
        <div className="flex items-center justify-between p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
          <button
            onClick={handleBack}
            disabled={currentStep === 1}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          <div className="text-sm text-muted-foreground">
            Step {currentStep} of {STEPS.length}
          </div>

          {currentStep < 6 ? (
            <button
              onClick={handleNext}
              disabled={!validateStep(currentStep)}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {isEditing ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  {isEditing ? 'Update Merchant' : 'Create Merchant'}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
