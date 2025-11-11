# Google Gemini AI Integration - QuickLink Pay

**Status:** ✅ Complete
**Last Updated:** 2025-01-07

## Overview

The Google Gemini AI integration provides intelligent automation and insights across the QuickLink Pay platform. Super Admins can configure Gemini API settings and manage AI prompt templates for consistent AI-powered features.

---

## Services Created

### 1. Gemini AI Service (`gemini.ts`)

**Location:** `admin-dashboard/src/services/gemini.ts`
**Lines of Code:** ~500 lines

#### Core Features:

- **Configuration Management**
  - Fetch Gemini config from Super Admin settings
  - Support for multiple models (gemini-pro, gemini-pro-vision)
  - Configurable temperature, max tokens, safety settings

- **Content Generation**
  - Generic content generation with context
  - Image analysis support (base64 encoded)
  - Token usage tracking and cost estimation

#### Specialized AI Functions:

1. **Invoice Data Extraction** (`extractInvoiceData()`)
   - Extract structured data from invoice images
   - Returns: invoice number, dates, customer info, line items, totals
   - Confidence scoring for extraction accuracy

2. **Product Description Generation** (`generateProductDescription()`)
   - Create compelling product descriptions
   - Inputs: product name, category, features, target audience
   - SEO-friendly, professional tone

3. **Email Content Generation** (`generateEmailContent()`)
   - Generate subject lines and email bodies
   - Customizable tone (formal, casual, friendly, professional)
   - Context-aware content

4. **Fraud Analysis** (`analyzeFraud()`)
   - Analyze transactions for fraud indicators
   - Returns: risk score (0-100), risk level, flags, recommendations
   - Considers: amount, customer data, IP, device, transaction history

5. **Business Insights** (`generateBusinessInsights()`)
   - Generate actionable insights from analytics data
   - Categories: Revenue, Products, Customers, Marketing, Operations
   - Priority levels and impact assessment

6. **Customer Support Chatbot** (`generateSupportResponse()`)
   - AI-powered customer support responses
   - Conversation history awareness
   - Context includes business info and support contacts

#### Usage Tracking:

- **AI Usage Logging** (`logAIUsage()`)
  - Track all AI requests (success/failure)
  - Token counts (prompt, response, total)
  - Cost estimation (~$0.00025 per 1K tokens)
  - Usage by merchant and use case

- **Usage Statistics** (`getAIUsageStats()`)
  - Total requests, tokens, costs
  - Breakdown by use case
  - Date range filtering

#### Configuration Testing:

- **Test Config** (`testGeminiConfig()`)
  - Verify API key and connectivity
  - Simple test prompt
  - Returns success/failure status

---

### 2. AI Prompt Templates Service (`aiTemplates.ts`)

**Location:** `admin-dashboard/src/services/aiTemplates.ts`
**Lines of Code:** ~800 lines

#### Core Features:

- **Gemini Configuration CRUD**
  - Save/update Gemini API configuration
  - Toggle active status
  - Test configuration

- **Prompt Template CRUD**
  - Create, read, update, delete templates
  - Filter by use case
  - Toggle active/inactive status
  - Set default templates per use case

- **Template Management**
  - Variable system for dynamic prompts
  - Output format specification (text, JSON, structured)
  - Temperature and token settings per template
  - Usage count tracking

#### Default Templates (6 total):

1. **Invoice Data Extraction**
   - Use Case: `invoice_extraction`
   - Output: JSON with structured invoice data
   - Temperature: 0.3 (accurate extraction)
   - Max Tokens: 2048

2. **Product Description Generator**
   - Use Case: `product_description`
   - Output: Text (2-3 paragraphs)
   - Temperature: 0.8 (creative)
   - Max Tokens: 512

3. **Professional Email Generator**
   - Use Case: `email_generation`
   - Output: JSON with subject and body
   - Temperature: 0.7 (balanced)
   - Max Tokens: 1024

4. **Transaction Fraud Analysis**
   - Use Case: `fraud_detection`
   - Output: JSON with risk analysis
   - Temperature: 0.3 (precise)
   - Max Tokens: 1024

5. **Business Performance Insights**
   - Use Case: `business_insights`
   - Output: JSON array of insights
   - Temperature: 0.6 (analytical)
   - Max Tokens: 2048

6. **Customer Support Assistant**
   - Use Case: `customer_support`
   - Output: Text response
   - Temperature: 0.7 (helpful)
   - Max Tokens: 1024

#### Template Features:

- **Variable System:**
  - Type: string, number, boolean, array, object
  - Required/optional flags
  - Default values
  - Description for each variable

- **Output Format:**
  - Text: Plain text response
  - JSON: Structured JSON output
  - Structured: JSON with schema validation

- **Validation:**
  - Required fields checking
  - Temperature range (0-1)
  - Token limits
  - JSON schema validation

- **Statistics:**
  - Total templates (active/inactive)
  - Usage by use case
  - Most used templates

---

## UI Components

### 3. AI Prompts Management Page (`AIPrompts.tsx`)

**Location:** `admin-dashboard/src/pages/AIPrompts.tsx`
**Lines of Code:** ~600 lines

#### Features:

- **Statistics Dashboard**
  - Total templates count
  - Active/inactive counts
  - Use case distribution
  - Visual cards with icons

- **Template List View**
  - Display all templates with details
  - Use case badges (color-coded)
  - Default template indicator (star icon)
  - Active/inactive status toggle

- **Search & Filters**
  - Search by name or description
  - Filter by use case (all, invoice, product, email, fraud, insights, support, custom)
  - Real-time filtering

- **Template Actions**
  - Set as default for use case
  - Toggle active/inactive status
  - Delete template (with confirmation)
  - View template details

- **Bulk Operations**
  - Create default templates (6 templates)
  - Refresh template list
  - Clear filters

- **Information Display**
  - Variable count
  - Usage count
  - Temperature setting
  - Max tokens
  - Output format

#### UI/UX:

- Loading states with spinners
- Success/error message banners
- Empty state with call-to-action
- Responsive design (mobile-friendly)
- Dark mode support
- Accessibility features

---

## Navigation & Routing

### Updates Made:

1. **App.tsx**
   - Added `AIPrompts` import
   - Added route: `/ai-prompts`
   - Super Admin only access

2. **Sidebar.tsx**
   - Added `Brain` icon import
   - Added "AI Prompts" navigation item
   - Positioned under "Templates"
   - Super Admin only visibility

---

## API Management Integration

### APIManagement.tsx

**GOOGLE_GEMINI provider already configured:**

- Provider type: `GOOGLE_GEMINI`
- Display name: "Google Gemini AI"
- Test endpoint: Lists available models
- API URL: `https://generativelanguage.googleapis.com/v1beta/models`
- Method: GET with API key parameter

---

## Configuration Structure

### Firestore Collections:

1. **systemConfig/gemini**
   ```typescript
   {
     apiKey: string,
     apiUrl: string,
     model: string, // "gemini-pro" or "gemini-pro-vision"
     isActive: boolean,
     isTestMode: boolean,
     maxTokens: number,
     temperature: number,
     topP: number,
     topK: number,
     safetySettings: [
       {
         category: string,
         threshold: string
       }
     ],
     createdAt: Timestamp,
     updatedAt: Timestamp
   }
   ```

2. **aiPromptTemplates/**
   ```typescript
   {
     name: string,
     description: string,
     useCase: string,
     promptText: string,
     systemContext?: string,
     variables: [
       {
         name: string,
         type: string,
         required: boolean,
         description: string,
         defaultValue?: any
       }
     ],
     outputFormat: string,
     outputSchema?: string,
     temperature: number,
     maxTokens: number,
     isActive: boolean,
     isDefault: boolean,
     usageCount: number,
     createdAt: Timestamp,
     updatedAt: Timestamp,
     createdBy: string
   }
   ```

3. **aiUsageLogs/**
   ```typescript
   {
     merchantId?: string,
     useCase: string,
     model: string,
     promptTokens: number,
     responseTokens: number,
     totalTokens: number,
     cost: number, // Estimated USD
     status: string, // "success" | "failed" | "blocked"
     error?: string,
     createdAt: Timestamp
   }
   ```

---

## Usage Examples

### Example 1: Extract Invoice Data

```typescript
import { extractInvoiceData } from '@/services/gemini';

// Upload invoice image, get base64
const base64Image = await convertImageToBase64(file);

// Extract data
const result = await extractInvoiceData(
  base64Image,
  'image/jpeg',
  merchantId
);

if (result) {
  console.log('Invoice Number:', result.invoiceNumber);
  console.log('Total:', result.total);
  console.log('Confidence:', result.confidence);
}
```

### Example 2: Generate Product Description

```typescript
import { generateProductDescription } from '@/services/gemini';

const description = await generateProductDescription(
  'Wireless Bluetooth Headphones',
  'Electronics',
  ['Noise Cancellation', '40-hour battery', 'Premium sound'],
  'Tech enthusiasts and music lovers',
  merchantId
);

console.log(description);
```

### Example 3: Fraud Detection

```typescript
import { analyzeFraud } from '@/services/gemini';

const analysis = await analyzeFraud({
  amount: 5000,
  currency: 'USD',
  customerEmail: 'user@example.com',
  ipAddress: '192.168.1.1',
  merchantId: 'merchant123',
  previousTransactions: 2,
  accountAge: 5
});

if (analysis) {
  console.log('Risk Level:', analysis.riskLevel);
  console.log('Risk Score:', analysis.riskScore);
  console.log('Flags:', analysis.flags);
  console.log('Recommendations:', analysis.recommendations);
}
```

### Example 4: Business Insights

```typescript
import { generateBusinessInsights } from '@/services/gemini';

const insights = await generateBusinessInsights({
  totalRevenue: 50000,
  totalTransactions: 150,
  averageOrderValue: 333.33,
  topProducts: [
    { name: 'Product A', sales: 50 },
    { name: 'Product B', sales: 35 }
  ],
  customerGrowth: 25,
  periodDays: 30,
  merchantId: 'merchant123'
});

if (insights) {
  insights.forEach(insight => {
    console.log(`Category: ${insight.category}`);
    console.log(`Insight: ${insight.insight}`);
    console.log(`Recommendation: ${insight.recommendation}`);
    console.log(`Priority: ${insight.priority}`);
  });
}
```

### Example 5: Customer Support

```typescript
import { generateSupportResponse } from '@/services/gemini';

const response = await generateSupportResponse(
  "I haven't received my invoice yet",
  [
    { role: 'user', message: 'When will I get my invoice?' },
    { role: 'assistant', message: 'Let me check on that for you.' }
  ],
  {
    businessName: 'QuickLink Pay',
    businessType: 'Payment Processing',
    supportEmail: 'support@quicklinkpay.com',
    supportPhone: '+1-555-0100'
  },
  merchantId
);

console.log(response);
```

---

## Setup Instructions

### 1. Get Google Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the API key

### 2. Configure in Super Admin

1. Navigate to **System > API Management**
2. Click "Add Integration"
3. Select provider: **GOOGLE_GEMINI**
4. Fill in details:
   - Name: "Google Gemini AI"
   - API Key: [your-api-key]
   - API URL: `https://generativelanguage.googleapis.com/v1beta`
   - Model: `gemini-pro` (or `gemini-pro-vision` for images)
   - Status: Active
   - Environment: Production
5. Click "Test Integration" to verify
6. Save configuration

### 3. Create Default Templates

1. Navigate to **AI Prompts**
2. Click "Create Defaults"
3. Confirm to create 6 default templates
4. Templates are now ready to use

### 4. (Optional) Customize Templates

1. Navigate to **AI Prompts**
2. Find the template to customize
3. Click edit (or create new custom template)
4. Modify prompt text, variables, settings
5. Save changes

---

## Cost Estimation

### Gemini Pricing (as of 2024):

- **gemini-pro**: ~$0.00025 per 1K tokens
- **gemini-pro-vision**: ~$0.00025 per 1K tokens (text) + image processing

### Example Costs:

| Use Case | Avg Tokens | Cost per Request | 1000 Requests |
|----------|-----------|------------------|---------------|
| Invoice Extraction | 1500 | $0.000375 | $0.38 |
| Product Description | 800 | $0.0002 | $0.20 |
| Email Generation | 600 | $0.00015 | $0.15 |
| Fraud Detection | 1000 | $0.00025 | $0.25 |
| Business Insights | 1800 | $0.00045 | $0.45 |
| Customer Support | 700 | $0.000175 | $0.18 |

**Note:** Actual costs may vary based on prompt complexity and response length.

---

## Security & Safety

### Safety Settings:

Default safety thresholds block harmful content:

- **Harassment:** Block medium and above
- **Hate Speech:** Block medium and above
- **Sexually Explicit:** Block medium and above
- **Dangerous Content:** Block medium and above

### Best Practices:

1. **API Key Security:**
   - Store in Firestore (encrypted at rest)
   - Never expose in frontend code
   - Rotate keys periodically

2. **Rate Limiting:**
   - Implement request rate limits
   - Monitor usage per merchant
   - Set budget alerts

3. **Data Privacy:**
   - Don't send sensitive customer data unnecessarily
   - Anonymize data when possible
   - Follow GDPR/data protection regulations

4. **Content Validation:**
   - Always validate AI responses
   - Don't trust AI output blindly
   - Implement human review for critical operations

---

## Testing

### Test Configuration:

```typescript
import { testGeminiConfig } from '@/services/gemini';

const isWorking = await testGeminiConfig();
console.log('Gemini Config:', isWorking ? 'Working' : 'Failed');
```

### Test Individual Functions:

```typescript
// Test product description
const desc = await generateProductDescription(
  'Test Product',
  'Test Category',
  ['Feature 1', 'Feature 2'],
  'Test Audience'
);

// Test email generation
const email = await generateEmailContent(
  'Test email',
  'John Doe',
  'Testing context',
  'professional'
);
```

---

## Troubleshooting

### Common Issues:

1. **"Gemini configuration not found"**
   - Solution: Configure Gemini in API Management

2. **"Gemini configuration is not active"**
   - Solution: Set `isActive: true` in configuration

3. **"No response candidates from Gemini"**
   - Possible causes: Content blocked by safety filters, invalid prompt
   - Solution: Check safety ratings, simplify prompt

4. **"Gemini API error: Invalid API key"**
   - Solution: Verify API key is correct and active

5. **High token usage/costs**
   - Solution: Reduce max tokens, optimize prompts, implement caching

### Debug Mode:

Enable test mode in configuration:
```typescript
isTestMode: true
```

This will:
- Add detailed logging
- Return mock responses (optional)
- Not charge to production quota

---

## Future Enhancements

### Potential Additions:

1. **Streaming Responses**
   - Real-time token-by-token responses
   - Better UX for long generations

2. **Function Calling**
   - Let AI call platform functions
   - More interactive AI assistance

3. **Fine-tuned Models**
   - Custom models for specific use cases
   - Better accuracy for domain-specific tasks

4. **Multi-modal Support**
   - Process PDFs, documents
   - Audio transcription and analysis

5. **Response Caching**
   - Cache similar requests
   - Reduce API calls and costs

6. **A/B Testing**
   - Test different prompts
   - Optimize for best results

7. **Merchant-specific Templates**
   - Allow merchants to create custom templates
   - Template marketplace

---

## Summary

The Google Gemini AI integration is now **fully implemented** and ready for use. Super Admins can:

- Configure Gemini API settings
- Manage AI prompt templates
- Create default templates with one click
- Monitor AI usage and costs
- Customize prompts for specific use cases

The integration provides powerful AI features:
- Invoice data extraction from images
- Product description generation
- Email content creation
- Fraud detection and analysis
- Business insights generation
- Customer support automation

All features are production-ready with proper error handling, usage tracking, and cost estimation.

---

**Implementation Complete:** ✅
**Total Lines of Code:** ~2,100 lines
**Services:** 2 (gemini.ts, aiTemplates.ts)
**Pages:** 1 (AIPrompts.tsx)
**Default Templates:** 6
**Documentation:** Complete
