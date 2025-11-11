# Paystack Payout Integration Guide

## Overview

This guide explains how QuickLink Pay integrates with Paystack's Transfer API to handle merchant settlements and payouts.

## System Architecture

### Key Components

1. **Merchant Payout Configuration** - Bank details and payout preferences
2. **Settlement Processing** - Automated and manual settlement calculations
3. **Payout Execution** - Integration with Paystack Transfer API
4. **Payout History** - Complete audit trail of all settlements

---

## Merchant Model Extensions

### Payout Configuration

```typescript
{
  payoutConfig: {
    enabled: boolean;
    recipientCode: string;           // Paystack transfer recipient code
    bankDetails: {
      accountNumber: string;
      accountName: string;
      bankCode: string;              // Paystack bank code
      bankName: string;
    };
    mobileMoneyDetails?: {
      provider: 'MTN' | 'Vodafone' | 'AirtelTigo';
      number: string;
      accountName: string;
    };
    schedule: {
      frequency: 'daily' | 'weekly' | 'bi-weekly' | 'monthly' | 'manual';
      dayOfWeek?: number;            // 0-6 for weekly
      dayOfMonth?: number;           // 1-31 for monthly
      time?: string;                 // HH:mm format
      minimumAmount: number;         // Minimum balance before payout
    };
    holds: {
      enabled: boolean;
      holdDays: number;              // Days to hold funds (e.g., 7 for T+7)
      reason?: string;
    };
  };

  payoutStats: {
    totalPaidOut: number;
    pendingPayout: number;
    failedPayouts: number;
    lastPayoutDate?: Timestamp;
    lastPayoutAmount?: number;
    nextScheduledPayout?: Timestamp;
  };
}
```

---

## Payout/Settlement Types

### Settlement Record

```typescript
interface Settlement {
  settlementId: string;
  merchantId: string;

  // Financial Details
  amount: number;
  currency: string;
  fees: {
    platformFee: number;           // QuickLink Pay fee
    paystackFee: number;           // Paystack transfer fee
    totalFees: number;
  };
  netAmount: number;               // amount - totalFees

  // Period
  periodStart: Timestamp;
  periodEnd: Timestamp;

  // Breakdown
  breakdown: {
    totalTransactions: number;
    totalRevenue: number;
    refunds: number;
    chargebacks: number;
    adjustments: number;
  };

  // Status
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

  // Processing
  initiatedBy: 'system' | 'admin';
  initiatedByAdminId?: string;
  createdAt: Timestamp;
  processedAt?: Timestamp;

  // Payout details (if executed)
  payout?: {
    payoutId: string;
    paystackTransferCode: string;
    paystackReference: string;
    recipientCode: string;
    status: PayoutStatus;
    executedAt?: Timestamp;
    completedAt?: Timestamp;
    failureReason?: string;
  };
}
```

### Payout Record

```typescript
type PayoutStatus =
  | 'pending'       // Created but not sent to Paystack
  | 'queued'        // Queued in Paystack
  | 'processing'    // Being processed by bank
  | 'success'       // Successfully completed
  | 'failed'        // Failed
  | 'reversed';     // Reversed/refunded

interface Payout {
  payoutId: string;
  merchantId: string;
  settlementId?: string;           // Link to settlement if applicable

  // Amount
  amount: number;
  currency: string;
  fee: number;
  netAmount: number;

  // Recipient
  recipient: {
    type: 'bank' | 'mobile_money';
    recipientCode: string;         // Paystack recipient code
    accountNumber: string;
    accountName: string;
    bankCode?: string;
    bankName?: string;
    mobileProvider?: string;
  };

  // Paystack Integration
  paystack: {
    transferCode: string;          // Paystack transfer code
    reference: string;             // Your unique reference
    status: PayoutStatus;
    integration: number;           // Paystack integration ID
    domain: 'live' | 'test';
    reason?: string;               // Transfer reason/narration
    createdAt: string;             // Paystack creation time
    updatedAt: string;             // Paystack last update
    transferredAt?: string;        // When transfer completed
    failureReason?: string;
  };

  // Processing
  initiatedBy: 'system' | 'admin' | 'merchant';
  initiatedByAdminId?: string;
  type: 'settlement' | 'refund' | 'adjustment' | 'manual';
  description?: string;

  // Timestamps
  createdAt: Timestamp;
  processedAt?: Timestamp;
  completedAt?: Timestamp;
  failedAt?: Timestamp;

  // Metadata
  metadata?: {
    settlementPeriod?: string;
    invoiceIds?: string[];
    notes?: string;
  };
}
```

---

## Paystack Transfer API Integration

### 1. Create Transfer Recipient

**Endpoint**: `POST https://api.paystack.co/transferrecipient`

```typescript
// Create recipient for bank account
const createBankRecipient = async (merchant: Merchant) => {
  const response = await fetch('https://api.paystack.co/transferrecipient', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      type: 'nuban',                           // Nigerian bank account
      name: merchant.payoutConfig.bankDetails.accountName,
      account_number: merchant.payoutConfig.bankDetails.accountNumber,
      bank_code: merchant.payoutConfig.bankDetails.bankCode,
      currency: 'GHS'                          // or NGN for Nigeria
    })
  });

  const data = await response.json();

  if (data.status) {
    // Store recipient_code in merchant document
    return data.data.recipient_code;
  } else {
    throw new Error(data.message);
  }
};

// Create recipient for mobile money (Ghana)
const createMobileMoneyRecipient = async (merchant: Merchant) => {
  const response = await fetch('https://api.paystack.co/transferrecipient', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      type: 'mobile_money',
      name: merchant.payoutConfig.mobileMoneyDetails!.accountName,
      account_number: merchant.payoutConfig.mobileMoneyDetails!.number,
      bank_code: getProviderCode(merchant.payoutConfig.mobileMoneyDetails!.provider),
      currency: 'GHS'
    })
  });

  const data = await response.json();
  return data.status ? data.data.recipient_code : null;
};

// Provider codes for Ghana mobile money
const getProviderCode = (provider: string): string => {
  const codes = {
    'MTN': 'MTN',
    'Vodafone': 'VOD',
    'AirtelTigo': 'ATL'
  };
  return codes[provider] || 'MTN';
};
```

### 2. Initiate Transfer

**Endpoint**: `POST https://api.paystack.co/transfer`

```typescript
const initiateTransfer = async (payout: Payout) => {
  const reference = `payout_${payout.payoutId}_${Date.now()}`;

  const response = await fetch('https://api.paystack.co/transfer', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      source: 'balance',                       // Transfer from Paystack balance
      amount: payout.netAmount * 100,          // Amount in pesewas/kobo
      recipient: payout.recipient.recipientCode,
      reason: payout.description || 'Settlement payment',
      reference: reference,
      currency: payout.currency
    })
  });

  const data = await response.json();

  if (data.status) {
    return {
      transferCode: data.data.transfer_code,
      reference: data.data.reference,
      status: data.data.status,
      createdAt: data.data.createdAt
    };
  } else {
    throw new Error(data.message);
  }
};
```

### 3. Verify Transfer Status

**Endpoint**: `GET https://api.paystack.co/transfer/:transfer_code`

```typescript
const verifyTransfer = async (transferCode: string) => {
  const response = await fetch(`https://api.paystack.co/transfer/${transferCode}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
    }
  });

  const data = await response.json();

  if (data.status) {
    return {
      status: data.data.status,              // 'success', 'failed', 'pending', etc.
      amount: data.data.amount / 100,
      recipient: data.data.recipient,
      transferredAt: data.data.transferred_at,
      failureReason: data.data.failures
    };
  }

  return null;
};
```

### 4. Fetch Transfer History

**Endpoint**: `GET https://api.paystack.co/transfer`

```typescript
const fetchTransferHistory = async (page = 1, perPage = 50) => {
  const response = await fetch(
    `https://api.paystack.co/transfer?perPage=${perPage}&page=${page}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
      }
    }
  );

  const data = await response.json();
  return data.status ? data.data : [];
};
```

---

## Settlement Calculation Logic

### Automated Settlement Process

```typescript
interface SettlementCalculation {
  merchantId: string;
  periodStart: Date;
  periodEnd: Date;

  // Revenue
  totalRevenue: number;
  totalTransactions: number;

  // Deductions
  refunds: number;
  chargebacks: number;
  platformFee: number;              // Your platform fee %
  paystackTransactionFees: number;  // Paystack fees from transactions
  paystackTransferFee: number;      // Paystack transfer fee

  // Net
  netAmount: number;
}

const calculateSettlement = async (
  merchantId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<SettlementCalculation> => {
  // 1. Get all successful transactions in period
  const transactions = await getTransactions(merchantId, periodStart, periodEnd);

  const totalRevenue = transactions
    .filter(t => t.status === 'success')
    .reduce((sum, t) => sum + t.amount, 0);

  // 2. Get refunds
  const refunds = transactions
    .filter(t => t.status === 'refunded')
    .reduce((sum, t) => sum + t.amount, 0);

  // 3. Get chargebacks
  const chargebacks = await getChargebacks(merchantId, periodStart, periodEnd);
  const chargebackTotal = chargebacks.reduce((sum, c) => sum + c.amount, 0);

  // 4. Calculate platform fee (e.g., 2% of revenue)
  const platformFeeRate = 0.02;  // 2%
  const platformFee = totalRevenue * platformFeeRate;

  // 5. Calculate Paystack transaction fees (already deducted from transactions)
  const paystackTransactionFees = transactions
    .filter(t => t.status === 'success')
    .reduce((sum, t) => sum + (t.fees?.paystack || 0), 0);

  // 6. Calculate Paystack transfer fee
  // Ghana: GHS 1 flat fee per transfer
  // Nigeria: NGN 10 + 0.5% (capped at NGN 50)
  const paystackTransferFee = 1; // GHS 1 for Ghana

  // 7. Calculate net amount
  const netAmount = totalRevenue
    - refunds
    - chargebackTotal
    - platformFee
    - paystackTransferFee;

  return {
    merchantId,
    periodStart,
    periodEnd,
    totalRevenue,
    totalTransactions: transactions.length,
    refunds,
    chargebacks: chargebackTotal,
    platformFee,
    paystackTransactionFees,
    paystackTransferFee,
    netAmount: Math.max(0, netAmount) // Never negative
  };
};
```

---

## Automated Payout Scheduling

### Cloud Function Implementation

```typescript
// Firebase Cloud Function - runs daily at 00:00 UTC
export const processScheduledPayouts = functions.pubsub
  .schedule('0 0 * * *')
  .timeZone('UTC')
  .onRun(async (context) => {
    console.log('Starting scheduled payout processing...');

    // Get all merchants with automated payouts enabled
    const merchantsSnapshot = await admin.firestore()
      .collection('merchants')
      .where('payoutConfig.enabled', '==', true)
      .where('payoutConfig.schedule.frequency', '!=', 'manual')
      .get();

    const today = new Date();
    const processedCount = { success: 0, skipped: 0, failed: 0 };

    for (const doc of merchantsSnapshot.docs) {
      const merchant = doc.data() as Merchant;

      // Check if payout should run today
      if (shouldProcessPayout(merchant, today)) {
        try {
          await processMerchantPayout(merchant);
          processedCount.success++;
        } catch (error) {
          console.error(`Failed to process payout for ${merchant.merchantId}:`, error);
          processedCount.failed++;
        }
      } else {
        processedCount.skipped++;
      }
    }

    console.log('Payout processing complete:', processedCount);
    return processedCount;
  });

const shouldProcessPayout = (merchant: Merchant, date: Date): boolean => {
  const schedule = merchant.payoutConfig.schedule;

  // Check minimum amount
  if (merchant.payoutStats.pendingPayout < schedule.minimumAmount) {
    return false;
  }

  // Check hold period
  if (merchant.payoutConfig.holds.enabled) {
    // Implementation for checking if funds are past hold period
  }

  // Check schedule
  switch (schedule.frequency) {
    case 'daily':
      return true;

    case 'weekly':
      return date.getDay() === schedule.dayOfWeek;

    case 'bi-weekly':
      const weekNumber = Math.floor(date.getDate() / 7);
      return weekNumber % 2 === 0 && date.getDay() === schedule.dayOfWeek;

    case 'monthly':
      return date.getDate() === schedule.dayOfMonth;

    default:
      return false;
  }
};
```

---

## Manual Payout Processing

### Admin Dashboard Function

```typescript
const processManualPayout = async (
  merchantId: string,
  amount?: number,
  adminId?: string
): Promise<Payout> => {
  // 1. Get merchant
  const merchant = await getMerchant(merchantId);

  if (!merchant.payoutConfig.enabled) {
    throw new Error('Payouts not enabled for this merchant');
  }

  // 2. Calculate settlement if amount not provided
  const payoutAmount = amount || merchant.payoutStats.pendingPayout;

  if (payoutAmount <= 0) {
    throw new Error('No funds available for payout');
  }

  // 3. Create settlement record
  const settlement = await createSettlement(merchant, payoutAmount);

  // 4. Create payout record
  const payout: Payout = {
    payoutId: `payout_${Date.now()}`,
    merchantId: merchant.merchantId,
    settlementId: settlement.settlementId,
    amount: payoutAmount,
    currency: 'GHS',
    fee: 1, // Paystack fee
    netAmount: payoutAmount - 1,
    recipient: {
      type: 'bank',
      recipientCode: merchant.payoutConfig.recipientCode,
      accountNumber: merchant.payoutConfig.bankDetails.accountNumber,
      accountName: merchant.payoutConfig.bankDetails.accountName,
      bankCode: merchant.payoutConfig.bankDetails.bankCode,
      bankName: merchant.payoutConfig.bankDetails.bankName
    },
    paystack: {
      transferCode: '',
      reference: ``,
      status: 'pending',
      integration: 0,
      domain: 'live',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    initiatedBy: 'admin',
    initiatedByAdminId: adminId,
    type: 'manual',
    createdAt: Timestamp.now()
  };

  // 5. Save payout to database
  await admin.firestore()
    .collection('payouts')
    .doc(payout.payoutId)
    .set(payout);

  // 6. Initiate Paystack transfer
  try {
    const transferResult = await initiateTransfer(payout);

    // Update payout with Paystack details
    payout.paystack.transferCode = transferResult.transferCode;
    payout.paystack.reference = transferResult.reference;
    payout.paystack.status = 'queued';
    payout.processedAt = Timestamp.now();

    await admin.firestore()
      .collection('payouts')
      .doc(payout.payoutId)
      .update({
        'paystack.transferCode': transferResult.transferCode,
        'paystack.reference': transferResult.reference,
        'paystack.status': 'queued',
        processedAt: Timestamp.now()
      });

    return payout;
  } catch (error) {
    // Mark as failed
    payout.paystack.status = 'failed';
    payout.paystack.failureReason = error.message;
    payout.failedAt = Timestamp.now();

    await admin.firestore()
      .collection('payouts')
      .doc(payout.payoutId)
      .update({
        'paystack.status': 'failed',
        'paystack.failureReason': error.message,
        failedAt: Timestamp.now()
      });

    throw error;
  }
};
```

---

## Webhook Handling

### Paystack Transfer Webhooks

```typescript
// Handle Paystack webhooks for transfer status updates
export const handlePaystackWebhook = functions.https.onRequest(async (req, res) => {
  // Verify webhook signature
  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (hash !== req.headers['x-paystack-signature']) {
    return res.status(400).send('Invalid signature');
  }

  const event = req.body;

  // Handle transfer events
  if (event.event === 'transfer.success') {
    await handleTransferSuccess(event.data);
  } else if (event.event === 'transfer.failed') {
    await handleTransferFailed(event.data);
  } else if (event.event === 'transfer.reversed') {
    await handleTransferReversed(event.data);
  }

  res.status(200).send('Webhook received');
});

const handleTransferSuccess = async (data: any) => {
  // Find payout by transfer code
  const payoutSnapshot = await admin.firestore()
    .collection('payouts')
    .where('paystack.transferCode', '==', data.transfer_code)
    .limit(1)
    .get();

  if (!payoutSnapshot.empty) {
    const payoutRef = payoutSnapshot.docs[0].ref;

    await payoutRef.update({
      'paystack.status': 'success',
      'paystack.transferredAt': data.transferred_at,
      completedAt: Timestamp.now()
    });

    // Update merchant stats
    const payout = payoutSnapshot.docs[0].data() as Payout;
    await updateMerchantPayoutStats(payout.merchantId, payout.netAmount);
  }
};

const handleTransferFailed = async (data: any) => {
  const payoutSnapshot = await admin.firestore()
    .collection('payouts')
    .where('paystack.transferCode', '==', data.transfer_code)
    .limit(1)
    .get();

  if (!payoutSnapshot.empty) {
    await payoutSnapshot.docs[0].ref.update({
      'paystack.status': 'failed',
      'paystack.failureReason': data.failure_reason,
      failedAt: Timestamp.now()
    });
  }
};
```

---

## Database Collections

### Collection Structure

```
/merchants/{merchantId}
  - payoutConfig: { ... }
  - payoutStats: { ... }

/settlements/{settlementId}
  - Settlement data

/payouts/{payoutId}
  - Payout data
  - Links to settlement

/payout_recipients/{merchantId}
  - Cached Paystack recipient data
  - recipientCode
  - verification status
```

---

## Security Considerations

1. **API Keys**: Store Paystack keys in environment variables
2. **Webhook Verification**: Always verify webhook signatures
3. **Admin Permissions**: Restrict manual payouts to authorized admins
4. **Amount Validation**: Validate payout amounts against available balance
5. **Audit Trail**: Log all payout initiations and status changes
6. **Retry Logic**: Implement exponential backoff for failed transfers
7. **Hold Periods**: Respect configured hold periods for risk management

---

## Testing

### Test Mode

Use Paystack test keys for development:
```typescript
const PAYSTACK_TEST_KEY = 'sk_test_...';
```

### Test Bank Account (Ghana)
- Account Number: 0123456789
- Bank Code: Any valid GHS bank code

---

## Monitoring & Alerts

1. **Failed Payouts**: Alert admins when payouts fail
2. **Large Amounts**: Require approval for payouts above threshold
3. **Webhook Failures**: Monitor webhook delivery success rate
4. **Balance Monitoring**: Alert when Paystack balance is low

---

## Implementation Checklist

- [ ] Extend Merchant type with payout configuration
- [ ] Create Settlement and Payout types
- [ ] Implement Paystack recipient creation
- [ ] Build settlement calculation logic
- [ ] Create manual payout function
- [ ] Set up automated payout scheduling
- [ ] Implement webhook handlers
- [ ] Build admin UI for payout management
- [ ] Add payout history view
- [ ] Implement reconciliation tools
- [ ] Set up monitoring and alerts
- [ ] Write comprehensive tests

---

**Last Updated**: 2025-11-07
**Version**: 1.0.0
**Author**: QuickLink Pay Development Team
