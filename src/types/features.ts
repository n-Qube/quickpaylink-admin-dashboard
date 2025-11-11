/**
 * Platform Feature Catalog - Comprehensive Feature Definitions
 *
 * This file defines all platform features that can be:
 * 1. Enabled/disabled globally via System Configuration
 * 2. Configured per subscription plan with usage limits
 * 3. Checked for access control in the mobile app
 */

import { Timestamp } from 'firebase/firestore';

// ============================================================================
// Feature Categories
// ============================================================================

export type FeatureCategory =
  | 'core_business'      // Essential business operations
  | 'communication'      // WhatsApp, Email, SMS
  | 'advanced'           // AI, Analytics, API
  | 'collaboration'      // Team management
  | 'customization'      // Branding, themes
  | 'integration';       // Webhooks, API access

export type FeatureTier = 'free' | 'starter' | 'professional' | 'enterprise';

// ============================================================================
// Feature Definition
// ============================================================================

export interface PlatformFeature {
  featureId: string;
  name: string;
  displayName: string;
  description: string;
  category: FeatureCategory;
  tier: FeatureTier;
  icon?: string;

  // Global feature flag (System Configuration)
  enabledGlobally: boolean;

  // Usage limits metadata
  hasUsageLimit: boolean;
  usageLimitType?: 'count' | 'storage' | 'rate';
  usageLimitUnit?: string; // e.g., 'per month', 'per hour', 'GB', 'calls'

  // Default limits for new plans
  defaultLimit?: number | 'unlimited';

  // Dependencies on other features
  dependsOn?: string[]; // Feature IDs that must be enabled

  // Available for specific plans
  availableInPlans?: string[]; // Plan IDs, empty = all plans

  createdAt: Timestamp;
  updatedAt: Timestamp;
  updatedBy: string;
}

// ============================================================================
// Enhanced System Config Features
// ============================================================================

export interface SystemConfigFeatures {
  // CORE BUSINESS FEATURES
  invoiceCreation: boolean;
  customerManagement: boolean;
  productManagement: boolean;
  paymentRecording: boolean;
  basicDashboard: boolean;

  // COMMUNICATION FEATURES
  whatsappBusinessIntegration: boolean;
  whatsappMessaging: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;

  // ADVANCED FEATURES
  aiProductRecognition: boolean;
  advancedReporting: boolean;
  advancedAnalytics: boolean;
  apiAccess: boolean;
  webhooks: boolean;

  // COLLABORATION FEATURES
  teamMembers: boolean;
  roleBasedAccess: boolean;

  // CUSTOMIZATION FEATURES
  customBranding: boolean;
  multiCurrency: boolean;
  darkMode: boolean;

  // SUPPORT FEATURES
  prioritySupport: boolean;
  dedicatedAccountManager: boolean;
}

// ============================================================================
// Enhanced Subscription Plan Features
// ============================================================================

export interface SubscriptionPlanFeatures {
  // CORE BUSINESS LIMITS (number or 'unlimited')
  invoicesPerMonth: number | 'unlimited';
  customersLimit: number | 'unlimited';
  productsLimit: number | 'unlimited';
  paymentsPerMonth: number | 'unlimited';

  // COMMUNICATION LIMITS
  whatsappMessagesPerMonth: number | 'unlimited';
  emailsPerMonth: number | 'unlimited';
  smsPerMonth: number | 'unlimited';

  // ADVANCED FEATURE ACCESS (boolean)
  aiFeatures: boolean;
  advancedReporting: boolean;
  advancedAnalytics: boolean;
  apiAccess: boolean;
  webhooks: boolean;

  // COLLABORATION LIMITS
  teamMembers: number;
  roleBasedAccess: boolean;

  // CUSTOMIZATION ACCESS
  customBranding: boolean;
  multiCurrency: boolean;
  customDomains: number;

  // SUPPORT LEVEL
  prioritySupport: boolean;
  dedicatedAccountManager: boolean;
}

// ============================================================================
// Enhanced Subscription Plan Limits
// ============================================================================

export interface SubscriptionPlanLimits {
  // STORAGE LIMITS
  storageGB: number;
  fileUploadSizeMB: number;

  // API RATE LIMITS
  apiCallsPerHour: number;
  apiCallsPerDay: number;
  webhookEndpoints: number;

  // COMMUNICATION RATE LIMITS
  whatsappMessagesPerMonth: number;
  whatsappMessagesPerDay: number;
  emailsPerDay: number;
  smsPerDay: number;

  // COLLABORATION LIMITS
  teamMembers: number;
  adminUsers: number;

  // CUSTOMIZATION LIMITS
  customDomains: number;
  customEmailTemplates: number;
  customInvoiceTemplates: number;

  // REPORT LIMITS
  scheduledReports: number;
  reportHistory: number; // days to keep reports

  // DATA EXPORT LIMITS
  dataExportsPerMonth: number;
  bulkExportRecords: number;
}

// ============================================================================
// Feature Usage Tracking
// ============================================================================

export interface FeatureUsage {
  merchantId: string;
  planId: string;
  period: {
    start: Timestamp;
    end: Timestamp;
  };

  usage: {
    // Core business
    invoicesCreated: number;
    customersAdded: number;
    productsAdded: number;
    paymentsRecorded: number;

    // Communication
    whatsappMessagesSent: number;
    emailsSent: number;
    smsSent: number;

    // Storage
    storageUsedGB: number;
    filesUploaded: number;

    // API
    apiCallsMade: number;
    webhooksCalled: number;

    // Team
    activeTeamMembers: number;

    // Reports
    reportsGenerated: number;
    dataExports: number;
  };

  // Limit breach tracking
  breaches: {
    featureId: string;
    limit: number;
    actualUsage: number;
    timestamp: Timestamp;
  }[];

  lastUpdated: Timestamp;
}

// ============================================================================
// Feature Access Check Result
// ============================================================================

export interface FeatureAccessResult {
  hasAccess: boolean;
  reason?: 'globally_disabled' | 'plan_not_included' | 'limit_exceeded' | 'dependency_not_met';
  currentUsage?: number;
  limit?: number | 'unlimited';
  remainingUsage?: number;
  resetDate?: Timestamp;
}

// ============================================================================
// Feature Catalog - Complete List
// ============================================================================

export const PLATFORM_FEATURES = {
  // CORE BUSINESS FEATURES
  INVOICE_CREATION: {
    id: 'invoice_creation',
    name: 'Invoice Creation',
    description: 'Create and manage invoices with multiple items',
    category: 'core_business',
    tier: 'free',
    hasUsageLimit: true,
    usageLimitType: 'count',
    usageLimitUnit: 'per month',
    defaultLimit: 10,
  },

  CUSTOMER_MANAGEMENT: {
    id: 'customer_management',
    name: 'Customer Management',
    description: 'Add and manage customer contacts with detailed profiles',
    category: 'core_business',
    tier: 'free',
    hasUsageLimit: true,
    usageLimitType: 'count',
    usageLimitUnit: 'total customers',
    defaultLimit: 50,
  },

  PRODUCT_MANAGEMENT: {
    id: 'product_management',
    name: 'Product Management',
    description: 'Manage product catalog with inventory tracking',
    category: 'core_business',
    tier: 'free',
    hasUsageLimit: true,
    usageLimitType: 'count',
    usageLimitUnit: 'total products',
    defaultLimit: 100,
  },

  PAYMENT_RECORDING: {
    id: 'payment_recording',
    name: 'Payment Recording',
    description: 'Record and track customer payments',
    category: 'core_business',
    tier: 'free',
    hasUsageLimit: true,
    usageLimitType: 'count',
    usageLimitUnit: 'per month',
    defaultLimit: 50,
  },

  BASIC_DASHBOARD: {
    id: 'basic_dashboard',
    name: 'Basic Dashboard',
    description: 'View key business metrics and statistics',
    category: 'core_business',
    tier: 'free',
    hasUsageLimit: false,
  },

  // COMMUNICATION FEATURES
  WHATSAPP_BUSINESS_INTEGRATION: {
    id: 'whatsapp_business_integration',
    name: 'WhatsApp Business Integration',
    description: 'Connect WhatsApp Business account via 360Dialog',
    category: 'communication',
    tier: 'starter',
    hasUsageLimit: false,
  },

  WHATSAPP_MESSAGING: {
    id: 'whatsapp_messaging',
    name: 'WhatsApp Messages',
    description: 'Send WhatsApp messages to customers',
    category: 'communication',
    tier: 'starter',
    hasUsageLimit: true,
    usageLimitType: 'count',
    usageLimitUnit: 'per month',
    defaultLimit: 100,
    dependsOn: ['whatsapp_business_integration'],
  },

  EMAIL_NOTIFICATIONS: {
    id: 'email_notifications',
    name: 'Email Notifications',
    description: 'Send invoices and notifications via email',
    category: 'communication',
    tier: 'free',
    hasUsageLimit: true,
    usageLimitType: 'count',
    usageLimitUnit: 'per month',
    defaultLimit: 200,
  },

  SMS_NOTIFICATIONS: {
    id: 'sms_notifications',
    name: 'SMS Notifications',
    description: 'Send SMS notifications to customers',
    category: 'communication',
    tier: 'professional',
    hasUsageLimit: true,
    usageLimitType: 'count',
    usageLimitUnit: 'per month',
    defaultLimit: 50,
  },

  // ADVANCED FEATURES
  AI_PRODUCT_RECOGNITION: {
    id: 'ai_product_recognition',
    name: 'AI Product Recognition',
    description: 'Gemini AI for product image recognition, name, description, and categorization',
    category: 'advanced',
    tier: 'professional',
    hasUsageLimit: true,
    usageLimitType: 'count',
    usageLimitUnit: 'per month',
    defaultLimit: 100,
  },

  ADVANCED_REPORTING: {
    id: 'advanced_reporting',
    name: 'Advanced Reporting',
    description: 'Generate detailed reports in PDF, CSV, and Excel formats',
    category: 'advanced',
    tier: 'professional',
    hasUsageLimit: true,
    usageLimitType: 'count',
    usageLimitUnit: 'per month',
    defaultLimit: 20,
  },

  ADVANCED_ANALYTICS: {
    id: 'advanced_analytics',
    name: 'Advanced Analytics',
    description: 'Detailed analytics with charts and insights',
    category: 'advanced',
    tier: 'professional',
    hasUsageLimit: false,
  },

  API_ACCESS: {
    id: 'api_access',
    name: 'API Access',
    description: 'REST API for integrations and automation',
    category: 'integration',
    tier: 'professional',
    hasUsageLimit: true,
    usageLimitType: 'rate',
    usageLimitUnit: 'per hour',
    defaultLimit: 100,
  },

  WEBHOOKS: {
    id: 'webhooks',
    name: 'Webhooks',
    description: 'Real-time event notifications via webhooks',
    category: 'integration',
    tier: 'enterprise',
    hasUsageLimit: true,
    usageLimitType: 'count',
    usageLimitUnit: 'endpoints',
    defaultLimit: 5,
  },

  // COLLABORATION FEATURES
  TEAM_MEMBERS: {
    id: 'team_members',
    name: 'Team Members',
    description: 'Add team members to collaborate',
    category: 'collaboration',
    tier: 'starter',
    hasUsageLimit: true,
    usageLimitType: 'count',
    usageLimitUnit: 'total team members',
    defaultLimit: 1,
  },

  ROLE_BASED_ACCESS: {
    id: 'role_based_access',
    name: 'Role-Based Access Control',
    description: 'Granular permissions for team members',
    category: 'collaboration',
    tier: 'professional',
    hasUsageLimit: false,
    dependsOn: ['team_members'],
  },

  // CUSTOMIZATION FEATURES
  CUSTOM_BRANDING: {
    id: 'custom_branding',
    name: 'Custom Branding',
    description: 'White-label with custom logo, colors, and branding',
    category: 'customization',
    tier: 'enterprise',
    hasUsageLimit: false,
  },

  MULTI_CURRENCY: {
    id: 'multi_currency',
    name: 'Multi-Currency Support',
    description: 'Support for multiple currencies',
    category: 'customization',
    tier: 'professional',
    hasUsageLimit: false,
  },

  DARK_MODE: {
    id: 'dark_mode',
    name: 'Dark Mode',
    description: 'Dark theme for mobile app',
    category: 'customization',
    tier: 'free',
    hasUsageLimit: false,
  },

  CUSTOM_DOMAINS: {
    id: 'custom_domains',
    name: 'Custom Domains',
    description: 'Use custom domain for branded experience',
    category: 'customization',
    tier: 'enterprise',
    hasUsageLimit: true,
    usageLimitType: 'count',
    usageLimitUnit: 'domains',
    defaultLimit: 1,
  },

  // SUPPORT FEATURES
  PRIORITY_SUPPORT: {
    id: 'priority_support',
    name: 'Priority Support',
    description: 'Dedicated priority support channel',
    category: 'advanced',
    tier: 'professional',
    hasUsageLimit: false,
  },

  DEDICATED_ACCOUNT_MANAGER: {
    id: 'dedicated_account_manager',
    name: 'Dedicated Account Manager',
    description: 'Personal account manager for enterprise support',
    category: 'advanced',
    tier: 'enterprise',
    hasUsageLimit: false,
  },
} as const;

// ============================================================================
// Feature ID Type (for type safety)
// ============================================================================

export type FeatureId = keyof typeof PLATFORM_FEATURES;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get all features by category
 */
export function getFeaturesByCategory(category: FeatureCategory): typeof PLATFORM_FEATURES[FeatureId][] {
  return Object.values(PLATFORM_FEATURES).filter(
    (feature) => feature.category === category
  );
}

/**
 * Get all features by tier
 */
export function getFeaturesByTier(tier: FeatureTier): typeof PLATFORM_FEATURES[FeatureId][] {
  return Object.values(PLATFORM_FEATURES).filter(
    (feature) => feature.tier === tier
  );
}

/**
 * Check if feature has dependencies
 */
export function hasFeatureDependencies(featureId: string): boolean {
  const feature = Object.values(PLATFORM_FEATURES).find((f) => f.id === featureId);
  return !!feature?.dependsOn && feature.dependsOn.length > 0;
}

/**
 * Get feature dependencies
 */
export function getFeatureDependencies(featureId: string): string[] {
  const feature = Object.values(PLATFORM_FEATURES).find((f) => f.id === featureId);
  return feature?.dependsOn || [];
}
