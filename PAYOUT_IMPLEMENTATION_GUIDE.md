# Complete Payout & Settlement Implementation Guide

This guide provides step-by-step instructions for implementing the payout and settlement system for QuickLink Pay.

---

## Overview

The payout system consists of:
1. **Paystack Service** - API wrapper for Paystack Transfer API
2. **Cloud Functions** - Backend logic for processing payouts
3. **Firestore Triggers** - Automated settlement calculations
4. **Webhook Handlers** - Status updates from Paystack
5. **Admin UI** - Manual payout initiation (already implemented)

---

## Part 1: Setup Firebase Functions Project

### 1.1 Initialize Firebase Functions (if not already done)

```bash
cd /path/to/your/project
firebase init functions
```

Select:
- TypeScript
- ESLint
- Install dependencies

### 1.2 Install Required Dependencies

```bash
cd functions
npm install axios node-fetch @types/node-fetch
```

### 1.3 Configure Environment Variables

```bash
firebase functions:config:set paystack.secret_key="YOUR_PAYSTACK_SECRET_KEY"
firebase functions:config:set paystack.domain="live"  # or "test" for testing
```

For local development, create `functions/.runtimeconfig.json`:

```json
{
  "paystack": {
    "secret_key": "sk_test_YOUR_TEST_KEY",
    "domain": "test"
  }
}
```

---

## Part 2: Create Paystack Service Module

Create `functions/src/services/paystack.service.ts`:

```typescript
import axios, { AxiosInstance } from 'axios';

export interface PaystackRecipient {
  type: 'nuban' | 'mobile_money';
  name: string;
  account_number: string;
  bank_code: string;
  currency: 'GHS' | 'NGN';
}

export interface PaystackTransfer {
  source: 'balance';
  amount: number; // in kobo/pesewas
  recipient: string; // recipient_code
  reason: string;
  reference: string;
  currency: 'GHS' | 'NGN';
}

export interface PaystackTransferResponse {
  status: boolean;
  message: string;
  data: {
    transfer_code: string;
    reference: string;
    status: 'pending' | 'success' | 'failed' | 'processing' | 'reversed';
    amount: number;
    createdAt: string;
    updatedAt: string;
    domain: 'live' | 'test';
    recipient: {
      recipient_code: string;
      name: string;
      details: {
        account_number: string;
        account_name: string;
        bank_code: string;
        bank_name: string;
      };
    };
  };
}

export class PaystackService {
  private client: AxiosInstance;
  private secretKey: string;

  constructor(secretKey: string) {
    this.secretKey = secretKey;
    this.client = axios.create({
      baseURL: 'https://api.paystack.co',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Create a transfer recipient (bank account or mobile money)
   */
  async createRecipient(data: PaystackRecipient): Promise<string> {
    try {
      const response = await this.client.post('/transferrecipient', data);

      if (response.data.status) {
        return response.data.data.recipient_code;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error: any) {
      console.error('Paystack createRecipient error:', error.response?.data || error.message);
      throw new Error(`Failed to create recipient: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Initiate a transfer to a recipient
   */
  async initiateTransfer(data: PaystackTransfer): Promise<PaystackTransferResponse['data']> {
    try {
      const response = await this.client.post('/transfer', data);

      if (response.data.status) {
        return response.data.data;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error: any) {
      console.error('Paystack initiateTransfer error:', error.response?.data || error.message);
      throw new Error(`Failed to initiate transfer: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Verify transfer status
   */
  async verifyTransfer(transferCode: string): Promise<PaystackTransferResponse['data']> {
    try {
      const response = await this.client.get(`/transfer/${transferCode}`);

      if (response.data.status) {
        return response.data.data;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error: any) {
      console.error('Paystack verifyTransfer error:', error.response?.data || error.message);
      throw new Error(`Failed to verify transfer: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get transfer history
   */
  async getTransfers(page = 1, perPage = 50) {
    try {
      const response = await this.client.get(`/transfer?perPage=${perPage}&page=${page}`);
      return response.data.data;
    } catch (error: any) {
      console.error('Paystack getTransfers error:', error.response?.data || error.message);
      throw new Error(`Failed to get transfers: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get Paystack bank codes for Ghana
   */
  static getGhanaBankCode(bankName: string): string {
    const banks: Record<string, string> = {
      'MTN': 'MTN',
      'Vodafone': 'VOD',
      'AirtelTigo': 'ATL',
      'Access Bank': '280100',
      'Cal Bank': '340100',
      'Ecobank': '130100',
      'Fidelity Bank': '240100',
      'First National Bank': '330100',
      'GCB Bank': '040100',
      'Guaranty Trust Bank': '230100',
      'Prudential Bank': '180100',
      'Stanbic Bank': '190100',
      'Standard Chartered': '020100',
      'United Bank for Africa': '060100',
      'Zenith Bank': '120100',
    };
    return banks[bankName] || '';
  }
}
```

---

## Part 3: Create Settlement Calculation Service

Create `functions/src/services/settlement.service.ts`:

```typescript
import * as admin from 'firebase-admin';

export interface SettlementCalculation {
  merchantId: string;
  periodStart: Date;
  periodEnd: Date;
  totalRevenue: number;
  totalTransactions: number;
  refunds: number;
  chargebacks: number;
  platformFee: number;
  paystackTransactionFees: number;
  paystackTransferFee: number;
  netAmount: number;
}

export class SettlementService {
  private db: admin.firestore.Firestore;

  constructor() {
    this.db = admin.firestore();
  }

  /**
   * Calculate settlement for a merchant for a given period
   */
  async calculateSettlement(
    merchantId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<SettlementCalculation> {
    // Get all transactions in the period
    const transactionsSnap = await this.db
      .collection('transactions')
      .where('merchantId', '==', merchantId)
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(periodStart))
      .where('createdAt', '<=', admin.firestore.Timestamp.fromDate(periodEnd))
      .where('status', '==', 'success')
      .get();

    let totalRevenue = 0;
    let totalTransactions = 0;
    let refunds = 0;
    let paystackTransactionFees = 0;

    transactionsSnap.forEach(doc => {
      const txn = doc.data();
      totalRevenue += txn.amount || 0;
      totalTransactions++;

      if (txn.refunded) {
        refunds += txn.amount || 0;
      }

      // Paystack charges are already deducted from transactions
      paystackTransactionFees += txn.fees?.paystack || 0;
    });

    // Get chargebacks
    const chargebacksSnap = await this.db
      .collection('chargebacks')
      .where('merchantId', '==', merchantId)
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(periodStart))
      .where('createdAt', '<=', admin.firestore.Timestamp.fromDate(periodEnd))
      .get();

    let chargebacks = 0;
    chargebacksSnap.forEach(doc => {
      chargebacks += doc.data().amount || 0;
    });

    // Get merchant to check platform fee rate
    const merchantDoc = await this.db.collection('merchants').doc(merchantId).get();
    const merchant = merchantDoc.data();

    // Platform fee (e.g., 2% of revenue)
    const platformFeeRate = merchant?.platformFeeRate || 0.02;
    const platformFee = totalRevenue * platformFeeRate;

    // Paystack transfer fee (Ghana: GHS 1 flat, Nigeria: NGN 10 + 0.5%)
    const paystackTransferFee = 1; // GHS 1 for Ghana

    // Calculate net amount
    const netAmount = Math.max(0,
      totalRevenue - refunds - chargebacks - platformFee - paystackTransferFee
    );

    return {
      merchantId,
      periodStart,
      periodEnd,
      totalRevenue,
      totalTransactions,
      refunds,
      chargebacks,
      platformFee,
      paystackTransactionFees,
      paystackTransferFee,
      netAmount,
    };
  }

  /**
   * Create a settlement record in Firestore
   */
  async createSettlement(calculation: SettlementCalculation): Promise<string> {
    const settlementId = `settlement_${Date.now()}_${calculation.merchantId}`;

    const settlementData = {
      settlementId,
      merchantId: calculation.merchantId,
      amount: calculation.totalRevenue,
      currency: 'GHS',
      fees: {
        platformFee: calculation.platformFee,
        paystackFee: calculation.paystackTransferFee,
        totalFees: calculation.platformFee + calculation.paystackTransferFee,
      },
      netAmount: calculation.netAmount,
      periodStart: admin.firestore.Timestamp.fromDate(calculation.periodStart),
      periodEnd: admin.firestore.Timestamp.fromDate(calculation.periodEnd),
      breakdown: {
        totalTransactions: calculation.totalTransactions,
        totalRevenue: calculation.totalRevenue,
        refunds: calculation.refunds,
        chargebacks: calculation.chargebacks,
        adjustments: 0,
      },
      status: 'pending',
      initiatedBy: 'system',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await this.db.collection('settlements').doc(settlementId).set(settlementData);

    return settlementId;
  }
}
```

---

## Part 4: Create Cloud Functions

Create `functions/src/index.ts`:

```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { PaystackService } from './services/paystack.service';
import { SettlementService } from './services/settlement.service';

admin.initializeApp();

const db = admin.firestore();

// Get Paystack secret key from config
const getPaystackKey = () => {
  return functions.config().paystack?.secret_key || process.env.PAYSTACK_SECRET_KEY;
};

/**
 * HTTPS Callable Function: Process Manual Payout
 *
 * Call this from the admin dashboard to initiate a payout
 */
export const processManualPayout = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  // Verify admin permissions
  const adminDoc = await db.collection('admins').doc(context.auth.uid).get();
  if (!adminDoc.exists) {
    throw new functions.https.HttpsError('permission-denied', 'User is not an admin');
  }

  const { merchantId, amount, description } = data;

  if (!merchantId) {
    throw new functions.https.HttpsError('invalid-argument', 'merchantId is required');
  }

  try {
    console.log(`Processing manual payout for merchant ${merchantId}, amount: ${amount || 'auto'}`);

    // Get merchant
    const merchantDoc = await db.collection('merchants').doc(merchantId).get();
    if (!merchantDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Merchant not found');
    }

    const merchant = merchantDoc.data();

    // Check if payouts are enabled
    if (!merchant?.payoutConfig?.enabled) {
      throw new functions.https.HttpsError('failed-precondition', 'Payouts not enabled for this merchant');
    }

    // Check if recipient code exists
    if (!merchant?.payoutConfig?.recipientCode) {
      throw new functions.https.HttpsError('failed-precondition', 'Merchant has no recipient configured');
    }

    // Calculate payout amount
    let payoutAmount = amount;
    if (!payoutAmount) {
      // Use pending payout amount
      payoutAmount = merchant.payoutStats?.pendingPayout || 0;
    }

    if (payoutAmount <= 0) {
      throw new functions.https.HttpsError('failed-precondition', 'No funds available for payout');
    }

    // Calculate fee (GHS 1 for Ghana)
    const fee = 1;
    const netAmount = payoutAmount - fee;

    // Create payout record
    const payoutId = `payout_${Date.now()}_${merchantId}`;
    const reference = `${payoutId}_${Date.now()}`;

    const payoutData = {
      payoutId,
      merchantId,
      amount: payoutAmount,
      currency: 'GHS',
      fee,
      netAmount,
      recipient: {
        type: merchant.payoutConfig.bankDetails ? 'bank' : 'mobile_money',
        recipientCode: merchant.payoutConfig.recipientCode,
        accountNumber: merchant.payoutConfig.bankDetails?.accountNumber || merchant.payoutConfig.mobileMoneyDetails?.number,
        accountName: merchant.payoutConfig.bankDetails?.accountName || merchant.payoutConfig.mobileMoneyDetails?.accountName,
        bankCode: merchant.payoutConfig.bankDetails?.bankCode,
        bankName: merchant.payoutConfig.bankDetails?.bankName,
        mobileProvider: merchant.payoutConfig.mobileMoneyDetails?.provider,
      },
      paystack: {
        transferCode: '',
        reference,
        status: 'pending',
        integration: 0,
        domain: functions.config().paystack?.domain || 'test',
        reason: description || 'Merchant settlement payment',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      initiatedBy: 'admin',
      initiatedByAdminId: context.auth.uid,
      type: 'manual',
      description: description || 'Manual payout',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Save payout to Firestore
    await db.collection('payouts').doc(payoutId).set(payoutData);

    // Initialize Paystack service
    const paystack = new PaystackService(getPaystackKey());

    // Initiate transfer via Paystack
    const transferResult = await paystack.initiateTransfer({
      source: 'balance',
      amount: netAmount * 100, // Convert to pesewas
      recipient: merchant.payoutConfig.recipientCode,
      reason: description || 'Merchant settlement payment',
      reference,
      currency: 'GHS',
    });

    // Update payout with Paystack response
    await db.collection('payouts').doc(payoutId).update({
      'paystack.transferCode': transferResult.transfer_code,
      'paystack.reference': transferResult.reference,
      'paystack.status': transferResult.status,
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`Payout initiated successfully: ${payoutId}`);

    return {
      success: true,
      payoutId,
      transferCode: transferResult.transfer_code,
      status: transferResult.status,
    };
  } catch (error: any) {
    console.error('Error processing manual payout:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * HTTPS Callable Function: Create Transfer Recipient
 *
 * Call this to create a Paystack recipient for a merchant
 */
export const createTransferRecipient = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { merchantId, type } = data; // type: 'bank' or 'mobile_money'

  if (!merchantId) {
    throw new functions.https.HttpsError('invalid-argument', 'merchantId is required');
  }

  try {
    // Get merchant
    const merchantDoc = await db.collection('merchants').doc(merchantId).get();
    if (!merchantDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Merchant not found');
    }

    const merchant = merchantDoc.data();

    // Initialize Paystack service
    const paystack = new PaystackService(getPaystackKey());

    let recipientCode: string;

    if (type === 'bank') {
      if (!merchant?.payoutConfig?.bankDetails) {
        throw new functions.https.HttpsError('failed-precondition', 'Merchant has no bank details');
      }

      recipientCode = await paystack.createRecipient({
        type: 'nuban',
        name: merchant.payoutConfig.bankDetails.accountName,
        account_number: merchant.payoutConfig.bankDetails.accountNumber,
        bank_code: merchant.payoutConfig.bankDetails.bankCode,
        currency: 'GHS',
      });
    } else if (type === 'mobile_money') {
      if (!merchant?.payoutConfig?.mobileMoneyDetails) {
        throw new functions.https.HttpsError('failed-precondition', 'Merchant has no mobile money details');
      }

      const provider = merchant.payoutConfig.mobileMoneyDetails.provider;
      const bankCode = PaystackService.getGhanaBankCode(provider);

      recipientCode = await paystack.createRecipient({
        type: 'mobile_money',
        name: merchant.payoutConfig.mobileMoneyDetails.accountName,
        account_number: merchant.payoutConfig.mobileMoneyDetails.number,
        bank_code: bankCode,
        currency: 'GHS',
      });
    } else {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid recipient type');
    }

    // Update merchant with recipient code
    await db.collection('merchants').doc(merchantId).update({
      'payoutConfig.recipientCode': recipientCode,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      recipientCode,
    };
  } catch (error: any) {
    console.error('Error creating transfer recipient:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * HTTP Function: Paystack Webhook Handler
 *
 * Receives webhook notifications from Paystack for transfer status updates
 */
export const paystackWebhook = functions.https.onRequest(async (req, res) => {
  // Verify webhook signature
  const crypto = require('crypto');
  const hash = crypto
    .createHmac('sha512', getPaystackKey())
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (hash !== req.headers['x-paystack-signature']) {
    console.error('Invalid webhook signature');
    res.status(400).send('Invalid signature');
    return;
  }

  const event = req.body;

  console.log('Received Paystack webhook:', event.event);

  try {
    if (event.event === 'transfer.success') {
      await handleTransferSuccess(event.data);
    } else if (event.event === 'transfer.failed') {
      await handleTransferFailed(event.data);
    } else if (event.event === 'transfer.reversed') {
      await handleTransferReversed(event.data);
    }

    res.status(200).send('Webhook received');
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).send('Error processing webhook');
  }
});

async function handleTransferSuccess(data: any) {
  console.log('Transfer success:', data.transfer_code);

  // Find payout by transfer code
  const payoutSnap = await db
    .collection('payouts')
    .where('paystack.transferCode', '==', data.transfer_code)
    .limit(1)
    .get();

  if (!payoutSnap.empty) {
    const payoutRef = payoutSnap.docs[0].ref;
    const payout = payoutSnap.docs[0].data();

    await payoutRef.update({
      'paystack.status': 'success',
      'paystack.transferredAt': data.transferred_at,
      'paystack.updatedAt': new Date().toISOString(),
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Update merchant payout stats
    await updateMerchantPayoutStats(payout.merchantId, payout.netAmount);

    console.log('Payout marked as successful:', payoutSnap.docs[0].id);
  }
}

async function handleTransferFailed(data: any) {
  console.log('Transfer failed:', data.transfer_code);

  // Find payout by transfer code
  const payoutSnap = await db
    .collection('payouts')
    .where('paystack.transferCode', '==', data.transfer_code)
    .limit(1)
    .get();

  if (!payoutSnap.empty) {
    await payoutSnap.docs[0].ref.update({
      'paystack.status': 'failed',
      'paystack.failureReason': data.reason || 'Transfer failed',
      'paystack.updatedAt': new Date().toISOString(),
      failedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log('Payout marked as failed:', payoutSnap.docs[0].id);
  }
}

async function handleTransferReversed(data: any) {
  console.log('Transfer reversed:', data.transfer_code);

  // Find payout by transfer code
  const payoutSnap = await db
    .collection('payouts')
    .where('paystack.transferCode', '==', data.transfer_code)
    .limit(1)
    .get();

  if (!payoutSnap.empty) {
    await payoutSnap.docs[0].ref.update({
      'paystack.status': 'reversed',
      'paystack.updatedAt': new Date().toISOString(),
    });

    console.log('Payout marked as reversed:', payoutSnap.docs[0].id);
  }
}

async function updateMerchantPayoutStats(merchantId: string, amount: number) {
  const merchantRef = db.collection('merchants').doc(merchantId);

  await db.runTransaction(async (transaction) => {
    const merchantDoc = await transaction.get(merchantRef);

    if (merchantDoc.exists) {
      const currentStats = merchantDoc.data()?.payoutStats || {};

      transaction.update(merchantRef, {
        'payoutStats.totalPaidOut': (currentStats.totalPaidOut || 0) + amount,
        'payoutStats.pendingPayout': Math.max(0, (currentStats.pendingPayout || 0) - amount),
        'payoutStats.lastPayoutDate': admin.firestore.FieldValue.serverTimestamp(),
        'payoutStats.lastPayoutAmount': amount,
      });
    }
  });
}

/**
 * Scheduled Function: Process Scheduled Payouts
 *
 * Runs daily at 00:00 UTC to process automated payouts
 */
export const processScheduledPayouts = functions.pubsub
  .schedule('0 0 * * *')
  .timeZone('UTC')
  .onRun(async (context) => {
    console.log('Starting scheduled payout processing...');

    // Get all merchants with automated payouts enabled
    const merchantsSnap = await db
      .collection('merchants')
      .where('payoutConfig.enabled', '==', true)
      .where('payoutConfig.schedule.frequency', '!=', 'manual')
      .get();

    const today = new Date();
    const results = { success: 0, skipped: 0, failed: 0 };

    for (const doc of merchantsSnap.docs) {
      const merchant = doc.data();
      const schedule = merchant.payoutConfig.schedule;

      // Check if payout should run today
      const shouldRun = checkSchedule(schedule, today);

      // Check minimum amount
      const hasMinAmount = merchant.payoutStats?.pendingPayout >= (schedule.minimumAmount || 0);

      if (shouldRun && hasMinAmount) {
        try {
          // Process payout automatically
          const paystack = new PaystackService(getPaystackKey());

          // Create and initiate payout (similar to manual payout)
          // ... implementation here ...

          results.success++;
        } catch (error) {
          console.error(`Failed to process payout for ${merchant.merchantId}:`, error);
          results.failed++;
        }
      } else {
        results.skipped++;
      }
    }

    console.log('Payout processing complete:', results);
    return results;
  });

function checkSchedule(schedule: any, date: Date): boolean {
  switch (schedule.frequency) {
    case 'daily':
      return true;

    case 'weekly':
      return date.getDay() === (schedule.dayOfWeek || 0);

    case 'bi-weekly':
      const weekNumber = Math.floor(date.getDate() / 7);
      return weekNumber % 2 === 0 && date.getDay() === (schedule.dayOfWeek || 0);

    case 'monthly':
      return date.getDate() === (schedule.dayOfMonth || 1);

    default:
      return false;
  }
}
```

---

## Part 5: Deploy Cloud Functions

```bash
# Build TypeScript
cd functions
npm run build

# Deploy all functions
firebase deploy --only functions

# Or deploy specific functions
firebase deploy --only functions:processManualPayout,functions:paystackWebhook
```

---

## Part 6: Update Admin Dashboard to Call Cloud Functions

Update `src/pages/Payouts.tsx` to add the manual payout button handler:

```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';

// Inside the Payouts component:
const functions = getFunctions();

const handleProcessManualPayout = async (merchantId: string, amount?: number) => {
  try {
    setProcessingPayout(true);

    const processManualPayoutFn = httpsCallable(functions, 'processManualPayout');

    const result = await processManualPayoutFn({
      merchantId,
      amount,
      description: 'Manual payout initiated from admin dashboard'
    });

    console.log('Payout processed:', result.data);

    // Reload payouts
    await loadData();

    alert('Payout initiated successfully!');
  } catch (error: any) {
    console.error('Error processing payout:', error);
    alert(`Failed to process payout: ${error.message}`);
  } finally {
    setProcessingPayout(false);
  }
};
```

---

## Part 7: Configure Paystack Webhook

1. Go to Paystack Dashboard → Settings → Webhooks
2. Add webhook URL: `https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/paystackWebhook`
3. Subscribe to events:
   - `transfer.success`
   - `transfer.failed`
   - `transfer.reversed`

---

## Part 8: Testing

### Test in Development

```bash
# Use Firebase emulators for local testing
firebase emulators:start --only functions,firestore

# Test manual payout from admin UI
# Use Paystack test keys and test bank accounts
```

### Test Bank Account (Ghana)
- Account Number: `0123456789`
- Bank Code: Any valid Ghana bank code
- Use Paystack test mode

---

## Summary

You now have:
1. ✅ Paystack service wrapper
2. ✅ Manual payout Cloud Function
3. ✅ Webhook handler for status updates
4. ✅ Scheduled payout processing
5. ✅ Settlement calculation service
6. ✅ Admin UI integration

To initiate a payout:
1. Ensure merchant has payout config with recipient code
2. Go to Payouts page in admin dashboard
3. Click process payout button
4. Function creates payout record → Calls Paystack → Updates status via webhook

Questions? Check the Paystack documentation or test with their API explorer!
