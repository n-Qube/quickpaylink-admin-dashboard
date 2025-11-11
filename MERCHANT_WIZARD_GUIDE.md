# Merchant Creation Wizard - Implementation Guide

## Overview

The Merchant Creation Wizard is a comprehensive multi-step form that guides admins through the merchant onboarding process with improved UI/UX, save draft functionality, KYC document uploads, and Ghana-specific Mobile Money wallet support.

## Features Implemented

### ✅ 1. Multi-Step Wizard (6 Steps)

The wizard breaks down merchant creation into logical steps:

1. **Step 1: Business Information**
   - Business name (required)
   - Trading name (optional)
   - Business type selection (required)
   - Registration number (required)
   - Tax ID (optional)
   - Status selection

2. **Step 2: Contact Information**
   - Email address (required)
   - Phone number (required)
   - Website (optional)

3. **Step 3: Address Details**
   - Street address (required)
   - Country selection (required)
   - Region selection (required, cascading from country)
   - City selection (required, cascading from region)
   - Postal code (optional)

4. **Step 4: Payment Methods**
   - **Mobile Money Wallet** (MTN, Vodafone, AirtelTigo)
     - Provider selection
     - Mobile number
     - Account name
     - Option to use the same phone number from contact info
   - **Bank Account** (traditional banking)
     - Account name
     - Account number
     - Bank name
     - Bank code (optional)
     - SWIFT code (optional for international)

5. **Step 5: KYC Document Upload**
   - Business Registration Certificate
   - Tax Identification Certificate
   - Owner ID Card (Ghana Card/Passport/Driver License)
   - Proof of Business Address
   - Bank Statement (Last 3 months)
   - Operating License (if applicable)
   - File validation (PDF, JPG, PNG, max 5MB)
   - Upload to Firebase Storage

6. **Step 6: Review & Submit**
   - Summary of all entered information
   - Edit buttons for each section
   - Final validation before submission

### ✅ 2. Ghana-Specific Mobile Money Support

The wizard includes comprehensive support for Ghana's major mobile money providers:

- **MTN Mobile Money**
  - Prefixes: 024, 054, 055, 059
- **Vodafone Cash**
  - Prefixes: 020, 050
- **AirtelTigo Money**
  - Prefixes: 027, 057, 026, 056

**Key Feature:** Checkbox option to use the same phone number from contact information for Mobile Money wallet (since most Ghanaian SMEs use the same number for business and mobile money).

### ✅ 3. Save Draft Functionality

- **Auto-save to Firestore** (`merchantDrafts` collection)
- Save button in header (available on all steps)
- Draft ID generation and tracking
- Resume from draft capability
- Last saved timestamp

### ✅ 4. Progress Tracking

- Visual progress indicator with step icons
- Completed steps marked with green checkmarks
- Current step highlighted
- Clickable step navigation (can go back to completed steps)
- Step completion validation

### ✅ 5. KYC Document Management

- **Document Types Supported:**
  - Business registration
  - Tax certificate
  - Owner ID
  - Proof of address
  - Bank statement
  - Operating license

- **Upload Features:**
  - Direct upload to Firebase Storage
  - File validation (type and size)
  - Preview uploaded documents
  - Remove/replace documents
  - Upload progress feedback
  - Automatic URL generation

### ✅ 6. Enhanced UI/UX

- **Modern Design:**
  - Two-tone color scheme with primary accents
  - Icon-based step indicators
  - Card-based payment method selection
  - Glass morphism effects
  - Smooth transitions and animations

- **User-Friendly Features:**
  - Contextual help text
  - Field validation with error messages
  - Real-time form validation
  - Disabled next button when required fields are empty
  - Success/error messages with icons
  - Auto-dismiss notifications

- **Accessibility:**
  - Keyboard navigation support
  - Clear labels and descriptions
  - Logical tab order
  - Screen reader friendly

## File Structure

```
/src
  /components
    MerchantWizard.tsx          # Main wizard component (2300+ lines)
  /pages
    Merchants.tsx               # Updated to use wizard (replaced 293 lines of old modal)
```

## Data Model

### Merchant Form Data Structure

```typescript
interface MerchantFormData {
  // Business Information
  businessName: string;
  tradingName?: string;
  businessType: string;
  registrationNumber: string;
  taxId: string;
  status: 'pending' | 'active' | 'suspended' | 'rejected';

  // Contact Information
  contactInfo: {
    email: string;
    phone: string;
    website?: string;
  };

  // Address
  address: {
    street: string;
    city: string;
    region: string;
    country: string;
    postalCode: string;
  };

  // Payment Methods
  paymentMethod: 'bank' | 'mobile_money';
  bankDetails?: {
    accountName: string;
    accountNumber: string;
    bankName: string;
    bankCode?: string;
    swiftCode?: string;
  };
  mobileMoneyWallet?: {
    provider: 'MTN' | 'Vodafone' | 'AirtelTigo';
    number: string;
    accountName: string;
  };

  // KYC Documents
  kycDocuments: Array<{
    id: string;
    type: string;
    name: string;
    url: string;
    status: 'pending' | 'uploaded' | 'verified' | 'rejected';
    uploadedAt: Date;
  }>;

  // Metadata
  draftId?: string;
  completedSteps: number[];
}
```

## Firestore Collections

### 1. `merchantDrafts` Collection

Stores incomplete merchant applications for later completion:

```typescript
{
  draftId: "draft_1234567890",
  isDraft: true,
  lastSaved: Timestamp,
  savedBy: "admin_uid",
  ...formData
}
```

### 2. `merchants` Collection

Final merchant documents:

```typescript
{
  merchantId: "merchant_1234567890",
  businessName: string,
  // ... all merchant data
  createdAt: Timestamp,
  createdBy: "admin_uid",
  onboardedBy: "admin_uid"
}
```

### 3. `merchants/{merchantId}/kycDocuments` Subcollection

KYC documents for each merchant:

```typescript
{
  documentId: "merchant_123_business_registration",
  merchantId: "merchant_123",
  type: "business_registration",
  fileName: "cert.pdf",
  fileUrl: "https://storage.../cert.pdf",
  status: "pending",
  uploadedAt: Timestamp,
  uploadedBy: "admin_uid"
}
```

## Firebase Storage Structure

```
merchant-kyc/
  business_registration_1234567890_certificate.pdf
  tax_certificate_1234567890_tin.pdf
  owner_id_1234567890_ghana_card.jpg
  ...
```

## Usage

### Opening the Wizard

```typescript
// In Merchants.tsx
<MerchantWizard
  isOpen={showModal}
  onClose={() => {
    setShowModal(false);
    setEditingMerchant(null);
  }}
  onSuccess={() => {
    loadMerchants();
  }}
  initialData={editingMerchant || undefined}
  isEditing={!!editingMerchant}
/>
```

### Creating a New Merchant

1. Click "Add Merchant" button on Merchants page
2. Complete Step 1 (Business Information)
3. Click "Next" to proceed to Step 2
4. Continue through all steps
5. Review information on Step 6
6. Click "Create Merchant" to submit

### Saving a Draft

1. Fill in any step (partial or complete)
2. Click "Save Draft" button in the header
3. Draft is saved to Firebase with unique ID
4. Success message displayed
5. Can close wizard and resume later

### Using Mobile Money (Ghana-Specific)

1. On Step 4, select "Mobile Money" payment method
2. Choose provider (MTN, Vodafone, or AirtelTigo)
3. **Option 1:** Check "Use the same phone number from contact information"
   - Mobile Money number auto-fills from Step 2
   - Number field becomes read-only
4. **Option 2:** Enter a different mobile money number
5. Enter account name
6. Continue to next step

### Uploading KYC Documents

1. On Step 5, click "Upload" next to any document type
2. Select file from computer (PDF, JPG, PNG, max 5MB)
3. File uploads to Firebase Storage automatically
4. Success message displayed
5. Document marked as "Uploaded" with green checkmark
6. Can remove and re-upload if needed

## Validation Rules

### Step 1 - Business Information
- Business name: Required
- Business type: Required
- Registration number: Required
- Tax ID: Optional
- Status: Required (defaults to "pending")

### Step 2 - Contact Information
- Email: Required, valid email format
- Phone: Required
- Website: Optional, valid URL format

### Step 3 - Address
- Street address: Required
- Country: Required
- Region: Required (must select country first)
- City: Required (must select region first)
- Postal code: Optional

### Step 4 - Payment Method

**If Mobile Money:**
- Provider: Required
- Number: Required
- Account name: Required

**If Bank Account:**
- Account name: Required
- Account number: Required
- Bank name: Required
- Bank code: Optional
- SWIFT code: Optional

### Step 5 - KYC Documents
- Optional (can be uploaded later)
- File size: Max 5MB per file
- File types: PDF, JPG, JPEG, PNG

### Step 6 - Review
- All previous steps must be valid
- Final confirmation required

## Error Handling

The wizard includes comprehensive error handling:

1. **Validation Errors:**
   - Red text for missing required fields
   - Disabled "Next" button when validation fails
   - Error message banner at top of wizard

2. **Upload Errors:**
   - File size exceeded
   - Invalid file type
   - Upload failed
   - Network errors

3. **Submission Errors:**
   - Firebase write failures
   - Network timeouts
   - Permission errors

4. **Draft Save Errors:**
   - Storage errors
   - Network issues

All errors display user-friendly messages with suggested actions.

## Benefits

### For Admin Users

1. **Guided Process:** Step-by-step wizard reduces confusion
2. **Save & Resume:** Don't lose work if interrupted
3. **Clear Progress:** Always know where you are in the process
4. **Validation:** Catch errors before submission
5. **Preview:** Review everything before final submission

### For Ghanaian SMEs

1. **Mobile Money First:** Recognizes that not all SMEs have bank accounts
2. **Simple Setup:** Use same phone for business and payments
3. **Flexible:** Can add bank details later
4. **Local Context:** Built for Ghana's payment ecosystem

### For System Administrators

1. **Clean Data:** Validation ensures data quality
2. **Complete Records:** All required information captured
3. **Audit Trail:** Track who created/updated merchants
4. **Document Management:** Organized KYC storage
5. **Draft System:** Reduces incomplete submissions

## Best Practices

### Creating Merchants

1. **Prepare Documents:** Have all KYC documents ready before starting
2. **Use Save Draft:** Save progress after each major step
3. **Verify Contact Info:** Double-check email and phone number
4. **Choose Payment Method:** Confirm with merchant which they prefer
5. **Review Carefully:** Check all information on Step 6 before submitting

### Mobile Money Setup

1. **Verify Number:** Confirm mobile money number is registered and active
2. **Check Provider:** Ensure correct provider selected (MTN/Vodafone/AirtelTigo)
3. **Account Name:** Must match name on mobile money account
4. **Test Before Launch:** Send test payout to verify account works

### KYC Documents

1. **Quality Matters:** Upload clear, readable documents
2. **Correct Type:** Ensure document matches the category
3. **File Size:** Compress large files if needed (max 5MB)
4. **Naming:** Use descriptive filenames
5. **Verification:** Review uploaded documents for clarity

## Future Enhancements

Potential improvements for future iterations:

1. **Document Verification:**
   - OCR for automatic data extraction
   - Document validity checking
   - Ghana Card verification API integration

2. **Payment Method Validation:**
   - Mobile money number format validation per provider
   - Real-time account verification
   - Bank account verification service

3. **Enhanced Draft Management:**
   - Draft list view
   - Search/filter drafts
   - Auto-save every N seconds
   - Draft expiration policy

4. **Progress Persistence:**
   - Local storage backup
   - Recover from browser crash
   - Multi-device sync

5. **Bulk Operations:**
   - Import merchants from CSV
   - Bulk document upload
   - Template-based creation

6. **Notifications:**
   - WhatsApp notification to merchant when account created
   - Email confirmation
   - SMS verification for phone number

## Troubleshooting

### "Permission denied" on save
- **Cause:** Firebase Storage rules not configured
- **Fix:** Update Firebase Storage rules to allow admin uploads

### "Failed to upload file"
- **Cause:** File too large or network issue
- **Fix:** Compress file or check internet connection

### "Draft not saving"
- **Cause:** Firestore write permission issue
- **Fix:** Check Firestore rules for `merchantDrafts` collection

### Mobile Money number not auto-filling
- **Cause:** Contact phone number not entered yet
- **Fix:** Go back to Step 2 and enter phone number

### Can't proceed to next step
- **Cause:** Required fields not filled or validation failed
- **Fix:** Check for red error messages and fill missing fields

## Support

For issues or questions:
- Check browser console for detailed error messages
- Review Firebase Console for data/storage issues
- Verify all Firebase rules are properly configured
- Test with different user permissions

---

**Created:** 2025-11-06
**Status:** Production Ready
**Version:** 1.0.0
