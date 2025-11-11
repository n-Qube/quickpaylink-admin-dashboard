/**
 * System Configuration Page - DYNAMIC VERSION
 *
 * Loads features dynamically from Firestore platformFeatures collection
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  collection,
  getDocs,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db, COLLECTIONS } from '@/lib/firebase';
import { Settings, Globe, Shield, Zap, Save, AlertCircle, CheckCircle2, DollarSign, Percent, Coins, TrendingDown, TrendingUp, Info, Calculator } from 'lucide-react';
import type { TaxRule, PlatformFeature } from '@/types/database';

interface SystemConfig {
  configId: string;
  version: string;
  features: Record<string, boolean>; // Dynamic feature flags
  platformSettings: {
    maintenanceMode: boolean;
    maintenanceMessage?: string;
    allowNewMerchantSignup: boolean;
    maxMerchantsLimit: number;
  };
  defaults: {
    currency: string;
    country: string;
    language: string;
    timezone: string;
    taxRate: number;
  };
  rateLimits: {
    otpPerHour: number;
    apiCallsPerMinute: number;
    whatsappMessagesPerDay: number;
  };
  transactionFees: {
    domestic: {
      percentage: number;
      fixed: number;
      minimum: number;
      maximum: number;
    };
    international: {
      percentage: number;
      fixed: number;
      minimum: number;
      maximum: number;
    };
  };
  updatedAt?: any;
  updatedBy?: string;
}

// Category metadata for display
const CATEGORY_INFO: Record<string, { title: string; description: string }> = {
  core_business: {
    title: 'Core Business Features',
    description: 'Essential features for business operations',
  },
  communication: {
    title: 'Communication Features',
    description: 'WhatsApp, Email, and SMS messaging capabilities',
  },
  advanced: {
    title: 'Advanced Features',
    description: 'AI, Analytics, and Enterprise capabilities',
  },
  integration: {
    title: 'Integration Features',
    description: 'API access and webhook integrations',
  },
  collaboration: {
    title: 'Collaboration Features',
    description: 'Team management and role-based access control',
  },
  customization: {
    title: 'Customization Features',
    description: 'Branding, themes, and white-label options',
  },
  support: {
    title: 'Support Features',
    description: 'Premium support and account management',
  },
};

export default function SystemConfig() {
  const { admin } = useAuth();
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [platformFeatures, setPlatformFeatures] = useState<PlatformFeature[]>([]);
  const [taxRules, setTaxRules] = useState<TaxRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  // Load system configuration, platform features, and tax rules
  useEffect(() => {
    loadConfig();
    loadPlatformFeatures();
    loadTaxRules();
  }, []);

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
    } catch (err: any) {
      console.error('Error loading platform features:', err);
      setError(err.message || 'Failed to load platform features');
    }
  };

  const loadConfig = async () => {
    try {
      setLoading(true);
      setError(null);

      const configRef = doc(db, COLLECTIONS.SYSTEM_CONFIG, 'platform_config_v1');
      const configSnap = await getDoc(configRef);

      if (configSnap.exists()) {
        setConfig(configSnap.data() as SystemConfig);
      } else {
        // Initialize with default config if doesn't exist
        const defaultConfig: SystemConfig = {
          configId: 'platform_config_v1',
          version: '2.0.0',
          features: {},
          platformSettings: {
            maintenanceMode: false,
            maintenanceMessage: '',
            allowNewMerchantSignup: true,
            maxMerchantsLimit: 10000,
          },
          defaults: {
            currency: 'GHS',
            country: 'GH',
            language: 'en',
            timezone: 'Africa/Accra',
            taxRate: 0.125,
          },
          rateLimits: {
            otpPerHour: 3,
            apiCallsPerMinute: 100,
            whatsappMessagesPerDay: 1000,
          },
          transactionFees: {
            domestic: {
              percentage: 2.5,
              fixed: 0.3,
              minimum: 0.1,
              maximum: 50.0,
            },
            international: {
              percentage: 3.5,
              fixed: 0.5,
              minimum: 0.2,
              maximum: 100.0,
            },
          },
        };
        setConfig(defaultConfig);
      }
    } catch (err: any) {
      console.error('Error loading config:', err);
      setError(err.message || 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!config || !admin) return;

    try {
      setSaving(true);
      setSaveStatus('idle');
      setError(null);

      const configRef = doc(db, COLLECTIONS.SYSTEM_CONFIG, 'platform_config_v1');

      // Check if document exists
      const configSnap = await getDoc(configRef);

      if (configSnap.exists()) {
        await updateDoc(configRef, {
          ...config,
          updatedAt: serverTimestamp(),
          updatedBy: admin.adminId,
        });
      } else {
        await setDoc(configRef, {
          ...config,
          updatedAt: serverTimestamp(),
          updatedBy: admin.adminId,
        });
      }

      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err: any) {
      console.error('Error saving config:', err);
      setError(err.message || 'Failed to save configuration');
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const updateFeature = (featureKey: string, value: boolean) => {
    if (!config) return;
    setConfig({
      ...config,
      features: {
        ...config.features,
        [featureKey]: value,
      },
    });
  };

  const updatePlatformSetting = (
    setting: keyof SystemConfig['platformSettings'],
    value: any
  ) => {
    if (!config) return;
    setConfig({
      ...config,
      platformSettings: {
        ...config.platformSettings,
        [setting]: value,
      },
    });
  };

  const loadTaxRules = async () => {
    try {
      const taxRulesRef = collection(db, COLLECTIONS.TAX_RULES);
      const taxRulesSnap = await getDocs(taxRulesRef);
      const rulesList: TaxRule[] = [];
      taxRulesSnap.forEach((doc) => {
        rulesList.push({ ruleId: doc.id, ...doc.data() } as TaxRule);
      });
      setTaxRules(rulesList.filter((rule) => rule.isActive));
    } catch (err: any) {
      console.error('Error loading tax rules:', err);
    }
  };

  const updateDefault = (key: keyof SystemConfig['defaults'], value: any) => {
    if (!config) return;

    setConfig({
      ...config,
      defaults: {
        ...config.defaults,
        [key]: value,
      },
    });
  };

  const getCountryTaxRules = () => {
    if (!config) return [];
    return taxRules.filter((rule) => rule.countryCode === config.defaults.country);
  };

  const updateTaxRateFromRule = (ruleId: string) => {
    if (!config) return;
    const selectedRule = taxRules.find((rule) => rule.ruleId === ruleId);
    if (selectedRule) {
      setConfig({
        ...config,
        defaults: {
          ...config.defaults,
          taxRate: selectedRule.rate / 100,
        },
      });
    }
  };

  const updateRateLimit = (key: keyof SystemConfig['rateLimits'], value: number) => {
    if (!config) return;
    setConfig({
      ...config,
      rateLimits: {
        ...config.rateLimits,
        [key]: value,
      },
    });
  };

  const updateTransactionFee = (
    type: 'domestic' | 'international',
    key: keyof SystemConfig['transactionFees']['domestic'],
    value: number
  ) => {
    if (!config) return;
    setConfig({
      ...config,
      transactionFees: {
        ...config.transactionFees,
        [type]: {
          ...config.transactionFees[type],
          [key]: value,
        },
      },
    });
  };

  // Group features by category
  const getFeaturesByCategory = (category: string) => {
    return platformFeatures.filter((feature) => feature.category === category);
  };

  // Get all unique categories in display order
  const getCategories = () => {
    const categories = new Set(platformFeatures.map((f) => f.category));
    return Array.from(categories);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Settings className="h-12 w-12 animate-spin text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Loading system configuration...</p>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Failed to load system configuration.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Configuration</h1>
          <p className="text-muted-foreground">
            Manage global platform settings and feature flags
          </p>
        </div>
        <Button onClick={saveConfig} disabled={saving}>
          {saving ? (
            <>
              <Settings className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {/* Save Status Alert */}
      {saveStatus === 'success' && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Configuration saved successfully!
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Configuration Tabs */}
      <Tabs defaultValue="features" className="space-y-6">
        <TabsList>
          <TabsTrigger value="features">
            <Zap className="mr-2 h-4 w-4" />
            Features
          </TabsTrigger>
          <TabsTrigger value="platform">
            <Settings className="mr-2 h-4 w-4" />
            Platform
          </TabsTrigger>
          <TabsTrigger value="defaults">
            <Globe className="mr-2 h-4 w-4" />
            Defaults
          </TabsTrigger>
          <TabsTrigger value="fees">
            <DollarSign className="mr-2 h-4 w-4" />
            Transaction Fees
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="mr-2 h-4 w-4" />
            Rate Limits
          </TabsTrigger>
        </TabsList>

        {/* Feature Flags Tab - DYNAMIC */}
        <TabsContent value="features">
          <div className="space-y-6">
            {getCategories().map((category) => {
              const categoryFeatures = getFeaturesByCategory(category);
              const categoryInfo = CATEGORY_INFO[category] || {
                title: category,
                description: '',
              };

              return (
                <Card key={category}>
                  <CardHeader>
                    <CardTitle>{categoryInfo.title}</CardTitle>
                    <CardDescription>{categoryInfo.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {categoryFeatures.map((feature) => (
                      <div key={feature.featureId} className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>{feature.displayName}</Label>
                          <p className="text-sm text-muted-foreground">
                            {feature.description}
                          </p>
                          {feature.dependsOn && feature.dependsOn.length > 0 && (
                            <p className="text-xs text-amber-600">
                              Requires: {feature.dependsOn.join(', ')}
                            </p>
                          )}
                        </div>
                        <Switch
                          checked={config.features[feature.configKey] || false}
                          onCheckedChange={(checked) =>
                            updateFeature(feature.configKey, checked)
                          }
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Platform Settings Tab */}
        <TabsContent value="platform">
          <Card>
            <CardHeader>
              <CardTitle>Platform Settings</CardTitle>
              <CardDescription>Global platform operational settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Maintenance Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Put the platform in maintenance mode (admins can still access)
                  </p>
                </div>
                <Switch
                  checked={config.platformSettings.maintenanceMode}
                  onCheckedChange={(checked) =>
                    updatePlatformSetting('maintenanceMode', checked)
                  }
                />
              </div>

              {config.platformSettings.maintenanceMode && (
                <div className="space-y-2">
                  <Label htmlFor="maintenanceMessage">Maintenance Message</Label>
                  <Input
                    id="maintenanceMessage"
                    value={config.platformSettings.maintenanceMessage || ''}
                    onChange={(e) =>
                      updatePlatformSetting('maintenanceMessage', e.target.value)
                    }
                    placeholder="System under maintenance. We'll be back soon!"
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow New Merchant Signup</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable new merchants to sign up for the platform
                  </p>
                </div>
                <Switch
                  checked={config.platformSettings.allowNewMerchantSignup}
                  onCheckedChange={(checked) =>
                    updatePlatformSetting('allowNewMerchantSignup', checked)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxMerchants">Maximum Merchants Limit</Label>
                <Input
                  id="maxMerchants"
                  type="number"
                  value={config.platformSettings.maxMerchantsLimit}
                  onChange={(e) =>
                    updatePlatformSetting('maxMerchantsLimit', parseInt(e.target.value) || 0)
                  }
                  min={0}
                />
                <p className="text-sm text-muted-foreground">
                  Scalability limit for total merchants on the platform
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Default Values Tab */}
        <TabsContent value="defaults">
          <Card>
            <CardHeader>
              <CardTitle>Default Values</CardTitle>
              <CardDescription>
                Default settings for new merchants and system defaults
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="defaultCurrency">Default Currency</Label>
                  <select
                    id="defaultCurrency"
                    value={config.defaults.currency}
                    onChange={(e) => updateDefault('currency', e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="GHS">GHS - Ghanaian Cedi</option>
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="NGN">NGN - Nigerian Naira</option>
                    <option value="ZAR">ZAR - South African Rand</option>
                    <option value="KES">KES - Kenyan Shilling</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="defaultCountry">Default Country</Label>
                  <select
                    id="defaultCountry"
                    value={config.defaults.country}
                    onChange={(e) => updateDefault('country', e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="GH">GH - Ghana</option>
                    <option value="NG">NG - Nigeria</option>
                    <option value="KE">KE - Kenya</option>
                    <option value="ZA">ZA - South Africa</option>
                    <option value="US">US - United States</option>
                    <option value="GB">GB - United Kingdom</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="defaultLanguage">Default Language</Label>
                  <select
                    id="defaultLanguage"
                    value={config.defaults.language}
                    onChange={(e) => updateDefault('language', e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="en">English</option>
                    <option value="fr">Français (French)</option>
                    <option value="es">Español (Spanish)</option>
                    <option value="pt">Português (Portuguese)</option>
                    <option value="ar">العربية (Arabic)</option>
                    <option value="sw">Kiswahili (Swahili)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="defaultTimezone">Default Timezone</Label>
                  <select
                    id="defaultTimezone"
                    value={config.defaults.timezone}
                    onChange={(e) => updateDefault('timezone', e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="Africa/Accra">Africa/Accra (GMT)</option>
                    <option value="Africa/Lagos">Africa/Lagos (WAT)</option>
                    <option value="Africa/Nairobi">Africa/Nairobi (EAT)</option>
                    <option value="Africa/Johannesburg">Africa/Johannesburg (SAST)</option>
                    <option value="Africa/Cairo">Africa/Cairo (EET)</option>
                    <option value="Europe/London">Europe/London (GMT/BST)</option>
                    <option value="America/New_York">America/New_York (EST/EDT)</option>
                    <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
                    <option value="UTC">UTC</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="defaultTaxRate">Default Tax Rate</Label>
                  {getCountryTaxRules().length > 0 ? (
                    <>
                      <select
                        id="defaultTaxRate"
                        onChange={(e) => updateTaxRateFromRule(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">
                          Select a tax rule for {config.defaults.country}
                        </option>
                        {getCountryTaxRules().map((rule) => (
                          <option key={rule.ruleId} value={rule.ruleId}>
                            {rule.name} - {rule.rate}% ({rule.taxType})
                          </option>
                        ))}
                      </select>
                      <p className="text-sm text-muted-foreground">
                        Current: {(config.defaults.taxRate * 100).toFixed(2)}%
                        {getCountryTaxRules().length > 1 && (
                          <span className="ml-2 text-blue-600">
                            ({getCountryTaxRules().length} tax rules available for{' '}
                            {config.defaults.country})
                          </span>
                        )}
                      </p>
                    </>
                  ) : (
                    <>
                      <Input
                        id="defaultTaxRate"
                        type="number"
                        step="0.001"
                        value={config.defaults.taxRate}
                        onChange={(e) =>
                          updateDefault('taxRate', parseFloat(e.target.value) || 0)
                        }
                        placeholder="0.125"
                      />
                      <p className="text-sm text-muted-foreground">
                        Current: {(config.defaults.taxRate * 100).toFixed(2)}%
                        <span className="ml-2 text-amber-600">
                          (No tax rules configured for {config.defaults.country})
                        </span>
                      </p>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transaction Fees Tab */}
        <TabsContent value="fees">
          <div className="space-y-6">
            {/* Domestic Transaction Fees */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Domestic Transaction Fees
                    </CardTitle>
                    <CardDescription>
                      Fees charged for local (GHS) transactions processed through the platform
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Currency:</span>
                    <span className="font-semibold px-2 py-1 bg-primary/10 rounded">GHS</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Percentage Fee */}
                  <div className="space-y-3">
                    <Label htmlFor="domesticPercentage" className="flex items-center gap-2">
                      <Percent className="h-4 w-4 text-primary" />
                      Percentage Fee
                    </Label>
                    <div className="relative">
                      <Input
                        id="domesticPercentage"
                        type="number"
                        step="0.01"
                        value={config.transactionFees.domestic.percentage}
                        onChange={(e) =>
                          updateTransactionFee(
                            'domestic',
                            'percentage',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        min={0}
                        max={100}
                        className="pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        %
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Info className="h-3 w-3" />
                      <span>Applied to transaction amount</span>
                    </div>
                  </div>

                  {/* Fixed Fee */}
                  <div className="space-y-3">
                    <Label htmlFor="domesticFixed" className="flex items-center gap-2">
                      <Coins className="h-4 w-4 text-primary" />
                      Fixed Fee
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        GHS
                      </span>
                      <Input
                        id="domesticFixed"
                        type="number"
                        step="0.01"
                        value={config.transactionFees.domestic.fixed}
                        onChange={(e) =>
                          updateTransactionFee(
                            'domestic',
                            'fixed',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        min={0}
                        className="pl-14"
                      />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Info className="h-3 w-3" />
                      <span>Added to each transaction</span>
                    </div>
                  </div>

                  {/* Minimum Fee */}
                  <div className="space-y-3">
                    <Label htmlFor="domesticMinimum" className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-orange-500" />
                      Minimum Fee
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        GHS
                      </span>
                      <Input
                        id="domesticMinimum"
                        type="number"
                        step="0.01"
                        value={config.transactionFees.domestic.minimum}
                        onChange={(e) =>
                          updateTransactionFee(
                            'domestic',
                            'minimum',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        min={0}
                        className="pl-14"
                      />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Info className="h-3 w-3" />
                      <span>Floor limit per transaction</span>
                    </div>
                  </div>

                  {/* Maximum Fee */}
                  <div className="space-y-3">
                    <Label htmlFor="domesticMaximum" className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      Maximum Fee
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        GHS
                      </span>
                      <Input
                        id="domesticMaximum"
                        type="number"
                        step="0.01"
                        value={config.transactionFees.domestic.maximum}
                        onChange={(e) =>
                          updateTransactionFee(
                            'domestic',
                            'maximum',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        min={0}
                        className="pl-14"
                      />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Info className="h-3 w-3" />
                      <span>Ceiling limit per transaction</span>
                    </div>
                  </div>
                </div>

                {/* Fee Calculation Example */}
                <Card className="bg-muted/50 border-primary/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calculator className="h-4 w-4" />
                      Example Calculation
                    </CardTitle>
                    <CardDescription className="text-xs">
                      For a GHS 1,000 transaction
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-2 text-sm">
                      <div className="flex items-center justify-between p-2 bg-background rounded">
                        <span className="text-muted-foreground">Percentage Fee</span>
                        <span className="font-mono">
                          GHS 1,000 × {config.transactionFees.domestic.percentage}% = GHS{' '}
                          {((1000 * config.transactionFees.domestic.percentage) / 100).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-background rounded">
                        <span className="text-muted-foreground">Fixed Fee</span>
                        <span className="font-mono">
                          GHS {config.transactionFees.domestic.fixed.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-background rounded">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="font-mono">
                          GHS{' '}
                          {(
                            (1000 * config.transactionFees.domestic.percentage) / 100 +
                            config.transactionFees.domestic.fixed
                          ).toFixed(2)}
                        </span>
                      </div>
                      <div className="border-t pt-2 flex items-center justify-between p-2 bg-primary/5 rounded font-semibold">
                        <span>Total Fee (with limits)</span>
                        <span className="font-mono text-primary">
                          GHS{' '}
                          {Math.min(
                            Math.max(
                              (1000 * config.transactionFees.domestic.percentage) / 100 +
                                config.transactionFees.domestic.fixed,
                              config.transactionFees.domestic.minimum
                            ),
                            config.transactionFees.domestic.maximum
                          ).toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 p-2 bg-blue-500/10 rounded text-xs">
                      <Info className="h-3 w-3 text-blue-500 mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">
                        Fee is capped between GHS {config.transactionFees.domestic.minimum.toFixed(2)} (min)
                        and GHS {config.transactionFees.domestic.maximum.toFixed(2)} (max)
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>

            {/* International Transaction Fees */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      International Transaction Fees
                    </CardTitle>
                    <CardDescription>
                      Fees charged for cross-border transactions (USD, EUR, etc.)
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Base Currency:</span>
                    <span className="font-semibold px-2 py-1 bg-primary/10 rounded">GHS</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Percentage Fee */}
                  <div className="space-y-3">
                    <Label htmlFor="internationalPercentage" className="flex items-center gap-2">
                      <Percent className="h-4 w-4 text-primary" />
                      Percentage Fee
                    </Label>
                    <div className="relative">
                      <Input
                        id="internationalPercentage"
                        type="number"
                        step="0.01"
                        value={config.transactionFees.international.percentage}
                        onChange={(e) =>
                          updateTransactionFee(
                            'international',
                            'percentage',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        min={0}
                        max={100}
                        className="pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        %
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Info className="h-3 w-3" />
                      <span>Applied to transaction amount</span>
                    </div>
                  </div>

                  {/* Fixed Fee */}
                  <div className="space-y-3">
                    <Label htmlFor="internationalFixed" className="flex items-center gap-2">
                      <Coins className="h-4 w-4 text-primary" />
                      Fixed Fee
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        GHS
                      </span>
                      <Input
                        id="internationalFixed"
                        type="number"
                        step="0.01"
                        value={config.transactionFees.international.fixed}
                        onChange={(e) =>
                          updateTransactionFee(
                            'international',
                            'fixed',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        min={0}
                        className="pl-14"
                      />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Info className="h-3 w-3" />
                      <span>Added to each transaction</span>
                    </div>
                  </div>

                  {/* Minimum Fee */}
                  <div className="space-y-3">
                    <Label htmlFor="internationalMinimum" className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-orange-500" />
                      Minimum Fee
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        GHS
                      </span>
                      <Input
                        id="internationalMinimum"
                        type="number"
                        step="0.01"
                        value={config.transactionFees.international.minimum}
                        onChange={(e) =>
                          updateTransactionFee(
                            'international',
                            'minimum',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        min={0}
                        className="pl-14"
                      />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Info className="h-3 w-3" />
                      <span>Floor limit per transaction</span>
                    </div>
                  </div>

                  {/* Maximum Fee */}
                  <div className="space-y-3">
                    <Label htmlFor="internationalMaximum" className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      Maximum Fee
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        GHS
                      </span>
                      <Input
                        id="internationalMaximum"
                        type="number"
                        step="0.01"
                        value={config.transactionFees.international.maximum}
                        onChange={(e) =>
                          updateTransactionFee(
                            'international',
                            'maximum',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        min={0}
                        className="pl-14"
                      />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Info className="h-3 w-3" />
                      <span>Ceiling limit per transaction</span>
                    </div>
                  </div>
                </div>

                {/* Fee Calculation Example */}
                <Card className="bg-muted/50 border-primary/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calculator className="h-4 w-4" />
                      Example Calculation
                    </CardTitle>
                    <CardDescription className="text-xs">
                      For a GHS 1,000 equivalent transaction
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-2 text-sm">
                      <div className="flex items-center justify-between p-2 bg-background rounded">
                        <span className="text-muted-foreground">Percentage Fee</span>
                        <span className="font-mono">
                          GHS 1,000 × {config.transactionFees.international.percentage}% = GHS{' '}
                          {((1000 * config.transactionFees.international.percentage) / 100).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-background rounded">
                        <span className="text-muted-foreground">Fixed Fee</span>
                        <span className="font-mono">
                          GHS {config.transactionFees.international.fixed.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-background rounded">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="font-mono">
                          GHS{' '}
                          {(
                            (1000 * config.transactionFees.international.percentage) / 100 +
                            config.transactionFees.international.fixed
                          ).toFixed(2)}
                        </span>
                      </div>
                      <div className="border-t pt-2 flex items-center justify-between p-2 bg-primary/5 rounded font-semibold">
                        <span>Total Fee (with limits)</span>
                        <span className="font-mono text-primary">
                          GHS{' '}
                          {Math.min(
                            Math.max(
                              (1000 * config.transactionFees.international.percentage) / 100 +
                                config.transactionFees.international.fixed,
                              config.transactionFees.international.minimum
                            ),
                            config.transactionFees.international.maximum
                          ).toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 p-2 bg-blue-500/10 rounded text-xs">
                      <Info className="h-3 w-3 text-blue-500 mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">
                        Fee is capped between GHS {config.transactionFees.international.minimum.toFixed(2)} (min)
                        and GHS {config.transactionFees.international.maximum.toFixed(2)} (max)
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>

            {/* Fee Structure Information */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>How Transaction Fees Work:</strong> Transaction fees are charged on
                top of subscription plans. The total fee is calculated as: (Transaction Amount
                × Percentage) + Fixed Amount, subject to minimum and maximum caps. These fees
                apply to all transactions processed through the platform.
              </AlertDescription>
            </Alert>
          </div>
        </TabsContent>

        {/* Rate Limits Tab */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Rate Limits</CardTitle>
              <CardDescription>
                Global rate limiting settings for security and stability
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="otpPerHour">OTP Requests Per Hour</Label>
                <Input
                  id="otpPerHour"
                  type="number"
                  value={config.rateLimits.otpPerHour}
                  onChange={(e) =>
                    updateRateLimit('otpPerHour', parseInt(e.target.value) || 0)
                  }
                  min={1}
                />
                <p className="text-sm text-muted-foreground">
                  Maximum OTP requests allowed per user per hour
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiCallsPerMinute">API Calls Per Minute</Label>
                <Input
                  id="apiCallsPerMinute"
                  type="number"
                  value={config.rateLimits.apiCallsPerMinute}
                  onChange={(e) =>
                    updateRateLimit('apiCallsPerMinute', parseInt(e.target.value) || 0)
                  }
                  min={10}
                />
                <p className="text-sm text-muted-foreground">
                  Maximum API calls allowed per merchant per minute
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsappPerDay">WhatsApp Messages Per Day</Label>
                <Input
                  id="whatsappPerDay"
                  type="number"
                  value={config.rateLimits.whatsappMessagesPerDay}
                  onChange={(e) =>
                    updateRateLimit('whatsappMessagesPerDay', parseInt(e.target.value) || 0)
                  }
                  min={100}
                />
                <p className="text-sm text-muted-foreground">
                  Maximum WhatsApp messages allowed per merchant per day
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
