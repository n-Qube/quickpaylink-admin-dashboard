# QuickLink Pay Super Admin - Firestore Database Schema

## Overview

This document defines the complete Firestore database schema for the QuickLink Pay Super Admin Platform Management System. The schema is optimized for real-time updates, efficient querying, and scalability to support 10,000+ merchants.

---

## Database Architecture

### Technology Stack
- **Primary Database**: Cloud Firestore (NoSQL)
- **Analytics Warehouse**: BigQuery
- **Cache Layer**: Redis (for session management)
- **File Storage**: Cloud Storage (for documents, logos, exports)

### Design Principles
1. **Denormalization**: Strategic denormalization for read performance
2. **Hierarchical Structure**: Logical grouping of related data
3. **Composite Indexes**: Optimized for common query patterns
4. **Audit Trail**: Immutable logs for all admin actions
5. **Real-time Updates**: Firestore's real-time listeners for live metrics

---

## Collection Structure

```
firestore/
├── systemConfig/              # System-wide configuration
│   └── {configId}
├── admins/                    # Super Admin users
│   └── {adminId}
├── roles/                     # RBAC role definitions
│   └── {roleId}
├── locations/                 # Dynamic location management
│   ├── countries/
│   │   └── {countryCode}
│   │       ├── regions/
│   │       │   └── {regionId}
│   │       └── cities/
│   │           └── {cityId}
├── currencies/                # Currency configuration
│   └── {currencyCode}
├── businessTypes/             # Business type categories
│   └── {businessTypeId}
├── taxRules/                  # Tax configuration
│   └── {taxRuleId}
├── subscriptionPlans/         # Pricing plans
│   └── {planId}
├── pricingRules/              # Dynamic pricing rules
│   └── {ruleId}
├── merchants/                 # Merchant accounts
│   └── {merchantId}
│       ├── kycDocuments/
│       │   └── {documentId}
│       ├── supportTickets/
│       │   └── {ticketId}
│       └── adminNotes/
│           └── {noteId}
├── apiIntegrations/           # External API configurations
│   └── {integrationId}
├── webhooks/                  # Webhook configurations
│   └── {webhookId}
├── auditLogs/                 # Immutable audit trail
│   └── {logId}
├── alerts/                    # System alerts
│   └── {alertId}
├── complianceReports/         # Generated reports
│   └── {reportId}
├── systemMetrics/             # Real-time metrics (TTL: 90 days)
│   └── {metricId}
└── maintenanceWindows/        # Scheduled maintenance
    └── {windowId}
```

---

## 1. System Configuration Collection

### Collection: `systemConfig`
**Purpose**: Global platform configuration settings

```typescript
interface SystemConfig {
  configId: string;                    // Document ID: "platform_config_v1"
  version: string;                     // Configuration version

  // Feature Flags
  features: {
    whatsappCoexistence: boolean;
    aiProductRecognition: boolean;
    multiCurrencySupport: boolean;
    apiAccess: boolean;
    darkMode: boolean;
  };

  // Platform Settings
  platformSettings: {
    maintenanceMode: boolean;
    maintenanceMessage?: string;
    whitelistedIPs?: string[];
    allowNewMerchantSignup: boolean;
    maxMerchantsLimit: number;         // Scalability limit
  };

  // Default Values
  defaults: {
    currency: string;                  // "GHS"
    country: string;                   // "GH"
    language: string;                  // "en"
    timezone: string;                  // "Africa/Accra"
    taxRate: number;                   // 0.125 (12.5% VAT)
  };

  // Rate Limits (Global)
  rateLimits: {
    otpPerHour: number;                // 3
    apiCallsPerMinute: number;         // 100
    whatsappMessagesPerDay: number;    // 1000
  };

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  updatedBy: string;                   // Admin ID
}
```

---

## 2. Admin Users Collection

### Collection: `admins`
**Purpose**: Super Admin user accounts with RBAC

```typescript
interface Admin {
  adminId: string;                     // Document ID (auto-generated)
  email: string;                       // Unique, indexed
  phoneNumber?: string;

  // Personal Information
  profile: {
    firstName: string;
    lastName: string;
    displayName: string;
    avatar?: string;                   // Cloud Storage URL
    department?: string;
  };

  // Authentication
  auth: {
    passwordHash: string;              // bcrypt hash
    lastPasswordChange: Timestamp;
    twoFactorEnabled: boolean;
    twoFactorSecret?: string;
    lastLogin: Timestamp;
    loginCount: number;
    failedLoginAttempts: number;
    accountLockedUntil?: Timestamp;
  };

  // Role & Permissions
  roleId: string;                      // Reference to roles collection
  permissions: string[];               // Granular permissions array
  accessLevel: 'super_admin' | 'system_admin' | 'ops_admin' | 'finance_admin' | 'support_admin' | 'audit_admin';

  // Session Management
  activeSessions: {
    sessionId: string;
    ipAddress: string;
    userAgent: string;
    loginAt: Timestamp;
    expiresAt: Timestamp;
  }[];

  // Activity Tracking
  stats: {
    totalLogins: number;
    totalActions: number;
    lastActionAt: Timestamp;
    merchantsManaged: number;
  };

  // Status
  status: 'active' | 'inactive' | 'suspended' | 'locked';
  statusReason?: string;

  // Metadata
  createdAt: Timestamp;
  createdBy: string;                   // Admin ID
  updatedAt: Timestamp;
  updatedBy: string;
}
```

---

## 3. Roles Collection

### Collection: `roles`
**Purpose**: RBAC role definitions

```typescript
interface Role {
  roleId: string;                      // Document ID
  name: string;                        // "Super Admin", "System Admin"
  displayName: string;
  description: string;
  level: number;                       // 1 (highest) to 6 (lowest)

  // Permissions Matrix
  permissions: {
    // System Configuration
    systemConfig: {
      read: boolean;
      write: boolean;
      delete: boolean;
    };

    // API Management
    apiManagement: {
      read: boolean;
      write: boolean;
      delete: boolean;
    };

    // Pricing & Subscription
    pricing: {
      read: boolean;
      write: boolean;
      delete: boolean;
    };

    // Merchant Management
    merchantManagement: {
      read: boolean;
      write: boolean;
      delete: boolean;
      suspend: boolean;
      terminate: boolean;
    };

    // Analytics
    analytics: {
      read: boolean;
      export: boolean;
    };

    // System Health
    systemHealth: {
      read: boolean;
      write: boolean;
    };

    // Compliance
    compliance: {
      read: boolean;
      write: boolean;
      export: boolean;
    };

    // Audit Logs
    auditLogs: {
      read: boolean;
    };
  };

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isActive: boolean;
}
```

---

## 4. Locations Collection

### Collection: `locations/countries/{countryCode}`
**Purpose**: Dynamic country configuration

```typescript
interface Country {
  countryCode: string;                 // Document ID: "GH", "NG", "KE"
  name: string;                        // "Ghana"

  // Configuration
  defaultCurrency: string;             // "GHS"
  defaultLanguage: string;             // "en"
  timezone: string;                    // "Africa/Accra"

  // Tax Configuration
  taxConfiguration: {
    vatRate: number;                   // 0.125 (12.5%)
    vatLabel: string;                  // "VAT", "GST"
    witholdingTaxRate: number;
    serviceTaxRate: number;
  };

  // Phone Configuration
  phoneFormat: {
    countryCode: string;               // "+233"
    regex: string;                     // Validation pattern
    example: string;                   // "024 123 4567"
  };

  // Address Format
  addressFormat: {
    postalCodeRequired: boolean;
    stateRequired: boolean;
    format: string[];                  // ["street", "city", "region", "country"]
  };

  // Status
  active: boolean;
  availableForSignup: boolean;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  updatedBy: string;
}
```

### SubCollection: `locations/countries/{countryCode}/regions/{regionId}`
```typescript
interface Region {
  regionId: string;                    // Document ID
  name: string;                        // "Greater Accra"
  countryCode: string;                 // Parent reference

  // Configuration
  code: string;                        // "GA"
  regionalTaxRate?: number;            // Optional regional tax
  holidays: {
    date: string;                      // "YYYY-MM-DD"
    name: string;
    recurring: boolean;
  }[];

  // Status
  active: boolean;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### SubCollection: `locations/countries/{countryCode}/regions/{regionId}/cities/{cityId}`
```typescript
interface City {
  cityId: string;                      // Document ID
  name: string;                        // "Accra"
  regionId: string;                    // Parent reference

  // Geolocation
  coordinates: {
    latitude: number;
    longitude: number;
  };

  // Configuration
  deliveryZones?: string[];
  localBusinessHours?: {
    open: string;                      // "08:00"
    close: string;                     // "18:00"
    timezone: string;
  };

  // Status
  active: boolean;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

## 5. Currencies Collection

### Collection: `currencies/{currencyCode}`
**Purpose**: Multi-currency support configuration

```typescript
interface Currency {
  currencyCode: string;                // Document ID: "GHS", "NGN", "KES", "USD"
  name: string;                        // "Ghana Cedi"
  symbol: string;                      // "₵"

  // Formatting
  formatting: {
    symbolPosition: 'prefix' | 'suffix';  // ₵100 vs 100₵
    decimalPlaces: number;             // 2
    thousandSeparator: string;         // ","
    decimalSeparator: string;          // "."
  };

  // Exchange Rates
  exchangeRates: {
    baseCurrency: string;              // "USD"
    rate: number;                      // 12.5 (GHS to USD)
    lastUpdated: Timestamp;
    source: 'manual' | 'automatic';
    apiProvider?: string;              // "exchangerate-api.com"
  };

  // Pricing Configuration
  pricing: {
    minimumAmount: number;             // Minimum transaction
    roundingRule: 'up' | 'down' | 'nearest';
    roundingPrecision: number;         // 0.05, 0.10, 1.00
  };

  // Status
  active: boolean;
  defaultForCountries: string[];       // ["GH"]

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  updatedBy: string;
}
```

---

## 6. Business Types Collection

### Collection: `businessTypes/{businessTypeId}`
**Purpose**: Dynamic business categories

```typescript
interface BusinessType {
  businessTypeId: string;              // Document ID
  name: string;                        // "Retail"
  displayName: string;
  description: string;
  icon?: string;                       // Icon identifier

  // Hierarchy
  parentId?: string;                   // For subcategories
  level: number;                       // 1 (parent), 2 (child)

  // Subcategories
  subcategories: {
    id: string;
    name: string;                      // "Fashion", "Electronics"
    description: string;
  }[];

  // Features
  features: {
    inventoryTracking: boolean;
    appointmentBooking: boolean;
    menuManagement: boolean;
    bulkInvoicing: boolean;
    termBilling: boolean;
    multiCurrency: boolean;
  };

  // Default Settings
  defaults: {
    taxRate?: number;
    paymentTerms?: number;             // Days
    invoicePrefix?: string;
  };

  // Status
  active: boolean;
  displayOrder: number;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  updatedBy: string;
}
```

---

## 7. Tax Rules Collection

### Collection: `taxRules/{taxRuleId}`
**Purpose**: Location and business-specific tax rules

```typescript
interface TaxRule {
  taxRuleId: string;                   // Document ID
  name: string;                        // "Ghana VAT 12.5%"
  description: string;

  // Tax Type
  type: 'vat' | 'gst' | 'service_tax' | 'withholding_tax' | 'custom';

  // Applicability
  applicability: {
    countries: string[];               // ["GH"]
    regions?: string[];
    businessTypes?: string[];
    productCategories?: string[];
  };

  // Tax Configuration
  rate: number;                        // 0.125 (12.5%)
  calculation: 'percentage' | 'fixed';

  // Exemptions
  exemptions: {
    businessTypes?: string[];
    productCategories?: string[];      // ["food", "medicine"]
    minimumAmount?: number;
  };

  // Date Range
  effectiveFrom: Timestamp;
  effectiveTo?: Timestamp;

  // Compliance
  taxIdRequired: boolean;
  taxIdValidationRegex?: string;
  reportingFrequency: 'monthly' | 'quarterly' | 'annually';
  reportFormat: string;                // Format specification

  // Status
  active: boolean;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  updatedBy: string;
}
```

---

## 8. Subscription Plans Collection

### Collection: `subscriptionPlans/{planId}`
**Purpose**: Dynamic subscription plan management

```typescript
interface SubscriptionPlan {
  planId: string;                      // Document ID: "free", "starter", "pro"
  name: string;                        // "Pro Plan"
  displayName: string;
  description: string;
  tagline?: string;

  // Pricing (Multi-Currency)
  pricing: {
    [currencyCode: string]: {
      amount: number;
      currency: string;
    };
  };
  // Example: { "GHS": { amount: 149, currency: "GHS" } }

  // Billing
  billingCycle: 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
  billingCycleDays: number;            // 30, 90, 180, 365
  setupFee: {
    [currencyCode: string]: number;
  };

  // Trial
  trialEnabled: boolean;
  trialDays: number;                   // 14

  // Features
  features: {
    invoicesPerMonth: number | 'unlimited';
    customersLimit: number | 'unlimited';
    productsLimit: number | 'unlimited';
    teamMembers: number;
    apiAccess: boolean;
    aiFeatures: boolean;
    whatsappMessages: number | 'unlimited';
    customBranding: boolean;
    prioritySupport: boolean;
    multiCurrency: boolean;
    webhooks: boolean;
    advancedAnalytics: boolean;
  };

  // Limits
  limits: {
    storageGB: number;
    apiCallsPerHour: number;
    whatsappMessagesPerMonth: number;
    teamMembers: number;
    customDomains: number;
  };

  // Visibility
  visible: boolean;
  featured: boolean;
  displayOrder: number;

  // Marketing
  highlights: string[];                // ["Unlimited invoices", "AI features"]
  ctaText: string;                     // "Start Free Trial"

  // Status
  active: boolean;
  availableForNewSignups: boolean;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  updatedBy: string;
}
```

---

## 9. Pricing Rules Collection

### Collection: `pricingRules/{ruleId}`
**Purpose**: Dynamic pricing rules and discounts

```typescript
interface PricingRule {
  ruleId: string;                      // Document ID
  name: string;                        // "Annual Discount 20%"
  description: string;

  // Rule Type
  type: 'volume_discount' | 'promotional' | 'partner_pricing' | 'regional' | 'early_bird' | 'referral';

  // Applicability
  applicability: {
    plans?: string[];                  // Specific plans
    countries?: string[];
    businessTypes?: string[];
    partnerIds?: string[];
    newCustomersOnly?: boolean;
  };

  // Discount Configuration
  discount: {
    type: 'percentage' | 'fixed_amount';
    value: number;                     // 20 (for 20%), or 50 (for ₵50 off)
    maxDiscount?: number;              // Cap for percentage discounts
  };

  // Conditions
  conditions: {
    minimumCommitment?: number;        // Months
    minimumSpend?: number;
    billingCycle?: string[];           // ["annual"]
    promoCode?: string;                // "LAUNCH50"
    promoCodeRequired?: boolean;
  };

  // Duration
  applicableFrom: Timestamp;
  applicableTo?: Timestamp;
  maxRedemptions?: number;             // Total uses limit
  redemptionCount: number;

  // Recurring
  applyToFirstPaymentOnly: boolean;
  applyToAllPayments: boolean;
  maxRecurringMonths?: number;         // 3 (for first 3 months)

  // Status
  active: boolean;
  priority: number;                    // For stacking rules

  // Metadata
  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
  updatedBy: string;
}
```

---

## 10. Merchants Collection

### Collection: `merchants/{merchantId}`
**Purpose**: Enhanced merchant accounts with admin metadata

```typescript
interface Merchant {
  merchantId: string;                  // Document ID (phone number or auto-generated)

  // Business Information
  businessInfo: {
    businessName: string;
    registrationNumber?: string;
    taxId?: string;
    businessType: string;              // Reference to businessTypes
    phoneNumber: string;
    email: string;
    website?: string;
    logo?: string;                     // Cloud Storage URL
  };

  // Location
  location: {
    country: string;                   // "GH"
    region?: string;
    city?: string;
    address?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };

  // Subscription
  subscription: {
    planId: string;
    status: 'trial' | 'active' | 'past_due' | 'canceled' | 'suspended';
    currentPeriodStart: Timestamp;
    currentPeriodEnd: Timestamp;
    trialEnd?: Timestamp;
    cancelAt?: Timestamp;
    canceledAt?: Timestamp;
    currency: string;
    amount: number;
  };

  // Admin Metadata (Super Admin Specific)
  adminMetadata: {
    // Risk & Verification
    riskScore: number;                 // 0-100
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    verificationStatus: 'pending' | 'verified' | 'rejected' | 'under_review';
    verificationDate?: Timestamp;
    verifiedBy?: string;               // Admin ID

    // KYC/KYB Documents
    kycStatus: 'pending' | 'submitted' | 'verified' | 'rejected';
    kycDocuments: {
      documentType: string;            // "national_id", "business_cert"
      status: 'pending' | 'verified' | 'rejected';
      verifiedAt?: Timestamp;
    }[];

    // Admin Notes & Flags
    notes: {
      noteId: string;
      adminId: string;
      note: string;
      timestamp: Timestamp;
      visibility: 'internal' | 'shared';
    }[];

    flags: string[];                   // ["vip", "beta_tester", "high_risk"]
    tags: string[];                    // Custom tags

    // Transaction Limits
    limits: {
      dailyTransactionLimit: number;
      monthlyVolumeLimit: number;
      maxInvoiceAmount: number;
      customLimits?: Record<string, number>;
    };

    // Support History
    supportTicketsCount: number;
    lastSupportInteraction?: Timestamp;
    supportPriority: 'low' | 'normal' | 'high' | 'vip';
  };

  // Statistics
  stats: {
    totalInvoices: number;
    totalRevenue: number;
    totalCustomers: number;
    averageInvoiceValue: number;
    lastInvoiceDate?: Timestamp;
    lastLoginDate?: Timestamp;
    activeInvoices: number;
  };

  // Account Status
  status: 'pending' | 'active' | 'suspended' | 'terminated' | 'archived';
  statusHistory: {
    status: string;
    changedAt: Timestamp;
    changedBy: string;               // Admin ID
    reason: string;
  }[];

  // Onboarding
  onboarding: {
    completed: boolean;
    completedSteps: string[];
    currentStep?: string;
    startedAt: Timestamp;
    completedAt?: Timestamp;
  };

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  approvedBy?: string;                 // Admin ID
  approvedAt?: Timestamp;
}
```

---

## 11. API Integrations Collection

### Collection: `apiIntegrations/{integrationId}`
**Purpose**: External service configurations

```typescript
interface APIIntegration {
  integrationId: string;               // Document ID
  name: string;                        // "360dialog", "Paystack"
  displayName: string;
  description: string;
  type: 'whatsapp' | 'payment' | 'ai' | 'email' | 'analytics' | 'other';

  // API Configuration
  config: {
    apiKey?: string;                   // Encrypted
    secretKey?: string;                // Encrypted
    publicKey?: string;
    webhookSecret?: string;            // Encrypted
    baseUrl?: string;
    apiVersion?: string;

    // Custom Configuration
    customConfig?: Record<string, any>;
  };

  // Endpoints
  endpoints: {
    name: string;                      // "sendMessage", "verifyPayment"
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    path: string;                      // "/messages/send"
    description?: string;
  }[];

  // Rate Limits
  rateLimits: {
    requestsPerSecond: number;
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
  };

  // Monitoring
  monitoring: {
    enabled: boolean;
    healthCheckUrl?: string;
    healthCheckInterval?: number;      // Seconds
    alertThreshold: {
      errorRate: number;               // Percentage
      responseTime: number;            // Milliseconds
    };
  };

  // Usage Statistics
  usage: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    lastRequestAt?: Timestamp;
    averageResponseTime: number;       // Milliseconds
  };

  // Status
  active: boolean;
  environment: 'production' | 'sandbox' | 'test';

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  updatedBy: string;
}
```

---

## 12. Webhooks Collection

### Collection: `webhooks/{webhookId}`
**Purpose**: Webhook configuration and management

```typescript
interface Webhook {
  webhookId: string;                   // Document ID
  name: string;
  description: string;

  // Type
  direction: 'incoming' | 'outgoing';

  // Configuration (Incoming)
  incomingConfig?: {
    source: string;                    // "paystack", "360dialog"
    events: string[];                  // ["payment.success", "message.delivered"]
    secret: string;                    // For signature verification
    ipWhitelist?: string[];
  };

  // Configuration (Outgoing)
  outgoingConfig?: {
    targetUrl: string;
    method: 'POST' | 'PUT';
    headers?: Record<string, string>;
    events: string[];                  // ["merchant.created", "plan.upgraded"]

    // Retry Configuration
    retryPolicy: {
      maxRetries: number;
      retryIntervalSeconds: number;
      backoffMultiplier: number;
    };
  };

  // Monitoring
  stats: {
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    lastCallAt?: Timestamp;
    averageResponseTime: number;
  };

  // Alerts
  alertConfig: {
    enabled: boolean;
    failureThreshold: number;          // Alert after X failures
    alertChannels: string[];           // ["email", "slack"]
  };

  // Status
  active: boolean;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  updatedBy: string;
}
```

---

## 13. Audit Logs Collection

### Collection: `auditLogs/{logId}`
**Purpose**: Immutable audit trail for compliance

```typescript
interface AuditLog {
  logId: string;                       // Document ID (auto-generated)

  // Who
  actor: {
    adminId: string;
    email: string;
    displayName: string;
    roleId: string;
    accessLevel: string;
  };

  // What
  action: {
    type: string;                      // "merchant.suspend", "plan.update"
    category: 'system_config' | 'merchant' | 'pricing' | 'api' | 'security' | 'compliance';
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  };

  // Where
  target: {
    resourceType: string;              // "merchant", "subscription_plan"
    resourceId: string;
    resourceName?: string;
  };

  // When
  timestamp: Timestamp;

  // Why
  reason?: string;
  ticketReference?: string;

  // Changes (Before/After)
  changes?: {
    before: Record<string, any>;
    after: Record<string, any>;
    fields: string[];                  // Changed field names
  };

  // Context
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

  // Result
  result: {
    success: boolean;
    errorMessage?: string;
    statusCode?: number;
  };

  // Metadata (Immutable)
  readonly: true;
  ttl?: Timestamp;                     // Auto-delete after 7 years
}
```

---

## 14. Alerts Collection

### Collection: `alerts/{alertId}`
**Purpose**: System alerts and notifications

```typescript
interface Alert {
  alertId: string;                     // Document ID

  // Alert Details
  title: string;
  message: string;
  type: 'system_down' | 'high_error_rate' | 'slow_response' | 'unusual_traffic' |
        'high_cpu' | 'low_disk' | 'suspicious_activity' | 'other';

  // Severity
  severity: 'critical' | 'high' | 'medium' | 'low';
  priority: 'P0' | 'P1' | 'P2' | 'P3';

  // Source
  source: {
    system: string;                    // "firebase_functions", "api_gateway"
    component?: string;
    serviceId?: string;
  };

  // Metrics (if applicable)
  metrics?: {
    currentValue: number;
    threshold: number;
    unit: string;                      // "percentage", "ms", "requests"
  };

  // Status
  status: 'triggered' | 'acknowledged' | 'investigating' | 'resolved' | 'false_positive';

  // Response
  acknowledgedBy?: string;             // Admin ID
  acknowledgedAt?: Timestamp;
  resolvedBy?: string;
  resolvedAt?: Timestamp;
  resolutionNotes?: string;

  // Notifications
  notifications: {
    channels: ('sms' | 'email' | 'slack' | 'dashboard')[];
    sentAt: Timestamp;
    recipients: string[];              // Admin IDs or emails
  }[];

  // Escalation
  escalation: {
    level: number;                     // 1, 2, 3
    escalatedAt?: Timestamp;
    escalatedTo?: string[];            // Admin IDs
  };

  // Timestamps
  triggeredAt: Timestamp;
  updatedAt: Timestamp;

  // Auto-resolve
  autoResolve: boolean;
  autoResolveAfterMinutes?: number;
}
```

---

## 15. System Metrics Collection

### Collection: `systemMetrics/{metricId}`
**Purpose**: Real-time platform metrics (TTL: 90 days)

```typescript
interface SystemMetric {
  metricId: string;                    // Document ID
  timestamp: Timestamp;

  // Metric Information
  metricType: 'platform' | 'revenue' | 'user' | 'performance' | 'infrastructure';
  metricName: string;                  // "mrr", "active_users", "api_response_time"

  // Value
  value: number;
  unit: string;                        // "currency", "count", "percentage", "milliseconds"

  // Dimensions (for filtering/grouping)
  dimensions: {
    country?: string;
    region?: string;
    plan?: string;
    businessType?: string;
    [key: string]: string | undefined;
  };

  // Metadata
  metadata?: Record<string, any>;

  // TTL (Auto-delete after 90 days)
  ttl: Timestamp;                      // timestamp + 90 days
}
```

---

## Composite Indexes

### Required Firestore Indexes

```javascript
// Admins Collection
{
  collection: "admins",
  fields: [
    { field: "email", order: "ASCENDING" },
    { field: "status", order: "ASCENDING" }
  ]
}

// Merchants Collection
{
  collection: "merchants",
  fields: [
    { field: "location.country", order: "ASCENDING" },
    { field: "subscription.planId", order: "ASCENDING" },
    { field: "status", order: "ASCENDING" }
  ]
},
{
  collection: "merchants",
  fields: [
    { field: "adminMetadata.riskScore", order: "DESCENDING" },
    { field: "status", order: "ASCENDING" }
  ]
},
{
  collection: "merchants",
  fields: [
    { field: "businessInfo.businessName", order: "ASCENDING" },
    { field: "createdAt", order: "DESCENDING" }
  ]
}

// Audit Logs Collection
{
  collection: "auditLogs",
  fields: [
    { field: "actor.adminId", order: "ASCENDING" },
    { field: "timestamp", order: "DESCENDING" }
  ]
},
{
  collection: "auditLogs",
  fields: [
    { field: "action.category", order: "ASCENDING" },
    { field: "timestamp", order: "DESCENDING" }
  ]
}

// System Metrics Collection
{
  collection: "systemMetrics",
  fields: [
    { field: "metricType", order: "ASCENDING" },
    { field: "metricName", order: "ASCENDING" },
    { field: "timestamp", order: "DESCENDING" }
  ]
}

// Alerts Collection
{
  collection: "alerts",
  fields: [
    { field: "severity", order: "ASCENDING" },
    { field: "status", order: "ASCENDING" },
    { field: "triggeredAt", order: "DESCENDING" }
  ]
}
```

---

## BigQuery Schema (Analytics Warehouse)

### Table: `platform_metrics`
```sql
CREATE TABLE platform_metrics (
  metric_id STRING NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  metric_type STRING NOT NULL,
  metric_name STRING NOT NULL,
  metric_value FLOAT64 NOT NULL,
  unit STRING,

  -- Dimensions
  country STRING,
  region STRING,
  plan STRING,
  business_type STRING,

  -- Metadata
  metadata JSON,

  -- Partitioning and Clustering
  partition_date DATE NOT NULL
)
PARTITION BY partition_date
CLUSTER BY metric_type, metric_name, country;
```

### Data Export from Firestore to BigQuery
- **Frequency**: Real-time streaming via Cloud Functions
- **Retention**: 5 years in BigQuery
- **Use Case**: Historical analysis, trend forecasting, custom reports

---

## Security Rules

### Firestore Security Rules Example

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper Functions
    function isAdmin() {
      return request.auth != null &&
             exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }

    function hasRole(role) {
      return isAdmin() &&
             get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.accessLevel == role;
    }

    function hasPermission(resource, action) {
      let admin = get(/databases/$(database)/documents/admins/$(request.auth.uid));
      let role = get(/databases/$(database)/documents/roles/$(admin.data.roleId));
      return role.data.permissions[resource][action] == true;
    }

    // System Config
    match /systemConfig/{configId} {
      allow read: if isAdmin();
      allow write: if hasPermission('systemConfig', 'write');
    }

    // Admins
    match /admins/{adminId} {
      allow read: if isAdmin();
      allow write: if hasRole('super_admin');
    }

    // Merchants
    match /merchants/{merchantId} {
      allow read: if isAdmin();
      allow write: if hasPermission('merchantManagement', 'write');
    }

    // Audit Logs (Read-only)
    match /auditLogs/{logId} {
      allow read: if isAdmin();
      allow write: if false; // Only server-side writes
    }

    // Alerts
    match /alerts/{alertId} {
      allow read: if isAdmin();
      allow write: if hasPermission('systemHealth', 'write');
    }
  }
}
```

---

## Data Migration Strategy

### Phase 1: Initial Setup
1. Create Firestore collections with security rules
2. Seed system configuration data
3. Create default admin accounts and roles
4. Set up BigQuery tables and data streaming

### Phase 2: Test Data
1. Import test merchants (100 accounts)
2. Generate test metrics for 30 days
3. Create sample audit logs
4. Test all indexes and queries

### Phase 3: Production Migration
1. Backup existing data (if any)
2. Migrate merchants in batches (100 at a time)
3. Verify data integrity
4. Enable real-time sync to BigQuery

---

## Backup & Disaster Recovery

### Backup Strategy
- **Firestore**: Automatic daily backups with 30-day retention
- **BigQuery**: Weekly full backups, 1-year retention
- **Critical Collections**: Hourly incremental backups

### Recovery Time Objective (RTO)
- **Critical Systems**: < 1 hour
- **Non-Critical Systems**: < 4 hours

### Recovery Point Objective (RPO)
- **Firestore**: < 1 hour (real-time replication)
- **BigQuery**: < 24 hours

---

## Monitoring & Observability

### Metrics to Monitor
1. **Write Operations**: Alerts if > 10,000/minute
2. **Read Operations**: Alerts if > 50,000/minute
3. **Query Latency**: P95 < 200ms
4. **Error Rate**: < 0.1%
5. **Storage Usage**: Alert at 80% capacity

### Tools
- **Firestore Metrics**: Google Cloud Monitoring
- **BigQuery**: Query execution stats
- **Custom Dashboards**: Datadog integration

---

**Last Updated**: November 6, 2025
**Version**: 1.0
**Status**: Ready for Implementation
