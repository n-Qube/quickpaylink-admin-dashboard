/**
 * Email Template Management Service (Super Admin)
 *
 * Manages email templates that are used globally by the system.
 * Super Admin creates and configures templates for: OTP, Invoices, Receipts, Reminders, etc.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  Timestamp,
  query,
  where,
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../lib/firebase';

// Import types from sendgrid service
import type { SendGridConfig, EmailTemplate } from './sendgrid';

/**
 * ============================================================================
 * SENDGRID CONFIGURATION MANAGEMENT
 * ============================================================================
 */

/**
 * Save SendGrid configuration (Super Admin only)
 */
export async function saveSendGridConfig(config: {
  apiKey: string;
  fromEmail: string;
  fromName: string;
  replyToEmail?: string;
  apiUrl?: string;
  isActive: boolean;
  isTestMode?: boolean;
}): Promise<void> {
  try {
    await setDoc(
      doc(db, COLLECTIONS.SYSTEM_CONFIG, 'sendgrid'),
      {
        ...config,
        apiUrl: config.apiUrl || 'https://api.sendgrid.com/v3',
        isTestMode: config.isTestMode || false,
        updatedAt: Timestamp.now(),
        createdAt: Timestamp.now(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error('Error saving SendGrid config:', error);
    throw new Error('Failed to save SendGrid configuration');
  }
}

/**
 * Update SendGrid configuration status
 */
export async function updateSendGridConfigStatus(isActive: boolean): Promise<void> {
  try {
    await updateDoc(doc(db, COLLECTIONS.SYSTEM_CONFIG, 'sendgrid'), {
      isActive,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating SendGrid config status:', error);
    throw new Error('Failed to update SendGrid configuration status');
  }
}

/**
 * Test SendGrid configuration by sending a test email
 */
export async function testSendGridConfig(testEmail: string): Promise<boolean> {
  try {
    const config = await getDoc(doc(db, COLLECTIONS.SYSTEM_CONFIG, 'sendgrid'));

    if (!config.exists()) {
      throw new Error('SendGrid configuration not found');
    }

    const data = config.data();

    // Send test email via SendGrid API
    const response = await fetch(`${data.apiUrl}/mail/send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${data.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: testEmail }],
            subject: 'Test Email from QuickLink Pay',
          },
        ],
        from: {
          email: data.fromEmail,
          name: data.fromName,
        },
        content: [
          {
            type: 'text/plain',
            value: 'This is a test email from QuickLink Pay. Configuration is working correctly!',
          },
          {
            type: 'text/html',
            value: '<p>This is a test email from <strong>QuickLink Pay</strong>.</p><p>Configuration is working correctly!</p>',
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

/**
 * ============================================================================
 * EMAIL TEMPLATE MANAGEMENT
 * ============================================================================
 */

/**
 * Create a new email template
 */
export async function createEmailTemplate(
  template: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'emailTemplates'), {
      ...template,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    return docRef.id;
  } catch (error) {
    console.error('Error creating email template:', error);
    throw new Error('Failed to create email template');
  }
}

/**
 * Update an email template
 */
export async function updateEmailTemplate(
  templateId: string,
  updates: Partial<EmailTemplate>
): Promise<void> {
  try {
    const docRef = doc(db, 'emailTemplates', templateId);

    // Remove fields that shouldn't be updated
    const updateData = { ...updates };
    delete (updateData as any).id;
    delete (updateData as any).createdAt;

    await updateDoc(docRef, {
      ...updateData,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating email template:', error);
    throw new Error('Failed to update email template');
  }
}

/**
 * Delete an email template
 */
export async function deleteEmailTemplate(templateId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'emailTemplates', templateId));
  } catch (error) {
    console.error('Error deleting email template:', error);
    throw new Error('Failed to delete email template');
  }
}

/**
 * Get all email templates
 */
export async function getAllEmailTemplates(): Promise<EmailTemplate[]> {
  try {
    const snapshot = await getDocs(collection(db, 'emailTemplates'));

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as EmailTemplate[];
  } catch (error) {
    console.error('Error getting email templates:', error);
    return [];
  }
}

/**
 * Get templates by category
 */
export async function getTemplatesByCategory(
  category: EmailTemplate['category']
): Promise<EmailTemplate[]> {
  try {
    const q = query(collection(db, 'emailTemplates'), where('category', '==', category));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as EmailTemplate[];
  } catch (error) {
    console.error('Error getting templates by category:', error);
    return [];
  }
}

/**
 * Activate/Deactivate a template
 */
export async function toggleTemplateStatus(
  templateId: string,
  isActive: boolean
): Promise<void> {
  try {
    await updateDoc(doc(db, 'emailTemplates', templateId), {
      isActive,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error toggling template status:', error);
    throw new Error('Failed to update template status');
  }
}

/**
 * ============================================================================
 * PRE-DEFINED EMAIL TEMPLATES CREATION
 * ============================================================================
 */

/**
 * Create default system email templates (run once during setup)
 */
export async function createDefaultEmailTemplates(): Promise<void> {
  const defaultTemplates: Array<Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>> = [
    // OTP Email Template
    {
      name: 'otp_email',
      subject: 'Your QuickLink Pay Verification Code',
      category: 'transactional',
      htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verification Code</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
    <h1 style="color: #2563eb; margin-bottom: 20px;">Verification Code</h1>
    <p>Hello,</p>
    <p>Your QuickLink Pay verification code is:</p>
    <div style="background-color: #fff; padding: 20px; border-radius: 5px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
      {{otp}}
    </div>
    <p>This code will expire in <strong>{{expiry_minutes}} minutes</strong>.</p>
    <p><strong>Important:</strong> Do not share this code with anyone.</p>
    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
    <p style="font-size: 12px; color: #666;">
      © {{current_year}} QuickLink Pay. All rights reserved.
    </p>
  </div>
</body>
</html>
      `,
      textContent: `Your QuickLink Pay verification code is: {{otp}}\n\nThis code will expire in {{expiry_minutes}} minutes.\n\nDo not share this code with anyone.\n\n© {{current_year}} QuickLink Pay. All rights reserved.`,
      variables: ['otp', 'expiry_minutes', 'current_year'],
      isActive: true,
    },

    // Invoice Email Template
    {
      name: 'invoice_email',
      subject: 'Invoice {{invoice_number}} from QuickLink Pay',
      category: 'transactional',
      htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
    <h1 style="color: #2563eb; margin-bottom: 20px;">New Invoice</h1>
    <p>Hello <strong>{{customer_name}}</strong>,</p>
    <p>You have received a new invoice from QuickLink Pay.</p>
    <div style="background-color: #fff; padding: 20px; border-radius: 5px; margin: 20px 0;">
      <table style="width: 100%;">
        <tr>
          <td style="padding: 10px 0;"><strong>Invoice Number:</strong></td>
          <td style="text-align: right;">{{invoice_number}}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0;"><strong>Amount Due:</strong></td>
          <td style="text-align: right; font-size: 24px; color: #2563eb;">{{amount}}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0;"><strong>Due Date:</strong></td>
          <td style="text-align: right;">{{due_date}}</td>
        </tr>
      </table>
    </div>
    <p>Please find the invoice attached to this email.</p>
    <p>Thank you for your business!</p>
    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
    <p style="font-size: 12px; color: #666;">
      © {{current_year}} QuickLink Pay. All rights reserved.
    </p>
  </div>
</body>
</html>
      `,
      textContent: `Hello {{customer_name}},\n\nYou have received a new invoice from QuickLink Pay.\n\nInvoice Number: {{invoice_number}}\nAmount Due: {{amount}}\nDue Date: {{due_date}}\n\nPlease find the invoice attached to this email.\n\nThank you for your business!\n\n© {{current_year}} QuickLink Pay. All rights reserved.`,
      variables: ['customer_name', 'invoice_number', 'amount', 'due_date', 'current_year'],
      isActive: true,
    },

    // Receipt Email Template
    {
      name: 'receipt_email',
      subject: 'Payment Receipt {{receipt_number}}',
      category: 'transactional',
      htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Receipt</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
    <h1 style="color: #10b981; margin-bottom: 20px;">✓ Payment Received</h1>
    <p>Hello <strong>{{customer_name}}</strong>,</p>
    <p>Thank you for your payment! We have successfully received your payment.</p>
    <div style="background-color: #fff; padding: 20px; border-radius: 5px; margin: 20px 0;">
      <table style="width: 100%;">
        <tr>
          <td style="padding: 10px 0;"><strong>Receipt Number:</strong></td>
          <td style="text-align: right;">{{receipt_number}}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0;"><strong>Amount Paid:</strong></td>
          <td style="text-align: right; font-size: 24px; color: #10b981;">{{amount}}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0;"><strong>Payment Method:</strong></td>
          <td style="text-align: right;">{{payment_method}}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0;"><strong>Payment Date:</strong></td>
          <td style="text-align: right;">{{payment_date}}</td>
        </tr>
      </table>
    </div>
    <p>Your receipt is attached to this email for your records.</p>
    <p>Thank you for your business!</p>
    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
    <p style="font-size: 12px; color: #666;">
      © {{current_year}} QuickLink Pay. All rights reserved.
    </p>
  </div>
</body>
</html>
      `,
      textContent: `Hello {{customer_name}},\n\nThank you for your payment! We have successfully received your payment.\n\nReceipt Number: {{receipt_number}}\nAmount Paid: {{amount}}\nPayment Method: {{payment_method}}\nPayment Date: {{payment_date}}\n\nYour receipt is attached to this email for your records.\n\nThank you for your business!\n\n© {{current_year}} QuickLink Pay. All rights reserved.`,
      variables: ['customer_name', 'receipt_number', 'amount', 'payment_method', 'payment_date', 'current_year'],
      isActive: true,
    },

    // Payment Reminder Email Template
    {
      name: 'payment_reminder_email',
      subject: 'Payment Reminder: Invoice {{invoice_number}}',
      category: 'notification',
      htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Reminder</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
    <h1 style="color: #f59e0b; margin-bottom: 20px;">⏰ Payment Reminder</h1>
    <p>Hello <strong>{{customer_name}}</strong>,</p>
    <p>This is a friendly reminder that your invoice is overdue.</p>
    <div style="background-color: #fff; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #f59e0b;">
      <table style="width: 100%;">
        <tr>
          <td style="padding: 10px 0;"><strong>Invoice Number:</strong></td>
          <td style="text-align: right;">{{invoice_number}}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0;"><strong>Amount Due:</strong></td>
          <td style="text-align: right; font-size: 24px; color: #f59e0b;">{{amount}}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0;"><strong>Days Overdue:</strong></td>
          <td style="text-align: right;">{{days_overdue}} days</td>
        </tr>
      </table>
    </div>
    <p>Please make payment at your earliest convenience to avoid any late fees.</p>
    <p>If you have already made payment, please disregard this reminder.</p>
    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
    <p style="font-size: 12px; color: #666;">
      © {{current_year}} QuickLink Pay. All rights reserved.
    </p>
  </div>
</body>
</html>
      `,
      textContent: `Hello {{customer_name}},\n\nThis is a friendly reminder that your invoice is overdue.\n\nInvoice Number: {{invoice_number}}\nAmount Due: {{amount}}\nDays Overdue: {{days_overdue}} days\n\nPlease make payment at your earliest convenience to avoid any late fees.\n\nIf you have already made payment, please disregard this reminder.\n\n© {{current_year}} QuickLink Pay. All rights reserved.`,
      variables: ['customer_name', 'invoice_number', 'amount', 'days_overdue', 'current_year'],
      isActive: true,
    },

    // Merchant Welcome Email Template
    {
      name: 'merchant_welcome_email',
      subject: 'Welcome to QuickLink Pay!',
      category: 'transactional',
      htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to QuickLink Pay</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
    <h1 style="color: #2563eb; margin-bottom: 20px;">🎉 Welcome to QuickLink Pay!</h1>
    <p>Hello <strong>{{merchant_name}}</strong>,</p>
    <p>Welcome to QuickLink Pay! Your account has been successfully created.</p>
    <div style="background-color: #fff; padding: 20px; border-radius: 5px; margin: 20px 0;">
      <p><strong>Business Name:</strong> {{business_name}}</p>
      <p>You can now start accepting payments and managing your business with our powerful tools.</p>
    </div>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{login_url}}" style="display: inline-block; background-color: #2563eb; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Open Dashboard</a>
    </div>
    <p>If you have any questions, our support team is here to help!</p>
    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
    <p style="font-size: 12px; color: #666;">
      © {{current_year}} QuickLink Pay. All rights reserved.
    </p>
  </div>
</body>
</html>
      `,
      textContent: `Hello {{merchant_name}},\n\nWelcome to QuickLink Pay! Your account has been successfully created.\n\nBusiness Name: {{business_name}}\n\nYou can now start accepting payments and managing your business with our powerful tools.\n\nLogin here: {{login_url}}\n\nIf you have any questions, our support team is here to help!\n\n© {{current_year}} QuickLink Pay. All rights reserved.`,
      variables: ['merchant_name', 'business_name', 'login_url', 'current_year'],
      isActive: true,
    },

    // Password Reset Email Template
    {
      name: 'password_reset_email',
      subject: 'Reset Your QuickLink Pay Password',
      category: 'transactional',
      htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
    <h1 style="color: #2563eb; margin-bottom: 20px;">🔐 Password Reset Request</h1>
    <p>Hello <strong>{{user_name}}</strong>,</p>
    <p>We received a request to reset your QuickLink Pay password.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{reset_link}}" style="display: inline-block; background-color: #2563eb; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
    </div>
    <p>This link will expire in 1 hour for security reasons.</p>
    <p><strong>Important:</strong> If you didn't request this password reset, please ignore this email or contact support if you have concerns.</p>
    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
    <p style="font-size: 12px; color: #666;">
      © {{current_year}} QuickLink Pay. All rights reserved.
    </p>
  </div>
</body>
</html>
      `,
      textContent: `Hello {{user_name}},\n\nWe received a request to reset your QuickLink Pay password.\n\nReset your password here: {{reset_link}}\n\nThis link will expire in 1 hour for security reasons.\n\nIf you didn't request this password reset, please ignore this email or contact support if you have concerns.\n\n© {{current_year}} QuickLink Pay. All rights reserved.`,
      variables: ['user_name', 'reset_link', 'current_year'],
      isActive: true,
    },
  ];

  try {
    for (const template of defaultTemplates) {
      await createEmailTemplate(template);
    }

    console.log('Default email templates created successfully');
  } catch (error) {
    console.error('Error creating default email templates:', error);
    throw error;
  }
}

/**
 * ============================================================================
 * EMAIL TEMPLATE VALIDATION
 * ============================================================================
 */

/**
 * Validate email template structure before saving
 */
export function validateEmailTemplate(template: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check required fields
  if (!template.name || template.name.trim() === '') {
    errors.push('Template name is required');
  }

  if (!template.subject || template.subject.trim() === '') {
    errors.push('Email subject is required');
  }

  if (!template.htmlContent || template.htmlContent.trim() === '') {
    errors.push('HTML content is required');
  }

  if (!template.textContent || template.textContent.trim() === '') {
    errors.push('Text content is required');
  }

  if (!template.category) {
    errors.push('Template category is required');
  }

  // Check variables match placeholders
  const htmlPlaceholders = (template.htmlContent.match(/\{\{(\w+)\}\}/g) || [])
    .map((p) => p.replace(/\{\{|\}\}/g, ''));
  const textPlaceholders = (template.textContent.match(/\{\{(\w+)\}\}/g) || [])
    .map((p) => p.replace(/\{\{|\}\}/g, ''));

  const allPlaceholders = [...new Set([...htmlPlaceholders, ...textPlaceholders])];

  // Check if all variables are defined
  const missingVariables = allPlaceholders.filter((p) => !template.variables.includes(p));
  if (missingVariables.length > 0) {
    errors.push(`Missing variable definitions: ${missingVariables.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * ============================================================================
 * EMAIL TEMPLATE STATISTICS
 * ============================================================================
 */

/**
 * Get email template usage statistics
 */
export async function getEmailTemplateStats(): Promise<Record<string, any>> {
  try {
    const templates = await getAllEmailTemplates();

    // Get email logs to calculate usage
    const logsSnapshot = await getDocs(collection(db, 'emailLogs'));

    const stats: Record<string, any> = {
      totalTemplates: templates.length,
      activeTemplates: templates.filter((t) => t.isActive).length,
      byCategory: {} as Record<string, number>,
      usage: {} as Record<string, number>,
    };

    // Count by category
    templates.forEach((template) => {
      stats.byCategory[template.category] = (stats.byCategory[template.category] || 0) + 1;
    });

    // Count usage
    logsSnapshot.docs.forEach((doc) => {
      const templateName = doc.data().templateName;
      if (templateName) {
        stats.usage[templateName] = (stats.usage[templateName] || 0) + 1;
      }
    });

    return stats;
  } catch (error) {
    console.error('Error getting email template stats:', error);
    return {};
  }
}
