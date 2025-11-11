/**
 * SendGrid Email Service
 *
 * Handles email sending via SendGrid for invoices, receipts, notifications, and marketing.
 * Used globally by the system for email communications.
 */

import { doc, getDoc, collection, addDoc, Timestamp } from 'firebase/firestore';
import { db, COLLECTIONS } from '../lib/firebase';

// Types
export interface SendGridConfig {
  id: string;
  apiKey: string;
  fromEmail: string;
  fromName: string;
  replyToEmail?: string;
  apiUrl: string;
  isActive: boolean;
  isTestMode: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  category: 'transactional' | 'marketing' | 'notification';
  variables: string[];
  sendgridTemplateId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SendEmailParams {
  to: string | string[];
  templateName: string;
  subject: string;
  variables: Record<string, string>;
  attachments?: EmailAttachment[];
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  merchantId?: string;
}

export interface EmailAttachment {
  content: string; // Base64 encoded
  filename: string;
  type: string; // MIME type
  disposition?: 'attachment' | 'inline';
}

export interface EmailLog {
  id: string;
  merchantId?: string;
  to: string[];
  from: string;
  subject: string;
  templateName: string;
  status: 'queued' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed';
  messageId?: string;
  error?: string;
  sentAt?: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  createdAt: Date;
}

/**
 * Get SendGrid configuration from Super Admin settings
 */
export async function getSendGridConfig(): Promise<SendGridConfig | null> {
  try {
    const configDoc = await getDoc(doc(db, COLLECTIONS.SYSTEM_CONFIG, 'sendgrid'));

    if (!configDoc.exists()) {
      console.error('SendGrid configuration not found');
      return null;
    }

    const data = configDoc.data();

    return {
      id: configDoc.id,
      apiKey: data.apiKey,
      fromEmail: data.fromEmail,
      fromName: data.fromName,
      replyToEmail: data.replyToEmail,
      apiUrl: data.apiUrl || 'https://api.sendgrid.com/v3',
      isActive: data.isActive,
      isTestMode: data.isTestMode || false,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
    };
  } catch (error) {
    console.error('Error getting SendGrid config:', error);
    return null;
  }
}

/**
 * Get email template by name
 */
export async function getEmailTemplateByName(templateName: string): Promise<EmailTemplate | null> {
  try {
    const templatesSnapshot = await getDoc(doc(db, 'emailTemplates', templateName));

    if (!templatesSnapshot.exists()) {
      console.error(`Email template '${templateName}' not found`);
      return null;
    }

    const data = templatesSnapshot.data();
    return {
      id: templatesSnapshot.id,
      ...data,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
    } as EmailTemplate;
  } catch (error) {
    console.error('Error getting email template:', error);
    return null;
  }
}

/**
 * Replace variables in email template
 */
function replaceVariables(template: string, variables: Record<string, string>): string {
  let result = template;

  // Replace {{variable}} patterns
  Object.keys(variables).forEach((key) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, variables[key] || '');
  });

  return result;
}

/**
 * Send email via SendGrid
 */
export async function sendEmail(params: SendEmailParams): Promise<string | null> {
  try {
    // Get SendGrid configuration
    const config = await getSendGridConfig();
    if (!config || !config.isActive) {
      throw new Error('SendGrid configuration is not active');
    }

    // Get email template
    const template = await getEmailTemplateByName(params.templateName);
    if (!template || !template.isActive) {
      throw new Error(`Email template '${params.templateName}' not found or inactive`);
    }

    // Replace variables in template
    const htmlContent = replaceVariables(template.htmlContent, params.variables);
    const textContent = replaceVariables(template.textContent, params.variables);
    const subject = params.subject || replaceVariables(template.subject, params.variables);

    // Prepare recipients
    const toEmails = Array.isArray(params.to) ? params.to : [params.to];

    // Build SendGrid request
    const personalizations = toEmails.map((email) => ({
      to: [{ email }],
      subject,
      ...(params.cc && { cc: params.cc.map((email) => ({ email })) }),
      ...(params.bcc && { bcc: params.bcc.map((email) => ({ email })) }),
    }));

    const requestBody: any = {
      personalizations,
      from: {
        email: config.fromEmail,
        name: config.fromName,
      },
      content: [
        {
          type: 'text/plain',
          value: textContent,
        },
        {
          type: 'text/html',
          value: htmlContent,
        },
      ],
      ...(params.replyTo && { reply_to: { email: params.replyTo } }),
      ...(config.replyToEmail && !params.replyTo && { reply_to: { email: config.replyToEmail } }),
    };

    // Add attachments if provided
    if (params.attachments && params.attachments.length > 0) {
      requestBody.attachments = params.attachments.map((att) => ({
        content: att.content,
        filename: att.filename,
        type: att.type,
        disposition: att.disposition || 'attachment',
      }));
    }

    // Send via SendGrid API
    const response = await fetch(`${config.apiUrl}/mail/send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`SendGrid API error: ${JSON.stringify(error)}`);
    }

    // Get message ID from response headers
    const messageId = response.headers.get('X-Message-Id') || `msg_${Date.now()}`;

    // Log the email
    await logEmail({
      merchantId: params.merchantId,
      to: toEmails,
      from: config.fromEmail,
      subject,
      templateName: params.templateName,
      status: 'sent',
      messageId,
    });

    return messageId;
  } catch (error) {
    console.error('Error sending email:', error);

    // Log failed email
    await logEmail({
      merchantId: params.merchantId,
      to: Array.isArray(params.to) ? params.to : [params.to],
      from: 'unknown',
      subject: params.subject,
      templateName: params.templateName,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return null;
  }
}

/**
 * Send invoice email
 */
export async function sendInvoiceEmail(
  to: string,
  invoiceNumber: string,
  customerName: string,
  amount: number,
  currency: string,
  dueDate: string,
  pdfAttachment?: EmailAttachment,
  merchantId?: string
): Promise<boolean> {
  try {
    const messageId = await sendEmail({
      to,
      templateName: 'invoice_email',
      subject: `Invoice ${invoiceNumber} from QuickLink Pay`,
      variables: {
        customer_name: customerName,
        invoice_number: invoiceNumber,
        amount: `${currency} ${amount.toFixed(2)}`,
        due_date: dueDate,
        current_year: new Date().getFullYear().toString(),
      },
      attachments: pdfAttachment ? [pdfAttachment] : undefined,
      merchantId,
    });

    return messageId !== null;
  } catch (error) {
    console.error('Error sending invoice email:', error);
    return false;
  }
}

/**
 * Send payment receipt email
 */
export async function sendReceiptEmail(
  to: string,
  customerName: string,
  receiptNumber: string,
  amount: number,
  currency: string,
  paymentMethod: string,
  pdfAttachment?: EmailAttachment,
  merchantId?: string
): Promise<boolean> {
  try {
    const messageId = await sendEmail({
      to,
      templateName: 'receipt_email',
      subject: `Payment Receipt ${receiptNumber}`,
      variables: {
        customer_name: customerName,
        receipt_number: receiptNumber,
        amount: `${currency} ${amount.toFixed(2)}`,
        payment_method: paymentMethod,
        payment_date: new Date().toLocaleDateString(),
        current_year: new Date().getFullYear().toString(),
      },
      attachments: pdfAttachment ? [pdfAttachment] : undefined,
      merchantId,
    });

    return messageId !== null;
  } catch (error) {
    console.error('Error sending receipt email:', error);
    return false;
  }
}

/**
 * Send payment reminder email
 */
export async function sendPaymentReminderEmail(
  to: string,
  customerName: string,
  invoiceNumber: string,
  amount: number,
  currency: string,
  daysOverdue: number,
  merchantId?: string
): Promise<boolean> {
  try {
    const messageId = await sendEmail({
      to,
      templateName: 'payment_reminder_email',
      subject: `Payment Reminder: Invoice ${invoiceNumber} is overdue`,
      variables: {
        customer_name: customerName,
        invoice_number: invoiceNumber,
        amount: `${currency} ${amount.toFixed(2)}`,
        days_overdue: daysOverdue.toString(),
        current_year: new Date().getFullYear().toString(),
      },
      merchantId,
    });

    return messageId !== null;
  } catch (error) {
    console.error('Error sending payment reminder email:', error);
    return false;
  }
}

/**
 * Send welcome email
 */
export async function sendWelcomeEmail(
  to: string,
  merchantName: string,
  businessName: string,
  loginUrl: string
): Promise<boolean> {
  try {
    const messageId = await sendEmail({
      to,
      templateName: 'merchant_welcome_email',
      subject: 'Welcome to QuickLink Pay!',
      variables: {
        merchant_name: merchantName,
        business_name: businessName,
        login_url: loginUrl,
        current_year: new Date().getFullYear().toString(),
      },
    });

    return messageId !== null;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return false;
  }
}

/**
 * Send OTP email
 */
export async function sendOTPEmail(
  to: string,
  otp: string,
  expiryMinutes: number = 5,
  merchantId?: string
): Promise<boolean> {
  try {
    const messageId = await sendEmail({
      to,
      templateName: 'otp_email',
      subject: 'Your QuickLink Pay Verification Code',
      variables: {
        otp,
        expiry_minutes: expiryMinutes.toString(),
        current_year: new Date().getFullYear().toString(),
      },
      merchantId,
    });

    return messageId !== null;
  } catch (error) {
    console.error('Error sending OTP email:', error);
    return false;
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  to: string,
  resetLink: string,
  userName: string
): Promise<boolean> {
  try {
    const messageId = await sendEmail({
      to,
      templateName: 'password_reset_email',
      subject: 'Reset Your QuickLink Pay Password',
      variables: {
        user_name: userName,
        reset_link: resetLink,
        current_year: new Date().getFullYear().toString(),
      },
    });

    return messageId !== null;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return false;
  }
}

/**
 * Log email to database
 */
async function logEmail(data: Partial<EmailLog>): Promise<void> {
  try {
    await addDoc(collection(db, 'emailLogs'), {
      ...data,
      createdAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error logging email:', error);
  }
}

/**
 * Get email logs for a merchant
 */
export async function getEmailLogs(merchantId: string, limit: number = 50): Promise<EmailLog[]> {
  try {
    // In production, add query constraints for filtering
    const snapshot = await getDoc(doc(db, 'emailLogs', merchantId));

    if (!snapshot.exists()) {
      return [];
    }

    // This is a simplified version; in production, use proper queries
    return [];
  } catch (error) {
    console.error('Error getting email logs:', error);
    return [];
  }
}

/**
 * Handle SendGrid webhook for email events
 */
export async function handleSendGridWebhook(events: any[]): Promise<void> {
  try {
    for (const event of events) {
      const eventType = event.event;
      const messageId = event.sg_message_id;

      switch (eventType) {
        case 'delivered':
          // Update email log status to delivered
          console.log(`Email ${messageId} delivered`);
          break;

        case 'open':
          // Update email log status to opened
          console.log(`Email ${messageId} opened`);
          break;

        case 'click':
          // Update email log status to clicked
          console.log(`Email ${messageId} clicked`);
          break;

        case 'bounce':
        case 'dropped':
          // Update email log status to bounced
          console.log(`Email ${messageId} bounced/dropped`);
          break;

        case 'spam_report':
          // Handle spam report
          console.log(`Email ${messageId} marked as spam`);
          break;

        default:
          console.log(`Unhandled email event: ${eventType}`);
      }
    }
  } catch (error) {
    console.error('Error handling SendGrid webhook:', error);
  }
}

/**
 * Test SendGrid configuration
 */
export async function testSendGridConfig(testEmail: string): Promise<boolean> {
  try {
    const config = await getSendGridConfig();
    if (!config) {
      return false;
    }

    // Send test email
    const response = await fetch(`${config.apiUrl}/mail/send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: testEmail }],
            subject: 'SendGrid Test Email - QuickLink Pay',
          },
        ],
        from: {
          email: config.fromEmail,
          name: config.fromName,
        },
        content: [
          {
            type: 'text/plain',
            value: 'This is a test email from QuickLink Pay. Your SendGrid configuration is working correctly!',
          },
          {
            type: 'text/html',
            value: '<p>This is a test email from <strong>QuickLink Pay</strong>.</p><p>Your SendGrid configuration is working correctly!</p>',
          },
        ],
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Error testing SendGrid config:', error);
    return false;
  }
}
