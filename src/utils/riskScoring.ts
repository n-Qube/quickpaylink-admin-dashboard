/**
 * Risk Scoring Utility
 *
 * Comprehensive merchant risk assessment system that calculates risk scores
 * based on multiple factors including KYC status, business metrics, transaction
 * patterns, and compliance indicators.
 *
 * Risk Score Range: 0-100
 * - 0-25: Low Risk (Green)
 * - 26-50: Medium Risk (Yellow)
 * - 51-75: High Risk (Orange)
 * - 76-100: Critical Risk (Red)
 */

import type { Merchant } from '@/types/database';

export interface RiskScoreBreakdown {
  totalScore: number;
  level: 'low' | 'medium' | 'high' | 'critical';
  components: {
    kycScore: number;
    businessMaturityScore: number;
    transactionScore: number;
    complianceScore: number;
    flagsScore: number;
  };
  factors: string[];
  recommendations: string[];
}

/**
 * Calculate comprehensive risk score for a merchant
 */
export function calculateRiskScore(merchant: Merchant): RiskScoreBreakdown {
  const kycScore = calculateKYCScore(merchant);
  const businessMaturityScore = calculateBusinessMaturityScore(merchant);
  const transactionScore = calculateTransactionScore(merchant);
  const complianceScore = calculateComplianceScore(merchant);
  const flagsScore = calculateFlagsScore(merchant);

  // Weighted average of all components
  // KYC: 30%, Business Maturity: 20%, Transactions: 25%, Compliance: 15%, Flags: 10%
  const totalScore = Math.round(
    kycScore * 0.3 +
    businessMaturityScore * 0.2 +
    transactionScore * 0.25 +
    complianceScore * 0.15 +
    flagsScore * 0.1
  );

  const level = getRiskLevel(totalScore);
  const factors = identifyRiskFactors(merchant, {
    kycScore,
    businessMaturityScore,
    transactionScore,
    complianceScore,
    flagsScore,
  });
  const recommendations = generateRecommendations(merchant, level, factors);

  return {
    totalScore,
    level,
    components: {
      kycScore,
      businessMaturityScore,
      transactionScore,
      complianceScore,
      flagsScore,
    },
    factors,
    recommendations,
  };
}

/**
 * KYC Score (0-100, lower is better for risk)
 *
 * Factors:
 * - KYC status (0-40 points)
 * - Documents submitted vs required (0-30 points)
 * - Document verification status (0-20 points)
 * - Time since KYC submission (0-10 points)
 */
function calculateKYCScore(merchant: Merchant): number {
  let score = 0;

  // KYC Status (0-40 points)
  switch (merchant.kyc?.status) {
    case 'approved':
      score += 0;  // Best case
      break;
    case 'under_review':
    case 'submitted':
      score += 15; // Pending review
      break;
    case 'pending':
      score += 30; // Documents needed
      break;
    case 'rejected':
      score += 50; // Major risk
      break;
    case 'expired':
      score += 45; // Needs renewal
      break;
    default:
      score += 40; // Not started
  }

  // Documents submitted (0-30 points)
  const documentsSubmitted = merchant.kyc?.documentsSubmitted || 0;
  const documentsRequired = 6; // Business reg, tax cert, owner ID, address proof, bank statement, license
  const documentCompleteness = documentsSubmitted / documentsRequired;
  score += Math.round((1 - documentCompleteness) * 30);

  // Document verification (0-20 points)
  const documentsVerified = merchant.kyc?.documentsVerified || 0;
  if (documentsSubmitted > 0) {
    const verificationRate = documentsVerified / documentsSubmitted;
    score += Math.round((1 - verificationRate) * 20);
  } else {
    score += 20;
  }

  // Time since KYC submission (0-10 points)
  if (merchant.kyc?.submittedAt) {
    const submittedDate = merchant.kyc.submittedAt.toDate?.() || new Date(merchant.kyc.submittedAt.seconds * 1000);
    const daysSinceSubmission = (Date.now() - submittedDate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceSubmission > 90) {
      score += 10; // Over 90 days - needs review
    } else if (daysSinceSubmission > 30) {
      score += 5;  // Over 30 days
    }
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * Business Maturity Score (0-100, lower is better for risk)
 *
 * Factors:
 * - Account age (0-25 points)
 * - Business registration status (0-25 points)
 * - Business type risk profile (0-25 points)
 * - Contact verification (0-25 points)
 */
function calculateBusinessMaturityScore(merchant: Merchant): number {
  let score = 0;

  // Account age (0-25 points)
  if (merchant.createdAt) {
    const createdDate = merchant.createdAt.toDate?.() || new Date(merchant.createdAt.seconds * 1000);
    const accountAgeDays = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);

    if (accountAgeDays < 7) {
      score += 25; // Very new account
    } else if (accountAgeDays < 30) {
      score += 20; // Less than a month
    } else if (accountAgeDays < 90) {
      score += 10; // Less than 3 months
    } else if (accountAgeDays < 180) {
      score += 5;  // Less than 6 months
    }
    // 180+ days: 0 points (mature account)
  } else {
    score += 15; // Unknown age
  }

  // Business registration (0-25 points)
  if (!merchant.registrationNumber || merchant.registrationNumber.trim() === '') {
    score += 25; // No registration number
  } else if (!merchant.taxId || merchant.taxId.trim() === '') {
    score += 15; // Has reg number but no tax ID
  }

  // Business type risk (0-25 points)
  const highRiskBusinessTypes = ['crypto', 'gambling', 'adult', 'forex', 'cannabis'];
  const mediumRiskBusinessTypes = ['marketplace', 'crowdfunding', 'subscription'];

  const businessType = merchant.businessType?.toLowerCase() || '';
  if (highRiskBusinessTypes.some(type => businessType.includes(type))) {
    score += 25;
  } else if (mediumRiskBusinessTypes.some(type => businessType.includes(type))) {
    score += 15;
  }

  // Contact verification (0-25 points)
  if (!merchant.contactInfo?.email || merchant.contactInfo.email.trim() === '') {
    score += 15;
  }
  if (!merchant.contactInfo?.phone || merchant.contactInfo.phone.trim() === '') {
    score += 10;
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * Transaction Score (0-100, lower is better for risk)
 *
 * Factors:
 * - Transaction volume patterns (0-30 points)
 * - Transaction frequency (0-25 points)
 * - Average transaction size (0-25 points)
 * - Failed transaction rate (0-20 points)
 */
function calculateTransactionScore(merchant: Merchant): number {
  let score = 0;

  const totalTransactions = merchant.financials?.totalTransactions || 0;
  const totalRevenue = merchant.financials?.totalRevenue || 0;
  const monthlyVolume = merchant.financials?.monthlyVolume || 0;

  // Transaction volume (0-30 points)
  if (totalTransactions === 0) {
    score += 20; // No transactions yet
  } else if (totalTransactions < 10) {
    score += 15; // Very few transactions
  } else if (totalTransactions < 50) {
    score += 10; // Limited history
  }

  // Unusual volume spike (0-30 points)
  if (totalTransactions > 0 && monthlyVolume > 0) {
    const avgTransactionSize = totalRevenue / totalTransactions;
    const monthlyTransactionEstimate = monthlyVolume / (avgTransactionSize || 1);

    // Check if monthly volume is unusually high compared to historical average
    if (monthlyTransactionEstimate > totalTransactions * 2) {
      score += 30; // Sudden spike in volume
    }
  }

  // Large average transaction size (0-25 points)
  if (totalTransactions > 0) {
    const avgSize = totalRevenue / totalTransactions;
    if (avgSize > 50000) {
      score += 25; // Very large transactions
    } else if (avgSize > 20000) {
      score += 15;
    } else if (avgSize > 10000) {
      score += 10;
    }
  }

  // Failed transaction rate (0-20 points)
  // This would come from transaction logs - placeholder for now
  // score += calculatedFailureRate * 20;

  return Math.min(100, Math.max(0, score));
}

/**
 * Compliance Score (0-100, lower is better for risk)
 *
 * Factors:
 * - Merchant status (0-40 points)
 * - Address completeness (0-30 points)
 * - Bank account verification (0-30 points)
 */
function calculateComplianceScore(merchant: Merchant): number {
  let score = 0;

  // Merchant status (0-40 points)
  switch (merchant.status) {
    case 'active':
      score += 0;  // Compliant
      break;
    case 'pending':
      score += 20; // Awaiting approval
      break;
    case 'suspended':
      score += 60; // High risk
      break;
    case 'rejected':
      score += 80; // Very high risk
      break;
    case 'closed':
      score += 100; // Should not be active
      break;
  }

  // Address completeness (0-30 points)
  if (!merchant.address?.street || merchant.address.street.trim() === '') {
    score += 10;
  }
  if (!merchant.address?.city || merchant.address.city.trim() === '') {
    score += 10;
  }
  if (!merchant.address?.country || merchant.address.country.trim() === '') {
    score += 10;
  }

  // Bank account verification (0-30 points)
  const hasBankDetails = merchant.bankDetails?.accountNumber && merchant.bankDetails?.bankName;
  const hasMobileMoney = merchant.mobileMoneyWallet?.number && merchant.mobileMoneyWallet?.provider;

  if (!hasBankDetails && !hasMobileMoney) {
    score += 30; // No payment method configured
  } else if (!hasBankDetails && hasMobileMoney) {
    score += 10; // Only mobile money (common in Ghana, lower risk)
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * Flags Score (0-100, lower is better for risk)
 *
 * Factors:
 * - Number of active flags (0-50 points)
 * - Flag severity (0-50 points)
 */
function calculateFlagsScore(merchant: Merchant): number {
  let score = 0;

  const flags = merchant.adminMetadata?.flags || [];

  // Number of flags (0-50 points)
  if (flags.length > 0) {
    score += Math.min(50, flags.length * 15);
  }

  // Flag severity (0-50 points)
  const criticalFlags = flags.filter(f =>
    f.toLowerCase().includes('fraud') ||
    f.toLowerCase().includes('suspicious') ||
    f.toLowerCase().includes('aml')
  );
  score += Math.min(50, criticalFlags.length * 25);

  return Math.min(100, Math.max(0, score));
}

/**
 * Determine risk level from total score
 */
function getRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
  if (score >= 76) return 'critical';
  if (score >= 51) return 'high';
  if (score >= 26) return 'medium';
  return 'low';
}

/**
 * Identify specific risk factors
 */
function identifyRiskFactors(
  merchant: Merchant,
  scores: {
    kycScore: number;
    businessMaturityScore: number;
    transactionScore: number;
    complianceScore: number;
    flagsScore: number;
  }
): string[] {
  const factors: string[] = [];

  // KYC factors
  if (scores.kycScore > 40) {
    if (merchant.kyc?.status === 'rejected') {
      factors.push('KYC documents were rejected');
    } else if (merchant.kyc?.status === 'expired') {
      factors.push('KYC documents have expired');
    } else if (!merchant.kyc?.status || merchant.kyc.status === 'pending') {
      factors.push('KYC process not completed');
    }

    if ((merchant.kyc?.documentsSubmitted || 0) < 4) {
      factors.push('Insufficient KYC documents submitted');
    }
  }

  // Business maturity factors
  if (scores.businessMaturityScore > 40) {
    if (merchant.createdAt) {
      const accountAgeDays = (Date.now() - (merchant.createdAt.toDate?.() || new Date(merchant.createdAt.seconds * 1000)).getTime()) / (1000 * 60 * 60 * 24);
      if (accountAgeDays < 30) {
        factors.push('New merchant account (less than 30 days old)');
      }
    }

    if (!merchant.registrationNumber || merchant.registrationNumber.trim() === '') {
      factors.push('Missing business registration number');
    }
  }

  // Transaction factors
  if (scores.transactionScore > 40) {
    if ((merchant.financials?.totalTransactions || 0) === 0) {
      factors.push('No transaction history');
    }

    const avgSize = (merchant.financials?.totalTransactions || 0) > 0
      ? (merchant.financials?.totalRevenue || 0) / merchant.financials!.totalTransactions
      : 0;

    if (avgSize > 20000) {
      factors.push('High average transaction value');
    }
  }

  // Compliance factors
  if (scores.complianceScore > 40) {
    if (merchant.status === 'suspended') {
      factors.push('Merchant account is suspended');
    } else if (merchant.status === 'pending') {
      factors.push('Merchant account pending approval');
    }

    if (!merchant.address?.street || !merchant.address?.city) {
      factors.push('Incomplete business address information');
    }
  }

  // Flags
  if (scores.flagsScore > 20) {
    const flagCount = merchant.adminMetadata?.flags?.length || 0;
    factors.push(`${flagCount} active risk flag${flagCount > 1 ? 's' : ''}`);
  }

  return factors;
}

/**
 * Generate recommendations based on risk level and factors
 */
function generateRecommendations(
  merchant: Merchant,
  level: 'low' | 'medium' | 'high' | 'critical',
  factors: string[]
): string[] {
  const recommendations: string[] = [];

  // Critical risk
  if (level === 'critical' || level === 'high') {
    recommendations.push('Immediate manual review required');
    recommendations.push('Consider imposing transaction limits');

    if (merchant.status === 'active') {
      recommendations.push('Consider suspending account until review is complete');
    }
  }

  // KYC recommendations
  if (!merchant.kyc?.status || merchant.kyc.status !== 'approved') {
    recommendations.push('Request complete KYC documentation');
  }

  if ((merchant.kyc?.documentsSubmitted || 0) < (merchant.kyc?.documentsVerified || 0) + 2) {
    recommendations.push('Verify submitted KYC documents');
  }

  // Business information
  if (!merchant.registrationNumber) {
    recommendations.push('Request business registration certificate');
  }

  if (!merchant.taxId) {
    recommendations.push('Request tax identification number');
  }

  // Transaction monitoring
  if ((merchant.financials?.totalTransactions || 0) === 0) {
    recommendations.push('Monitor first transactions closely');
  }

  // Transaction limits
  if (level === 'high' || level === 'critical') {
    if (!merchant.adminMetadata?.transactionLimits) {
      recommendations.push('Set conservative transaction limits');
    }
  } else if (level === 'medium') {
    recommendations.push('Review and adjust transaction limits as needed');
  }

  // Flags
  if ((merchant.adminMetadata?.flags?.length || 0) > 0) {
    recommendations.push('Investigate and resolve active risk flags');
  }

  // Address
  if (!merchant.address?.street || !merchant.address?.city) {
    recommendations.push('Request complete business address');
  }

  return recommendations;
}

/**
 * Get risk score color class for UI
 */
export function getRiskScoreColor(score: number): string {
  if (score >= 76) return 'text-red-600';
  if (score >= 51) return 'text-orange-600';
  if (score >= 26) return 'text-yellow-600';
  return 'text-green-600';
}

/**
 * Get risk score background color for UI
 */
export function getRiskScoreBg(score: number): string {
  if (score >= 76) return 'bg-red-100 dark:bg-red-900/20';
  if (score >= 51) return 'bg-orange-100 dark:bg-orange-900/20';
  if (score >= 26) return 'bg-yellow-100 dark:bg-yellow-900/20';
  return 'bg-green-100 dark:bg-green-900/20';
}
