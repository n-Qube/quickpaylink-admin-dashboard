/**
 * Subscription Plans Management Page - DYNAMIC VERSION
 *
 * Features:
 * - Dynamic feature loading from Firestore
 * - Feature dependency logic (hide disabled features from SystemConfig)
 * - Progressive disclosure (show fields only when relevant)
 * - Collapsible sections by category
 * - Real-time validation and preview panel
 * - Save as draft functionality
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Plus,
  Edit,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Zap,
  Save,
  FileText,
  AlertCircle,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { db, COLLECTIONS } from '@/lib/firebase';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  Timestamp,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import type { SubscriptionPlan, PlatformFeature } from '@/types/database';

type BillingCycle = 'monthly' | 'yearly' | 'quarterly' | 'one_time';

// Category grouping for organized display
const CATEGORY_GROUPS = {
  core_business: 'Core Business Limits',
  communication: 'Communication Limits',
  collaboration: 'Collaboration',
  advanced: 'Advanced Features',
  integration: 'API & Integration',
  customization: 'Customization & Branding',
  support: 'Support Level',
};

export default function SubscriptionPlans() {
  const { admin } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [platformFeatures, setPlatformFeatures] = useState<PlatformFeature[]>([]);
  const [systemConfig, setSystemConfig] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    basic: true,
    pricing: true,
  });

  // Form state - dynamic features
  const [formData, setFormData] = useState<Partial<SubscriptionPlan>>({
    name: '',
    displayName: '',
    description: '',
    tagline: '',
    billingCycle: 'monthly',
    billingCycleDays: 30,
    trialEnabled: false,
    trialDays: 14,
    visible: true,
    featured: false,
    displayOrder: 0,
    active: false, // Draft by default
    availableForNewSignups: true,
    ctaText: 'Get Started',
    highlights: [],
    pricing: {
      GHS: { amount: 0, currency: 'GHS' },
      USD: { amount: 0, currency: 'USD' },
    },
    setupFee: {
      GHS: 0,
      USD: 0,
    },
    features: {},
    limits: {},
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadPlans(),
        loadPlatformFeatures(),
        loadSystemConfig(),
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPlans = async () => {
    try {
      const plansRef = collection(db, COLLECTIONS.SUBSCRIPTION_PLANS);
      const plansSnap = await getDocs(plansRef);

      const plansList: SubscriptionPlan[] = [];
      plansSnap.forEach((doc) => {
        plansList.push({ planId: doc.id, ...doc.data() } as SubscriptionPlan);
      });

      plansList.sort((a, b) => a.displayOrder - b.displayOrder);
      setPlans(plansList);
    } catch (error) {
      console.error('Error loading plans:', error);
    }
  };

  const loadPlatformFeatures = async () => {
    try {
      const featuresRef = collection(db, 'platformFeatures');
      const q = query(
        featuresRef,
        where('active', '==', true)
      );
      const featuresSnap = await getDocs(q);

      const features: PlatformFeature[] = [];
      featuresSnap.forEach((doc) => {
        features.push(doc.data() as PlatformFeature);
      });

      // Sort by displayOrder in memory
      features.sort((a, b) => a.displayOrder - b.displayOrder);

      setPlatformFeatures(features);
    } catch (error) {
      console.error('Error loading platform features:', error);
    }
  };

  const loadSystemConfig = async () => {
    try {
      const configRef = doc(db, COLLECTIONS.SYSTEM_CONFIG, 'platform_config_v1');
      const configSnap = await getDoc(configRef);

      if (configSnap.exists()) {
        const config = configSnap.data();
        setSystemConfig(config.features || {});
      }
    } catch (error) {
      console.error('Error loading system config:', error);
    }
  };

  // Get features filtered by what's enabled in SystemConfig
  const getAvailableFeatures = () => {
    return platformFeatures.filter((feature) => {
      // Check if feature is globally enabled
      const isGloballyEnabled = systemConfig[feature.configKey] !== false;

      // Check dependencies
      if (feature.dependsOn && feature.dependsOn.length > 0) {
        const allDependenciesMet = feature.dependsOn.every((depFeatureId) => {
          const depFeature = platformFeatures.find((f) => f.featureId === depFeatureId);
          return depFeature ? systemConfig[depFeature.configKey] !== false : false;
        });
        return isGloballyEnabled && allDependenciesMet;
      }

      return isGloballyEnabled;
    });
  };

  // Group features by category
  const getFeaturesByCategory = (category: string) => {
    return getAvailableFeatures().filter((f) => f.category === category);
  };

  // Get all available categories
  const getCategories = () => {
    const categories = new Set(getAvailableFeatures().map((f) => f.category));
    return Array.from(categories);
  };

  // Get feature value from formData
  const getFeatureValue = (feature: PlatformFeature) => {
    if (feature.planKey) {
      // Check both features and limits objects
      const fromFeatures = (formData.features as any)?.[feature.planKey];
      const fromLimits = (formData.limits as any)?.[feature.planKey];
      return fromFeatures !== undefined ? fromFeatures : fromLimits;
    }
    return undefined;
  };

  // Update feature value in formData
  const updateFeatureValue = (feature: PlatformFeature, value: any) => {
    if (!feature.planKey) return;

    setFormData((prev) => {
      // Determine if this goes in features or limits based on planType
      const isLimit = feature.planType === 'number' || feature.hasUsageLimit;

      if (isLimit) {
        return {
          ...prev,
          limits: {
            ...prev.limits,
            [feature.planKey!]: value,
          },
        };
      } else {
        return {
          ...prev,
          features: {
            ...prev.features,
            [feature.planKey!]: value,
          },
        };
      }
    });
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name || formData.name.trim() === '') {
      errors.name = 'Plan ID is required';
    }
    if (!formData.displayName || formData.displayName.trim() === '') {
      errors.displayName = 'Display name is required';
    }
    if (!formData.pricing?.GHS?.amount || formData.pricing.GHS.amount <= 0) {
      errors.pricingGHS = 'GHS pricing must be greater than 0';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle create plan
  const handleCreatePlan = async (asDraft: boolean = false) => {
    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);
      const plansRef = collection(db, COLLECTIONS.SUBSCRIPTION_PLANS);

      await addDoc(plansRef, {
        ...formData,
        active: !asDraft, // If draft, set active to false
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        updatedBy: admin?.adminId,
      });

      await loadPlans();
      setShowCreateModal(false);
      resetForm();
    } catch (error) {
      console.error('Error creating plan:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePlan = async (planId: string, updates: Partial<SubscriptionPlan>) => {
    try {
      const planRef = doc(db, COLLECTIONS.SUBSCRIPTION_PLANS, planId);
      await updateDoc(planRef, {
        ...updates,
        updatedAt: Timestamp.now(),
        updatedBy: admin?.adminId,
      });

      await loadPlans();
    } catch (error) {
      console.error('Error updating plan:', error);
    }
  };

  const handleTogglePlanStatus = async (plan: SubscriptionPlan) => {
    await handleUpdatePlan(plan.planId, { active: !plan.active });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      displayName: '',
      description: '',
      tagline: '',
      billingCycle: 'monthly',
      billingCycleDays: 30,
      trialEnabled: false,
      trialDays: 14,
      visible: true,
      featured: false,
      displayOrder: 0,
      active: false,
      availableForNewSignups: true,
      ctaText: 'Get Started',
      highlights: [],
      pricing: {
        GHS: { amount: 0, currency: 'GHS' },
        USD: { amount: 0, currency: 'USD' },
      },
      setupFee: {
        GHS: 0,
        USD: 0,
      },
      features: {},
      limits: {},
    });
    setValidationErrors({});
  };

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const formatCurrency = (amount: number, currency: string = 'GHS') => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <DollarSign className="h-12 w-12 animate-pulse text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Loading subscription plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Subscription Plans</h1>
          <p className="text-muted-foreground">
            Manage pricing, features, and limits for subscription tiers
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} size="lg">
          <Plus className="mr-2 h-4 w-4" />
          Create New Plan
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Plans</p>
                <p className="text-2xl font-bold">{plans.length}</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Plans</p>
                <p className="text-2xl font-bold text-green-600">
                  {plans.filter((p) => p.active).length}
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Featured Plans</p>
                <p className="text-2xl font-bold text-purple-600">
                  {plans.filter((p) => p.featured).length}
                </p>
              </div>
              <Zap className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Draft Plans</p>
                <p className="text-2xl font-bold text-orange-600">
                  {plans.filter((p) => !p.active).length}
                </p>
              </div>
              <FileText className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plans List or Empty State */}
      {plans.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-primary/10 p-6 mb-4">
              <DollarSign className="h-12 w-12 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No Subscription Plans Yet</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              Get started by creating your first subscription plan. Define pricing, features, and limits to offer to your merchants.
            </p>
            <Button onClick={() => setShowCreateModal(true)} size="lg">
              <Plus className="mr-2 h-5 w-5" />
              Create Your First Plan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card
              key={plan.planId}
              className={`transition-all hover:shadow-lg ${!plan.active ? 'opacity-60 hover:opacity-100' : ''} ${plan.featured ? 'border-primary border-2' : ''}`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2 mb-1">
                      {plan.displayName}
                      {plan.featured && (
                        <Badge variant="default" className="text-xs">
                          <Zap className="h-3 w-3 mr-1" />
                          Featured
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="text-sm">
                      {plan.tagline || plan.description}
                    </CardDescription>
                  </div>
                  <Switch
                    checked={plan.active}
                    onCheckedChange={() => handleTogglePlanStatus(plan)}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Pricing Display */}
                  <div className="border-t border-b py-4">
                    <div className="flex items-baseline gap-1">
                      <p className="text-4xl font-bold">
                        {formatCurrency(plan.pricing.GHS.amount, 'GHS')}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      per {plan.billingCycle}
                    </p>
                    {plan.pricing.USD?.amount && plan.pricing.USD.amount > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        or {formatCurrency(plan.pricing.USD.amount, 'USD')}
                      </p>
                    )}
                  </div>

                  {/* Plan Status Badges */}
                  <div className="flex flex-wrap gap-2">
                    {plan.active ? (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-orange-600 border-orange-600">
                        <FileText className="h-3 w-3 mr-1" />
                        Draft
                      </Badge>
                    )}
                    {plan.trialEnabled && (
                      <Badge variant="outline" className="text-blue-600 border-blue-600">
                        {plan.trialDays}-day trial
                      </Badge>
                    )}
                    {plan.visible && (
                      <Badge variant="outline">
                        Visible
                      </Badge>
                    )}
                  </div>

                  {/* Feature Count */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Zap className="h-4 w-4" />
                    <span>
                      {Object.values(plan.features || {}).filter((v) => v === true).length} features enabled
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Edit className="mr-2 h-3 w-3" />
                      Edit
                    </Button>
                    <Button
                      variant={plan.active ? 'outline' : 'default'}
                      size="sm"
                      onClick={() => handleTogglePlanStatus(plan)}
                    >
                      {plan.active ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Plan Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 overflow-y-auto p-4">
          <div className="bg-background rounded-lg shadow-xl w-full max-w-6xl my-8">
            <div className="sticky top-0 bg-background border-b p-6 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Create New Subscription Plan</h2>
                  <p className="text-muted-foreground">
                    Configure pricing, features, and limits for a new plan
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleCreatePlan(true)}
                    disabled={saving}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Save as Draft
                  </Button>
                  <Button
                    onClick={() => handleCreatePlan(false)}
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <Save className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Create Plan
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
              {/* Main Form - 2 columns */}
              <div className="lg:col-span-2 space-y-6">
                {/* Basic Information */}
                <Collapsible
                  open={openSections.basic}
                  onOpenChange={() => toggleSection('basic')}
                >
                  <Card>
                    <CollapsibleTrigger className="w-full">
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">Basic Information</CardTitle>
                          {openSections.basic ? (
                            <ChevronUp className="h-5 w-5" />
                          ) : (
                            <ChevronDown className="h-5 w-5" />
                          )}
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="planId">
                              Plan ID <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id="planId"
                              placeholder="e.g., starter, professional"
                              value={formData.name || ''}
                              onChange={(e) =>
                                setFormData({ ...formData, name: e.target.value })
                              }
                            />
                            {validationErrors.name && (
                              <p className="text-xs text-red-500">
                                {validationErrors.name}
                              </p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="displayName">
                              Display Name <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id="displayName"
                              placeholder="e.g., Starter Plan"
                              value={formData.displayName || ''}
                              onChange={(e) =>
                                setFormData({ ...formData, displayName: e.target.value })
                              }
                            />
                            {validationErrors.displayName && (
                              <p className="text-xs text-red-500">
                                {validationErrors.displayName}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="tagline">Tagline</Label>
                          <Input
                            id="tagline"
                            placeholder="e.g., Perfect for small businesses"
                            value={formData.tagline || ''}
                            onChange={(e) =>
                              setFormData({ ...formData, tagline: e.target.value })
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="description">Description</Label>
                          <Input
                            id="description"
                            placeholder="Detailed plan description"
                            value={formData.description || ''}
                            onChange={(e) =>
                              setFormData({ ...formData, description: e.target.value })
                            }
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="displayOrder">Display Order</Label>
                            <Input
                              id="displayOrder"
                              type="number"
                              min={0}
                              value={formData.displayOrder || 0}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  displayOrder: parseInt(e.target.value) || 0,
                                })
                              }
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="ctaText">CTA Button Text</Label>
                            <Input
                              id="ctaText"
                              placeholder="Get Started"
                              value={formData.ctaText || ''}
                              onChange={(e) =>
                                setFormData({ ...formData, ctaText: e.target.value })
                              }
                            />
                          </div>
                        </div>

                        <div className="flex items-center space-x-6">
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={formData.featured || false}
                              onCheckedChange={(checked) =>
                                setFormData({ ...formData, featured: checked })
                              }
                            />
                            <Label>Featured Plan</Label>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={formData.visible !== false}
                              onCheckedChange={(checked) =>
                                setFormData({ ...formData, visible: checked })
                              }
                            />
                            <Label>Visible to Public</Label>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={formData.availableForNewSignups !== false}
                              onCheckedChange={(checked) =>
                                setFormData({
                                  ...formData,
                                  availableForNewSignups: checked,
                                })
                              }
                            />
                            <Label>Available for New Signups</Label>
                          </div>
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>

                {/* Pricing */}
                <Collapsible
                  open={openSections.pricing}
                  onOpenChange={() => toggleSection('pricing')}
                >
                  <Card>
                    <CollapsibleTrigger className="w-full">
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">Pricing</CardTitle>
                          {openSections.pricing ? (
                            <ChevronUp className="h-5 w-5" />
                          ) : (
                            <ChevronDown className="h-5 w-5" />
                          )}
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="billingCycle">Billing Cycle</Label>
                            <select
                              id="billingCycle"
                              value={formData.billingCycle || 'monthly'}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  billingCycle: e.target.value as BillingCycle,
                                })
                              }
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <option value="monthly">Monthly</option>
                              <option value="yearly">Yearly</option>
                              <option value="quarterly">Quarterly</option>
                              <option value="one_time">One-Time</option>
                            </select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="billingCycleDays">Billing Cycle (Days)</Label>
                            <Input
                              id="billingCycleDays"
                              type="number"
                              min={1}
                              value={formData.billingCycleDays || 30}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  billingCycleDays: parseInt(e.target.value) || 30,
                                })
                              }
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="priceGHS">
                              Price (GHS) <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id="priceGHS"
                              type="number"
                              min={0}
                              step={0.01}
                              placeholder="0.00"
                              value={formData.pricing?.GHS?.amount || 0}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  pricing: {
                                    ...formData.pricing,
                                    GHS: {
                                      amount: parseFloat(e.target.value) || 0,
                                      currency: 'GHS',
                                    },
                                  },
                                })
                              }
                            />
                            {validationErrors.pricingGHS && (
                              <p className="text-xs text-red-500">
                                {validationErrors.pricingGHS}
                              </p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="priceUSD">Price (USD)</Label>
                            <Input
                              id="priceUSD"
                              type="number"
                              min={0}
                              step={0.01}
                              placeholder="0.00"
                              value={formData.pricing?.USD?.amount || 0}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  pricing: {
                                    ...formData.pricing,
                                    USD: {
                                      amount: parseFloat(e.target.value) || 0,
                                      currency: 'USD',
                                    },
                                  },
                                })
                              }
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="setupFeeGHS">Setup Fee (GHS)</Label>
                            <Input
                              id="setupFeeGHS"
                              type="number"
                              min={0}
                              step={0.01}
                              placeholder="0.00"
                              value={formData.setupFee?.GHS || 0}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  setupFee: {
                                    ...formData.setupFee,
                                    GHS: parseFloat(e.target.value) || 0,
                                  },
                                })
                              }
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="setupFeeUSD">Setup Fee (USD)</Label>
                            <Input
                              id="setupFeeUSD"
                              type="number"
                              min={0}
                              step={0.01}
                              placeholder="0.00"
                              value={formData.setupFee?.USD || 0}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  setupFee: {
                                    ...formData.setupFee,
                                    USD: parseFloat(e.target.value) || 0,
                                  },
                                })
                              }
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={formData.trialEnabled || false}
                              onCheckedChange={(checked) =>
                                setFormData({ ...formData, trialEnabled: checked })
                              }
                            />
                            <Label>Enable Free Trial</Label>
                          </div>

                          {/* Progressive Disclosure: Show trial days only when trial is enabled */}
                          {formData.trialEnabled && (
                            <div className="ml-6 space-y-2">
                              <Label htmlFor="trialDays">Trial Days</Label>
                              <Input
                                id="trialDays"
                                type="number"
                                min={1}
                                value={formData.trialDays || 14}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    trialDays: parseInt(e.target.value) || 14,
                                  })
                                }
                              />
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>

                {/* Dynamic Features by Category */}
                {getCategories().map((category) => {
                  const categoryFeatures = getFeaturesByCategory(category);
                  const categoryLabel =
                    CATEGORY_GROUPS[category as keyof typeof CATEGORY_GROUPS] || category;
                  const sectionKey = `features_${category}`;

                  return (
                    <Collapsible
                      key={category}
                      open={openSections[sectionKey]}
                      onOpenChange={() => toggleSection(sectionKey)}
                    >
                      <Card>
                        <CollapsibleTrigger className="w-full">
                          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <CardTitle className="text-lg">{categoryLabel}</CardTitle>
                                <Badge variant="outline" className="text-xs">
                                  {categoryFeatures.length} features
                                </Badge>
                              </div>
                              {openSections[sectionKey] ? (
                                <ChevronUp className="h-5 w-5" />
                              ) : (
                                <ChevronDown className="h-5 w-5" />
                              )}
                            </div>
                          </CardHeader>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <CardContent className="space-y-4">
                            {categoryFeatures.map((feature) => {
                              const featureValue = getFeatureValue(feature);
                              const isEnabled =
                                feature.planType === 'boolean'
                                  ? featureValue === true
                                  : true;

                              return (
                                <div key={feature.featureId} className="space-y-2">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <Label>{feature.displayName}</Label>
                                        {feature.dependsOn && feature.dependsOn.length > 0 && (
                                          <Badge variant="outline" className="text-xs">
                                            <Info className="h-3 w-3 mr-1" />
                                            Has dependencies
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-xs text-muted-foreground">
                                        {feature.description}
                                      </p>
                                      {feature.dependsOn && feature.dependsOn.length > 0 && (
                                        <p className="text-xs text-amber-600 mt-1">
                                          Requires: {feature.dependsOn.join(', ')}
                                        </p>
                                      )}
                                    </div>

                                    {/* Render based on planType */}
                                    {feature.planType === 'boolean' ? (
                                      <Switch
                                        checked={featureValue === true}
                                        onCheckedChange={(checked) =>
                                          updateFeatureValue(feature, checked)
                                        }
                                      />
                                    ) : (
                                      <div className="w-32">
                                        <Input
                                          type="number"
                                          min={0}
                                          placeholder={feature.defaultLimit?.toString() || '0'}
                                          value={featureValue || ''}
                                          onChange={(e) =>
                                            updateFeatureValue(
                                              feature,
                                              e.target.value === 'unlimited'
                                                ? 'unlimited'
                                                : parseInt(e.target.value) || 0
                                            )
                                          }
                                        />
                                        {feature.usageLimitUnit && (
                                          <p className="text-xs text-muted-foreground mt-1">
                                            {feature.usageLimitUnit}
                                          </p>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  {/* Progressive Disclosure: Show additional config only when feature is enabled */}
                                  {feature.planType === 'boolean' && isEnabled && feature.hasUsageLimit && (
                                    <div className="ml-6 space-y-2 p-3 bg-muted/30 rounded-md">
                                      <Label className="text-sm">
                                        {feature.displayName} Limit
                                      </Label>
                                      <Input
                                        type="number"
                                        min={0}
                                        placeholder={feature.defaultLimit?.toString() || '0'}
                                        value={
                                          (formData.limits as any)?.[feature.planKey!] || ''
                                        }
                                        onChange={(e) => {
                                          setFormData({
                                            ...formData,
                                            limits: {
                                              ...formData.limits,
                                              [feature.planKey!]:
                                                parseInt(e.target.value) || 0,
                                            },
                                          });
                                        }}
                                      />
                                      <p className="text-xs text-muted-foreground">
                                        {feature.usageLimitUnit || 'per month'}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  );
                })}
              </div>

              {/* Preview Panel - 1 column */}
              <div className="lg:col-span-1">
                <div className="sticky top-24 space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Zap className="h-5 w-5" />
                        Plan Preview
                      </CardTitle>
                      <CardDescription>Live preview of your plan</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Plan Name */}
                      <div>
                        <p className="text-sm text-muted-foreground">Plan Name</p>
                        <p className="text-xl font-bold">
                          {formData.displayName || 'Untitled Plan'}
                        </p>
                        {formData.tagline && (
                          <p className="text-sm text-muted-foreground">{formData.tagline}</p>
                        )}
                      </div>

                      {/* Pricing */}
                      <div>
                        <p className="text-sm text-muted-foreground">Pricing</p>
                        <p className="text-3xl font-bold">
                          {formatCurrency(
                            formData.pricing?.GHS?.amount || 0,
                            'GHS'
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          per {formData.billingCycle}
                        </p>
                        {formData.pricing?.USD?.amount && formData.pricing.USD.amount > 0 && (
                          <p className="text-sm text-muted-foreground">
                            or {formatCurrency(formData.pricing.USD.amount, 'USD')}
                          </p>
                        )}
                      </div>

                      {/* Setup Fee */}
                      {(formData.setupFee?.GHS || 0) > 0 && (
                        <div>
                          <p className="text-sm text-muted-foreground">Setup Fee</p>
                          <p className="text-lg font-semibold">
                            {formatCurrency(formData.setupFee?.GHS || 0, 'GHS')}
                          </p>
                        </div>
                      )}

                      {/* Trial */}
                      {formData.trialEnabled && (
                        <Alert>
                          <CheckCircle2 className="h-4 w-4" />
                          <AlertDescription>
                            {formData.trialDays || 14}-day free trial included
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Enabled Features Count */}
                      <div>
                        <p className="text-sm text-muted-foreground">Enabled Features</p>
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4 text-primary" />
                          <p className="text-lg font-semibold">
                            {Object.values(formData.features || {}).filter((v) => v === true)
                              .length}{' '}
                            features
                          </p>
                        </div>
                      </div>

                      {/* Validation Errors */}
                      {Object.keys(validationErrors).length > 0 && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            <p className="font-semibold">Please fix the following errors:</p>
                            <ul className="list-disc list-inside mt-2 text-sm">
                              {Object.values(validationErrors).map((error, index) => (
                                <li key={index}>{error}</li>
                              ))}
                            </ul>
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Status Badges */}
                      <div className="flex flex-wrap gap-2">
                        {formData.featured && (
                          <Badge variant="default">Featured</Badge>
                        )}
                        {formData.visible !== false && (
                          <Badge variant="outline">Visible</Badge>
                        )}
                        {formData.availableForNewSignups !== false && (
                          <Badge variant="outline">Available for Signup</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Info Alert */}
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Only features enabled in System Configuration are available to configure
                      here. Features with dependencies require their parent features to be
                      enabled first.
                    </AlertDescription>
                  </Alert>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
