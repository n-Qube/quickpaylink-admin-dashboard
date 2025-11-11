"use strict";
/**
 * Secret Manager Service
 *
 * Securely stores and retrieves sensitive data like API keys using Google Cloud Secret Manager
 *
 * @module services/secretManager
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
exports.SecretType = void 0;
exports.storeSecret = storeSecret;
exports.getSecret = getSecret;
exports.deleteSecret = deleteSecret;
exports.storeWhatsAppApiKey = storeWhatsAppApiKey;
exports.getWhatsAppApiKey = getWhatsAppApiKey;
exports.storePaystackSecret = storePaystackSecret;
exports.getPaystackSecret = getPaystackSecret;
exports.storeSystemSecret = storeSystemSecret;
exports.getSystemSecret = getSystemSecret;
exports.rotateSecret = rotateSecret;
exports.listMerchantSecrets = listMerchantSecrets;
const secret_manager_1 = require("@google-cloud/secret-manager");
const functions = __importStar(require("firebase-functions"));
const client = new secret_manager_1.SecretManagerServiceClient();
const projectId = process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT;
/**
 * Secret name patterns for different types of secrets
 */
var SecretType;
(function (SecretType) {
    SecretType["WHATSAPP_API_KEY"] = "whatsapp-api-key";
    SecretType["PAYSTACK_SECRET"] = "paystack-secret";
    SecretType["GEMINI_API_KEY"] = "gemini-api-key";
    SecretType["SENDGRID_API_KEY"] = "sendgrid-api-key";
    SecretType["TWILIO_AUTH_TOKEN"] = "twilio-auth-token";
})(SecretType || (exports.SecretType = SecretType = {}));
/**
 * Create or update a secret in Google Cloud Secret Manager
 *
 * @param secretName - Name of the secret
 * @param secretValue - Value to store
 * @param merchantId - Optional merchant ID for merchant-specific secrets
 * @returns Secret resource name
 */
async function storeSecret(secretName, secretValue, merchantId) {
    try {
        const fullSecretName = merchantId
            ? `${secretName}-${merchantId}`
            : secretName;
        const parent = `projects/${projectId}`;
        // Check if secret already exists
        let secretExists = false;
        try {
            await client.getSecret({
                name: `${parent}/secrets/${fullSecretName}`,
            });
            secretExists = true;
        }
        catch (error) {
            if (error.code !== 5) { // NOT_FOUND error code
                throw error;
            }
        }
        // Create secret if it doesn't exist
        if (!secretExists) {
            await client.createSecret({
                parent: parent,
                secretId: fullSecretName,
                secret: {
                    replication: {
                        automatic: {},
                    },
                },
            });
            functions.logger.info(`Created new secret: ${fullSecretName}`);
        }
        // Add new version with the secret value
        const [version] = await client.addSecretVersion({
            parent: `${parent}/secrets/${fullSecretName}`,
            payload: {
                data: Buffer.from(secretValue, 'utf8'),
            },
        });
        functions.logger.info(`Stored secret version: ${version.name}`);
        return version.name;
    }
    catch (error) {
        functions.logger.error('Error storing secret:', error);
        throw new functions.https.HttpsError('internal', 'Failed to store secret', error);
    }
}
/**
 * Retrieve a secret value from Google Cloud Secret Manager
 *
 * @param secretName - Name of the secret
 * @param merchantId - Optional merchant ID for merchant-specific secrets
 * @param version - Version to retrieve (default: 'latest')
 * @returns Secret value as string
 */
async function getSecret(secretName, merchantId, version = 'latest') {
    var _a, _b;
    try {
        const fullSecretName = merchantId
            ? `${secretName}-${merchantId}`
            : secretName;
        const name = `projects/${projectId}/secrets/${fullSecretName}/versions/${version}`;
        const [accessResponse] = await client.accessSecretVersion({ name });
        const secretValue = ((_b = (_a = accessResponse.payload) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.toString()) || '';
        if (!secretValue) {
            throw new Error('Secret value is empty');
        }
        return secretValue;
    }
    catch (error) {
        functions.logger.error(`Error retrieving secret ${secretName}:`, error);
        throw new functions.https.HttpsError('not-found', 'Failed to retrieve secret', error);
    }
}
/**
 * Delete a secret from Google Cloud Secret Manager
 *
 * @param secretName - Name of the secret
 * @param merchantId - Optional merchant ID for merchant-specific secrets
 */
async function deleteSecret(secretName, merchantId) {
    try {
        const fullSecretName = merchantId
            ? `${secretName}-${merchantId}`
            : secretName;
        const name = `projects/${projectId}/secrets/${fullSecretName}`;
        await client.deleteSecret({ name });
        functions.logger.info(`Deleted secret: ${fullSecretName}`);
    }
    catch (error) {
        functions.logger.error(`Error deleting secret ${secretName}:`, error);
        throw new functions.https.HttpsError('internal', 'Failed to delete secret', error);
    }
}
/**
 * Store WhatsApp API key for a merchant
 *
 * @param merchantId - Merchant ID
 * @param apiKey - WhatsApp API key from 360Dialog
 * @returns Secret version name
 */
async function storeWhatsAppApiKey(merchantId, apiKey) {
    return storeSecret(SecretType.WHATSAPP_API_KEY, apiKey, merchantId);
}
/**
 * Retrieve WhatsApp API key for a merchant
 *
 * @param merchantId - Merchant ID
 * @returns WhatsApp API key
 */
async function getWhatsAppApiKey(merchantId) {
    return getSecret(SecretType.WHATSAPP_API_KEY, merchantId);
}
/**
 * Store Paystack secret key for a merchant
 *
 * @param merchantId - Merchant ID
 * @param secretKey - Paystack secret key
 * @returns Secret version name
 */
async function storePaystackSecret(merchantId, secretKey) {
    return storeSecret(SecretType.PAYSTACK_SECRET, secretKey, merchantId);
}
/**
 * Retrieve Paystack secret key for a merchant
 *
 * @param merchantId - Merchant ID
 * @returns Paystack secret key
 */
async function getPaystackSecret(merchantId) {
    return getSecret(SecretType.PAYSTACK_SECRET, merchantId);
}
/**
 * Store system-wide API keys (not merchant-specific)
 *
 * @param secretType - Type of secret (GEMINI_API_KEY, SENDGRID_API_KEY, etc.)
 * @param apiKey - API key value
 * @returns Secret version name
 */
async function storeSystemSecret(secretType, apiKey) {
    return storeSecret(secretType, apiKey);
}
/**
 * Retrieve system-wide API keys
 *
 * @param secretType - Type of secret
 * @returns API key value
 */
async function getSystemSecret(secretType) {
    return getSecret(secretType);
}
/**
 * Rotate a secret by creating a new version and disabling old versions
 *
 * @param secretName - Name of the secret
 * @param newValue - New secret value
 * @param merchantId - Optional merchant ID
 * @returns New secret version name
 */
async function rotateSecret(secretName, newValue, merchantId) {
    try {
        const fullSecretName = merchantId
            ? `${secretName}-${merchantId}`
            : secretName;
        // Add new version
        const versionName = await storeSecret(secretName, newValue, merchantId);
        // Disable all previous versions except the latest
        const parent = `projects/${projectId}/secrets/${fullSecretName}`;
        const [versions] = await client.listSecretVersions({ parent });
        if (versions && versions.length > 1) {
            for (const version of versions.slice(1)) { // Skip first (latest)
                if (version.state === 'ENABLED') {
                    await client.disableSecretVersion({ name: version.name });
                    functions.logger.info(`Disabled old secret version: ${version.name}`);
                }
            }
        }
        return versionName;
    }
    catch (error) {
        functions.logger.error('Error rotating secret:', error);
        throw new functions.https.HttpsError('internal', 'Failed to rotate secret', error);
    }
}
/**
 * List all secrets for a merchant
 *
 * @param merchantId - Merchant ID
 * @returns Array of secret names
 */
async function listMerchantSecrets(merchantId) {
    try {
        const parent = `projects/${projectId}`;
        const [secrets] = await client.listSecrets({ parent });
        const merchantSecrets = secrets
            .filter(secret => { var _a; return (_a = secret.name) === null || _a === void 0 ? void 0 : _a.includes(`-${merchantId}`); })
            .map(secret => {
            const parts = secret.name.split('/');
            return parts[parts.length - 1];
        });
        return merchantSecrets;
    }
    catch (error) {
        functions.logger.error('Error listing merchant secrets:', error);
        throw new functions.https.HttpsError('internal', 'Failed to list secrets', error);
    }
}
//# sourceMappingURL=secretManager.js.map