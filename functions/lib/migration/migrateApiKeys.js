"use strict";
/**
 * API Key Migration Functions
 *
 * Migrates API keys from Firestore to Google Cloud Secret Manager
 * This is a one-time migration to move from insecure plaintext storage to secure encrypted storage
 *
 * @module migration/migrateApiKeys
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
exports.verifyMigrationStatus = exports.migrateSystemSecrets = exports.migratePaystackSecrets = exports.migrateWhatsAppApiKeys = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const secretManager_1 = require("../services/secretManager");
const getDb = () => admin.firestore();
/**
 * Migrate WhatsApp API Keys from Firestore to Secret Manager
 *
 * Admin-only function to migrate all merchant WhatsApp API keys
 */
exports.migrateWhatsAppApiKeys = functions.https.onCall(async (data, context) => {
    var _a;
    try {
        // Require authentication
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }
        // TODO: Check if user is admin
        // For now, only allow specific admin UID (should be configured in env)
        const adminUID = process.env.ADMIN_UID || 'ADMIN_UID_NOT_SET';
        if (context.auth.uid !== adminUID) {
            throw new functions.https.HttpsError('permission-denied', 'Only admins can migrate API keys');
        }
        const { dryRun = true } = data; // Default to dry run for safety
        functions.logger.info(`Starting WhatsApp API key migration (dryRun: ${dryRun})`);
        const results = [];
        // Get all merchants with WhatsApp configuration
        const merchantsSnapshot = await getDb()
            .collection('merchants')
            .where('whatsappBusiness.connected', '==', true)
            .get();
        functions.logger.info(`Found ${merchantsSnapshot.size} merchants with WhatsApp connected`);
        for (const merchantDoc of merchantsSnapshot.docs) {
            const merchantId = merchantDoc.id;
            const merchantData = merchantDoc.data();
            try {
                const apiKey = (_a = merchantData.whatsappBusiness) === null || _a === void 0 ? void 0 : _a.apiKey;
                if (!apiKey) {
                    functions.logger.warn(`Merchant ${merchantId} has no API key`);
                    results.push({
                        merchantId,
                        success: false,
                        secretsMigrated: [],
                        error: 'No API key found',
                    });
                    continue;
                }
                if (!dryRun) {
                    // Store API key in Secret Manager
                    await (0, secretManager_1.storeWhatsAppApiKey)(merchantId, apiKey);
                    // Remove API key from Firestore
                    await getDb().collection('merchants').doc(merchantId).update({
                        'whatsappBusiness.apiKey': admin.firestore.FieldValue.delete(),
                        'whatsappBusiness.apiKeyMigrated': true,
                        'whatsappBusiness.apiKeyMigratedAt': admin.firestore.Timestamp.now(),
                    });
                    functions.logger.info(`✅ Migrated WhatsApp API key for merchant ${merchantId}`);
                }
                else {
                    functions.logger.info(`[DRY RUN] Would migrate WhatsApp API key for merchant ${merchantId}`);
                }
                results.push({
                    merchantId,
                    success: true,
                    secretsMigrated: ['whatsappApiKey'],
                });
            }
            catch (error) {
                functions.logger.error(`Error migrating merchant ${merchantId}:`, error);
                results.push({
                    merchantId,
                    success: false,
                    secretsMigrated: [],
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }
        const successCount = results.filter(r => r.success).length;
        const failureCount = results.filter(r => !r.success).length;
        functions.logger.info(`Migration complete: ${successCount} succeeded, ${failureCount} failed`);
        return {
            success: true,
            dryRun,
            totalMerchants: merchantsSnapshot.size,
            successCount,
            failureCount,
            results,
        };
    }
    catch (error) {
        functions.logger.error('Error in WhatsApp API key migration:', error);
        throw new functions.https.HttpsError('internal', 'Failed to migrate WhatsApp API keys', { error: error instanceof Error ? error.message : String(error) });
    }
});
/**
 * Migrate Paystack Secret Keys from Firestore to Secret Manager
 *
 * Admin-only function to migrate all merchant Paystack secret keys
 */
exports.migratePaystackSecrets = functions.https.onCall(async (data, context) => {
    var _a, _b;
    try {
        // Require authentication
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }
        // Check if user is admin
        const adminUID = process.env.ADMIN_UID || 'ADMIN_UID_NOT_SET';
        if (context.auth.uid !== adminUID) {
            throw new functions.https.HttpsError('permission-denied', 'Only admins can migrate API keys');
        }
        const { dryRun = true } = data;
        functions.logger.info(`Starting Paystack secret key migration (dryRun: ${dryRun})`);
        const results = [];
        // Get all merchants with Paystack configuration
        const merchantsSnapshot = await getDb()
            .collection('merchants')
            .where('paymentGateways.paystack.enabled', '==', true)
            .get();
        functions.logger.info(`Found ${merchantsSnapshot.size} merchants with Paystack enabled`);
        for (const merchantDoc of merchantsSnapshot.docs) {
            const merchantId = merchantDoc.id;
            const merchantData = merchantDoc.data();
            try {
                const secretKey = (_b = (_a = merchantData.paymentGateways) === null || _a === void 0 ? void 0 : _a.paystack) === null || _b === void 0 ? void 0 : _b.secretKey;
                if (!secretKey) {
                    functions.logger.warn(`Merchant ${merchantId} has no Paystack secret key`);
                    results.push({
                        merchantId,
                        success: false,
                        secretsMigrated: [],
                        error: 'No secret key found',
                    });
                    continue;
                }
                if (!dryRun) {
                    // Store secret key in Secret Manager
                    await (0, secretManager_1.storePaystackSecret)(merchantId, secretKey);
                    // Remove secret key from Firestore
                    await getDb().collection('merchants').doc(merchantId).update({
                        'paymentGateways.paystack.secretKey': admin.firestore.FieldValue.delete(),
                        'paymentGateways.paystack.secretKeyMigrated': true,
                        'paymentGateways.paystack.secretKeyMigratedAt': admin.firestore.Timestamp.now(),
                    });
                    functions.logger.info(`✅ Migrated Paystack secret for merchant ${merchantId}`);
                }
                else {
                    functions.logger.info(`[DRY RUN] Would migrate Paystack secret for merchant ${merchantId}`);
                }
                results.push({
                    merchantId,
                    success: true,
                    secretsMigrated: ['paystackSecret'],
                });
            }
            catch (error) {
                functions.logger.error(`Error migrating merchant ${merchantId}:`, error);
                results.push({
                    merchantId,
                    success: false,
                    secretsMigrated: [],
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }
        const successCount = results.filter(r => r.success).length;
        const failureCount = results.filter(r => !r.success).length;
        functions.logger.info(`Migration complete: ${successCount} succeeded, ${failureCount} failed`);
        return {
            success: true,
            dryRun,
            totalMerchants: merchantsSnapshot.size,
            successCount,
            failureCount,
            results,
        };
    }
    catch (error) {
        functions.logger.error('Error in Paystack secret migration:', error);
        throw new functions.https.HttpsError('internal', 'Failed to migrate Paystack secrets', { error: error instanceof Error ? error.message : String(error) });
    }
});
/**
 * Migrate System API Keys from Firestore/Config to Secret Manager
 *
 * Admin-only function to migrate system-wide API keys (Gemini, SendGrid, etc.)
 */
exports.migrateSystemSecrets = functions.https.onCall(async (data, context) => {
    try {
        // Require authentication
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }
        // Check if user is admin
        const adminUID = process.env.ADMIN_UID || 'ADMIN_UID_NOT_SET';
        if (context.auth.uid !== adminUID) {
            throw new functions.https.HttpsError('permission-denied', 'Only admins can migrate API keys');
        }
        const { secrets, dryRun = true } = data;
        if (!secrets || typeof secrets !== 'object') {
            throw new functions.https.HttpsError('invalid-argument', 'secrets object is required with format: { geminiApiKey: "...", sendgridApiKey: "...", ... }');
        }
        functions.logger.info(`Starting system secrets migration (dryRun: ${dryRun})`);
        const results = [];
        // Migrate Gemini API Key
        if (secrets.geminiApiKey) {
            try {
                if (!dryRun) {
                    await (0, secretManager_1.storeSystemSecret)(secretManager_1.SecretType.GEMINI_API_KEY, secrets.geminiApiKey);
                    functions.logger.info('✅ Migrated Gemini API key');
                }
                else {
                    functions.logger.info('[DRY RUN] Would migrate Gemini API key');
                }
                results.push({ secretType: 'geminiApiKey', success: true });
            }
            catch (error) {
                functions.logger.error('Error migrating Gemini API key:', error);
                results.push({
                    secretType: 'geminiApiKey',
                    success: false,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }
        // Migrate SendGrid API Key
        if (secrets.sendgridApiKey) {
            try {
                if (!dryRun) {
                    await (0, secretManager_1.storeSystemSecret)(secretManager_1.SecretType.SENDGRID_API_KEY, secrets.sendgridApiKey);
                    functions.logger.info('✅ Migrated SendGrid API key');
                }
                else {
                    functions.logger.info('[DRY RUN] Would migrate SendGrid API key');
                }
                results.push({ secretType: 'sendgridApiKey', success: true });
            }
            catch (error) {
                functions.logger.error('Error migrating SendGrid API key:', error);
                results.push({
                    secretType: 'sendgridApiKey',
                    success: false,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }
        // Migrate Twilio Auth Token
        if (secrets.twilioAuthToken) {
            try {
                if (!dryRun) {
                    await (0, secretManager_1.storeSystemSecret)(secretManager_1.SecretType.TWILIO_AUTH_TOKEN, secrets.twilioAuthToken);
                    functions.logger.info('✅ Migrated Twilio auth token');
                }
                else {
                    functions.logger.info('[DRY RUN] Would migrate Twilio auth token');
                }
                results.push({ secretType: 'twilioAuthToken', success: true });
            }
            catch (error) {
                functions.logger.error('Error migrating Twilio auth token:', error);
                results.push({
                    secretType: 'twilioAuthToken',
                    success: false,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }
        const successCount = results.filter(r => r.success).length;
        const failureCount = results.filter(r => !r.success).length;
        functions.logger.info(`System secrets migration complete: ${successCount} succeeded, ${failureCount} failed`);
        return {
            success: true,
            dryRun,
            totalSecrets: results.length,
            successCount,
            failureCount,
            results,
        };
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        functions.logger.error('Error in system secrets migration:', error);
        throw new functions.https.HttpsError('internal', 'Failed to migrate system secrets', { error: error instanceof Error ? error.message : String(error) });
    }
});
/**
 * Verify API Keys Migration Status
 *
 * Checks migration status for all merchants
 */
exports.verifyMigrationStatus = functions.https.onCall(async (data, context) => {
    try {
        // Require authentication
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }
        // Check if user is admin
        const adminUID = process.env.ADMIN_UID || 'ADMIN_UID_NOT_SET';
        if (context.auth.uid !== adminUID) {
            throw new functions.https.HttpsError('permission-denied', 'Only admins can verify migration status');
        }
        // Count merchants with WhatsApp
        const whatsappMerchantsSnapshot = await getDb()
            .collection('merchants')
            .where('whatsappBusiness.connected', '==', true)
            .get();
        const whatsappMigrated = whatsappMerchantsSnapshot.docs.filter(doc => { var _a; return ((_a = doc.data().whatsappBusiness) === null || _a === void 0 ? void 0 : _a.apiKeyMigrated) === true; }).length;
        const whatsappNotMigrated = whatsappMerchantsSnapshot.docs.filter(doc => {
            var _a, _b;
            return ((_a = doc.data().whatsappBusiness) === null || _a === void 0 ? void 0 : _a.apiKeyMigrated) !== true &&
                ((_b = doc.data().whatsappBusiness) === null || _b === void 0 ? void 0 : _b.apiKey);
        }).length;
        // Count merchants with Paystack
        const paystackMerchantsSnapshot = await getDb()
            .collection('merchants')
            .where('paymentGateways.paystack.enabled', '==', true)
            .get();
        const paystackMigrated = paystackMerchantsSnapshot.docs.filter(doc => { var _a, _b; return ((_b = (_a = doc.data().paymentGateways) === null || _a === void 0 ? void 0 : _a.paystack) === null || _b === void 0 ? void 0 : _b.secretKeyMigrated) === true; }).length;
        const paystackNotMigrated = paystackMerchantsSnapshot.docs.filter(doc => {
            var _a, _b, _c, _d;
            return ((_b = (_a = doc.data().paymentGateways) === null || _a === void 0 ? void 0 : _a.paystack) === null || _b === void 0 ? void 0 : _b.secretKeyMigrated) !== true &&
                ((_d = (_c = doc.data().paymentGateways) === null || _c === void 0 ? void 0 : _c.paystack) === null || _d === void 0 ? void 0 : _d.secretKey);
        }).length;
        return {
            success: true,
            whatsapp: {
                total: whatsappMerchantsSnapshot.size,
                migrated: whatsappMigrated,
                notMigrated: whatsappNotMigrated,
                percentComplete: whatsappMerchantsSnapshot.size > 0
                    ? Math.round((whatsappMigrated / whatsappMerchantsSnapshot.size) * 100)
                    : 0,
            },
            paystack: {
                total: paystackMerchantsSnapshot.size,
                migrated: paystackMigrated,
                notMigrated: paystackNotMigrated,
                percentComplete: paystackMerchantsSnapshot.size > 0
                    ? Math.round((paystackMigrated / paystackMerchantsSnapshot.size) * 100)
                    : 0,
            },
        };
    }
    catch (error) {
        functions.logger.error('Error verifying migration status:', error);
        throw new functions.https.HttpsError('internal', 'Failed to verify migration status', { error: error instanceof Error ? error.message : String(error) });
    }
});
//# sourceMappingURL=migrateApiKeys.js.map