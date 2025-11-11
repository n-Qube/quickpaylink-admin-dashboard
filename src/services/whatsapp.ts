/**
 * 360Dialog WhatsApp Service
 *
 * Global WhatsApp messaging service that uses templates configured in Super Admin.
 * Supports: OTP, Invoices, Reminders, Receipts, Interactive Templates with Payment Links.
 */

import { doc, getDoc, collection, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { db, COLLECTIONS } from '../lib/firebase';

// Types
export interface WhatsAppConfig {
  id: string;
  apiKey: string;
  phoneNumberId: string;
  apiUrl: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  category: 'OTP' | 'INVOICE' | 'REMINDER' | 'RECEIPT' | 'MARKETING' | 'GENERAL';
  templateId: string; // 360Dialog template ID
  language: string;
  status: 'pending' | 'approved' | 'rejected';
  components: TemplateComponent[];
  variables: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'VIDEO';
  text?: string;
  buttons?: TemplateButton[];
}

export interface TemplateButton {
  type: 'URL' | 'PHONE_NUMBER' | 'QUICK_REPLY';
  text: string;
  url?: string;
  phoneNumber?: string;
}

export interface SendMessageParams {
  to: string; // Phone number in international format
  templateName: string;
  variables: Record<string, string>;
  merchantId?: string;
}

export interface InteractiveInvoiceParams {
  to: string;
  invoiceNumber: string;
  customerName: string;
  amount: number;
  currency: string;
  dueDate: string;
  paymentLink: string; // Paystack payment link
  merchantId: string;
}

export interface MessageLog {
  id: string;
  merchantId?: string;
  to: string;
  templateName: string;
  category: string;
  status: 'queued' | 'sent' | 'delivered' | 'read' | 'failed';
  messageId?: string;
  error?: string;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  createdAt: Date;
}

/**
 * Get WhatsApp configuration from Super Admin settings
 */
export async function getWhatsAppConfig(): Promise<WhatsAppConfig | null> {
  try {
    const configDoc = await getDoc(doc(db, COLLECTIONS.SYSTEM_CONFIG, 'whatsapp'));

    if (!configDoc.exists()) {
      console.error('WhatsApp configuration not found');
      return null;
    }

    const data = configDoc.data();

    return {
      id: configDoc.id,
      apiKey: data.apiKey,
      phoneNumberId: data.phoneNumberId,
      apiUrl: data.apiUrl || 'https://waba.360dialog.io/v1',
      isActive: data.isActive,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
    };
  } catch (error) {
    console.error('Error getting WhatsApp config:', error);
    return null;
  }
}

/**
 * Get all WhatsApp templates from Super Admin
 */
export async function getWhatsAppTemplates(): Promise<WhatsAppTemplate[]> {
  try {
    const templatesRef = collection(db, 'whatsappTemplates');
    const snapshot = await getDocs(templatesRef);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as WhatsAppTemplate[];
  } catch (error) {
    console.error('Error getting WhatsApp templates:', error);
    return [];
  }
}

/**
 * Get a specific template by name
 */
export async function getTemplateByName(templateName: string): Promise<WhatsAppTemplate | null> {
  try {
    const templates = await getWhatsAppTemplates();
    return templates.find((t) => t.name === templateName && t.isActive) || null;
  } catch (error) {
    console.error('Error getting template:', error);
    return null;
  }
}

/**
 * Send WhatsApp message using 360Dialog API
 */
export async function sendWhatsAppMessage(params: SendMessageParams): Promise<string | null> {
  try {
    // Get WhatsApp configuration
    const config = await getWhatsAppConfig();
    if (!config || !config.isActive) {
      throw new Error('WhatsApp configuration is not active');
    }

    // Get template
    const template = await getTemplateByName(params.templateName);
    if (!template) {
      throw new Error(`Template '${params.templateName}' not found`);
    }

    // Build template parameters
    const components = buildTemplateComponents(template, params.variables);

    // Send message via 360Dialog API
    const response = await fetch(`${config.apiUrl}/messages`, {
      method: 'POST',
      headers: {
        'D360-API-KEY': config.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: params.to,
        type: 'template',
        template: {
          name: template.templateId,
          language: {
            code: template.language,
          },
          components: components,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`360Dialog API error: ${JSON.stringify(error)}`);
    }

    const result = await response.json();
    const messageId = result.messages?.[0]?.id;

    // Log the message
    await logMessage({
      merchantId: params.merchantId,
      to: params.to,
      templateName: params.templateName,
      category: template.category,
      status: 'sent',
      messageId: messageId,
    });

    return messageId;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);

    // Log failed message
    await logMessage({
      merchantId: params.merchantId,
      to: params.to,
      templateName: params.templateName,
      category: 'GENERAL',
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return null;
  }
}

/**
 * Send OTP via WhatsApp
 */
export async function sendOTP(phoneNumber: string, otp: string, merchantId?: string): Promise<boolean> {
  try {
    const messageId = await sendWhatsAppMessage({
      to: phoneNumber,
      templateName: 'merchant_otp_verification',
      variables: {
        otp: otp,
      },
      merchantId,
    });

    return messageId !== null;
  } catch (error) {
    console.error('Error sending OTP:', error);
    return false;
  }
}

/**
 * Send invoice with interactive Paystack payment button
 */
export async function sendInvoiceWithPayment(params: InteractiveInvoiceParams): Promise<boolean> {
  try {
    // Get WhatsApp configuration
    const config = await getWhatsAppConfig();
    if (!config || !config.isActive) {
      throw new Error('WhatsApp configuration is not active');
    }

    // Send interactive message with payment button
    const response = await fetch(`${config.apiUrl}/messages`, {
      method: 'POST',
      headers: {
        'D360-API-KEY': config.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: params.to,
        type: 'interactive',
        interactive: {
          type: 'button',
          header: {
            type: 'text',
            text: `Invoice ${params.invoiceNumber}`,
          },
          body: {
            text: `Hello ${params.customerName},\n\nYou have a new invoice for ${params.currency} ${params.amount.toFixed(2)}.\n\nDue Date: ${params.dueDate}\n\nClick the button below to pay securely via Paystack.`,
          },
          footer: {
            text: 'Powered by QuickLink Pay',
          },
          action: {
            buttons: [
              {
                type: 'reply',
                reply: {
                  id: 'view_invoice',
                  title: 'View Invoice',
                },
              },
              {
                type: 'reply',
                reply: {
                  id: 'pay_now',
                  title: 'Pay Now',
                },
              },
            ],
          },
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`360Dialog API error: ${JSON.stringify(error)}`);
    }

    const result = await response.json();
    const messageId = result.messages?.[0]?.id;

    // Log the message
    await logMessage({
      merchantId: params.merchantId,
      to: params.to,
      templateName: 'invoice_with_payment',
      category: 'INVOICE',
      status: 'sent',
      messageId: messageId,
    });

    return true;
  } catch (error) {
    console.error('Error sending invoice with payment:', error);
    return false;
  }
}

/**
 * Send invoice template message
 */
export async function sendInvoice(
  to: string,
  invoiceNumber: string,
  customerName: string,
  amount: number,
  currency: string,
  dueDate: string,
  merchantId: string
): Promise<boolean> {
  try {
    const messageId = await sendWhatsAppMessage({
      to,
      templateName: 'invoice_notification',
      variables: {
        customer_name: customerName,
        invoice_number: invoiceNumber,
        amount: `${currency} ${amount.toFixed(2)}`,
        due_date: dueDate,
      },
      merchantId,
    });

    return messageId !== null;
  } catch (error) {
    console.error('Error sending invoice:', error);
    return false;
  }
}

/**
 * Send payment reminder
 */
export async function sendPaymentReminder(
  to: string,
  customerName: string,
  invoiceNumber: string,
  amount: number,
  currency: string,
  daysOverdue: number,
  merchantId: string
): Promise<boolean> {
  try {
    const messageId = await sendWhatsAppMessage({
      to,
      templateName: 'payment_reminder',
      variables: {
        customer_name: customerName,
        invoice_number: invoiceNumber,
        amount: `${currency} ${amount.toFixed(2)}`,
        days_overdue: daysOverdue.toString(),
      },
      merchantId,
    });

    return messageId !== null;
  } catch (error) {
    console.error('Error sending payment reminder:', error);
    return false;
  }
}

/**
 * Send payment receipt
 */
export async function sendPaymentReceipt(
  to: string,
  customerName: string,
  receiptNumber: string,
  amount: number,
  currency: string,
  paymentMethod: string,
  merchantId: string
): Promise<boolean> {
  try {
    const messageId = await sendWhatsAppMessage({
      to,
      templateName: 'payment_receipt',
      variables: {
        customer_name: customerName,
        receipt_number: receiptNumber,
        amount: `${currency} ${amount.toFixed(2)}`,
        payment_method: paymentMethod,
        date: new Date().toLocaleDateString(),
      },
      merchantId,
    });

    return messageId !== null;
  } catch (error) {
    console.error('Error sending payment receipt:', error);
    return false;
  }
}

/**
 * Build template components with variables
 */
function buildTemplateComponents(
  template: WhatsAppTemplate,
  variables: Record<string, string>
): any[] {
  const components: any[] = [];

  template.components.forEach((component) => {
    if (component.type === 'BODY' && template.variables.length > 0) {
      // Build parameters for body component
      const parameters = template.variables.map((varName) => ({
        type: 'text',
        text: variables[varName] || '',
      }));

      components.push({
        type: 'body',
        parameters,
      });
    } else if (component.type === 'BUTTONS' && component.buttons) {
      // Handle button components
      component.buttons.forEach((button, index) => {
        if (button.type === 'URL' && button.url) {
          components.push({
            type: 'button',
            sub_type: 'url',
            index: index,
            parameters: [
              {
                type: 'text',
                text: variables[`button_${index}`] || '',
              },
            ],
          });
        }
      });
    }
  });

  return components;
}

/**
 * Log message to database
 */
async function logMessage(data: Partial<MessageLog>): Promise<void> {
  try {
    await addDoc(collection(db, 'whatsappMessages'), {
      ...data,
      createdAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error logging message:', error);
  }
}

/**
 * Get message logs for a merchant
 */
export async function getMessageLogs(merchantId: string, limit: number = 50): Promise<MessageLog[]> {
  try {
    // In production, add query constraints for filtering
    const snapshot = await getDocs(collection(db, 'whatsappMessages'));

    const logs = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
        sentAt: doc.data().sentAt?.toDate(),
        deliveredAt: doc.data().deliveredAt?.toDate(),
        readAt: doc.data().readAt?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
      }))
      .filter((log) => log.merchantId === merchantId)
      .slice(0, limit) as MessageLog[];

    return logs;
  } catch (error) {
    console.error('Error getting message logs:', error);
    return [];
  }
}

/**
 * Handle 360Dialog webhook for message status updates
 */
export async function handleWhatsAppWebhook(payload: any): Promise<void> {
  try {
    // Process status updates from 360Dialog
    const entry = payload.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (value?.statuses) {
      // Update message status in database
      for (const status of value.statuses) {
        const messageId = status.id;
        const statusValue = status.status; // sent, delivered, read, failed

        // Update message log status
        // In production, implement update logic here
        console.log(`Message ${messageId} status: ${statusValue}`);
      }
    }
  } catch (error) {
    console.error('Error handling WhatsApp webhook:', error);
  }
}
