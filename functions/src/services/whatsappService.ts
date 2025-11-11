/**
 * WhatsApp Service for Cloud Functions
 *
 * Integrates with 360Dialog API to send WhatsApp messages
 * Used for OTP verification, notifications, and business messages
 */

import * as admin from 'firebase-admin';
import fetch from 'node-fetch';

const getDb = () => admin.firestore();

/**
 * WhatsApp Configuration from Firestore
 */
interface WhatsAppConfig {
  apiKey: string;
  phoneNumberId: string;
  apiUrl: string;
  isActive: boolean;
}

/**
 * WhatsApp Template structure
 */
interface WhatsAppTemplate {
  name: string;
  templateId: string;
  language: string;
  category: string;
  components: any[];
  variables: string[];
  isActive: boolean;
}

/**
 * Get WhatsApp configuration from Firestore
 */
export async function getWhatsAppConfig(): Promise<WhatsAppConfig | null> {
  try {
    const configDoc = await getDb().collection('systemConfig').doc('whatsapp').get();

    if (!configDoc.exists) {
      console.error('⚠️  WhatsApp config not found in Firestore');
      return null;
    }

    const data = configDoc.data();

    if (!data?.isActive) {
      console.error('⚠️  WhatsApp integration is not active');
      return null;
    }

    return {
      apiKey: data.apiKey,
      phoneNumberId: data.phoneNumberId,
      apiUrl: data.apiUrl || 'https://waba.360dialog.io/v1',
      isActive: data.isActive,
    };
  } catch (error) {
    console.error('❌ Error fetching WhatsApp config:', error);
    return null;
  }
}

/**
 * Get WhatsApp template by category
 */
export async function getTemplateByCategory(
  category: string
): Promise<WhatsAppTemplate | null> {
  try {
    const templatesQuery = await getDb()
      .collection('whatsappTemplates')
      .where('category', '==', category)
      .where('isActive', '==', true)
      .where('status', '==', 'approved')
      .limit(1)
      .get();

    if (templatesQuery.empty) {
      console.error(`⚠️  No active template found for category: ${category}`);
      return null;
    }

    const templateDoc = templatesQuery.docs[0];
    const data = templateDoc.data();

    return {
      name: data.name,
      templateId: data.templateId,
      language: data.language || 'en',
      category: data.category,
      components: data.components || [],
      variables: data.variables || [],
      isActive: data.isActive,
    };
  } catch (error) {
    console.error('❌ Error fetching WhatsApp template:', error);
    return null;
  }
}

/**
 * Send WhatsApp message via 360Dialog API
 */
async function send360DialogMessage(
  config: WhatsAppConfig,
  to: string,
  template: WhatsAppTemplate,
  variables: Record<string, string>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Prepare template parameters
    const components = template.components.map((component) => {
      if (component.type === 'BODY') {
        // Replace template variables with actual values
        const parameters = template.variables.map((varName) => ({
          type: 'text',
          text: variables[varName] || '',
        }));

        return {
          type: 'body',
          parameters,
        };
      }
      return component;
    });

    // 360Dialog API request body
    const requestBody = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to.replace(/\+/g, ''), // Remove + prefix
      type: 'template',
      template: {
        name: template.templateId,
        language: {
          code: template.language,
        },
        components,
      },
    };

    // Send via 360Dialog API
    const response = await fetch(`${config.apiUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'D360-API-KEY': config.apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(
        `360Dialog API error: ${responseData.error?.message || 'Unknown error'}`
      );
    }

    return {
      success: true,
      messageId: responseData.messages?.[0]?.id,
    };
  } catch (error: any) {
    console.error('❌ Error sending WhatsApp message:', error);
    return {
      success: false,
      error: error.message || 'Failed to send WhatsApp message',
    };
  }
}

/**
 * Send OTP via WhatsApp
 *
 * @param phoneNumber - Recipient phone number (international format)
 * @param otp - 6-digit OTP code
 * @returns Success status and message ID
 */
export async function sendWhatsAppOTP(
  phoneNumber: string,
  otp: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Get WhatsApp configuration
    const config = await getWhatsAppConfig();
    if (!config) {
      return {
        success: false,
        error: 'WhatsApp is not configured. Please contact support.',
      };
    }

    // Get OTP template
    const template = await getTemplateByCategory('OTP');
    if (!template) {
      return {
        success: false,
        error: 'OTP template not found. Please contact support.',
      };
    }

    // Send message
    const result = await send360DialogMessage(config, phoneNumber, template, {
      otp_code: otp,
      expiry_minutes: '5',
    });

    // Log message to Firestore
    await getDb().collection('whatsappMessages').add({
      to: phoneNumber,
      templateName: template.name,
      category: 'OTP',
      status: result.success ? 'sent' : 'failed',
      messageId: result.messageId || null,
      error: result.error || null,
      variables: { otp_code: otp, expiry_minutes: '5' },
      sentAt: result.success ? admin.firestore.Timestamp.now() : null,
      createdAt: admin.firestore.Timestamp.now(),
    });

    return result;
  } catch (error: any) {
    console.error('❌ Error in sendWhatsAppOTP:', error);
    return {
      success: false,
      error: error.message || 'Failed to send OTP via WhatsApp',
    };
  }
}

/**
 * Send business verification message via WhatsApp
 *
 * Used when merchant completes business setup
 */
export async function sendBusinessVerificationMessage(
  phoneNumber: string,
  businessName: string,
  merchantId: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const config = await getWhatsAppConfig();
    if (!config) {
      return { success: false, error: 'WhatsApp not configured' };
    }

    const template = await getTemplateByCategory('GENERAL');
    if (!template) {
      return { success: false, error: 'Template not found' };
    }

    const result = await send360DialogMessage(config, phoneNumber, template, {
      business_name: businessName,
      message: 'Your business profile has been submitted for verification. We will notify you once approved.',
    });

    // Log to Firestore
    await getDb().collection('whatsappMessages').add({
      merchantId,
      to: phoneNumber,
      templateName: template.name,
      category: 'GENERAL',
      status: result.success ? 'sent' : 'failed',
      messageId: result.messageId || null,
      error: result.error || null,
      sentAt: result.success ? admin.firestore.Timestamp.now() : null,
      createdAt: admin.firestore.Timestamp.now(),
    });

    return result;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Send WhatsApp Business connection success message
 */
export async function sendWhatsAppBusinessConnectedMessage(
  phoneNumber: string,
  businessName: string,
  merchantId: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const config = await getWhatsAppConfig();
    if (!config) {
      return { success: false, error: 'WhatsApp not configured' };
    }

    const template = await getTemplateByCategory('GENERAL');
    if (!template) {
      return { success: false, error: 'Template not found' };
    }

    const result = await send360DialogMessage(config, phoneNumber, template, {
      business_name: businessName,
      message: 'Your WhatsApp Business account has been successfully connected! You can now receive notifications and send invoices via WhatsApp.',
    });

    // Log to Firestore
    await getDb().collection('whatsappMessages').add({
      merchantId,
      to: phoneNumber,
      templateName: template.name,
      category: 'GENERAL',
      status: result.success ? 'sent' : 'failed',
      messageId: result.messageId || null,
      error: result.error || null,
      sentAt: result.success ? admin.firestore.Timestamp.now() : null,
      createdAt: admin.firestore.Timestamp.now(),
    });

    return result;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
