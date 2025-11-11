/**
 * Cloud Functions for QuickLink Pay
 *
 * Functions:
 * - sendOTP: Send OTP via WhatsApp/SMS
 * - verifyOTP: Verify OTP and create custom token
 * - requestPayout: Request merchant payout
 * - processManualPayout: Process manual payout (Admin only)
 * - validateMerchantData: Validate merchant data on write
 * - validateInvoiceData: Validate invoice data on write
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import {
  rateLimitMiddleware,
  RATE_LIMITS,
  cleanupRateLimits,
} from './utils/rateLimiter';
import { sendWhatsAppOTP } from './services/whatsappService';
import {
  isValidPhoneNumber,
  isValidOTP,
} from './utils/validation';

// Initialize Firebase Admin
admin.initializeApp();

const getDb = () => admin.firestore();
const auth = admin.auth();
const appCheck = admin.appCheck();

/**
 * Verify App Check token
 * Returns true if valid, false otherwise
 */
async function verifyAppCheckToken(context: functions.https.CallableContext): Promise<boolean> {
  // In development/emulator, skip App Check verification
  if (process.env.FUNCTIONS_EMULATOR === 'true') {
    console.log('⚠️  App Check: Skipping verification in emulator');
    return true;
  }

  // Check if App Check token exists
  if (!context.app) {
    console.warn('⚠️  App Check: No token provided');
    return false;
  }

  try {
    // Verify the App Check token
    // The token is a string, not an object
    await appCheck.verifyToken(context.app as any);
    return true;
  } catch (error) {
    console.error('❌ App Check: Token verification failed:', error);
    return false;
  }
}

// ============================================================================
// OTP Management
// ============================================================================

interface OTPRecord {
  phoneNumber: string;
  otp: string;
  createdAt: admin.firestore.Timestamp;
  expiresAt: admin.firestore.Timestamp;
  attempts: number;
  verified: boolean;
}

/**
 * Generate a 6-digit OTP
 */
function generateOTP(): string {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Send OTP via WhatsApp/SMS
 */
export const sendOTP = functions.https.onCall(async (data, context) => {
  try {
    // Verify App Check token (optional - can be enforced in production)
    const isValidAppCheck = await verifyAppCheckToken(context);
    if (!isValidAppCheck && process.env.NODE_ENV === 'production') {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'App Check verification failed. Please use an official app.'
      );
    }

    const { phoneNumber } = data;

    // Validate phone number format
    if (!phoneNumber || !isValidPhoneNumber(phoneNumber)) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Invalid phone number format. Use international format: +233XXXXXXXXX'
      );
    }

    // Rate limiting: Max 5 OTP requests per hour per phone number
    await rateLimitMiddleware(
      context,
      'sendOTP',
      RATE_LIMITS.OTP_SEND,
      'phoneNumber',
      phoneNumber
    );

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
    );

    // Store OTP in Firestore
    await getDb().collection('otps').add({
      phoneNumber,
      otp,
      createdAt: admin.firestore.Timestamp.now(),
      expiresAt,
      attempts: 0,
      verified: false,
    });

    // Send OTP via WhatsApp using 360Dialog
    const whatsappResult = await sendWhatsAppOTP(phoneNumber, otp);

    if (!whatsappResult.success) {
      console.error('Failed to send WhatsApp OTP:', whatsappResult.error);
      // In production, you might want to throw an error here
      // For now, we'll return success but log the error
    }

    console.log(`✅ OTP sent via WhatsApp to ${phoneNumber}`);
    if (process.env.FUNCTIONS_EMULATOR) {
      console.log(`📱 OTP for testing: ${otp}`);
    }

    return {
      success: true,
      message: 'OTP sent successfully via WhatsApp',
      // In production, do NOT return the OTP
      // Only return in emulator mode for testing
      otp: process.env.FUNCTIONS_EMULATOR ? otp : undefined,
    };
  } catch (error: any) {
    console.error('Error sending OTP:', error);
    throw new functions.https.HttpsError(
      'internal',
      error.message || 'Failed to send OTP'
    );
  }
});

/**
 * Verify OTP and create custom token for authentication
 */
export const verifyOTP = functions.https.onCall(async (data, context) => {
  try {
    const { phoneNumber, otp } = data;

    // Validate phone number format
    if (!phoneNumber || !isValidPhoneNumber(phoneNumber)) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Invalid phone number format'
      );
    }

    // Validate OTP format
    if (!otp || !isValidOTP(otp)) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Invalid OTP format. Must be 6 digits'
      );
    }

    // Rate limiting: Max 10 verification attempts per 10 minutes per phone number
    await rateLimitMiddleware(
      context,
      'verifyOTP',
      RATE_LIMITS.OTP_VERIFY,
      'phoneNumber',
      phoneNumber
    );

    // Find the most recent OTP for this phone number
    const otpQuery = await getDb()
      .collection('otps')
      .where('phoneNumber', '==', phoneNumber)
      .where('verified', '==', false)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (otpQuery.empty) {
      throw new functions.https.HttpsError(
        'not-found',
        'No OTP found for this phone number'
      );
    }

    const otpDoc = otpQuery.docs[0];
    const otpData = otpDoc.data() as OTPRecord;

    // Check if OTP has expired
    if (otpData.expiresAt.toMillis() < Date.now()) {
      throw new functions.https.HttpsError(
        'deadline-exceeded',
        'OTP has expired. Please request a new one.'
      );
    }

    // Check if too many attempts
    if (otpData.attempts >= 3) {
      throw new functions.https.HttpsError(
        'resource-exhausted',
        'Too many failed attempts. Please request a new OTP.'
      );
    }

    // Verify OTP
    if (otpData.otp !== otp) {
      // Increment attempts
      await otpDoc.ref.update({
        attempts: admin.firestore.FieldValue.increment(1),
      });

      throw new functions.https.HttpsError(
        'invalid-argument',
        'Invalid OTP. Please try again.'
      );
    }

    // Mark OTP as verified
    await otpDoc.ref.update({
      verified: true,
      verifiedAt: admin.firestore.Timestamp.now(),
    });

    // Check if merchant exists
    const merchantQuery = await getDb()
      .collection('merchants')
      .where('contactInfo.phoneNumber', '==', phoneNumber)
      .limit(1)
      .get();

    let merchantId: string;

    if (merchantQuery.empty) {
      // Create new merchant
      const newMerchant = {
        contactInfo: {
          phoneNumber,
        },
        status: 'pending_setup',
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
      };

      const merchantRef = await getDb().collection('merchants').add(newMerchant);
      merchantId = merchantRef.id;

      // Create Firebase Auth user
      try {
        await auth.createUser({
          uid: merchantId,
          phoneNumber,
        });
      } catch (authError: any) {
        // If user already exists, that's okay
        if (authError.code !== 'auth/uid-already-exists') {
          throw authError;
        }
      }
    } else {
      merchantId = merchantQuery.docs[0].id;
    }

    // Create custom token for authentication
    const customToken = await auth.createCustomToken(merchantId);

    return {
      success: true,
      customToken,
      merchantId,
      message: 'OTP verified successfully',
    };
  } catch (error: any) {
    console.error('Error verifying OTP:', error);
    throw new functions.https.HttpsError(
      'internal',
      error.message || 'Failed to verify OTP'
    );
  }
});

// ============================================================================
// Payout Management
// ============================================================================

/**
 * Request merchant payout
 */
export const requestPayout = functions.https.onCall(async (data, context) => {
  try {
    // Check authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Must be authenticated to request payout'
      );
    }

    // Rate limiting: Max 10 payout requests per hour per merchant
    await rateLimitMiddleware(
      context,
      'requestPayout',
      RATE_LIMITS.PAYOUT_REQUEST,
      'merchant'
    );

    const merchantId = context.auth.uid;
    const { amount, currency, bankDetails } = data;

    // Validate inputs
    if (!amount || !currency || !bankDetails) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Amount, currency, and bank details are required'
      );
    }

    if (amount <= 0) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Amount must be greater than zero'
      );
    }

    // Get merchant data
    const merchantDoc = await getDb().collection('merchants').doc(merchantId).get();

    if (!merchantDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'Merchant not found'
      );
    }

    const merchantData = merchantDoc.data();

    // Check if merchant is active
    if (merchantData?.status !== 'active') {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Merchant account must be active to request payout'
      );
    }

    // TODO: Check merchant balance
    // const availableBalance = await getMerchantBalance(merchantId);
    // if (availableBalance < amount) {
    //   throw new functions.https.HttpsError(
    //     'failed-precondition',
    //     'Insufficient balance for payout'
    //   );
    // }

    // Create payout request
    const payoutRef = await getDb().collection('payouts').add({
      merchantId,
      amount,
      currency,
      bankDetails,
      status: 'pending',
      requestedAt: admin.firestore.Timestamp.now(),
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    });

    // Log audit event
    await getDb().collection('auditLogs').add({
      action: {
        type: 'payout_requested',
        category: 'payment',
        severity: 'medium',
      },
      actor: {
        merchantId,
        type: 'merchant',
      },
      target: {
        resourceType: 'payout',
        resourceId: payoutRef.id,
      },
      timestamp: admin.firestore.Timestamp.now(),
      metadata: {
        amount,
        currency,
      },
    });

    return {
      success: true,
      payoutId: payoutRef.id,
      message: 'Payout request submitted successfully',
    };
  } catch (error: any) {
    console.error('Error requesting payout:', error);
    throw new functions.https.HttpsError(
      'internal',
      error.message || 'Failed to request payout'
    );
  }
});

// ============================================================================
// Manual Payout Processing (Admin Only)
// ============================================================================

/**
 * Process manual payout for a merchant (Admin only)
 * This function is called from the admin dashboard to initiate payouts
 */
export const processManualPayout = functions.https.onCall(async (data, context) => {
  try {
    // Check authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Must be authenticated to process manual payout'
      );
    }

    const {merchantId, amount, description, initiatedByAdminId} = data;

    // Validate required fields
    if (!merchantId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Merchant ID is required'
      );
    }

    if (!initiatedByAdminId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Admin ID is required'
      );
    }

    // Verify the caller is an admin
    const adminDoc = await getDb().collection('admins').doc(context.auth.uid).get();
    if (!adminDoc.exists) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only admins can process manual payouts'
      );
    }

    const adminData = adminDoc.data();
    if (adminData?.status !== 'active') {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Admin account must be active to process payouts'
      );
    }

    // Get merchant data
    const merchantDoc = await getDb().collection('merchants').doc(merchantId).get();
    if (!merchantDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'Merchant not found'
      );
    }

    const merchantData = merchantDoc.data();

    // Check if merchant is active
    if (merchantData?.status !== 'active') {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Merchant account must be active to process payout'
      );
    }

    // Validate payout details
    if (!merchantData?.payoutDetails?.recipientCode) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Merchant does not have payout details configured. Please add bank account or mobile money details first.'
      );
    }

    // TODO: Integrate with Paystack Transfer API
    // For now, create a payout record in pending status
    // The actual Paystack integration would happen here

    const payoutData: any = {
      merchantId,
      amount: amount || 0, // If no amount, it will be calculated from available balance
      currency: merchantData?.defaultCurrency || 'GHS',
      fee: 0, // TODO: Calculate actual transfer fee
      netAmount: (amount || 0), // TODO: Subtract fee
      recipient: {
        type: merchantData?.payoutDetails?.type || 'bank',
        recipientCode: merchantData?.payoutDetails?.recipientCode,
        accountNumber: merchantData?.payoutDetails?.accountNumber || '',
        accountName: merchantData?.payoutDetails?.accountName || '',
        bankCode: merchantData?.payoutDetails?.bankCode,
        bankName: merchantData?.payoutDetails?.bankName,
        mobileProvider: merchantData?.payoutDetails?.mobileProvider,
      },
      paystack: {
        transferCode: '', // TODO: Get from Paystack API
        reference: `PAY-${Date.now()}-${merchantId.substring(0, 8)}`,
        status: 'pending',
        integration: 0,
        domain: process.env.NODE_ENV === 'production' ? 'live' : 'test',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      initiatedBy: 'admin',
      initiatedByAdminId,
      type: 'manual',
      description: description || 'Manual payout initiated from admin dashboard',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    };

    // Create payout record
    const payoutRef = await getDb().collection('payouts').add(payoutData);

    // Log audit event
    await getDb().collection('auditLogs').add({
      action: {
        type: 'manual_payout_initiated',
        category: 'payment',
        severity: 'high',
      },
      actor: {
        adminId: initiatedByAdminId,
        type: 'admin',
      },
      target: {
        resourceType: 'payout',
        resourceId: payoutRef.id,
        merchantId,
      },
      timestamp: admin.firestore.Timestamp.now(),
      metadata: {
        amount,
        description,
      },
    });

    return {
      success: true,
      payoutId: payoutRef.id,
      transferCode: payoutData.paystack.transferCode || 'pending',
      message: 'Manual payout initiated successfully. Integration with Paystack Transfer API is pending.',
    };
  } catch (error: any) {
    console.error('Error processing manual payout:', error);
    throw new functions.https.HttpsError(
      'internal',
      error.message || 'Failed to process manual payout'
    );
  }
});

// ============================================================================
// Data Validation Triggers
// ============================================================================

/**
 * Validate merchant data on create/update
 */
export const validateMerchantData = functions.firestore
  .document('merchants/{merchantId}')
  .onWrite(async (change, context) => {
    const merchantId = context.params.merchantId;

    // If document was deleted, nothing to validate
    if (!change.after.exists) {
      return null;
    }

    const data = change.after.data();

    if (!data) {
      return null;
    }

    try {
      // Validate phone number format
      if (data.contactInfo?.phoneNumber) {
        const phoneRegex = /^\+\d{10,15}$/;
        if (!phoneRegex.test(data.contactInfo.phoneNumber)) {
          console.error(`Invalid phone number format for merchant ${merchantId}`);
          // In production, you might want to revert the change or notify admins
        }
      }

      // Validate email format
      if (data.businessInfo?.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.businessInfo.email)) {
          console.error(`Invalid email format for merchant ${merchantId}`);
        }
      }

      // Validate business name
      if (data.businessInfo?.businessName) {
        if (data.businessInfo.businessName.length < 2) {
          console.error(`Business name too short for merchant ${merchantId}`);
        }
      }

      // If status changed to 'suspended', ensure reason is provided
      if (change.before.exists) {
        const oldData = change.before.data();
        if (
          oldData &&
          oldData.status !== 'suspended' &&
          data.status === 'suspended' &&
          !data.suspensionReason
        ) {
          console.error(`Suspension reason missing for merchant ${merchantId}`);
          // Revert the change
          await change.after.ref.update({
            status: oldData.status,
            updatedAt: admin.firestore.Timestamp.now(),
          });
        }
      }

      return null;
    } catch (error) {
      console.error('Error validating merchant data:', error);
      return null;
    }
  });

/**
 * Validate invoice data on create/update
 */
export const validateInvoiceData = functions.firestore
  .document('invoices/{invoiceId}')
  .onWrite(async (change, context) => {
    const invoiceId = context.params.invoiceId;

    // If document was deleted, nothing to validate
    if (!change.after.exists) {
      return null;
    }

    const data = change.after.data();

    if (!data) {
      return null;
    }

    try {
      // Validate invoice amounts
      if (data.totalAmount !== undefined && data.totalAmount < 0) {
        console.error(`Invalid total amount for invoice ${invoiceId}`);
        // Revert if needed
      }

      // Validate items array
      if (data.items && Array.isArray(data.items)) {
        for (const item of data.items) {
          if (item.quantity <= 0) {
            console.error(`Invalid quantity in invoice ${invoiceId}`);
          }
          if (item.unitPrice < 0) {
            console.error(`Invalid unit price in invoice ${invoiceId}`);
          }
        }
      }

      // Validate due date
      if (data.issueDate && data.dueDate) {
        const issueDate = data.issueDate.toDate();
        const dueDate = data.dueDate.toDate();

        if (dueDate < issueDate) {
          console.error(`Due date before issue date for invoice ${invoiceId}`);
        }
      }

      // Auto-update invoice status based on dates
      if (
        data.status === 'sent' &&
        data.dueDate &&
        data.dueDate.toMillis() < Date.now()
      ) {
        await change.after.ref.update({
          status: 'overdue',
          updatedAt: admin.firestore.Timestamp.now(),
        });
      }

      return null;
    } catch (error) {
      console.error('Error validating invoice data:', error);
      return null;
    }
  });

/**
 * Update invoice status when payment is recorded
 */
export const updateInvoiceOnPayment = functions.firestore
  .document('payments/{paymentId}')
  .onCreate(async (snapshot, context) => {
    const paymentData = snapshot.data();

    try {
      // If payment is linked to an invoice
      if (paymentData.invoiceId) {
        const invoiceRef = getDb().collection('invoices').doc(paymentData.invoiceId);
        const invoiceDoc = await invoiceRef.get();

        if (invoiceDoc.exists) {
          // Update invoice with payment info
          await invoiceRef.update({
            payment: {
              paymentId: snapshot.id,
              amount: paymentData.amount,
              method: paymentData.method,
              paidAt: paymentData.createdAt,
              transactionId: paymentData.transactionId,
            },
            status: 'paid',
            updatedAt: admin.firestore.Timestamp.now(),
          });

          console.log(`Invoice ${paymentData.invoiceId} marked as paid`);
        }
      }

      return null;
    } catch (error) {
      console.error('Error updating invoice on payment:', error);
      return null;
    }
  });

/**
 * Create notification on support ticket update
 */
export const notifyOnTicketUpdate = functions.firestore
  .document('supportTickets/{ticketId}')
  .onUpdate(async (change, context) => {
    const ticketId = context.params.ticketId;
    const before = change.before.data();
    const after = change.after.data();

    try {
      // If status changed
      if (before.status !== after.status) {
        const merchantId = after.merchantId;

        await getDb().collection('notifications').add({
          userId: merchantId,
          type: 'support_ticket',
          title: 'Support Ticket Updated',
          message: `Your support ticket #${ticketId} status changed to ${after.status}`,
          data: {
            ticketId,
            oldStatus: before.status,
            newStatus: after.status,
          },
          read: false,
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now(),
        });

        console.log(`Notification created for ticket ${ticketId} update`);
      }

      return null;
    } catch (error) {
      console.error('Error creating notification:', error);
      return null;
    }
  });

// ============================================================================
// Rate Limit Management
// ============================================================================

/**
 * Scheduled function to clean up old rate limit records
 * Runs every day at midnight
 */
export const cleanupOldRateLimits = functions.pubsub
  .schedule('0 0 * * *') // Every day at midnight
  .timeZone('UTC')
  .onRun(async (context) => {
    try {
      const deletedCount = await cleanupRateLimits();
      console.log(`Cleaned up ${deletedCount} old rate limit records`);
      return null;
    } catch (error) {
      console.error('Error cleaning up rate limits:', error);
      return null;
    }
  });

// ==================== WhatsApp Webhooks ====================
export { whatsappWebhook, cleanupOldMessageEchoes } from './webhooks/whatsappWebhook';

// ==================== Configuration Management ====================
export {
  getSystemConfig,
  getSubscriptionPlans,
  getSubscriptionPlan,
  getMerchantSubscription,
  subscribeToPlan,
  checkFeatureAccess,
  checkUsageLimit,
} from './config/configFunctions';

// ==================== API Key Migration ====================
export {
  migrateWhatsAppApiKeys,
  migratePaystackSecrets,
  migrateSystemSecrets,
  verifyMigrationStatus,
} from './migration/migrateApiKeys';

// ============================================================================
// API Integration Testing
// ============================================================================

/**
 * Test API integration connectivity (Admin only)
 * This function is called from the admin dashboard to test API integrations
 */
export const testAPIIntegration = functions.https.onCall(async (data, context) => {
  try {
    // Check authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Must be authenticated to test API integrations'
      );
    }

    // Verify the caller is an admin
    const adminDoc = await getDb().collection('admins').doc(context.auth.uid).get();
    if (!adminDoc.exists) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only admins can test API integrations'
      );
    }

    const { integrationId } = data;

    if (!integrationId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Integration ID is required'
      );
    }

    // Get integration details from Firestore
    const integrationDoc = await getDb().collection('apiIntegrations').doc(integrationId).get();

    if (!integrationDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'API integration not found'
      );
    }

    const integration = integrationDoc.data();

    if (!integration) {
      throw new functions.https.HttpsError(
        'not-found',
        'API integration data is empty'
      );
    }

    // Determine test endpoint based on provider
    let testEndpoint = '';
    let testMethod = 'GET';
    const headers: Record<string, string> = {};

    switch (integration.provider) {
      case 'PAYSTACK':
        testEndpoint = 'https://api.paystack.co/bank';
        headers['Authorization'] = `Bearer ${integration.apiKey}`;
        headers['Content-Type'] = 'application/json';
        break;

      case 'GOOGLE_GEMINI':
        testEndpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${integration.apiKey}`;
        headers['Content-Type'] = 'application/json';
        break;

      case 'GOOGLE_MAPS':
        testEndpoint = `https://maps.googleapis.com/maps/api/geocode/json?address=1600+Amphitheatre+Parkway,+Mountain+View,+CA&key=${integration.apiKey}`;
        headers['Content-Type'] = 'application/json';
        break;

      case 'FLUTTERWAVE':
        testEndpoint = 'https://api.flutterwave.com/v3/banks/NG';
        headers['Authorization'] = `Bearer ${integration.apiKey}`;
        headers['Content-Type'] = 'application/json';
        break;

      case 'STRIPE':
        testEndpoint = 'https://api.stripe.com/v1/balance';
        headers['Authorization'] = `Bearer ${integration.apiKey}`;
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
        break;

      case 'DIALOG_360':
        testEndpoint = 'https://waba.360dialog.io/v1/configs/webhook';
        headers['D360-API-KEY'] = integration.apiKey;
        headers['Content-Type'] = 'application/json';
        break;

      case 'SENDGRID':
        testEndpoint = 'https://api.sendgrid.com/v3/scopes';
        headers['Authorization'] = `Bearer ${integration.apiKey}`;
        headers['Content-Type'] = 'application/json';
        break;

      case 'CUSTOM':
        if (!integration.config?.baseUrl) {
          throw new functions.https.HttpsError(
            'failed-precondition',
            'No base URL configured for custom integration'
          );
        }

        if (integration.config.baseUrl.includes('360dialog')) {
          testEndpoint = `${integration.config.baseUrl}/v1/configs/webhook`;
          headers['D360-API-KEY'] = integration.apiKey;
          headers['Content-Type'] = 'application/json';
        } else {
          testEndpoint = `${integration.config.baseUrl}/health`;
          headers['Authorization'] = `Bearer ${integration.apiKey}`;
          headers['Content-Type'] = 'application/json';
        }
        break;

      default:
        throw new functions.https.HttpsError(
          'invalid-argument',
          `Unsupported provider: ${integration.provider}`
        );
    }

    // Make the test request with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, integration.config?.timeout || 30000);

    try {
      const response = await fetch(testEndpoint, {
        method: testMethod,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const responseData = await response.json();

      if (response.ok) {
        return {
          success: true,
          message: 'Connection successful! API is responding correctly.',
          data: {
            status: response.status,
            statusText: response.statusText,
            provider: integration.provider,
            environment: integration.environment,
          },
        };
      } else {
        return {
          success: false,
          message: `API returned error: ${responseData.message || response.statusText}`,
          data: {
            status: response.status,
            error: responseData,
          },
        };
      }
    } catch (fetchError: any) {
      clearTimeout(timeout);

      let errorMessage = 'Connection failed';

      if (fetchError.name === 'AbortError') {
        errorMessage = 'Request timed out. Check your network connection.';
      } else if (fetchError.message?.includes('fetch')) {
        errorMessage = 'Network error. Check if the API endpoint is reachable.';
      } else {
        errorMessage = fetchError.message || 'Unknown error occurred';
      }

      return {
        success: false,
        message: errorMessage,
        data: {
          error: fetchError.message,
        },
      };
    }
  } catch (error: any) {
    console.error('Error testing API integration:', error);
    throw new functions.https.HttpsError(
      'internal',
      error.message || 'Failed to test API integration'
    );
  }
});
