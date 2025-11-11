/**
 * Secret Manager Service
 *
 * Securely stores and retrieves sensitive data like API keys using Google Cloud Secret Manager
 *
 * @module services/secretManager
 */

import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import * as functions from 'firebase-functions';

const client = new SecretManagerServiceClient();
const projectId = process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT;

/**
 * Secret name patterns for different types of secrets
 */
export enum SecretType {
  WHATSAPP_API_KEY = 'whatsapp-api-key',
  PAYSTACK_SECRET = 'paystack-secret',
  GEMINI_API_KEY = 'gemini-api-key',
  SENDGRID_API_KEY = 'sendgrid-api-key',
  TWILIO_AUTH_TOKEN = 'twilio-auth-token',
}

/**
 * Create or update a secret in Google Cloud Secret Manager
 *
 * @param secretName - Name of the secret
 * @param secretValue - Value to store
 * @param merchantId - Optional merchant ID for merchant-specific secrets
 * @returns Secret resource name
 */
export async function storeSecret(
  secretName: string,
  secretValue: string,
  merchantId?: string
): Promise<string> {
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
    } catch (error: any) {
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
    return version.name!;
  } catch (error) {
    functions.logger.error('Error storing secret:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to store secret',
      error
    );
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
export async function getSecret(
  secretName: string,
  merchantId?: string,
  version: string = 'latest'
): Promise<string> {
  try {
    const fullSecretName = merchantId
      ? `${secretName}-${merchantId}`
      : secretName;

    const name = `projects/${projectId}/secrets/${fullSecretName}/versions/${version}`;

    const [accessResponse] = await client.accessSecretVersion({ name });

    const secretValue = accessResponse.payload?.data?.toString() || '';

    if (!secretValue) {
      throw new Error('Secret value is empty');
    }

    return secretValue;
  } catch (error) {
    functions.logger.error(`Error retrieving secret ${secretName}:`, error);
    throw new functions.https.HttpsError(
      'not-found',
      'Failed to retrieve secret',
      error
    );
  }
}

/**
 * Delete a secret from Google Cloud Secret Manager
 *
 * @param secretName - Name of the secret
 * @param merchantId - Optional merchant ID for merchant-specific secrets
 */
export async function deleteSecret(
  secretName: string,
  merchantId?: string
): Promise<void> {
  try {
    const fullSecretName = merchantId
      ? `${secretName}-${merchantId}`
      : secretName;

    const name = `projects/${projectId}/secrets/${fullSecretName}`;

    await client.deleteSecret({ name });

    functions.logger.info(`Deleted secret: ${fullSecretName}`);
  } catch (error) {
    functions.logger.error(`Error deleting secret ${secretName}:`, error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to delete secret',
      error
    );
  }
}

/**
 * Store WhatsApp API key for a merchant
 *
 * @param merchantId - Merchant ID
 * @param apiKey - WhatsApp API key from 360Dialog
 * @returns Secret version name
 */
export async function storeWhatsAppApiKey(
  merchantId: string,
  apiKey: string
): Promise<string> {
  return storeSecret(SecretType.WHATSAPP_API_KEY, apiKey, merchantId);
}

/**
 * Retrieve WhatsApp API key for a merchant
 *
 * @param merchantId - Merchant ID
 * @returns WhatsApp API key
 */
export async function getWhatsAppApiKey(merchantId: string): Promise<string> {
  return getSecret(SecretType.WHATSAPP_API_KEY, merchantId);
}

/**
 * Store Paystack secret key for a merchant
 *
 * @param merchantId - Merchant ID
 * @param secretKey - Paystack secret key
 * @returns Secret version name
 */
export async function storePaystackSecret(
  merchantId: string,
  secretKey: string
): Promise<string> {
  return storeSecret(SecretType.PAYSTACK_SECRET, secretKey, merchantId);
}

/**
 * Retrieve Paystack secret key for a merchant
 *
 * @param merchantId - Merchant ID
 * @returns Paystack secret key
 */
export async function getPaystackSecret(merchantId: string): Promise<string> {
  return getSecret(SecretType.PAYSTACK_SECRET, merchantId);
}

/**
 * Store system-wide API keys (not merchant-specific)
 *
 * @param secretType - Type of secret (GEMINI_API_KEY, SENDGRID_API_KEY, etc.)
 * @param apiKey - API key value
 * @returns Secret version name
 */
export async function storeSystemSecret(
  secretType: SecretType,
  apiKey: string
): Promise<string> {
  return storeSecret(secretType, apiKey);
}

/**
 * Retrieve system-wide API keys
 *
 * @param secretType - Type of secret
 * @returns API key value
 */
export async function getSystemSecret(secretType: SecretType): Promise<string> {
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
export async function rotateSecret(
  secretName: string,
  newValue: string,
  merchantId?: string
): Promise<string> {
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
          await client.disableSecretVersion({ name: version.name! });
          functions.logger.info(`Disabled old secret version: ${version.name}`);
        }
      }
    }

    return versionName;
  } catch (error) {
    functions.logger.error('Error rotating secret:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to rotate secret',
      error
    );
  }
}

/**
 * List all secrets for a merchant
 *
 * @param merchantId - Merchant ID
 * @returns Array of secret names
 */
export async function listMerchantSecrets(merchantId: string): Promise<string[]> {
  try {
    const parent = `projects/${projectId}`;
    const [secrets] = await client.listSecrets({ parent });

    const merchantSecrets = secrets
      .filter(secret => secret.name?.includes(`-${merchantId}`))
      .map(secret => {
        const parts = secret.name!.split('/');
        return parts[parts.length - 1];
      });

    return merchantSecrets;
  } catch (error) {
    functions.logger.error('Error listing merchant secrets:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to list secrets',
      error
    );
  }
}
