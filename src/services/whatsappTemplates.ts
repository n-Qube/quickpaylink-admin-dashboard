/**
 * WhatsApp Template Management Service (Super Admin)
 *
 * Manages WhatsApp message templates that are used globally by the system.
 * Super Admin creates and configures templates for: OTP, Invoices, Reminders, Receipts, etc.
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

// Import types from whatsapp service
import type { WhatsAppConfig, WhatsAppTemplate, TemplateComponent } from './whatsapp';

/**
 * ============================================================================
 * WHATSAPP CONFIGURATION MANAGEMENT
 * ============================================================================
 */

/**
 * Save WhatsApp 360Dialog configuration (Super Admin only)
 */
export async function saveWhatsAppConfig(config: {
  apiKey: string;
  phoneNumberId: string;
  apiUrl?: string;
  isActive: boolean;
}): Promise<void> {
  try {
    await setDoc(
      doc(db, COLLECTIONS.SYSTEM_CONFIG, 'whatsapp'),
      {
        ...config,
        apiUrl: config.apiUrl || 'https://waba.360dialog.io/v1',
        updatedAt: Timestamp.now(),
        createdAt: Timestamp.now(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error('Error saving WhatsApp config:', error);
    throw new Error('Failed to save WhatsApp configuration');
  }
}

/**
 * Update WhatsApp configuration status
 */
export async function updateWhatsAppConfigStatus(isActive: boolean): Promise<void> {
  try {
    await updateDoc(doc(db, COLLECTIONS.SYSTEM_CONFIG, 'whatsapp'), {
      isActive,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating WhatsApp config status:', error);
    throw new Error('Failed to update WhatsApp configuration status');
  }
}

/**
 * Test WhatsApp configuration by sending a test message
 */
export async function testWhatsAppConfig(testPhoneNumber: string): Promise<boolean> {
  try {
    const config = await getDoc(doc(db, COLLECTIONS.SYSTEM_CONFIG, 'whatsapp'));

    if (!config.exists()) {
      throw new Error('WhatsApp configuration not found');
    }

    const data = config.data();

    // Send test message via 360Dialog API
    const response = await fetch(`${data.apiUrl}/messages`, {
      method: 'POST',
      headers: {
        'D360-API-KEY': data.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: testPhoneNumber,
        type: 'text',
        text: {
          body: 'This is a test message from QuickLink Pay. Configuration is working correctly!',
        },
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Error testing WhatsApp config:', error);
    return false;
  }
}

/**
 * ============================================================================
 * TEMPLATE MANAGEMENT
 * ============================================================================
 */

/**
 * Create a new WhatsApp template
 */
export async function createWhatsAppTemplate(
  template: Omit<WhatsAppTemplate, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'whatsappTemplates'), {
      ...template,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    return docRef.id;
  } catch (error) {
    console.error('Error creating WhatsApp template:', error);
    throw new Error('Failed to create WhatsApp template');
  }
}

/**
 * Update a WhatsApp template
 */
export async function updateWhatsAppTemplate(
  templateId: string,
  updates: Partial<WhatsAppTemplate>
): Promise<void> {
  try {
    const docRef = doc(db, 'whatsappTemplates', templateId);

    // Remove fields that shouldn't be updated
    const updateData = { ...updates };
    delete (updateData as any).id;
    delete (updateData as any).createdAt;

    await updateDoc(docRef, {
      ...updateData,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating WhatsApp template:', error);
    throw new Error('Failed to update WhatsApp template');
  }
}

/**
 * Delete a WhatsApp template
 */
export async function deleteWhatsAppTemplate(templateId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'whatsappTemplates', templateId));
  } catch (error) {
    console.error('Error deleting WhatsApp template:', error);
    throw new Error('Failed to delete WhatsApp template');
  }
}

/**
 * Get all WhatsApp templates
 */
export async function getAllWhatsAppTemplates(): Promise<WhatsAppTemplate[]> {
  try {
    const snapshot = await getDocs(collection(db, 'whatsappTemplates'));

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
 * Get templates by category
 */
export async function getTemplatesByCategory(
  category: WhatsAppTemplate['category']
): Promise<WhatsAppTemplate[]> {
  try {
    const q = query(collection(db, 'whatsappTemplates'), where('category', '==', category));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as WhatsAppTemplate[];
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
    await updateDoc(doc(db, 'whatsappTemplates', templateId), {
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
 * PRE-DEFINED TEMPLATES CREATION
 * ============================================================================
 */

/**
 * Create default system templates (run once during setup)
 */
export async function createDefaultTemplates(): Promise<void> {
  const defaultTemplates: Array<Omit<WhatsAppTemplate, 'id' | 'createdAt' | 'updatedAt'>> = [
    // OTP Template
    {
      name: 'merchant_otp_verification',
      category: 'OTP',
      templateId: 'merchant_otp_verification',
      language: 'en',
      status: 'approved',
      components: [
        {
          type: 'BODY',
          text: 'Your QuickLink Pay verification code is: {{1}}\n\nThis code will expire in 5 minutes. Do not share this code with anyone.',
        },
      ],
      variables: ['otp'],
      isActive: true,
    },

    // Invoice Notification Template
    {
      name: 'invoice_notification',
      category: 'INVOICE',
      templateId: 'invoice_notification',
      language: 'en',
      status: 'approved',
      components: [
        {
          type: 'HEADER',
          format: 'TEXT',
          text: 'New Invoice',
        },
        {
          type: 'BODY',
          text: 'Hello {{1}},\n\nYou have received a new invoice.\n\nInvoice Number: {{2}}\nAmount: {{3}}\nDue Date: {{4}}\n\nPlease make payment before the due date.',
        },
        {
          type: 'FOOTER',
          text: 'Powered by QuickLink Pay',
        },
      ],
      variables: ['customer_name', 'invoice_number', 'amount', 'due_date'],
      isActive: true,
    },

    // Payment Reminder Template
    {
      name: 'payment_reminder',
      category: 'REMINDER',
      templateId: 'payment_reminder',
      language: 'en',
      status: 'approved',
      components: [
        {
          type: 'HEADER',
          format: 'TEXT',
          text: 'Payment Reminder',
        },
        {
          type: 'BODY',
          text: 'Hello {{1}},\n\nThis is a friendly reminder that invoice {{2}} for {{3}} is overdue by {{4}} days.\n\nPlease make payment at your earliest convenience.',
        },
        {
          type: 'FOOTER',
          text: 'Thank you for your business',
        },
      ],
      variables: ['customer_name', 'invoice_number', 'amount', 'days_overdue'],
      isActive: true,
    },

    // Payment Receipt Template
    {
      name: 'payment_receipt',
      category: 'RECEIPT',
      templateId: 'payment_receipt',
      language: 'en',
      status: 'approved',
      components: [
        {
          type: 'HEADER',
          format: 'TEXT',
          text: 'Payment Received',
        },
        {
          type: 'BODY',
          text: 'Hello {{1}},\n\nThank you for your payment!\n\nReceipt Number: {{2}}\nAmount Paid: {{3}}\nPayment Method: {{4}}\nDate: {{5}}\n\nYour payment has been successfully processed.',
        },
        {
          type: 'FOOTER',
          text: 'Powered by QuickLink Pay',
        },
      ],
      variables: ['customer_name', 'receipt_number', 'amount', 'payment_method', 'date'],
      isActive: true,
    },

    // Welcome Message Template
    {
      name: 'merchant_welcome',
      category: 'GENERAL',
      templateId: 'merchant_welcome',
      language: 'en',
      status: 'approved',
      components: [
        {
          type: 'HEADER',
          format: 'TEXT',
          text: 'Welcome to QuickLink Pay!',
        },
        {
          type: 'BODY',
          text: 'Hello {{1}},\n\nWelcome to QuickLink Pay! Your account has been successfully created.\n\nBusiness: {{2}}\n\nYou can now start accepting payments and managing your business.',
        },
        {
          type: 'FOOTER',
          text: 'Get started today!',
        },
        {
          type: 'BUTTONS',
          buttons: [
            {
              type: 'URL',
              text: 'Open Dashboard',
              url: 'https://merchant.quickpaylink.com',
            },
          ],
        },
      ],
      variables: ['merchant_name', 'business_name'],
      isActive: true,
    },
  ];

  try {
    for (const template of defaultTemplates) {
      await createWhatsAppTemplate(template);
    }

    console.log('Default WhatsApp templates created successfully');
  } catch (error) {
    console.error('Error creating default templates:', error);
    throw error;
  }
}

/**
 * ============================================================================
 * TEMPLATE VALIDATION
 * ============================================================================
 */

/**
 * Validate template structure before saving
 */
export function validateTemplate(template: Omit<WhatsAppTemplate, 'id' | 'createdAt' | 'updatedAt'>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check required fields
  if (!template.name || template.name.trim() === '') {
    errors.push('Template name is required');
  }

  if (!template.templateId || template.templateId.trim() === '') {
    errors.push('Template ID is required');
  }

  if (!template.category) {
    errors.push('Template category is required');
  }

  if (!template.language) {
    errors.push('Template language is required');
  }

  // Check components
  if (!template.components || template.components.length === 0) {
    errors.push('Template must have at least one component');
  }

  // Validate component structure
  template.components.forEach((component, index) => {
    if (!component.type) {
      errors.push(`Component ${index + 1}: Type is required`);
    }

    if (component.type === 'BODY' && !component.text) {
      errors.push(`Component ${index + 1}: Body text is required`);
    }

    if (component.type === 'BUTTONS' && (!component.buttons || component.buttons.length === 0)) {
      errors.push(`Component ${index + 1}: Buttons component must have at least one button`);
    }
  });

  // Check variables match placeholders in body text
  const bodyComponent = template.components.find((c) => c.type === 'BODY');
  if (bodyComponent && bodyComponent.text) {
    const placeholders = (bodyComponent.text.match(/\{\{(\d+)\}\}/g) || []).length;
    if (placeholders !== template.variables.length) {
      errors.push(
        `Number of variables (${template.variables.length}) doesn't match placeholders (${placeholders})`
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * ============================================================================
 * TEMPLATE STATISTICS
 * ============================================================================
 */

/**
 * Get template usage statistics
 */
export async function getTemplateStats(): Promise<Record<string, any>> {
  try {
    const templates = await getAllWhatsAppTemplates();

    // Get message logs to calculate usage
    const messagesSnapshot = await getDocs(collection(db, 'whatsappMessages'));

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
    messagesSnapshot.docs.forEach((doc) => {
      const templateName = doc.data().templateName;
      if (templateName) {
        stats.usage[templateName] = (stats.usage[templateName] || 0) + 1;
      }
    });

    return stats;
  } catch (error) {
    console.error('Error getting template stats:', error);
    return {};
  }
}
