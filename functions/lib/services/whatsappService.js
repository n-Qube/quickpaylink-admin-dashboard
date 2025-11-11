"use strict";
/**
 * WhatsApp Service for Cloud Functions
 *
 * Integrates with 360Dialog API to send WhatsApp messages
 * Used for OTP verification, notifications, and business messages
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWhatsAppConfig = getWhatsAppConfig;
exports.getTemplateByCategory = getTemplateByCategory;
exports.sendWhatsAppOTP = sendWhatsAppOTP;
exports.sendBusinessVerificationMessage = sendBusinessVerificationMessage;
exports.sendWhatsAppBusinessConnectedMessage = sendWhatsAppBusinessConnectedMessage;
const admin = __importStar(require("firebase-admin"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const getDb = () => admin.firestore();
/**
 * Get WhatsApp configuration from Firestore
 */
async function getWhatsAppConfig() {
    try {
        const configDoc = await getDb().collection('systemConfig').doc('whatsapp').get();
        if (!configDoc.exists) {
            console.error('⚠️  WhatsApp config not found in Firestore');
            return null;
        }
        const data = configDoc.data();
        if (!(data === null || data === void 0 ? void 0 : data.isActive)) {
            console.error('⚠️  WhatsApp integration is not active');
            return null;
        }
        return {
            apiKey: data.apiKey,
            phoneNumberId: data.phoneNumberId,
            apiUrl: data.apiUrl || 'https://waba.360dialog.io/v1',
            isActive: data.isActive,
        };
    }
    catch (error) {
        console.error('❌ Error fetching WhatsApp config:', error);
        return null;
    }
}
/**
 * Get WhatsApp template by category
 */
async function getTemplateByCategory(category) {
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
    }
    catch (error) {
        console.error('❌ Error fetching WhatsApp template:', error);
        return null;
    }
}
/**
 * Send WhatsApp message via 360Dialog API
 */
async function send360DialogMessage(config, to, template, variables) {
    var _a, _b, _c;
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
        const response = await (0, node_fetch_1.default)(`${config.apiUrl}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'D360-API-KEY': config.apiKey,
            },
            body: JSON.stringify(requestBody),
        });
        const responseData = await response.json();
        if (!response.ok) {
            throw new Error(`360Dialog API error: ${((_a = responseData.error) === null || _a === void 0 ? void 0 : _a.message) || 'Unknown error'}`);
        }
        return {
            success: true,
            messageId: (_c = (_b = responseData.messages) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.id,
        };
    }
    catch (error) {
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
async function sendWhatsAppOTP(phoneNumber, otp) {
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
    }
    catch (error) {
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
async function sendBusinessVerificationMessage(phoneNumber, businessName, merchantId) {
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
    }
    catch (error) {
        return { success: false, error: error.message };
    }
}
/**
 * Send WhatsApp Business connection success message
 */
async function sendWhatsAppBusinessConnectedMessage(phoneNumber, businessName, merchantId) {
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
    }
    catch (error) {
        return { success: false, error: error.message };
    }
}
//# sourceMappingURL=whatsappService.js.map