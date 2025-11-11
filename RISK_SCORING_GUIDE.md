# Risk Scoring System - Complete Guide

## Overview

The QuickLink Pay Risk Management System uses a comprehensive, multi-factor scoring algorithm to assess merchant risk levels automatically. This guide explains how risk scores are calculated and how to interpret them.

## Risk Score Range

Risk scores range from **0 to 100**, with **lower scores indicating lower risk**:

| Score Range | Risk Level | Color Code | Description |
|-------------|------------|------------|-------------|
| 0-25        | **Low**    | 🟢 Green   | Trusted merchant, minimal risk |
| 26-50       | **Medium** | 🟡 Yellow  | Normal risk, standard monitoring |
| 51-75       | **High**   | 🟠 Orange  | Elevated risk, enhanced monitoring required |
| 76-100      | **Critical** | 🔴 Red   | Severe risk, immediate action required |

---

## Score Components

The total risk score is calculated using a **weighted average** of five key components:

### 1. KYC Score (30% weight)

**Purpose:** Assess the completeness and quality of Know Your Customer documentation.

**Factors:**

#### A. KYC Status (0-40 points)
- ✅ **Approved:** 0 points (best case)
- 🔄 **Under Review/Submitted:** 15 points (pending)
- ⏳ **Pending:** 30 points (documents needed)
- ❌ **Rejected:** 50 points (major risk)
- ⚠️ **Expired:** 45 points (needs renewal)
- ❓ **Not Started:** 40 points

#### B. Document Completeness (0-30 points)
Required documents:
1. Business Registration Certificate
2. Tax Identification Certificate
3. Owner ID Card (Ghana Card/Passport/Driver's License)
4. Proof of Business Address
5. Bank Statement (Last 3 months)
6. Operating License (if applicable)

**Calculation:**
```
Score = (1 - documentsSubmitted / 6) × 30
```

**Example:**
- 6/6 documents submitted → 0 points
- 4/6 documents submitted → 10 points
- 0/6 documents submitted → 30 points

#### C. Document Verification (0-20 points)
Measures how many submitted documents have been verified:

```
Score = (1 - documentsVerified / documentsSubmitted) × 20
```

**Example:**
- 4/4 documents verified → 0 points
- 2/4 documents verified → 10 points
- 0/4 documents verified → 20 points

#### D. Time Since Submission (0-10 points)
- **< 30 days:** 0 points
- **30-90 days:** 5 points
- **> 90 days:** 10 points (needs review)

**Total KYC Score Example:**
A merchant with:
- Status: Pending (30)
- Documents: 3/6 submitted (15)
- Verification: 1/3 verified (13)
- Time: 45 days (5)

**KYC Score = 30 + 15 + 13 + 5 = 63 points**

---

### 2. Business Maturity Score (20% weight)

**Purpose:** Evaluate merchant business stability and legitimacy.

**Factors:**

#### A. Account Age (0-25 points)
- **< 7 days:** 25 points (very new)
- **7-30 days:** 20 points
- **30-90 days:** 10 points
- **90-180 days:** 5 points
- **> 180 days:** 0 points (mature)

#### B. Business Registration (0-25 points)
- **No registration number:** 25 points
- **Has registration, no tax ID:** 15 points
- **Has both:** 0 points

#### C. Business Type Risk (0-25 points)
- **High-risk industries:** 25 points
  - Cryptocurrency
  - Gambling
  - Adult entertainment
  - Forex trading
  - Cannabis
- **Medium-risk industries:** 15 points
  - Marketplace
  - Crowdfunding
  - Subscription services
- **Low-risk industries:** 0 points
  - Retail, Services, E-commerce, etc.

#### D. Contact Verification (0-25 points)
- **Missing email:** 15 points
- **Missing phone:** 10 points
- **Both present:** 0 points

**Total Business Maturity Example:**
A 15-day-old e-commerce merchant with registration number, tax ID, email, and phone:

**Business Maturity Score = 20 + 0 + 0 + 0 = 20 points**

---

### 3. Transaction Score (25% weight)

**Purpose:** Identify unusual transaction patterns and behaviors.

**Factors:**

#### A. Transaction History (0-20 points)
- **0 transactions:** 20 points
- **1-9 transactions:** 15 points
- **10-49 transactions:** 10 points
- **50+ transactions:** 0 points

#### B. Volume Spike Detection (0-30 points)
Compares current monthly volume to historical average:

```
If monthlyVolume > historicalAverage × 2:
    Score = 30 points (suspicious spike)
```

#### C. Average Transaction Size (0-25 points)
- **> GHS 50,000:** 25 points (very large)
- **GHS 20,001 - 50,000:** 15 points
- **GHS 10,001 - 20,000:** 10 points
- **< GHS 10,000:** 0 points

#### D. Failed Transaction Rate (0-20 points)
```
Score = failureRate × 20
```

**Example:**
- 0% failure rate → 0 points
- 25% failure rate → 5 points
- 100% failure rate → 20 points

**Total Transaction Score Example:**
A merchant with 5 transactions, average size GHS 8,000, no volume spikes:

**Transaction Score = 15 + 0 + 0 + 0 = 15 points**

---

### 4. Compliance Score (15% weight)

**Purpose:** Assess regulatory and operational compliance.

**Factors:**

#### A. Merchant Status (0-40 points)
- ✅ **Active:** 0 points
- ⏳ **Pending:** 20 points
- ⚠️ **Suspended:** 60 points
- ❌ **Rejected:** 80 points
- 🚫 **Closed:** 100 points

#### B. Address Completeness (0-30 points)
- **Missing street:** 10 points
- **Missing city:** 10 points
- **Missing country:** 10 points

#### C. Payment Method Configuration (0-30 points)
- **No bank details AND no mobile money:** 30 points
- **Only mobile money:** 10 points (acceptable in Ghana)
- **Has bank details:** 0 points

**Total Compliance Score Example:**
Active merchant with complete address and mobile money:

**Compliance Score = 0 + 0 + 10 = 10 points**

---

### 5. Flags Score (10% weight)

**Purpose:** Account for administrative risk flags.

**Factors:**

#### A. Number of Flags (0-50 points)
```
Score = min(50, numberOfFlags × 15)
```

**Example:**
- 0 flags → 0 points
- 1 flag → 15 points
- 3 flags → 45 points
- 4+ flags → 50 points

#### B. Critical Flags (0-50 points)
Flags containing keywords like "fraud", "suspicious", "AML":

```
Score = min(50, criticalFlags × 25)
```

**Example:**
- 0 critical flags → 0 points
- 1 critical flag → 25 points
- 2+ critical flags → 50 points

**Total Flags Score Example:**
Merchant with 2 flags, one containing "suspicious":

**Flags Score = 30 + 25 = 55 points** → **capped at 50**

---

## Total Score Calculation

The final risk score is a **weighted average**:

```
Total Score = (KYC × 0.30) + (BusinessMaturity × 0.20) +
              (Transaction × 0.25) + (Compliance × 0.15) +
              (Flags × 0.10)
```

### Complete Example

| Component | Raw Score | Weight | Weighted Score |
|-----------|-----------|--------|----------------|
| KYC | 63 | 30% | 18.9 |
| Business Maturity | 20 | 20% | 4.0 |
| Transaction | 15 | 25% | 3.75 |
| Compliance | 10 | 15% | 1.5 |
| Flags | 50 | 10% | 5.0 |
| **TOTAL** | | | **33.15 ≈ 33** |

**Result:** **Medium Risk** (26-50 range)

---

## Risk Factors Identification

The system automatically identifies specific risk factors based on component scores:

### KYC Factors (if KYC score > 40)
- ❌ KYC documents were rejected
- ⏰ KYC documents have expired
- ⏳ KYC process not completed
- 📄 Insufficient KYC documents submitted

### Business Maturity Factors (if score > 40)
- 🆕 New merchant account (less than 30 days old)
- 📋 Missing business registration number
- 🏢 High-risk business type

### Transaction Factors (if score > 40)
- 📊 No transaction history
- 💰 High average transaction value
- 📈 Unusual volume spike detected

### Compliance Factors (if score > 40)
- ⏸️ Merchant account is suspended
- ⏳ Merchant account pending approval
- 🏠 Incomplete business address information

### Flag Factors (if score > 20)
- 🚩 [X] active risk flag(s)

---

## Recommendations System

Based on risk level and identified factors, the system generates actionable recommendations:

### For Critical/High Risk (51-100)
1. ⚠️ Immediate manual review required
2. 🔒 Consider imposing transaction limits
3. ⏸️ Consider suspending account until review is complete

### For All Levels
1. **KYC:** Request complete KYC documentation
2. **Verification:** Verify submitted KYC documents
3. **Business Info:** Request business registration certificate
4. **Tax Info:** Request tax identification number
5. **Monitoring:** Monitor first transactions closely
6. **Limits:** Set/adjust transaction limits
7. **Flags:** Investigate and resolve active risk flags
8. **Address:** Request complete business address

---

## Best Practices for Risk Management

### 1. Regular Reviews
- **Weekly:** Review all High/Critical risk merchants
- **Monthly:** Review all Medium risk merchants
- **Quarterly:** Review all merchants for score recalculation

### 2. Transaction Limits Based on Risk

| Risk Level | Daily Limit | Monthly Limit | Max Invoice |
|------------|-------------|---------------|-------------|
| Low | GHS 100,000 | GHS 2,000,000 | GHS 20,000 |
| Medium | GHS 50,000 | GHS 1,000,000 | GHS 10,000 |
| High | GHS 20,000 | GHS 400,000 | GHS 5,000 |
| Critical | GHS 5,000 | GHS 100,000 | GHS 2,000 |

### 3. Escalation Procedures

**Critical Risk:**
1. Suspend new transaction processing
2. Notify risk management team immediately
3. Conduct thorough investigation
4. Document findings
5. Decide on account status within 24 hours

**High Risk:**
1. Increase monitoring frequency
2. Flag for manual review within 48 hours
3. Request additional documentation
4. Consider temporary limits
5. Review weekly until risk decreases

**Medium Risk:**
1. Standard monitoring
2. Verify KYC if not already done
3. Review monthly
4. No immediate action required unless flags appear

**Low Risk:**
1. Normal processing
2. Quarterly reviews
3. Standard compliance checks

---

## Using the Risk Score in the Admin Dashboard

### Viewing Risk Scores
1. Navigate to **Risk Management** page
2. View merchant list with risk badges
3. Click "View Details" on any merchant
4. View comprehensive risk breakdown

### Understanding the Breakdown
The detail view shows:
- **Total Score** with color indicator
- **Component Scores** (KYC, Business, Transaction, Compliance, Flags)
- **Risk Factors** list
- **Recommendations** list

### Taking Action
1. Review recommendations
2. Update transaction limits if needed
3. Add internal notes documenting decisions
4. Request additional KYC documents if needed
5. Manually override risk level if justified (with documentation)

---

## Frequently Asked Questions

### Q: Can I manually override the risk score?
**A:** Yes, admins can manually set the risk level, but the automated score provides an objective baseline. Document all manual overrides.

### Q: How often is the risk score recalculated?
**A:** Currently on-demand when viewing merchant details. Future versions will include automatic daily recalculation.

### Q: Why is mobile money scored lower than "no payment method"?
**A:** In Ghana, mobile money is widely used and trusted. Many legitimate SMEs use mobile money exclusively.

### Q: What if a merchant improves their score?
**A:** As merchants submit KYC, complete transactions, and build history, their scores naturally decrease (improve). Review limits quarterly to adjust for improved risk profiles.

### Q: How do I add a custom risk flag?
**A:** Use the merchant detail view to add flags. Critical keywords ("fraud", "suspicious", "AML") automatically increase the risk score.

---

## Technical Implementation

### Calculation Timing
- **On-Demand:** When viewing merchant in Risk Management
- **Batch Processing:** (Future) Nightly recalculation for all merchants
- **Event-Driven:** (Future) Recalculate on significant events (KYC update, large transaction, etc.)

### Data Sources
- Merchant profile data
- KYC documents and status
- Transaction history
- Admin-added flags and notes
- System metadata

### Performance Considerations
- Calculations are performed client-side for immediate feedback
- Results can be cached for improved performance
- Future server-side Cloud Functions for batch processing

---

## Changelog

**Version 1.0.0** (2025-11-06)
- Initial release
- Five-component scoring system
- Automated factor identification
- Recommendation generation
- Real-time calculation

---

**Last Updated:** November 6, 2025
**System Version:** 1.0.0
**Author:** QuickLink Pay Risk Management Team
