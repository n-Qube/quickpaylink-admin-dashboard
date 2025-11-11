/**
 * AI Prompt Templates Management Service
 *
 * Manages AI prompt templates for Super Admin configuration
 * Used for consistent AI-powered features across the platform
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
  Timestamp,
  addDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

// Types
export interface AIPromptTemplate {
  id: string;
  name: string;
  description: string;
  useCase: 'invoice_extraction' | 'product_description' | 'email_generation' | 'fraud_detection' | 'business_insights' | 'customer_support' | 'custom';
  promptText: string;
  systemContext?: string;
  variables: PromptVariable[];
  outputFormat: 'text' | 'json' | 'structured';
  outputSchema?: string; // JSON schema for structured output
  temperature: number;
  maxTokens: number;
  isActive: boolean;
  isDefault: boolean;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface PromptVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  description: string;
  defaultValue?: any;
}

export interface GeminiConfigData {
  apiKey: string;
  apiUrl: string;
  model: string;
  isActive: boolean;
  isTestMode: boolean;
  maxTokens: number;
  temperature: number;
  topP: number;
  topK: number;
  safetySettings: Array<{
    category: string;
    threshold: string;
  }>;
}

/**
 * Save Gemini configuration
 */
export async function saveGeminiConfig(config: GeminiConfigData): Promise<void> {
  try {
    await setDoc(doc(db, 'systemConfig', 'gemini'), {
      ...config,
      updatedAt: Timestamp.now(),
    }, { merge: true });
  } catch (error) {
    console.error('Error saving Gemini config:', error);
    throw new Error('Failed to save Gemini configuration');
  }
}

/**
 * Update Gemini configuration status
 */
export async function updateGeminiConfigStatus(isActive: boolean): Promise<void> {
  try {
    await updateDoc(doc(db, 'systemConfig', 'gemini'), {
      isActive,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating Gemini config status:', error);
    throw new Error('Failed to update Gemini configuration status');
  }
}

/**
 * Test Gemini configuration
 */
export async function testGeminiConfig(): Promise<boolean> {
  try {
    const configDoc = await getDoc(doc(db, 'systemConfig', 'gemini'));

    if (!configDoc.exists()) {
      throw new Error('Gemini configuration not found');
    }

    const config = configDoc.data();

    // Test API call
    const response = await fetch(
      `${config.apiUrl}/models/${config.model}:generateContent?key=${config.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: 'Respond with "test successful" if you can read this.',
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Gemini API test failed: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    return data.candidates && data.candidates.length > 0;
  } catch (error) {
    console.error('Error testing Gemini config:', error);
    throw error;
  }
}

/**
 * Create AI prompt template
 */
export async function createPromptTemplate(
  template: Omit<AIPromptTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>
): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'aiPromptTemplates'), {
      ...template,
      usageCount: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    return docRef.id;
  } catch (error) {
    console.error('Error creating prompt template:', error);
    throw new Error('Failed to create prompt template');
  }
}

/**
 * Update AI prompt template
 */
export async function updatePromptTemplate(
  templateId: string,
  updates: Partial<Omit<AIPromptTemplate, 'id' | 'createdAt' | 'createdBy'>>
): Promise<void> {
  try {
    await updateDoc(doc(db, 'aiPromptTemplates', templateId), {
      ...updates,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating prompt template:', error);
    throw new Error('Failed to update prompt template');
  }
}

/**
 * Delete AI prompt template
 */
export async function deletePromptTemplate(templateId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'aiPromptTemplates', templateId));
  } catch (error) {
    console.error('Error deleting prompt template:', error);
    throw new Error('Failed to delete prompt template');
  }
}

/**
 * Get all AI prompt templates
 */
export async function getAllPromptTemplates(): Promise<AIPromptTemplate[]> {
  try {
    const snapshot = await getDocs(collection(db, 'aiPromptTemplates'));

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as AIPromptTemplate[];
  } catch (error) {
    console.error('Error getting prompt templates:', error);
    return [];
  }
}

/**
 * Get prompt templates by use case
 */
export async function getPromptTemplatesByUseCase(
  useCase: AIPromptTemplate['useCase']
): Promise<AIPromptTemplate[]> {
  try {
    const q = query(collection(db, 'aiPromptTemplates'), where('useCase', '==', useCase));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as AIPromptTemplate[];
  } catch (error) {
    console.error('Error getting prompt templates by use case:', error);
    return [];
  }
}

/**
 * Get default prompt template for a use case
 */
export async function getDefaultPromptTemplate(
  useCase: AIPromptTemplate['useCase']
): Promise<AIPromptTemplate | null> {
  try {
    const q = query(
      collection(db, 'aiPromptTemplates'),
      where('useCase', '==', useCase),
      where('isDefault', '==', true),
      where('isActive', '==', true)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    } as AIPromptTemplate;
  } catch (error) {
    console.error('Error getting default prompt template:', error);
    return null;
  }
}

/**
 * Toggle prompt template status
 */
export async function togglePromptTemplateStatus(
  templateId: string,
  isActive: boolean
): Promise<void> {
  try {
    await updateDoc(doc(db, 'aiPromptTemplates', templateId), {
      isActive,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error toggling prompt template status:', error);
    throw new Error('Failed to toggle prompt template status');
  }
}

/**
 * Set default prompt template for a use case
 */
export async function setDefaultPromptTemplate(
  templateId: string,
  useCase: AIPromptTemplate['useCase']
): Promise<void> {
  try {
    // First, unset all defaults for this use case
    const templates = await getPromptTemplatesByUseCase(useCase);
    const updatePromises = templates
      .filter((t) => t.isDefault && t.id !== templateId)
      .map((t) =>
        updateDoc(doc(db, 'aiPromptTemplates', t.id), {
          isDefault: false,
          updatedAt: Timestamp.now(),
        })
      );

    await Promise.all(updatePromises);

    // Set the new default
    await updateDoc(doc(db, 'aiPromptTemplates', templateId), {
      isDefault: true,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error setting default prompt template:', error);
    throw new Error('Failed to set default prompt template');
  }
}

/**
 * Increment template usage count
 */
export async function incrementTemplateUsage(templateId: string): Promise<void> {
  try {
    const templateRef = doc(db, 'aiPromptTemplates', templateId);
    const templateDoc = await getDoc(templateRef);

    if (templateDoc.exists()) {
      const currentCount = templateDoc.data().usageCount || 0;
      await updateDoc(templateRef, {
        usageCount: currentCount + 1,
      });
    }
  } catch (error) {
    console.error('Error incrementing template usage:', error);
  }
}

/**
 * Validate prompt template
 */
export function validatePromptTemplate(template: Partial<AIPromptTemplate>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!template.name || template.name.trim().length === 0) {
    errors.push('Template name is required');
  }

  if (!template.promptText || template.promptText.trim().length === 0) {
    errors.push('Prompt text is required');
  }

  if (!template.useCase) {
    errors.push('Use case is required');
  }

  if (template.temperature !== undefined && (template.temperature < 0 || template.temperature > 1)) {
    errors.push('Temperature must be between 0 and 1');
  }

  if (template.maxTokens !== undefined && template.maxTokens < 1) {
    errors.push('Max tokens must be at least 1');
  }

  if (template.outputFormat === 'json' || template.outputFormat === 'structured') {
    if (!template.outputSchema) {
      errors.push('Output schema is required for JSON/structured output');
    } else {
      try {
        JSON.parse(template.outputSchema);
      } catch {
        errors.push('Output schema must be valid JSON');
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Create default AI prompt templates
 */
export async function createDefaultPromptTemplates(): Promise<void> {
  const defaultTemplates: Array<Omit<AIPromptTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>> = [
    // Invoice Extraction Template
    {
      name: 'Invoice Data Extraction',
      description: 'Extract structured invoice data from images',
      useCase: 'invoice_extraction',
      promptText: `Analyze this invoice image and extract all relevant information in JSON format.
Please extract:
- Invoice number
- Invoice date (format: YYYY-MM-DD)
- Due date (format: YYYY-MM-DD)
- Customer name, email, phone
- Line items (description, quantity, unit price, total)
- Subtotal, tax, discount, total amount
- Currency and notes

Return ONLY valid JSON without markdown formatting.`,
      systemContext: 'You are an expert invoice data extraction assistant.',
      variables: [
        { name: 'imageData', type: 'string', required: true, description: 'Base64 encoded invoice image' },
        { name: 'mimeType', type: 'string', required: true, description: 'Image MIME type' },
      ],
      outputFormat: 'json',
      outputSchema: JSON.stringify({
        invoiceNumber: 'string',
        invoiceDate: 'YYYY-MM-DD',
        dueDate: 'YYYY-MM-DD',
        customerName: 'string',
        customerEmail: 'string',
        customerPhone: 'string',
        items: [{ description: 'string', quantity: 'number', unitPrice: 'number', total: 'number' }],
        subtotal: 'number',
        tax: 'number',
        discount: 'number',
        total: 'number',
        currency: 'string',
        notes: 'string',
        confidence: 'number',
      }),
      temperature: 0.3,
      maxTokens: 2048,
      isActive: true,
      isDefault: true,
      createdBy: 'system',
    },

    // Product Description Template
    {
      name: 'Product Description Generator',
      description: 'Generate compelling product descriptions',
      useCase: 'product_description',
      promptText: `Generate a compelling product description for an e-commerce platform.

Product: {{productName}}
Category: {{category}}
Features: {{features}}
Target Audience: {{targetAudience}}

Requirements:
- Professional and engaging tone
- 2-3 paragraphs (150-200 words)
- Highlight key features and benefits
- Include a call-to-action
- SEO-friendly

Generate the description:`,
      systemContext: 'You are an expert e-commerce copywriter.',
      variables: [
        { name: 'productName', type: 'string', required: true, description: 'Product name' },
        { name: 'category', type: 'string', required: true, description: 'Product category' },
        { name: 'features', type: 'array', required: true, description: 'Product features' },
        { name: 'targetAudience', type: 'string', required: true, description: 'Target audience' },
      ],
      outputFormat: 'text',
      temperature: 0.8,
      maxTokens: 512,
      isActive: true,
      isDefault: true,
      createdBy: 'system',
    },

    // Email Generation Template
    {
      name: 'Professional Email Generator',
      description: 'Generate professional email content',
      useCase: 'email_generation',
      promptText: `Generate an email for the following purpose.

Purpose: {{purpose}}
Recipient: {{recipientName}}
Context: {{context}}
Tone: {{tone}}

Generate both subject line and email body in JSON format:
{
  "subject": "Email subject here",
  "body": "Email body here (use \\n for line breaks)"
}

Return ONLY valid JSON without markdown formatting.`,
      systemContext: 'You are a professional email writing assistant.',
      variables: [
        { name: 'purpose', type: 'string', required: true, description: 'Email purpose' },
        { name: 'recipientName', type: 'string', required: true, description: 'Recipient name' },
        { name: 'context', type: 'string', required: true, description: 'Email context' },
        { name: 'tone', type: 'string', required: false, description: 'Email tone', defaultValue: 'professional' },
      ],
      outputFormat: 'json',
      outputSchema: JSON.stringify({
        subject: 'string',
        body: 'string',
      }),
      temperature: 0.7,
      maxTokens: 1024,
      isActive: true,
      isDefault: true,
      createdBy: 'system',
    },

    // Fraud Detection Template
    {
      name: 'Transaction Fraud Analysis',
      description: 'Analyze transactions for fraud indicators',
      useCase: 'fraud_detection',
      promptText: `Analyze this transaction for potential fraud indicators.

Transaction Details:
- Amount: {{amount}} {{currency}}
- Customer Email: {{customerEmail}}
- Customer Phone: {{customerPhone}}
- IP Address: {{ipAddress}}
- Device Info: {{deviceInfo}}
- Previous Transactions: {{previousTransactions}}
- Account Age: {{accountAge}} days

Provide a fraud risk analysis in JSON format:
{
  "riskScore": 0-100,
  "riskLevel": "low|medium|high|critical",
  "flags": ["array of specific concerns"],
  "recommendations": ["array of recommended actions"],
  "analysis": "detailed analysis explanation"
}

Return ONLY valid JSON without markdown formatting.`,
      systemContext: 'You are a fraud detection and risk analysis expert.',
      variables: [
        { name: 'amount', type: 'number', required: true, description: 'Transaction amount' },
        { name: 'currency', type: 'string', required: true, description: 'Currency code' },
        { name: 'customerEmail', type: 'string', required: true, description: 'Customer email' },
        { name: 'customerPhone', type: 'string', required: false, description: 'Customer phone' },
        { name: 'ipAddress', type: 'string', required: false, description: 'IP address' },
        { name: 'deviceInfo', type: 'string', required: false, description: 'Device information' },
        { name: 'previousTransactions', type: 'number', required: false, description: 'Previous transaction count' },
        { name: 'accountAge', type: 'number', required: false, description: 'Account age in days' },
      ],
      outputFormat: 'json',
      outputSchema: JSON.stringify({
        riskScore: 'number',
        riskLevel: 'string',
        flags: ['string'],
        recommendations: ['string'],
        analysis: 'string',
      }),
      temperature: 0.3,
      maxTokens: 1024,
      isActive: true,
      isDefault: true,
      createdBy: 'system',
    },

    // Business Insights Template
    {
      name: 'Business Performance Insights',
      description: 'Generate actionable business insights from analytics',
      useCase: 'business_insights',
      promptText: `Analyze this business performance data and provide actionable insights.

Analytics Data:
- Total Revenue: {{totalRevenue}}
- Total Transactions: {{totalTransactions}}
- Average Order Value: {{averageOrderValue}}
- Top Products: {{topProducts}}
- Customer Growth: {{customerGrowth}}%
- Period: {{periodDays}} days

Generate 3-5 key business insights with recommendations in JSON format:
[
  {
    "category": "Revenue|Products|Customers|Marketing|Operations",
    "insight": "Clear observation about the business",
    "recommendation": "Specific actionable recommendation",
    "priority": "low|medium|high",
    "impact": "Expected impact of implementing recommendation"
  }
]

Return ONLY valid JSON array without markdown formatting.`,
      systemContext: 'You are a business analytics and strategy consultant.',
      variables: [
        { name: 'totalRevenue', type: 'number', required: true, description: 'Total revenue' },
        { name: 'totalTransactions', type: 'number', required: true, description: 'Total transactions' },
        { name: 'averageOrderValue', type: 'number', required: true, description: 'Average order value' },
        { name: 'topProducts', type: 'array', required: true, description: 'Top selling products' },
        { name: 'customerGrowth', type: 'number', required: true, description: 'Customer growth percentage' },
        { name: 'periodDays', type: 'number', required: true, description: 'Analysis period in days' },
      ],
      outputFormat: 'json',
      outputSchema: JSON.stringify([
        {
          category: 'string',
          insight: 'string',
          recommendation: 'string',
          priority: 'string',
          impact: 'string',
        },
      ]),
      temperature: 0.6,
      maxTokens: 2048,
      isActive: true,
      isDefault: true,
      createdBy: 'system',
    },

    // Customer Support Template
    {
      name: 'Customer Support Assistant',
      description: 'AI-powered customer support responses',
      useCase: 'customer_support',
      promptText: `You are a helpful customer support assistant for {{businessName}}, a {{businessType}} business.

Support Contact:
- Email: {{supportEmail}}
- Phone: {{supportPhone}}

Conversation History:
{{conversationHistory}}

Customer's Current Message:
{{customerMessage}}

Guidelines:
- Be helpful, professional, and empathetic
- Provide accurate information about payments, invoices, and general inquiries
- If you don't know something, be honest and offer to escalate to human support
- Keep responses concise (2-3 paragraphs max)
- Include contact information if escalation is needed

Generate a helpful support response:`,
      systemContext: 'You are a professional customer support representative.',
      variables: [
        { name: 'businessName', type: 'string', required: true, description: 'Business name' },
        { name: 'businessType', type: 'string', required: true, description: 'Business type' },
        { name: 'supportEmail', type: 'string', required: true, description: 'Support email' },
        { name: 'supportPhone', type: 'string', required: false, description: 'Support phone' },
        { name: 'conversationHistory', type: 'string', required: false, description: 'Conversation history' },
        { name: 'customerMessage', type: 'string', required: true, description: 'Customer message' },
      ],
      outputFormat: 'text',
      temperature: 0.7,
      maxTokens: 1024,
      isActive: true,
      isDefault: true,
      createdBy: 'system',
    },
  ];

  try {
    // Check if templates already exist
    const existingTemplates = await getAllPromptTemplates();
    if (existingTemplates.length > 0) {
      console.log('Default AI prompt templates already exist');
      return;
    }

    // Create all default templates
    const createPromises = defaultTemplates.map((template) => createPromptTemplate(template));
    await Promise.all(createPromises);

    console.log('✅ Default AI prompt templates created successfully');
  } catch (error) {
    console.error('Error creating default prompt templates:', error);
    throw error;
  }
}

/**
 * Get AI prompt template statistics
 */
export async function getPromptTemplateStats(): Promise<Record<string, any>> {
  try {
    const templates = await getAllPromptTemplates();

    return {
      total: templates.length,
      active: templates.filter((t) => t.isActive).length,
      inactive: templates.filter((t) => !t.isActive).length,
      byUseCase: templates.reduce((acc, t) => {
        acc[t.useCase] = (acc[t.useCase] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      mostUsed: templates.sort((a, b) => b.usageCount - a.usageCount).slice(0, 5),
    };
  } catch (error) {
    console.error('Error getting prompt template stats:', error);
    return {};
  }
}
