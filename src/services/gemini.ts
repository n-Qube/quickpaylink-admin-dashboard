/**
 * Google Gemini AI Service
 *
 * Handles AI-powered features via Google Gemini API for:
 * - Invoice data extraction from images/documents
 * - Customer support chatbot assistance
 * - Product description generation
 * - Email/message content generation
 * - Fraud detection and analysis
 * - Business insights and recommendations
 */

import { doc, getDoc, collection, addDoc, Timestamp } from 'firebase/firestore';
import { db, COLLECTIONS } from '../lib/firebase';

// Types
export interface GeminiConfig {
  id: string;
  apiKey: string;
  apiUrl: string;
  model: string; // gemini-pro, gemini-pro-vision, etc.
  isActive: boolean;
  isTestMode: boolean;
  maxTokens: number;
  temperature: number;
  topP: number;
  topK: number;
  safetySettings: SafetySetting[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SafetySetting {
  category: string;
  threshold: 'BLOCK_NONE' | 'BLOCK_ONLY_HIGH' | 'BLOCK_MEDIUM_AND_ABOVE' | 'BLOCK_LOW_AND_ABOVE';
}

export interface GeminiRequest {
  prompt: string;
  context?: string;
  imageData?: string; // Base64 encoded image
  mimeType?: string;
  temperature?: number;
  maxTokens?: number;
  merchantId?: string;
  useCase?: string; // For logging and analytics
}

export interface GeminiResponse {
  text: string;
  finishReason: string;
  safetyRatings: any[];
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
}

export interface AIUsageLog {
  id: string;
  merchantId?: string;
  useCase: string;
  model: string;
  promptTokens: number;
  responseTokens: number;
  totalTokens: number;
  cost: number; // Estimated cost in USD
  status: 'success' | 'failed' | 'blocked';
  error?: string;
  createdAt: Date;
}

export interface InvoiceExtractionResult {
  invoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal?: number;
  tax?: number;
  discount?: number;
  total?: number;
  currency?: string;
  notes?: string;
  confidence: number; // 0-1 confidence score
}

export interface FraudAnalysisResult {
  riskScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  flags: string[];
  recommendations: string[];
  analysis: string;
}

export interface BusinessInsight {
  category: string;
  insight: string;
  recommendation: string;
  priority: 'low' | 'medium' | 'high';
  impact: string;
}

/**
 * Get Gemini configuration from Super Admin settings
 */
export async function getGeminiConfig(): Promise<GeminiConfig | null> {
  try {
    const configDoc = await getDoc(doc(db, COLLECTIONS.SYSTEM_CONFIG, 'gemini'));

    if (!configDoc.exists()) {
      console.error('Gemini configuration not found');
      return null;
    }

    const data = configDoc.data();

    return {
      id: configDoc.id,
      apiKey: data.apiKey,
      apiUrl: data.apiUrl || 'https://generativelanguage.googleapis.com/v1beta',
      model: data.model || 'gemini-pro',
      isActive: data.isActive,
      isTestMode: data.isTestMode || false,
      maxTokens: data.maxTokens || 2048,
      temperature: data.temperature || 0.7,
      topP: data.topP || 0.95,
      topK: data.topK || 40,
      safetySettings: data.safetySettings || getDefaultSafetySettings(),
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
    };
  } catch (error) {
    console.error('Error getting Gemini config:', error);
    return null;
  }
}

/**
 * Get default safety settings for Gemini
 */
function getDefaultSafetySettings(): SafetySetting[] {
  return [
    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  ];
}

/**
 * Generate content using Gemini AI
 */
export async function generateContent(request: GeminiRequest): Promise<GeminiResponse | null> {
  try {
    const config = await getGeminiConfig();
    if (!config || !config.isActive) {
      throw new Error('Gemini configuration is not active');
    }

    // Build request body
    const contents = [
      {
        parts: [
          {
            text: request.context ? `${request.context}\n\n${request.prompt}` : request.prompt,
          },
        ],
      },
    ];

    // Add image if provided (for gemini-pro-vision)
    if (request.imageData && request.mimeType) {
      contents[0].parts.push({
        inline_data: {
          mime_type: request.mimeType,
          data: request.imageData,
        },
      } as any);
    }

    const requestBody = {
      contents,
      generationConfig: {
        temperature: request.temperature ?? config.temperature,
        maxOutputTokens: request.maxTokens ?? config.maxTokens,
        topP: config.topP,
        topK: config.topK,
      },
      safetySettings: config.safetySettings,
    };

    // Determine model to use
    const model = request.imageData ? 'gemini-pro-vision' : config.model;

    // Call Gemini API
    const response = await fetch(`${config.apiUrl}/models/${model}:generateContent?key=${config.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Gemini API error: ${JSON.stringify(error)}`);
    }

    const data = await response.json();

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No response candidates from Gemini');
    }

    const candidate = data.candidates[0];
    const text = candidate.content?.parts?.[0]?.text || '';

    const result: GeminiResponse = {
      text,
      finishReason: candidate.finishReason,
      safetyRatings: candidate.safetyRatings || [],
      promptTokenCount: data.usageMetadata?.promptTokenCount,
      candidatesTokenCount: data.usageMetadata?.candidatesTokenCount,
      totalTokenCount: data.usageMetadata?.totalTokenCount,
    };

    // Log usage
    await logAIUsage({
      merchantId: request.merchantId,
      useCase: request.useCase || 'general',
      model,
      promptTokens: result.promptTokenCount || 0,
      responseTokens: result.candidatesTokenCount || 0,
      totalTokens: result.totalTokenCount || 0,
      status: 'success',
    });

    return result;
  } catch (error) {
    console.error('Error generating content with Gemini:', error);

    // Log failed request
    await logAIUsage({
      merchantId: request.merchantId,
      useCase: request.useCase || 'general',
      model: 'gemini-pro',
      promptTokens: 0,
      responseTokens: 0,
      totalTokens: 0,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return null;
  }
}

/**
 * Extract invoice data from image using Gemini Vision
 */
export async function extractInvoiceData(
  imageData: string,
  mimeType: string,
  merchantId?: string
): Promise<InvoiceExtractionResult | null> {
  try {
    const prompt = `Analyze this invoice image and extract all relevant information in JSON format.
Please extract:
- Invoice number
- Invoice date (format: YYYY-MM-DD)
- Due date (format: YYYY-MM-DD)
- Customer name
- Customer email
- Customer phone
- Line items (description, quantity, unit price, total)
- Subtotal
- Tax amount
- Discount amount
- Total amount
- Currency
- Any notes or payment terms

Return ONLY valid JSON without any markdown formatting or code blocks. Use this structure:
{
  "invoiceNumber": "string or null",
  "invoiceDate": "YYYY-MM-DD or null",
  "dueDate": "YYYY-MM-DD or null",
  "customerName": "string or null",
  "customerEmail": "string or null",
  "customerPhone": "string or null",
  "items": [{"description": "string", "quantity": number, "unitPrice": number, "total": number}],
  "subtotal": number or null,
  "tax": number or null,
  "discount": number or null,
  "total": number or null,
  "currency": "string or null",
  "notes": "string or null",
  "confidence": 0.95
}`;

    const response = await generateContent({
      prompt,
      imageData,
      mimeType,
      merchantId,
      useCase: 'invoice_extraction',
      temperature: 0.3, // Lower temperature for more accurate extraction
    });

    if (!response) {
      return null;
    }

    // Parse JSON response
    const cleanedText = response.text.replace(/```json\n?|\n?```/g, '').trim();
    const result = JSON.parse(cleanedText) as InvoiceExtractionResult;

    return result;
  } catch (error) {
    console.error('Error extracting invoice data:', error);
    return null;
  }
}

/**
 * Generate product description
 */
export async function generateProductDescription(
  productName: string,
  category: string,
  features: string[],
  targetAudience: string,
  merchantId?: string
): Promise<string | null> {
  try {
    const prompt = `Generate a compelling product description for an e-commerce platform.

Product: ${productName}
Category: ${category}
Features: ${features.join(', ')}
Target Audience: ${targetAudience}

Requirements:
- Professional and engaging tone
- 2-3 paragraphs (150-200 words)
- Highlight key features and benefits
- Include a call-to-action
- SEO-friendly

Generate the description:`;

    const response = await generateContent({
      prompt,
      merchantId,
      useCase: 'product_description',
      temperature: 0.8, // Higher temperature for creative content
    });

    return response?.text || null;
  } catch (error) {
    console.error('Error generating product description:', error);
    return null;
  }
}

/**
 * Generate email content
 */
export async function generateEmailContent(
  purpose: string,
  recipientName: string,
  context: string,
  tone: 'formal' | 'casual' | 'friendly' | 'professional' = 'professional',
  merchantId?: string
): Promise<{ subject: string; body: string } | null> {
  try {
    const prompt = `Generate an email for the following purpose.

Purpose: ${purpose}
Recipient: ${recipientName}
Context: ${context}
Tone: ${tone}

Generate both subject line and email body in JSON format:
{
  "subject": "Email subject here",
  "body": "Email body here (use \\n for line breaks)"
}

Return ONLY valid JSON without any markdown formatting.`;

    const response = await generateContent({
      prompt,
      merchantId,
      useCase: 'email_generation',
      temperature: 0.7,
    });

    if (!response) {
      return null;
    }

    const cleanedText = response.text.replace(/```json\n?|\n?```/g, '').trim();
    const result = JSON.parse(cleanedText);

    return {
      subject: result.subject,
      body: result.body,
    };
  } catch (error) {
    console.error('Error generating email content:', error);
    return null;
  }
}

/**
 * Analyze transaction for fraud
 */
export async function analyzeFraud(
  transactionData: {
    amount: number;
    currency: string;
    customerEmail: string;
    customerPhone?: string;
    ipAddress?: string;
    deviceInfo?: string;
    merchantId: string;
    previousTransactions?: number;
    accountAge?: number; // in days
  }
): Promise<FraudAnalysisResult | null> {
  try {
    const prompt = `Analyze this transaction for potential fraud indicators.

Transaction Details:
- Amount: ${transactionData.amount} ${transactionData.currency}
- Customer Email: ${transactionData.customerEmail}
- Customer Phone: ${transactionData.customerPhone || 'N/A'}
- IP Address: ${transactionData.ipAddress || 'N/A'}
- Device Info: ${transactionData.deviceInfo || 'N/A'}
- Previous Transactions: ${transactionData.previousTransactions || 0}
- Account Age: ${transactionData.accountAge || 0} days

Provide a fraud risk analysis in JSON format:
{
  "riskScore": 0-100,
  "riskLevel": "low|medium|high|critical",
  "flags": ["array of specific concerns"],
  "recommendations": ["array of recommended actions"],
  "analysis": "detailed analysis explanation"
}

Return ONLY valid JSON without any markdown formatting.`;

    const response = await generateContent({
      prompt,
      merchantId: transactionData.merchantId,
      useCase: 'fraud_detection',
      temperature: 0.3,
    });

    if (!response) {
      return null;
    }

    const cleanedText = response.text.replace(/```json\n?|\n?```/g, '').trim();
    const result = JSON.parse(cleanedText) as FraudAnalysisResult;

    return result;
  } catch (error) {
    console.error('Error analyzing fraud:', error);
    return null;
  }
}

/**
 * Generate business insights from analytics data
 */
export async function generateBusinessInsights(
  analyticsData: {
    totalRevenue: number;
    totalTransactions: number;
    averageOrderValue: number;
    topProducts: Array<{ name: string; sales: number }>;
    customerGrowth: number; // percentage
    periodDays: number;
    merchantId: string;
  }
): Promise<BusinessInsight[] | null> {
  try {
    const prompt = `Analyze this business performance data and provide actionable insights.

Analytics Data:
- Total Revenue: ${analyticsData.totalRevenue}
- Total Transactions: ${analyticsData.totalTransactions}
- Average Order Value: ${analyticsData.averageOrderValue}
- Top Products: ${JSON.stringify(analyticsData.topProducts)}
- Customer Growth: ${analyticsData.customerGrowth}%
- Period: ${analyticsData.periodDays} days

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

Return ONLY valid JSON array without any markdown formatting.`;

    const response = await generateContent({
      prompt,
      merchantId: analyticsData.merchantId,
      useCase: 'business_insights',
      temperature: 0.6,
    });

    if (!response) {
      return null;
    }

    const cleanedText = response.text.replace(/```json\n?|\n?```/g, '').trim();
    const result = JSON.parse(cleanedText) as BusinessInsight[];

    return result;
  } catch (error) {
    console.error('Error generating business insights:', error);
    return null;
  }
}

/**
 * Customer support chatbot response
 */
export async function generateSupportResponse(
  customerMessage: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; message: string }>,
  merchantContext: {
    businessName: string;
    businessType: string;
    supportEmail: string;
    supportPhone?: string;
  },
  merchantId?: string
): Promise<string | null> {
  try {
    // Build conversation context
    const history = conversationHistory
      .map((msg) => `${msg.role === 'user' ? 'Customer' : 'Support'}: ${msg.message}`)
      .join('\n');

    const prompt = `You are a helpful customer support assistant for ${merchantContext.businessName}, a ${merchantContext.businessType} business.

Support Contact:
- Email: ${merchantContext.supportEmail}
- Phone: ${merchantContext.supportPhone || 'Not provided'}

Conversation History:
${history}

Customer's Current Message:
${customerMessage}

Guidelines:
- Be helpful, professional, and empathetic
- Provide accurate information about payments, invoices, and general inquiries
- If you don't know something, be honest and offer to escalate to human support
- Keep responses concise (2-3 paragraphs max)
- Include contact information if escalation is needed

Generate a helpful support response:`;

    const response = await generateContent({
      prompt,
      merchantId,
      useCase: 'customer_support',
      temperature: 0.7,
    });

    return response?.text || null;
  } catch (error) {
    console.error('Error generating support response:', error);
    return null;
  }
}

/**
 * Log AI usage for analytics and billing
 */
async function logAIUsage(data: Omit<AIUsageLog, 'id' | 'createdAt' | 'cost'>): Promise<void> {
  try {
    // Calculate estimated cost (based on Gemini pricing)
    // As of 2024: ~$0.00025 per 1K tokens for gemini-pro
    const costPer1kTokens = 0.00025;
    const cost = (data.totalTokens / 1000) * costPer1kTokens;

    await addDoc(collection(db, 'aiUsageLogs'), {
      ...data,
      cost,
      createdAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error logging AI usage:', error);
  }
}

/**
 * Get AI usage statistics for a merchant
 */
export async function getAIUsageStats(
  merchantId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  usageByUseCase: Record<string, number>;
} | null> {
  try {
    // In production, implement proper query with date range
    // This is a placeholder
    return {
      totalRequests: 0,
      totalTokens: 0,
      totalCost: 0,
      usageByUseCase: {},
    };
  } catch (error) {
    console.error('Error getting AI usage stats:', error);
    return null;
  }
}

/**
 * Test Gemini configuration
 */
export async function testGeminiConfig(): Promise<boolean> {
  try {
    const config = await getGeminiConfig();
    if (!config) {
      return false;
    }

    const response = await generateContent({
      prompt: 'Respond with "Configuration test successful" if you can read this message.',
      useCase: 'config_test',
      temperature: 0.1,
    });

    return response !== null && response.text.length > 0;
  } catch (error) {
    console.error('Error testing Gemini config:', error);
    return false;
  }
}
