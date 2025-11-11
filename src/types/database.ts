/**
 * QuickLink Pay Super Admin - Database Type Definitions
 * Generated from Firestore Database Schema v1.0
 */

import { Timestamp } from 'firebase/firestore';

// ============================================================================
// Platform Feature Types
// ============================================================================

export type FeatureCategory =
  | 'core_business'
  | 'communication'
  | 'advanced'
  | 'collaboration'
  | 'customization'
  | 'integration'
  | 'support';

export type FeatureTier = 'free' | 'starter' | 'professional' | 'enterprise';

export interface PlatformFeature {
  featureId: string;
  name: string;
  displayName: string;
  description: string;
  category: FeatureCategory;
  tier: FeatureTier;
  icon?: string;

  hasUsageLimit: boolean;
  usageLimitType?: 'count' | 'storage' | 'rate';
  usageLimitUnit?: string;
  defaultLimit?: number;

  dependsOn?: string[];
  configKey: string;
  planKey?: string;
  planType?: 'boolean' | 'number' | 'string';

  active: boolean;
  displayOrder: number;

  createdAt: Timestamp;
  updatedAt: Timestamp;
  updatedBy: string;
}

// ============================================================================
// System Configuration Types
// ============================================================================

export interface SystemConfig {
  configId: string;
  version: string;
  features: {
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
    customDomains: boolean;

    // SUPPORT FEATURES
    prioritySupport: boolean;
    dedicatedAccountManager: boolean;

    // LEGACY (for backward compatibility)
    whatsappCoexistence: boolean;
    multiCurrencySupport: boolean;
  };
  platformSettings: {
    maintenanceMode: boolean;
    maintenanceMessage?: string;
    whitelistedIPs?: string[];
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
  transactionFees?: {
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
  createdAt: Timestamp;
  updatedAt: Timestamp;
  updatedBy: string;
}

// ============================================================================
// Admin & Role Types
// ============================================================================

export type AccessLevel =
  | 'super_admin'
  | 'system_admin'
  | 'ops_admin'
  | 'finance_admin'
  | 'support_admin'
  | 'audit_admin'
  | 'merchant_support_lead'
  | 'merchant_support_agent';

export type AdminStatus = 'active' | 'inactive' | 'suspended' | 'locked';

export interface AdminSession {
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  loginAt: Timestamp;
  expiresAt: Timestamp;
}

export interface Admin {
  adminId: string;
  email: string;
  phoneNumber?: string;
  profile: {
    firstName: string;
    lastName: string;
    displayName: string;
    avatar?: string;
    department?: string;
  };
  auth: {
    passwordHash: string;
    lastPasswordChange: Timestamp;
    twoFactorEnabled: boolean;
    twoFactorSecret?: string;
    lastLogin: Timestamp;
    loginCount: number;
    failedLoginAttempts: number;
    accountLockedUntil?: Timestamp;
  };
  roleId: string;
  permissions: string[];
  accessLevel: AccessLevel;
  activeSessions: AdminSession[];

  // Hierarchical management
  managerId?: string; // ID of the manager who created/manages this admin
  managerName?: string; // Name of the manager
  teamId?: string; // Optional team assignment
  canCreateSubUsers: boolean; // Can this admin create users below them?
  maxSubUsers?: number; // Maximum users they can create
  createdSubUsersCount: number; // How many sub-users they've created

  stats: {
    totalLogins: number;
    totalActions: number;
    lastActionAt: Timestamp;
    merchantsManaged: number;
  };
  status: AdminStatus;
  statusReason?: string;
  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
  updatedBy: string;
}

export interface PermissionSet {
  read: boolean;
  write: boolean;
  delete?: boolean;
  suspend?: boolean;
  terminate?: boolean;
  export?: boolean;
}

export interface Role {
  roleId: string;
  name: string;
  displayName: string;
  description: string;
  level: number; // Hierarchy level (0 = Super Admin, 100 = lowest)

  // Role hierarchy
  isSystemRole: boolean; // Cannot be deleted/modified (predefined roles)
  isCustomRole: boolean; // Created by users
  parentRoleId?: string; // Parent role in hierarchy
  canCreateSubRoles: boolean; // Can create roles below this one
  canManageUsers: boolean; // Can create/manage users
  maxSubRoles?: number; // Maximum sub-roles that can be created

  permissions: {
    systemConfig: PermissionSet;
    apiManagement: PermissionSet;
    pricing: PermissionSet;
    merchantManagement: PermissionSet & {
      suspend: boolean;
      terminate: boolean;
    };
    analytics: {
      read: boolean;
      export: boolean;
    };
    systemHealth: PermissionSet;
    compliance: PermissionSet & {
      export: boolean;
    };
    auditLogs: {
      read: boolean;
    };
    userManagement?: {
      read: boolean;
      create: boolean;
      update: boolean;
      delete: boolean;
      assignRoles: boolean;
    };
    roleManagement?: {
      read: boolean;
      create: boolean;
      update: boolean;
      delete: boolean;
    };
    templates?: {
      read: boolean;
      create: boolean;
      update: boolean;
      delete: boolean;
    };
    supportTickets?: {
      read: boolean;
      create: boolean;
      update: boolean;
      delete: boolean;
    };
    aiPrompts?: {
      read: boolean;
      create: boolean;
      update: boolean;
      delete: boolean;
    };
    payouts?: PermissionSet;
  };

  // Usage stats
  usageStats: {
    assignedUsersCount: number;
    lastAssignedAt?: Timestamp;
  };

  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
  updatedBy: string;
  isActive: boolean;
}

// ============================================================================
// Location Types
// ============================================================================

export interface Country {
  countryCode: string;
  name: string;
  defaultCurrency: string;
  defaultLanguage: string;
  timezone: string;
  taxConfiguration: {
    vatRate: number;
    vatLabel: string;
    witholdingTaxRate: number;
    serviceTaxRate: number;
  };
  phoneFormat: {
    countryCode: string;
    regex: string;
    example: string;
  };
  addressFormat: {
    postalCodeRequired: boolean;
    stateRequired: boolean;
    format: string[];
  };
  active: boolean;
  availableForSignup: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  updatedBy: string;
}

export interface Region {
  regionId: string;
  name: string;
  countryCode: string;
  code: string;
  regionalTaxRate?: number;
  holidays: {
    date: string;
    name: string;
    recurring: boolean;
  }[];
  active: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface City {
  cityId: string;
  name: string;
  regionId: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  deliveryZones?: string[];
  localBusinessHours?: {
    open: string;
    close: string;
    timezone: string;
  };
  active: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================================================
// Currency Types
// ============================================================================

export type SymbolPosition = 'prefix' | 'suffix';
export type RoundingRule = 'up' | 'down' | 'nearest';
export type ExchangeRateSource = 'manual' | 'automatic';

export interface Currency {
  currencyCode: string;
  name: string;
  symbol: string;
  formatting: {
    symbolPosition: SymbolPosition;
    decimalPlaces: number;
    thousandSeparator: string;
    decimalSeparator: string;
  };
  exchangeRates: {
    baseCurrency: string;
    rate: number;
    lastUpdated: Timestamp;
    source: ExchangeRateSource;
    apiProvider?: string;
  };
  pricing: {
    minimumAmount: number;
    roundingRule: RoundingRule;
    roundingPrecision: number;
  };
  active: boolean;
  defaultForCountries: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  updatedBy: string;
}

// ============================================================================
// Business Type Types
// ============================================================================

export interface BusinessType {
  businessTypeId: string;
  name: string;
  displayName: string;
  description: string;
  icon?: string;
  parentId?: string;
  level: number;
  subcategories: {
    id: string;
    name: string;
    description: string;
  }[];
  features: {
    inventoryTracking: boolean;
    appointmentBooking: boolean;
    menuManagement: boolean;
    bulkInvoicing: boolean;
    termBilling: boolean;
    multiCurrency: boolean;
  };
  defaults: {
    taxRate?: number;
    paymentTerms?: number;
    invoicePrefix?: string;
  };
  active: boolean;
  displayOrder: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  updatedBy: string;
}

// ============================================================================
// Tax Rule Types
// ============================================================================

export type TaxType = 'vat' | 'gst' | 'service_tax' | 'withholding_tax' | 'custom';
export type TaxCalculation = 'percentage' | 'fixed';
export type ReportingFrequency = 'monthly' | 'quarterly' | 'annually';

export interface TaxRule {
  taxRuleId: string;
  name: string;
  description: string;
  type: TaxType;
  applicability: {
    countries: string[];
    regions?: string[];
    businessTypes?: string[];
    productCategories?: string[];
  };
  rate: number;
  calculation: TaxCalculation;
  exemptions: {
    businessTypes?: string[];
    productCategories?: string[];
    minimumAmount?: number;
  };
  effectiveFrom: Timestamp;
  effectiveTo?: Timestamp;
  taxIdRequired: boolean;
  taxIdValidationRegex?: string;
  reportingFrequency: ReportingFrequency;
  reportFormat: string;
  active: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  updatedBy: string;
}

// ============================================================================
// Subscription Plan Types
// ============================================================================

export type BillingCycle = 'monthly' | 'quarterly' | 'semi_annual' | 'annual';

export interface SubscriptionPlan {
  planId: string;
  name: string;
  displayName: string;
  description: string;
  tagline?: string;
  pricing: {
    [currencyCode: string]: {
      amount: number;
      currency: string;
    };
  };
  billingCycle: BillingCycle;
  billingCycleDays: number;
  setupFee: {
    [currencyCode: string]: number;
  };
  trialEnabled: boolean;
  trialDays: number;
  features: {
    // CORE BUSINESS LIMITS
    invoicesPerMonth: number | 'unlimited';
    customersLimit: number | 'unlimited';
    productsLimit: number | 'unlimited';
    paymentsPerMonth: number | 'unlimited';

    // COMMUNICATION LIMITS
    whatsappMessages: number | 'unlimited';
    emailsPerMonth: number | 'unlimited';
    smsPerMonth: number | 'unlimited';

    // ADVANCED FEATURE ACCESS
    aiFeatures: boolean;
    advancedReporting: boolean;
    advancedAnalytics: boolean;
    apiAccess: boolean;
    webhooks: boolean;

    // COLLABORATION
    teamMembers: number;
    roleBasedAccess: boolean;

    // CUSTOMIZATION
    customBranding: boolean;
    multiCurrency: boolean;
    customDomains: number;

    // SUPPORT
    prioritySupport: boolean;
    dedicatedAccountManager: boolean;
  };
  limits: {
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
    reportHistoryDays: number;

    // DATA EXPORT LIMITS
    dataExportsPerMonth: number;
    bulkExportRecords: number;
  };
  visible: boolean;
  featured: boolean;
  displayOrder: number;
  highlights: string[];
  ctaText: string;
  active: boolean;
  availableForNewSignups: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  updatedBy: string;
}

// ============================================================================
// Pricing Rule Types
// ============================================================================

export type PricingRuleType =
  | 'volume_discount'
  | 'promotional'
  | 'partner_pricing'
  | 'regional'
  | 'early_bird'
  | 'referral';

export type DiscountType = 'percentage' | 'fixed_amount';

export interface PricingRule {
  ruleId: string;
  name: string;
  description: string;
  type: PricingRuleType;
  applicability: {
    plans?: string[];
    countries?: string[];
    businessTypes?: string[];
    partnerIds?: string[];
    newCustomersOnly?: boolean;
  };
  discount: {
    type: DiscountType;
    value: number;
    maxDiscount?: number;
  };
  conditions: {
    minimumCommitment?: number;
    minimumSpend?: number;
    billingCycle?: string[];
    promoCode?: string;
    promoCodeRequired?: boolean;
  };
  applicableFrom: Timestamp;
  applicableTo?: Timestamp;
  maxRedemptions?: number;
  redemptionCount: number;
  applyToFirstPaymentOnly: boolean;
  applyToAllPayments: boolean;
  maxRecurringMonths?: number;
  active: boolean;
  priority: number;
  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
  updatedBy: string;
}

// ============================================================================
// Merchant Types
// ============================================================================

export type MerchantStatus = 'pending' | 'active' | 'suspended' | 'terminated' | 'archived';
export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'canceled' | 'suspended';
export type VerificationStatus = 'pending' | 'verified' | 'rejected' | 'under_review';
export type KYCStatus = 'pending' | 'submitted' | 'verified' | 'rejected';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type SupportPriority = 'low' | 'normal' | 'high' | 'vip';
export type NoteVisibility = 'internal' | 'shared';

export interface Merchant {
  merchantId: string;
  businessInfo: {
    businessName: string;
    registrationNumber?: string;
    taxId?: string;
    businessType: string;
    phoneNumber: string;
    email: string;
    website?: string;
    logo?: string;
  };
  location: {
    country: string;
    region?: string;
    city?: string;
    address?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  subscription: {
    planId: string;
    status: SubscriptionStatus;
    currentPeriodStart: Timestamp;
    currentPeriodEnd: Timestamp;
    trialEnd?: Timestamp;
    cancelAt?: Timestamp;
    canceledAt?: Timestamp;
    currency: string;
    amount: number;
  };
  adminMetadata: {
    riskScore: number;
    riskLevel: RiskLevel;
    verificationStatus: VerificationStatus;
    verificationDate?: Timestamp;
    verifiedBy?: string;
    kycStatus: KYCStatus;
    kycDocuments: {
      documentType: string;
      status: 'pending' | 'verified' | 'rejected';
      verifiedAt?: Timestamp;
    }[];
    notes: {
      noteId: string;
      adminId: string;
      note: string;
      timestamp: Timestamp;
      visibility: NoteVisibility;
    }[];
    flags: string[];
    tags: string[];
    limits: {
      dailyTransactionLimit: number;
      monthlyVolumeLimit: number;
      maxInvoiceAmount: number;
      customLimits?: Record<string, number>;
    };
    supportTicketsCount: number;
    lastSupportInteraction?: Timestamp;
    supportPriority: SupportPriority;
  };
  stats: {
    totalInvoices: number;
    totalRevenue: number;
    totalCustomers: number;
    averageInvoiceValue: number;
    lastInvoiceDate?: Timestamp;
    lastLoginDate?: Timestamp;
    activeInvoices: number;
  };
  status: MerchantStatus;
  statusHistory: {
    status: string;
    changedAt: Timestamp;
    changedBy: string;
    reason: string;
  }[];
  onboarding: {
    completed: boolean;
    completedSteps: string[];
    currentStep?: string;
    startedAt: Timestamp;
    completedAt?: Timestamp;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
  approvedBy?: string;
  approvedAt?: Timestamp;
}

// ============================================================================
// API Integration Types
// ============================================================================

export type IntegrationType = 'whatsapp' | 'payment' | 'ai' | 'email' | 'analytics' | 'other';
export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
export type Environment = 'production' | 'sandbox' | 'test';

export interface APIIntegration {
  integrationId: string;
  name: string;
  displayName: string;
  description: string;
  type: IntegrationType;
  config: {
    apiKey?: string;
    secretKey?: string;
    publicKey?: string;
    webhookSecret?: string;
    baseUrl?: string;
    apiVersion?: string;
    customConfig?: Record<string, any>;
  };
  endpoints: {
    name: string;
    method: HTTPMethod;
    path: string;
    description?: string;
  }[];
  rateLimits: {
    requestsPerSecond: number;
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
  };
  monitoring: {
    enabled: boolean;
    healthCheckUrl?: string;
    healthCheckInterval?: number;
    alertThreshold: {
      errorRate: number;
      responseTime: number;
    };
  };
  usage: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    lastRequestAt?: Timestamp;
    averageResponseTime: number;
  };
  active: boolean;
  environment: Environment;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  updatedBy: string;
}

// ============================================================================
// Webhook Types
// ============================================================================

export type WebhookDirection = 'incoming' | 'outgoing';

export interface Webhook {
  webhookId: string;
  name: string;
  description: string;
  direction: WebhookDirection;
  incomingConfig?: {
    source: string;
    events: string[];
    secret: string;
    ipWhitelist?: string[];
  };
  outgoingConfig?: {
    targetUrl: string;
    method: 'POST' | 'PUT';
    headers?: Record<string, string>;
    events: string[];
    retryPolicy: {
      maxRetries: number;
      retryIntervalSeconds: number;
      backoffMultiplier: number;
    };
  };
  stats: {
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    lastCallAt?: Timestamp;
    averageResponseTime: number;
  };
  alertConfig: {
    enabled: boolean;
    failureThreshold: number;
    alertChannels: string[];
  };
  active: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  updatedBy: string;
}

// ============================================================================
// Audit Log Types
// ============================================================================

export type ActionCategory =
  | 'system_config'
  | 'merchant'
  | 'pricing'
  | 'api'
  | 'security'
  | 'compliance';

export type Severity = 'low' | 'medium' | 'high' | 'critical';

export interface AuditLog {
  logId: string;
  actor: {
    adminId: string;
    email: string;
    displayName: string;
    roleId: string;
    accessLevel: string;
  };
  action: {
    type: string;
    category: ActionCategory;
    description: string;
    severity: Severity;
  };
  target: {
    resourceType: string;
    resourceId: string;
    resourceName?: string;
  };
  timestamp: Timestamp;
  reason?: string;
  ticketReference?: string;
  changes?: {
    before: Record<string, any>;
    after: Record<string, any>;
    fields: string[];
  };
  context: {
    ipAddress: string;
    userAgent: string;
    sessionId: string;
    location?: {
      city: string;
      country: string;
      coordinates?: { latitude: number; longitude: number };
    };
  };
  result: {
    success: boolean;
    errorMessage?: string;
    statusCode?: number;
  };
  readonly: true;
  ttl?: Timestamp;
}

// ============================================================================
// Alert Types
// ============================================================================

export type AlertType =
  | 'system_down'
  | 'high_error_rate'
  | 'slow_response'
  | 'unusual_traffic'
  | 'high_cpu'
  | 'low_disk'
  | 'suspicious_activity'
  | 'other';

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';
export type AlertPriority = 'P0' | 'P1' | 'P2' | 'P3';
export type AlertStatus = 'triggered' | 'acknowledged' | 'investigating' | 'resolved' | 'false_positive';
export type NotificationChannel = 'sms' | 'email' | 'slack' | 'dashboard';

export interface Alert {
  alertId: string;
  title: string;
  message: string;
  type: AlertType;
  severity: AlertSeverity;
  priority: AlertPriority;
  source: {
    system: string;
    component?: string;
    serviceId?: string;
  };
  metrics?: {
    currentValue: number;
    threshold: number;
    unit: string;
  };
  status: AlertStatus;
  acknowledgedBy?: string;
  acknowledgedAt?: Timestamp;
  resolvedBy?: string;
  resolvedAt?: Timestamp;
  resolutionNotes?: string;
  notifications: {
    channels: NotificationChannel[];
    sentAt: Timestamp;
    recipients: string[];
  }[];
  escalation: {
    level: number;
    escalatedAt?: Timestamp;
    escalatedTo?: string[];
  };
  triggeredAt: Timestamp;
  updatedAt: Timestamp;
  autoResolve: boolean;
  autoResolveAfterMinutes?: number;
}

// ============================================================================
// System Metrics Types
// ============================================================================

export type MetricType = 'platform' | 'revenue' | 'user' | 'performance' | 'infrastructure';

export interface SystemMetric {
  metricId: string;
  timestamp: Timestamp;
  metricType: MetricType;
  metricName: string;
  value: number;
  unit: string;
  dimensions: {
    country?: string;
    region?: string;
    plan?: string;
    businessType?: string;
    [key: string]: string | undefined;
  };
  metadata?: Record<string, any>;
  ttl: Timestamp;
}

// ============================================================================
// Support Ticket Types
// ============================================================================

export type TicketStatus =
  | 'open'
  | 'assigned'
  | 'in_progress'
  | 'waiting_merchant'
  | 'waiting_internal'
  | 'resolved'
  | 'closed'
  | 'reopened';

export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent' | 'critical';

export type TicketCategory =
  | 'technical_issue'
  | 'billing_payment'
  | 'account_access'
  | 'feature_request'
  | 'integration_support'
  | 'api_issue'
  | 'payout_settlement'
  | 'compliance_kyc'
  | 'general_inquiry'
  | 'other';

export type TicketSource = 'email' | 'phone' | 'chat' | 'dashboard' | 'api' | 'internal';

export interface TicketMessage {
  messageId: string;
  sender: {
    type: 'admin' | 'merchant' | 'system';
    id: string;
    name: string;
    email?: string;
  };
  content: string;
  attachments?: {
    fileName: string;
    fileUrl: string;
    fileSize: number;
    fileType: string;
  }[];
  isInternal: boolean;
  timestamp: Timestamp;
}

export interface TicketActivity {
  activityId: string;
  type: 'status_change' | 'priority_change' | 'assignment' | 'comment' | 'escalation' | 'merge' | 'tag_added' | 'tag_removed';
  performedBy: {
    adminId: string;
    displayName: string;
  };
  description: string;
  oldValue?: string;
  newValue?: string;
  timestamp: Timestamp;
}

export interface SLAMetrics {
  firstResponseTime?: number; // in minutes
  firstResponseDue: Timestamp;
  firstResponseMetAt?: Timestamp;
  resolutionTime?: number; // in minutes
  resolutionDue: Timestamp;
  resolutionMetAt?: Timestamp;
  breached: boolean;
  breachReason?: string;
}

export interface SupportTicket {
  ticketId: string;
  ticketNumber: string; // Human-readable (e.g., "TKT-2024-00001")

  merchant: {
    merchantId: string;
    businessName: string;
    email: string;
    phoneNumber?: string;
  };

  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  source: TicketSource;

  assignment: {
    assignedTo?: string; // Admin ID
    assignedToName?: string;
    assignedAt?: Timestamp;
    assignedBy?: string;
    teamQueue?: string; // e.g., 'support_team', 'technical_team'
  };

  messages: TicketMessage[];

  activities: TicketActivity[];

  tags: string[];

  sla: SLAMetrics;

  satisfaction?: {
    rating: 1 | 2 | 3 | 4 | 5;
    feedback?: string;
    ratedAt: Timestamp;
  };

  relatedTickets?: string[]; // Related ticket IDs
  mergedInto?: string; // If ticket was merged into another

  metadata: {
    browserInfo?: string;
    deviceInfo?: string;
    ipAddress?: string;
    sessionId?: string;
    errorLogs?: string;
  };

  resolution?: {
    resolvedBy: string;
    resolvedByName: string;
    resolvedAt: Timestamp;
    resolutionNotes: string;
    resolutionType: 'solved' | 'workaround' | 'duplicate' | 'not_reproducible' | 'wont_fix';
  };

  escalation?: {
    escalated: boolean;
    escalatedTo?: string; // Admin ID or team
    escalatedBy?: string;
    escalatedAt?: Timestamp;
    escalationReason?: string;
    escalationLevel: number; // 0 = normal, 1 = first escalation, etc.
  };

  createdAt: Timestamp;
  createdBy: string; // Admin ID or 'system' or merchantId
  updatedAt: Timestamp;
  updatedBy: string;

  closedAt?: Timestamp;
  closedBy?: string;

  reopenedCount: number;
  lastReopenedAt?: Timestamp;
}

export interface TicketStats {
  totalTickets: number;
  openTickets: number;
  assignedTickets: number;
  resolvedTickets: number;
  closedTickets: number;
  averageResolutionTime: number; // in hours
  averageFirstResponseTime: number; // in hours
  slaComplianceRate: number; // percentage
  satisfactionScore: number; // average rating
  ticketsByPriority: Record<TicketPriority, number>;
  ticketsByCategory: Record<TicketCategory, number>;
  ticketsByStatus: Record<TicketStatus, number>;
}

// ============================================================================
// Helper Types
// ============================================================================

export interface PaginationParams {
  limit: number;
  offset?: number;
  startAfter?: any;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface QueryFilters {
  [field: string]: any;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    timestamp: number;
    requestId: string;
    pagination?: {
      total: number;
      page: number;
      pageSize: number;
      hasNext: boolean;
    };
  };
}

// ============================================================================
// Dashboard Metrics Types
// ============================================================================

export interface DashboardMetrics {
  totalMerchants: number;
  activeMerchants: number;
  mrr: number;
  growthRate: number;
  activeUsers: number;
  systemHealth: {
    uptime: number;
    responseTime: number;
    errorRate: number;
  };
  liveMetrics: {
    liveInvoices: number;
    paymentsPerHour: number;
    messagesCount: number;
    apiCalls: number;
  };
}

export interface RevenueMetrics {
  mrrByPlan: Record<string, number>;
  churnRate: number;
  ltvByCohort: Record<string, number>;
  transactionRevenue: number;
  geographicDistribution: Record<string, number>;
  forecast: {
    threeMonth: number;
    annualRunRate: number;
  };
}

export interface GrowthMetrics {
  newMerchantsPerMonth: number;
  activationRate: number;
  freeToPaidConversion: number;
  churnRate: number;
  npsScore: number;
  cac: number;
  ltvCacRatio: number;
}
