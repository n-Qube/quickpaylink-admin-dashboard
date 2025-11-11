# QuickLink Pay Super Admin - Database Schema Diagram

## Visual Database Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                         QUICKLINK PAY SUPER ADMIN SYSTEM                             │
│                              Firestore Database Schema                               │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────────────────┐
│                            SYSTEM LAYER                                               │
├───────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                       │
│  ┌─────────────────┐        ┌─────────────────┐        ┌─────────────────┐        │
│  │ systemConfig    │        │ admins          │        │ roles           │        │
│  ├─────────────────┤        ├─────────────────┤        ├─────────────────┤        │
│  │ • configId (PK) │        │ • adminId (PK)  │───────▶│ • roleId (PK)   │        │
│  │ • version       │        │ • email (idx)   │        │ • name          │        │
│  │ • features      │        │ • profile       │        │ • permissions   │        │
│  │ • platformSettings│      │ • auth          │        │ • level         │        │
│  │ • defaults      │        │ • roleId (FK)   │        │ • isActive      │        │
│  │ • rateLimits    │        │ • permissions   │        └─────────────────┘        │
│  └─────────────────┘        │ • accessLevel   │                                    │
│                              │ • status (idx)  │                                    │
│                              └─────────────────┘                                    │
│                                                                                       │
└───────────────────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────────────────┐
│                      CONFIGURATION LAYER                                              │
├───────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                       │
│  ┌─────────────────────────────┐         ┌─────────────────────────────┐           │
│  │ locations/countries         │         │ currencies                  │           │
│  ├─────────────────────────────┤         ├─────────────────────────────┤           │
│  │ • countryCode (PK)          │         │ • currencyCode (PK)         │           │
│  │ • name                      │         │ • name                      │           │
│  │ • defaultCurrency (FK) ─────┼────────▶│ • symbol                    │           │
│  │ • taxConfiguration          │         │ • formatting                │           │
│  │ • phoneFormat               │         │ • exchangeRates             │           │
│  │ • active (idx)              │         │ • pricing                   │           │
│  └─────────────────────────────┘         └─────────────────────────────┘           │
│            │                                                                         │
│            │ SubCollections                                                         │
│            ├──▶ regions/{regionId}                                                  │
│            │    └──▶ cities/{cityId}                                                │
│                                                                                       │
│  ┌─────────────────────────────┐         ┌─────────────────────────────┐           │
│  │ businessTypes               │         │ taxRules                    │           │
│  ├─────────────────────────────┤         ├─────────────────────────────┤           │
│  │ • businessTypeId (PK)       │         │ • taxRuleId (PK)            │           │
│  │ • name                      │         │ • name                      │           │
│  │ • subcategories             │         │ • type                      │           │
│  │ • features                  │         │ • applicability             │           │
│  │ • defaults                  │         │ • rate                      │           │
│  │ • active (idx)              │         │ • exemptions                │           │
│  └─────────────────────────────┘         │ • effectiveFrom (idx)       │           │
│                                           └─────────────────────────────┘           │
│                                                                                       │
└───────────────────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────────────────┐
│                        PRICING & SUBSCRIPTION LAYER                                   │
├───────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                       │
│  ┌─────────────────────────────┐         ┌─────────────────────────────┐           │
│  │ subscriptionPlans           │         │ pricingRules                │           │
│  ├─────────────────────────────┤         ├─────────────────────────────┤           │
│  │ • planId (PK)               │         │ • ruleId (PK)               │           │
│  │ • name                      │         │ • name                      │           │
│  │ • pricing {}                │◀────────│ • type                      │           │
│  │   - GHS: 149                │  applies│ • applicability             │           │
│  │   - NGN: 5000              │      to │   - plans[] (FK)            │           │
│  │ • billingCycle              │         │ • discount                  │           │
│  │ • features                  │         │ • conditions                │           │
│  │ • limits                    │         │ • active (idx)              │           │
│  │ • active (idx)              │         │ • priority (idx)            │           │
│  └─────────────────────────────┘         └─────────────────────────────┘           │
│                                                                                       │
└───────────────────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────────────────┐
│                          MERCHANT MANAGEMENT LAYER                                    │
├───────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                       │
│  ┌────────────────────────────────────────────────────────────────────────┐         │
│  │ merchants                                                              │         │
│  ├────────────────────────────────────────────────────────────────────────┤         │
│  │ • merchantId (PK)                                                      │         │
│  │ • businessInfo                                                         │         │
│  │   - businessName (idx)                                                 │         │
│  │   - businessType (FK) ─────────────────┐                              │         │
│  │ • location                             │                              │         │
│  │   - country (FK) (idx)                 │                              │         │
│  │   - region, city                       │                              │         │
│  │ • subscription                         │                              │         │
│  │   - planId (FK) (idx) ─────────────────┼──────────────────┐           │         │
│  │   - status (idx)                       │                  │           │         │
│  │ • adminMetadata                        │                  │           │         │
│  │   - riskScore (idx)                    ▼                  ▼           │         │
│  │   - riskLevel                  businessTypes    subscriptionPlans     │         │
│  │   - verificationStatus                                                │         │
│  │   - kycStatus                                                         │         │
│  │   - notes[]                                                           │         │
│  │   - flags[], tags[]                                                   │         │
│  │   - limits                                                            │         │
│  │ • stats                                                               │         │
│  │ • status (idx)                                                        │         │
│  │ • createdAt (idx)                                                     │         │
│  └────────────────────────────────────────────────────────────────────────┘         │
│            │                                                                         │
│            │ SubCollections                                                         │
│            ├──▶ kycDocuments/{documentId}                                          │
│            ├──▶ supportTickets/{ticketId}                                          │
│            └──▶ adminNotes/{noteId}                                                │
│                                                                                       │
└───────────────────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────────────────┐
│                        API & INTEGRATION LAYER                                        │
├───────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                       │
│  ┌─────────────────────────────┐         ┌─────────────────────────────┐           │
│  │ apiIntegrations             │         │ webhooks                    │           │
│  ├─────────────────────────────┤         ├─────────────────────────────┤           │
│  │ • integrationId (PK)        │         │ • webhookId (PK)            │           │
│  │ • name                      │         │ • name                      │           │
│  │ • type (idx)                │         │ • direction                 │           │
│  │   - whatsapp (360dialog)    │         │   - incoming                │           │
│  │   - payment (Paystack)      │         │   - outgoing                │           │
│  │   - ai (Gemini)             │         │ • incomingConfig            │           │
│  │   - email (SendGrid)        │         │   - source                  │           │
│  │ • config (encrypted)        │         │   - events[]                │           │
│  │   - apiKey                  │         │ • outgoingConfig            │           │
│  │   - secretKey               │         │   - targetUrl               │           │
│  │ • endpoints[]               │         │   - retryPolicy             │           │
│  │ • rateLimits                │         │ • stats                     │           │
│  │ • monitoring                │         │ • alertConfig               │           │
│  │ • usage                     │         │ • active (idx)              │           │
│  │ • active (idx)              │         └─────────────────────────────┘           │
│  │ • environment               │                                                    │
│  └─────────────────────────────┘                                                    │
│                                                                                       │
└───────────────────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────────────────┐
│                      MONITORING & COMPLIANCE LAYER                                    │
├───────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                       │
│  ┌─────────────────────────────┐         ┌─────────────────────────────┐           │
│  │ auditLogs                   │         │ alerts                      │           │
│  ├─────────────────────────────┤         ├─────────────────────────────┤           │
│  │ • logId (PK)                │         │ • alertId (PK)              │           │
│  │ • actor                     │         │ • title                     │           │
│  │   - adminId (FK) (idx)      │         │ • type (idx)                │           │
│  │   - email                   │         │ • severity (idx)            │           │
│  │ • action                    │         │ • priority                  │           │
│  │   - type                    │         │ • source                    │           │
│  │   - category (idx)          │         │ • status (idx)              │           │
│  │   - severity                │         │ • acknowledgedBy (FK)       │           │
│  │ • target                    │         │ • resolvedBy (FK)           │           │
│  │   - resourceType            │         │ • notifications[]           │           │
│  │   - resourceId              │         │ • escalation                │           │
│  │ • timestamp (idx)           │         │ • triggeredAt (idx)         │           │
│  │ • changes                   │         └─────────────────────────────┘           │
│  │   - before                  │                                                    │
│  │   - after                   │         ┌─────────────────────────────┐           │
│  │ • context                   │         │ complianceReports           │           │
│  │ • result                    │         ├─────────────────────────────┤           │
│  │ • readonly: true            │         │ • reportId (PK)             │           │
│  │ • ttl (7 years)             │         │ • type                      │           │
│  └─────────────────────────────┘         │   - kyc                     │           │
│                                           │   - transaction             │           │
│  ┌─────────────────────────────┐         │   - tax                     │           │
│  │ systemMetrics (TTL: 90d)    │         │   - suspicious_activity     │           │
│  ├─────────────────────────────┤         │ • format                    │           │
│  │ • metricId (PK)             │         │ • generatedBy (FK)          │           │
│  │ • timestamp (idx)           │         │ • generatedAt               │           │
│  │ • metricType (idx)          │         │ • status                    │           │
│  │ • metricName (idx)          │         │ • fileUrl                   │           │
│  │ • value                     │         └─────────────────────────────┘           │
│  │ • dimensions                │                                                    │
│  │   - country                 │         ┌─────────────────────────────┐           │
│  │   - plan                    │         │ maintenanceWindows          │           │
│  │   - businessType            │         ├─────────────────────────────┤           │
│  │ • ttl (90 days)             │         │ • windowId (PK)             │           │
│  └─────────────────────────────┘         │ • type                      │           │
│                                           │ • scheduledStart            │           │
│                                           │ • scheduledEnd              │           │
│                                           │ • status                    │           │
│                                           │ • affectedServices[]        │           │
│                                           │ • notificationSent          │           │
│                                           └─────────────────────────────┘           │
│                                                                                       │
└───────────────────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────────────────┐
│                          ANALYTICS WAREHOUSE (BigQuery)                               │
├───────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                       │
│  ┌─────────────────────────────────────────────────────────────────────────┐        │
│  │ platform_metrics (Partitioned by date, Clustered by type/name/country) │        │
│  ├─────────────────────────────────────────────────────────────────────────┤        │
│  │ • metric_id                                                             │        │
│  │ • timestamp                                                             │        │
│  │ • metric_type ────────────▶ platform | revenue | user | performance    │        │
│  │ • metric_name ────────────▶ mrr | active_users | response_time ...     │        │
│  │ • metric_value                                                          │        │
│  │ • unit                                                                  │        │
│  │ • country, region, plan, business_type (Dimensions)                    │        │
│  │ • metadata (JSON)                                                       │        │
│  │ • partition_date (Partition key)                                        │        │
│  └─────────────────────────────────────────────────────────────────────────┘        │
│                                                                                       │
│  Stream from Firestore systemMetrics ────────▶ BigQuery (Real-time)                │
│  Retention: 5 years                                                                  │
│  Use: Historical analysis, trend forecasting, custom reports                        │
│                                                                                       │
└───────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Relationship Diagram

```
┌─────────────┐
│   admins    │
└──────┬──────┘
       │ roleId (FK)
       │
       ▼
┌─────────────┐
│    roles    │
└─────────────┘

┌─────────────┐         ┌──────────────────┐         ┌─────────────────┐
│  countries  │◀────────│    merchants     │────────▶│subscriptionPlans│
└─────────────┘ country └──────────────────┘  planId └─────────────────┘
       │                        │
       │                        │ businessType
       ▼                        ▼
┌─────────────┐         ┌──────────────────┐
│   regions   │         │  businessTypes   │
└─────────────┘         └──────────────────┘
       │
       ▼
┌─────────────┐
│   cities    │
└─────────────┘

┌─────────────┐         ┌──────────────────┐
│ currencies  │◀────────│subscriptionPlans │
└─────────────┘ pricing └──────────────────┘
                                 ▲
                                 │ applies to
                                 │
                         ┌──────────────────┐
                         │  pricingRules    │
                         └──────────────────┘

┌─────────────┐         ┌──────────────────┐
│  taxRules   │────────▶│    countries     │
└─────────────┘ applies └──────────────────┘

┌─────────────┐         ┌──────────────────┐
│  webhooks   │◀────────│ apiIntegrations  │
└─────────────┘  uses   └──────────────────┘

┌─────────────┐         ┌──────────────────┐
│ auditLogs   │────────▶│     admins       │
└─────────────┘ actor   └──────────────────┘

┌─────────────┐         ┌──────────────────┐
│   alerts    │────────▶│     admins       │
└─────────────┘resolved └──────────────────┘
                by
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ADMIN ACTIONS                                    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      API GATEWAY + AUTH                                  │
│                    - Verify JWT token                                    │
│                    - Check RBAC permissions                              │
│                    - Rate limiting                                       │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
        ┌───────────────┐  ┌───────────────┐  ┌───────────────┐
        │   Firestore   │  │ Cloud Storage │  │   BigQuery    │
        │   (Primary)   │  │    (Files)    │  │  (Analytics)  │
        └───────────────┘  └───────────────┘  └───────────────┘
                │                                       ▲
                │                                       │
                ▼                                       │
        ┌───────────────┐                              │
        │  Audit Logs   │                              │
        │  (Immutable)  │                              │
        └───────────────┘                              │
                                                        │
        ┌───────────────┐                              │
        │systemMetrics  │──────────────────────────────┘
        │  (TTL: 90d)   │     Stream to BigQuery
        └───────────────┘
```

---

## Index Strategy

### Single Field Indexes
```
admins:
  - email (ascending)
  - status (ascending)

merchants:
  - location.country (ascending)
  - subscription.planId (ascending)
  - status (ascending)
  - businessInfo.businessName (ascending)
  - createdAt (descending)

auditLogs:
  - timestamp (descending)
  - actor.adminId (ascending)

systemMetrics:
  - timestamp (descending)
  - metricType (ascending)
```

### Composite Indexes
```
merchants:
  - [location.country, subscription.planId, status]
  - [adminMetadata.riskScore DESC, status]

auditLogs:
  - [actor.adminId, timestamp DESC]
  - [action.category, timestamp DESC]

systemMetrics:
  - [metricType, metricName, timestamp DESC]

alerts:
  - [severity, status, triggeredAt DESC]
```

---

## Storage Estimates

### Collection Size Estimates (for 10,000 merchants)

| Collection | Documents | Avg Doc Size | Total Size | Notes |
|------------|-----------|--------------|------------|-------|
| merchants | 10,000 | 5 KB | 50 MB | Core merchant data |
| auditLogs | 500,000 | 2 KB | 1 GB | 7-year retention |
| systemMetrics | 2,500,000 | 0.5 KB | 1.25 GB | 90-day TTL |
| alerts | 50,000 | 1 KB | 50 MB | Active alerts |
| subscriptionPlans | 10 | 3 KB | 30 KB | Small collection |
| locations | 500 | 2 KB | 1 MB | Countries/regions/cities |
| **TOTAL** | | | **~2.35 GB** | Firestore |

### BigQuery Storage (5 years)
- **Historical Metrics**: ~50 GB
- **Aggregated Data**: ~10 GB
- **Total**: ~60 GB

---

## Backup & Recovery

### Backup Schedule
```
Daily:    Full Firestore backup (retain 30 days)
Weekly:   Full BigQuery backup (retain 1 year)
Hourly:   Incremental backup of critical collections
```

### Recovery Procedures
1. **Point-in-Time Recovery**: Available for last 30 days
2. **Disaster Recovery**: Multi-region replication
3. **Data Export**: Monthly exports to Cloud Storage

---

**Last Updated**: November 6, 2025
**Version**: 1.0
**Status**: Design Complete - Ready for Implementation
