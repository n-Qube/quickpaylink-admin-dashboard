/**
 * Paystack Integration Service
 *
 * Handles Paystack payment link generation for invoices and payments.
 * Used globally by the system for payment processing.
 */

import { doc, getDoc, collection, addDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db, COLLECTIONS } from '../lib/firebase';

// Types
export interface PaystackConfig {
  id: string;
  secretKey: string;
  publicKey: string;
  apiUrl: string;
  isActive: boolean;
  isTestMode: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentLinkParams {
  amount: number;
  currency: string;
  customerEmail: string;
  customerName: string;
  reference: string; // Invoice number or transaction reference
  description: string;
  callbackUrl?: string;
  metadata?: Record<string, any>;
}

export interface PaymentLink {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  customerEmail: string;
  link: string;
  accessCode: string;
  status: 'pending' | 'success' | 'failed' | 'expired';
  createdAt: Date;
  expiresAt: Date;
}

export interface PaymentVerification {
  reference: string;
  amount: number;
  currency: string;
  status: 'success' | 'failed' | 'pending';
  paidAt?: Date;
  channel: string;
  customerEmail: string;
  customerName: string;
}

/**
 * Get Paystack configuration from Super Admin settings
 */
export async function getPaystackConfig(): Promise<PaystackConfig | null> {
  try {
    const configDoc = await getDoc(doc(db, COLLECTIONS.SYSTEM_CONFIG, 'paystack'));

    if (!configDoc.exists()) {
      console.error('Paystack configuration not found');
      return null;
    }

    const data = configDoc.data();

    return {
      id: configDoc.id,
      secretKey: data.secretKey,
      publicKey: data.publicKey,
      apiUrl: data.apiUrl || 'https://api.paystack.co',
      isActive: data.isActive,
      isTestMode: data.isTestMode || false,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
    };
  } catch (error) {
    console.error('Error getting Paystack config:', error);
    return null;
  }
}

/**
 * Generate payment link for invoice
 */
export async function generatePaymentLink(params: PaymentLinkParams): Promise<PaymentLink | null> {
  try {
    // Get Paystack configuration
    const config = await getPaystackConfig();
    if (!config || !config.isActive) {
      throw new Error('Paystack configuration is not active');
    }

    // Convert amount to kobo (Paystack requires amount in smallest currency unit)
    const amountInKobo = Math.round(params.amount * 100);

    // Initialize Paystack transaction
    const response = await fetch(`${config.apiUrl}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: params.customerEmail,
        amount: amountInKobo,
        currency: params.currency,
        reference: params.reference,
        callback_url: params.callbackUrl || 'https://quickpaylink.com/payment/callback',
        metadata: {
          customer_name: params.customerName,
          description: params.description,
          ...params.metadata,
        },
        channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Paystack API error: ${error.message || JSON.stringify(error)}`);
    }

    const result = await response.json();

    if (!result.status || !result.data) {
      throw new Error('Invalid response from Paystack');
    }

    const paymentLink: PaymentLink = {
      id: result.data.reference,
      reference: params.reference,
      amount: params.amount,
      currency: params.currency,
      customerEmail: params.customerEmail,
      link: result.data.authorization_url,
      accessCode: result.data.access_code,
      status: 'pending',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    };

    // Save payment link to database
    await addDoc(collection(db, 'paymentLinks'), {
      ...paymentLink,
      createdAt: Timestamp.now(),
      expiresAt: Timestamp.fromDate(paymentLink.expiresAt),
    });

    return paymentLink;
  } catch (error) {
    console.error('Error generating payment link:', error);
    return null;
  }
}

/**
 * Generate payment link specifically for invoice
 */
export async function generateInvoicePaymentLink(
  invoiceNumber: string,
  amount: number,
  currency: string,
  customerEmail: string,
  customerName: string,
  merchantId: string
): Promise<PaymentLink | null> {
  try {
    const paymentLink = await generatePaymentLink({
      amount,
      currency,
      customerEmail,
      customerName,
      reference: `INV-${invoiceNumber}-${Date.now()}`,
      description: `Payment for Invoice ${invoiceNumber}`,
      callbackUrl: `https://quickpaylink.com/payment/callback?merchant=${merchantId}`,
      metadata: {
        invoice_number: invoiceNumber,
        merchant_id: merchantId,
        payment_type: 'invoice',
      },
    });

    return paymentLink;
  } catch (error) {
    console.error('Error generating invoice payment link:', error);
    return null;
  }
}

/**
 * Verify payment status
 */
export async function verifyPayment(reference: string): Promise<PaymentVerification | null> {
  try {
    // Get Paystack configuration
    const config = await getPaystackConfig();
    if (!config || !config.isActive) {
      throw new Error('Paystack configuration is not active');
    }

    // Verify transaction with Paystack
    const response = await fetch(`${config.apiUrl}/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${config.secretKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Paystack verification error: ${error.message || JSON.stringify(error)}`);
    }

    const result = await response.json();

    if (!result.status || !result.data) {
      throw new Error('Invalid verification response from Paystack');
    }

    const data = result.data;

    const verification: PaymentVerification = {
      reference: data.reference,
      amount: data.amount / 100, // Convert from kobo to main currency
      currency: data.currency,
      status: data.status === 'success' ? 'success' : data.status === 'failed' ? 'failed' : 'pending',
      paidAt: data.paid_at ? new Date(data.paid_at) : undefined,
      channel: data.channel,
      customerEmail: data.customer.email,
      customerName: data.customer.first_name + ' ' + data.customer.last_name,
    };

    return verification;
  } catch (error) {
    console.error('Error verifying payment:', error);
    return null;
  }
}

/**
 * Handle Paystack webhook
 */
export async function handlePaystackWebhook(payload: any): Promise<void> {
  try {
    const event = payload.event;
    const data = payload.data;

    switch (event) {
      case 'charge.success':
        // Payment was successful
        await handleSuccessfulPayment(data);
        break;

      case 'charge.failed':
        // Payment failed
        await handleFailedPayment(data);
        break;

      case 'transfer.success':
        // Payout was successful
        await handleSuccessfulPayout(data);
        break;

      case 'transfer.failed':
        // Payout failed
        await handleFailedPayout(data);
        break;

      default:
        console.log(`Unhandled webhook event: ${event}`);
    }
  } catch (error) {
    console.error('Error handling Paystack webhook:', error);
  }
}

/**
 * Handle successful payment
 */
async function handleSuccessfulPayment(data: any): Promise<void> {
  try {
    const reference = data.reference;
    const metadata = data.metadata;

    // Update payment link status
    // In production, query and update the payment link document

    // If this is an invoice payment, update the invoice status
    if (metadata?.invoice_number) {
      // Update invoice to paid status
      // This would be handled by the merchant app service
      console.log(`Invoice ${metadata.invoice_number} paid successfully`);
    }

    // Log the successful payment
    await addDoc(collection(db, 'payments'), {
      reference: reference,
      amount: data.amount / 100,
      currency: data.currency,
      customerEmail: data.customer.email,
      status: 'success',
      channel: data.channel,
      paidAt: Timestamp.fromDate(new Date(data.paid_at)),
      metadata: metadata,
      createdAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error handling successful payment:', error);
  }
}

/**
 * Handle failed payment
 */
async function handleFailedPayment(data: any): Promise<void> {
  try {
    const reference = data.reference;

    // Log the failed payment
    await addDoc(collection(db, 'payments'), {
      reference: reference,
      amount: data.amount / 100,
      currency: data.currency,
      customerEmail: data.customer.email,
      status: 'failed',
      failureReason: data.gateway_response,
      metadata: data.metadata,
      createdAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error handling failed payment:', error);
  }
}

/**
 * Handle successful payout
 */
async function handleSuccessfulPayout(data: any): Promise<void> {
  try {
    console.log('Payout successful:', data);
    // Update payout status in database
    // This would be handled by the payout service
  } catch (error) {
    console.error('Error handling successful payout:', error);
  }
}

/**
 * Handle failed payout
 */
async function handleFailedPayout(data: any): Promise<void> {
  try {
    console.log('Payout failed:', data);
    // Update payout status in database
    // This would be handled by the payout service
  } catch (error) {
    console.error('Error handling failed payout:', error);
  }
}

/**
 * Get payment link by reference
 */
export async function getPaymentLinkByReference(reference: string): Promise<PaymentLink | null> {
  try {
    // In production, implement query to find payment link by reference
    // For now, return null
    return null;
  } catch (error) {
    console.error('Error getting payment link:', error);
    return null;
  }
}

/**
 * Test Paystack configuration
 */
export async function testPaystackConfig(): Promise<boolean> {
  try {
    const config = await getPaystackConfig();
    if (!config) {
      return false;
    }

    // Test API key by fetching banks list
    const response = await fetch(`${config.apiUrl}/bank`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${config.secretKey}`,
        'Content-Type': 'application/json',
      },
    });

    return response.ok;
  } catch (error) {
    console.error('Error testing Paystack config:', error);
    return false;
  }
}
