"use strict";
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
exports.cleanupOldMessageEchoes = exports.whatsappWebhook = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const getDb = () => admin.firestore();
/**
 * Process message echo and store in Firestore
 */
async function processMessageEcho(echo, phoneNumberId, wabaId) {
    try {
        // Create unique message key for deduplication
        const messageKey = `${echo.id}-${echo.timestamp}`;
        // Check if message already processed
        const existingMessage = await getDb()
            .collection('whatsappMessageEchoes')
            .doc(messageKey)
            .get();
        if (existingMessage.exists) {
            console.log(`Message echo ${messageKey} already processed, skipping`);
            return;
        }
        // Find merchant by phone number ID
        const merchantQuery = await getDb()
            .collection('merchants')
            .where('whatsappBusiness.phoneNumberId', '==', phoneNumberId)
            .limit(1)
            .get();
        if (merchantQuery.empty) {
            console.warn(`No merchant found for phone number ID: ${phoneNumberId}`);
            return;
        }
        const merchantDoc = merchantQuery.docs[0];
        const merchantId = merchantDoc.id;
        // Store message echo
        await getDb().collection('whatsappMessageEchoes').doc(messageKey).set({
            messageId: echo.id,
            from: echo.from,
            to: echo.to,
            timestamp: echo.timestamp,
            messageType: echo.type,
            content: echo[echo.type] || {}, // Store type-specific content
            merchantId: merchantId,
            phoneNumberId: phoneNumberId,
            wabaId: wabaId,
            source: 'whatsapp_business_app', // Indicates sent from app, not API
            processed: true,
            processedAt: admin.firestore.FieldValue.serverTimestamp(),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        // Update merchant's last activity
        await getDb().collection('merchants').doc(merchantId).update({
            'whatsappBusiness.lastMessageAt': admin.firestore.FieldValue.serverTimestamp(),
            'whatsappBusiness.lastEchoReceivedAt': admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`✅ Processed message echo ${messageKey} for merchant ${merchantId}`);
    }
    catch (error) {
        console.error('Error processing message echo:', error);
        throw error;
    }
}
/**
 * WhatsApp Webhook Endpoint
 *
 * Handles incoming webhooks from 360Dialog
 * - Verification (GET request with hub.verify_token)
 * - Message echoes (POST request with smb_message_echoes)
 */
exports.whatsappWebhook = functions.https.onRequest(async (req, res) => {
    try {
        // Handle webhook verification (GET request)
        if (req.method === 'GET') {
            const mode = req.query['hub.mode'];
            const token = req.query['hub.verify_token'];
            const challenge = req.query['hub.challenge'];
            // Get verification token from Firestore config
            const configDoc = await getDb().collection('systemConfig').doc('whatsapp').get();
            const config = configDoc.data();
            const verifyToken = (config === null || config === void 0 ? void 0 : config.webhookVerifyToken) || process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
            if (mode === 'subscribe' && token === verifyToken) {
                console.log('✅ Webhook verified successfully');
                res.status(200).send(challenge);
                return;
            }
            console.warn('❌ Webhook verification failed');
            res.status(403).send('Forbidden');
            return;
        }
        // Handle webhook payload (POST request)
        if (req.method === 'POST') {
            const payload = req.body;
            // Validate payload structure
            if (!payload.object || !payload.entry || payload.entry.length === 0) {
                console.warn('Invalid webhook payload structure');
                res.status(400).send('Invalid payload');
                return;
            }
            // Process each entry
            for (const entry of payload.entry) {
                const wabaId = entry.id;
                for (const change of entry.changes) {
                    // Check if this is a message echo webhook
                    if (change.field === 'smb_message_echoes') {
                        const echoes = change.value.message_echoes || [];
                        const phoneNumberId = change.value.metadata.phone_number_id;
                        console.log(`Received ${echoes.length} message echoes for phone number ${phoneNumberId}`);
                        // Process each message echo
                        for (const echo of echoes) {
                            try {
                                await processMessageEcho(echo, phoneNumberId, wabaId);
                            }
                            catch (error) {
                                console.error(`Failed to process echo ${echo.id}:`, error);
                                // Continue processing other echoes even if one fails
                            }
                        }
                    }
                }
            }
            // Always return 200 OK to acknowledge receipt
            res.status(200).send('OK');
            return;
        }
        // Unsupported method
        res.status(405).send('Method Not Allowed');
    }
    catch (error) {
        console.error('Webhook processing error:', error);
        res.status(500).send('Internal Server Error');
    }
});
/**
 * Cleanup old message echoes
 *
 * Runs daily to delete echoes older than 30 days
 */
exports.cleanupOldMessageEchoes = functions.pubsub
    .schedule('0 2 * * *') // Run at 2 AM UTC daily
    .timeZone('UTC')
    .onRun(async (context) => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const oldEchoes = await getDb()
            .collection('whatsappMessageEchoes')
            .where('createdAt', '<', admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
            .limit(500)
            .get();
        if (oldEchoes.empty) {
            console.log('No old message echoes to clean up');
            return null;
        }
        const batch = getDb().batch();
        let count = 0;
        oldEchoes.docs.forEach((doc) => {
            batch.delete(doc.ref);
            count++;
        });
        await batch.commit();
        console.log(`✅ Cleaned up ${count} old message echoes`);
        return null;
    }
    catch (error) {
        console.error('Error cleaning up old message echoes:', error);
        return null;
    }
});
//# sourceMappingURL=whatsappWebhook.js.map