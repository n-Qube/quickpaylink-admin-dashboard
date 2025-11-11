"use strict";
/**
 * Input Validation Utilities
 *
 * Comprehensive validation functions for Cloud Functions
 * Prevents injection attacks, validates data formats, and enforces business rules
 *
 * @module utils/validation
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidPhoneNumber = isValidPhoneNumber;
exports.isValidEmail = isValidEmail;
exports.isValidMerchantId = isValidMerchantId;
exports.isValidOTP = isValidOTP;
exports.isValidCurrency = isValidCurrency;
exports.isValidAmount = isValidAmount;
exports.isValidUrl = isValidUrl;
exports.isValidBusinessName = isValidBusinessName;
exports.isValidCountryCode = isValidCountryCode;
exports.sanitizeString = sanitizeString;
exports.isValidInvoiceNumber = isValidInvoiceNumber;
exports.isValidISODate = isValidISODate;
exports.isValidWebhookUrl = isValidWebhookUrl;
exports.isValidApiKey = isValidApiKey;
exports.isValidWabaId = isValidWabaId;
exports.isValidPhoneNumberId = isValidPhoneNumberId;
exports.validateMerchantRegistration = validateMerchantRegistration;
exports.validateInvoiceData = validateInvoiceData;
exports.validateWhatsAppConfig = validateWhatsAppConfig;
exports.throwIfInvalid = throwIfInvalid;
exports.validateAndSanitizeMerchantData = validateAndSanitizeMerchantData;
exports.validateAndSanitizeInvoiceData = validateAndSanitizeInvoiceData;
const functions = __importStar(require("firebase-functions"));
/**
 * Validate phone number format (international format with country code)
 * Accepts: +233XXXXXXXXX, +1XXXXXXXXXX, etc.
 *
 * @param phoneNumber - Phone number to validate
 * @returns true if valid
 */
function isValidPhoneNumber(phoneNumber) {
    if (!phoneNumber || typeof phoneNumber !== 'string') {
        return false;
    }
    // Must start with +, followed by country code (1-3 digits), then 7-15 digits
    const phoneRegex = /^\+[1-9]\d{1,3}\d{7,14}$/;
    return phoneRegex.test(phoneNumber);
}
/**
 * Validate email format
 *
 * @param email - Email to validate
 * @returns true if valid
 */
function isValidEmail(email) {
    if (!email || typeof email !== 'string') {
        return false;
    }
    // RFC 5322 compliant email regex
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
}
/**
 * Validate merchant ID format (Firebase UID)
 *
 * @param merchantId - Merchant ID to validate
 * @returns true if valid
 */
function isValidMerchantId(merchantId) {
    if (!merchantId || typeof merchantId !== 'string') {
        return false;
    }
    // Firebase UIDs are 28 characters, alphanumeric
    return /^[a-zA-Z0-9]{20,28}$/.test(merchantId);
}
/**
 * Validate OTP format (6-digit numeric code)
 *
 * @param otp - OTP to validate
 * @returns true if valid
 */
function isValidOTP(otp) {
    if (!otp || typeof otp !== 'string') {
        return false;
    }
    return /^\d{6}$/.test(otp);
}
/**
 * Validate currency code (ISO 4217)
 *
 * @param currency - Currency code to validate
 * @returns true if valid
 */
function isValidCurrency(currency) {
    if (!currency || typeof currency !== 'string') {
        return false;
    }
    // ISO 4217 currency codes are 3 uppercase letters
    return /^[A-Z]{3}$/.test(currency);
}
/**
 * Validate amount (positive number with up to 2 decimal places)
 *
 * @param amount - Amount to validate
 * @returns true if valid
 */
function isValidAmount(amount) {
    if (typeof amount !== 'number' || isNaN(amount)) {
        return false;
    }
    // Must be positive and have at most 2 decimal places
    return amount > 0 && Number.isFinite(amount) &&
        Math.floor(amount * 100) === amount * 100;
}
/**
 * Validate URL format
 *
 * @param url - URL to validate
 * @param httpsOnly - Require HTTPS (default: true)
 * @returns true if valid
 */
function isValidUrl(url, httpsOnly = true) {
    if (!url || typeof url !== 'string') {
        return false;
    }
    try {
        const urlObj = new URL(url);
        if (httpsOnly && urlObj.protocol !== 'https:') {
            return false;
        }
        return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    }
    catch (_a) {
        return false;
    }
}
/**
 * Validate business name (2-100 characters, alphanumeric plus common symbols)
 *
 * @param name - Business name to validate
 * @returns true if valid
 */
function isValidBusinessName(name) {
    if (!name || typeof name !== 'string') {
        return false;
    }
    const trimmed = name.trim();
    // 2-100 characters, letters, numbers, spaces, and common business symbols
    return trimmed.length >= 2 &&
        trimmed.length <= 100 &&
        /^[a-zA-Z0-9\s\-&',.()\u00C0-\u024F]+$/.test(trimmed);
}
/**
 * Validate country code (ISO 3166-1 alpha-2)
 *
 * @param code - Country code to validate
 * @returns true if valid
 */
function isValidCountryCode(code) {
    if (!code || typeof code !== 'string') {
        return false;
    }
    // ISO 3166-1 alpha-2 codes are 2 uppercase letters
    return /^[A-Z]{2}$/.test(code);
}
/**
 * Sanitize string input (remove potential XSS/injection attacks)
 *
 * @param input - String to sanitize
 * @returns Sanitized string
 */
function sanitizeString(input) {
    if (!input || typeof input !== 'string') {
        return '';
    }
    return input
        .trim()
        .replace(/[<>]/g, '') // Remove < and >
        .replace(/[^\x20-\x7E\u00C0-\u024F]/g, '') // Remove non-printable chars
        .substring(0, 1000); // Limit length
}
/**
 * Validate invoice number format
 *
 * @param invoiceNumber - Invoice number to validate
 * @returns true if valid
 */
function isValidInvoiceNumber(invoiceNumber) {
    if (!invoiceNumber || typeof invoiceNumber !== 'string') {
        return false;
    }
    // 3-50 characters, alphanumeric plus dash and underscore
    return /^[A-Z0-9\-_]{3,50}$/i.test(invoiceNumber);
}
/**
 * Validate date string (ISO 8601 format)
 *
 * @param dateString - Date string to validate
 * @returns true if valid
 */
function isValidISODate(dateString) {
    if (!dateString || typeof dateString !== 'string') {
        return false;
    }
    const date = new Date(dateString);
    return !isNaN(date.getTime());
}
/**
 * Validate webhook URL
 *
 * @param url - Webhook URL to validate
 * @returns true if valid
 */
function isValidWebhookUrl(url) {
    if (!isValidUrl(url, true)) { // Must be HTTPS
        return false;
    }
    try {
        const urlObj = new URL(url);
        // Prevent localhost and private IP ranges
        const hostname = urlObj.hostname.toLowerCase();
        if (hostname === 'localhost' ||
            hostname === '127.0.0.1' ||
            hostname.startsWith('192.168.') ||
            hostname.startsWith('10.') ||
            hostname.startsWith('172.16.')) {
            return false;
        }
        return true;
    }
    catch (_a) {
        return false;
    }
}
/**
 * Validate API key format (360Dialog, Paystack, etc.)
 *
 * @param apiKey - API key to validate
 * @returns true if valid
 */
function isValidApiKey(apiKey) {
    if (!apiKey || typeof apiKey !== 'string') {
        return false;
    }
    // API keys should be 20-200 characters, alphanumeric plus common symbols
    const trimmed = apiKey.trim();
    return trimmed.length >= 20 &&
        trimmed.length <= 200 &&
        /^[a-zA-Z0-9\-_.:]+$/.test(trimmed);
}
/**
 * Validate WhatsApp Business Account ID (WABA ID)
 *
 * @param wabaId - WABA ID to validate
 * @returns true if valid
 */
function isValidWabaId(wabaId) {
    if (!wabaId || typeof wabaId !== 'string') {
        return false;
    }
    // WABA IDs are numeric, typically 15-16 digits
    return /^\d{12,20}$/.test(wabaId);
}
/**
 * Validate Phone Number ID (WhatsApp)
 *
 * @param phoneNumberId - Phone number ID to validate
 * @returns true if valid
 */
function isValidPhoneNumberId(phoneNumberId) {
    if (!phoneNumberId || typeof phoneNumberId !== 'string') {
        return false;
    }
    // Phone number IDs are numeric, typically 15-16 digits
    return /^\d{12,20}$/.test(phoneNumberId);
}
/**
 * Validate merchant data for registration
 *
 * @param data - Merchant registration data
 * @returns Validation result
 */
function validateMerchantRegistration(data) {
    const errors = [];
    // Validate business name
    if (!data.businessName || !isValidBusinessName(data.businessName)) {
        errors.push({
            field: 'businessName',
            message: 'Business name must be 2-100 characters',
            code: 'INVALID_BUSINESS_NAME',
        });
    }
    // Validate email
    if (!data.email || !isValidEmail(data.email)) {
        errors.push({
            field: 'email',
            message: 'Invalid email format',
            code: 'INVALID_EMAIL',
        });
    }
    // Validate phone number
    if (!data.phoneNumber || !isValidPhoneNumber(data.phoneNumber)) {
        errors.push({
            field: 'phoneNumber',
            message: 'Invalid phone number format. Use international format: +233XXXXXXXXX',
            code: 'INVALID_PHONE_NUMBER',
        });
    }
    // Validate country code
    if (!data.countryCode || !isValidCountryCode(data.countryCode)) {
        errors.push({
            field: 'countryCode',
            message: 'Invalid country code. Use ISO 3166-1 alpha-2 format: GH, NG, etc.',
            code: 'INVALID_COUNTRY_CODE',
        });
    }
    return {
        valid: errors.length === 0,
        errors,
    };
}
/**
 * Validate invoice creation data
 *
 * @param data - Invoice data
 * @returns Validation result
 */
function validateInvoiceData(data) {
    const errors = [];
    // Validate invoice number
    if (!data.invoiceNumber || !isValidInvoiceNumber(data.invoiceNumber)) {
        errors.push({
            field: 'invoiceNumber',
            message: 'Invoice number must be 3-50 alphanumeric characters',
            code: 'INVALID_INVOICE_NUMBER',
        });
    }
    // Validate amount
    if (!data.amount || !isValidAmount(data.amount)) {
        errors.push({
            field: 'amount',
            message: 'Amount must be a positive number with up to 2 decimal places',
            code: 'INVALID_AMOUNT',
        });
    }
    // Validate currency
    if (!data.currency || !isValidCurrency(data.currency)) {
        errors.push({
            field: 'currency',
            message: 'Invalid currency code. Use ISO 4217 format: GHS, NGN, USD, etc.',
            code: 'INVALID_CURRENCY',
        });
    }
    // Validate customer phone (if provided)
    if (data.customerPhone && !isValidPhoneNumber(data.customerPhone)) {
        errors.push({
            field: 'customerPhone',
            message: 'Invalid customer phone number format',
            code: 'INVALID_CUSTOMER_PHONE',
        });
    }
    // Validate customer email (if provided)
    if (data.customerEmail && !isValidEmail(data.customerEmail)) {
        errors.push({
            field: 'customerEmail',
            message: 'Invalid customer email format',
            code: 'INVALID_CUSTOMER_EMAIL',
        });
    }
    // Validate due date (if provided)
    if (data.dueDate && !isValidISODate(data.dueDate)) {
        errors.push({
            field: 'dueDate',
            message: 'Invalid due date format. Use ISO 8601 format',
            code: 'INVALID_DUE_DATE',
        });
    }
    return {
        valid: errors.length === 0,
        errors,
    };
}
/**
 * Validate WhatsApp configuration data
 *
 * @param data - WhatsApp configuration
 * @returns Validation result
 */
function validateWhatsAppConfig(data) {
    const errors = [];
    // Validate WABA ID
    if (!data.wabaId || !isValidWabaId(data.wabaId)) {
        errors.push({
            field: 'wabaId',
            message: 'Invalid WhatsApp Business Account ID',
            code: 'INVALID_WABA_ID',
        });
    }
    // Validate Phone Number ID
    if (!data.phoneNumberId || !isValidPhoneNumberId(data.phoneNumberId)) {
        errors.push({
            field: 'phoneNumberId',
            message: 'Invalid WhatsApp Phone Number ID',
            code: 'INVALID_PHONE_NUMBER_ID',
        });
    }
    // Validate API key
    if (!data.apiKey || !isValidApiKey(data.apiKey)) {
        errors.push({
            field: 'apiKey',
            message: 'Invalid API key format',
            code: 'INVALID_API_KEY',
        });
    }
    // Validate webhook URL (if provided)
    if (data.webhookUrl && !isValidWebhookUrl(data.webhookUrl)) {
        errors.push({
            field: 'webhookUrl',
            message: 'Invalid webhook URL. Must be HTTPS and not a private IP',
            code: 'INVALID_WEBHOOK_URL',
        });
    }
    return {
        valid: errors.length === 0,
        errors,
    };
}
/**
 * Throw validation error if data is invalid
 *
 * @param result - Validation result
 * @throws HttpsError with validation details
 */
function throwIfInvalid(result) {
    if (!result.valid) {
        const errorMessages = result.errors
            .map(e => `${e.field}: ${e.message}`)
            .join('; ');
        throw new functions.https.HttpsError('invalid-argument', `Validation failed: ${errorMessages}`, { errors: result.errors });
    }
}
/**
 * Validate and sanitize merchant input data
 *
 * @param data - Raw merchant data
 * @returns Sanitized and validated data
 * @throws HttpsError if validation fails
 */
function validateAndSanitizeMerchantData(data) {
    const result = validateMerchantRegistration(data);
    throwIfInvalid(result);
    return {
        businessName: sanitizeString(data.businessName),
        email: data.email.toLowerCase().trim(),
        phoneNumber: data.phoneNumber.trim(),
        countryCode: data.countryCode.toUpperCase(),
        region: data.region ? sanitizeString(data.region) : null,
        city: data.city ? sanitizeString(data.city) : null,
        businessType: data.businessType ? sanitizeString(data.businessType) : null,
        industry: data.industry ? sanitizeString(data.industry) : null,
    };
}
/**
 * Validate and sanitize invoice input data
 *
 * @param data - Raw invoice data
 * @returns Sanitized and validated data
 * @throws HttpsError if validation fails
 */
function validateAndSanitizeInvoiceData(data) {
    const result = validateInvoiceData(data);
    throwIfInvalid(result);
    return {
        invoiceNumber: data.invoiceNumber.toUpperCase().trim(),
        amount: Number(data.amount),
        currency: data.currency.toUpperCase(),
        customerName: data.customerName ? sanitizeString(data.customerName) : null,
        customerPhone: data.customerPhone ? data.customerPhone.trim() : null,
        customerEmail: data.customerEmail ? data.customerEmail.toLowerCase().trim() : null,
        description: data.description ? sanitizeString(data.description) : null,
        dueDate: data.dueDate || null,
        items: data.items || [],
    };
}
//# sourceMappingURL=validation.js.map