"use strict";
/**
 * Rate Limiting Utility for Cloud Functions
 *
 * Provides flexible rate limiting with different strategies:
 * - Per user (authenticated requests)
 * - Per IP address (unauthenticated requests)
 * - Per phone number (OTP/auth flows)
 * - Per merchant (merchant-specific operations)
 * - Global (system-wide limits)
 *
 * Uses Firestore for distributed rate limiting across function instances.
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
exports.RATE_LIMITS = void 0;
exports.getRateLimitIdentifier = getRateLimitIdentifier;
exports.checkRateLimit = checkRateLimit;
exports.rateLimitMiddleware = rateLimitMiddleware;
exports.cleanupRateLimits = cleanupRateLimits;
exports.resetRateLimit = resetRateLimit;
exports.getRateLimitStatus = getRateLimitStatus;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
// Lazy-load Firestore to avoid initialization errors
const getDb = () => admin.firestore();
/**
 * Predefined rate limit configurations
 */
exports.RATE_LIMITS = {
    // OTP Operations (very strict)
    OTP_SEND: {
        maxRequests: 5,
        windowMs: 60 * 60 * 1000, // 1 hour
        message: 'Too many OTP requests. Please try again in an hour.',
    },
    OTP_VERIFY: {
        maxRequests: 10,
        windowMs: 10 * 60 * 1000, // 10 minutes
        message: 'Too many verification attempts. Please wait before trying again.',
    },
    // Authentication (strict)
    AUTH_LOGIN: {
        maxRequests: 10,
        windowMs: 15 * 60 * 1000, // 15 minutes
        message: 'Too many login attempts. Please try again later.',
    },
    AUTH_PASSWORD_RESET: {
        maxRequests: 3,
        windowMs: 60 * 60 * 1000, // 1 hour
        message: 'Too many password reset requests. Please try again in an hour.',
    },
    // Payment Operations (moderate)
    PAYMENT_CREATE: {
        maxRequests: 50,
        windowMs: 60 * 60 * 1000, // 1 hour
        message: 'Too many payment requests. Please try again later.',
    },
    PAYOUT_REQUEST: {
        maxRequests: 10,
        windowMs: 60 * 60 * 1000, // 1 hour
        message: 'Too many payout requests. Please try again later.',
    },
    // API Operations (moderate-lenient)
    API_READ: {
        maxRequests: 1000,
        windowMs: 60 * 60 * 1000, // 1 hour
        message: 'API rate limit exceeded. Please slow down.',
    },
    API_WRITE: {
        maxRequests: 500,
        windowMs: 60 * 60 * 1000, // 1 hour
        message: 'API rate limit exceeded. Please slow down.',
    },
    // Email/SMS Operations (moderate)
    EMAIL_SEND: {
        maxRequests: 100,
        windowMs: 60 * 60 * 1000, // 1 hour
        message: 'Too many emails sent. Please try again later.',
    },
    SMS_SEND: {
        maxRequests: 50,
        windowMs: 60 * 60 * 1000, // 1 hour
        message: 'Too many SMS sent. Please try again later.',
    },
    WHATSAPP_SEND: {
        maxRequests: 100,
        windowMs: 60 * 60 * 1000, // 1 hour
        message: 'Too many WhatsApp messages sent. Please try again later.',
    },
    // Admin Operations (lenient)
    ADMIN_OPERATION: {
        maxRequests: 500,
        windowMs: 60 * 60 * 1000, // 1 hour
        message: 'Admin operation rate limit exceeded.',
    },
    // Default (lenient)
    DEFAULT: {
        maxRequests: 100,
        windowMs: 60 * 60 * 1000, // 1 hour
        message: 'Rate limit exceeded. Please try again later.',
    },
};
/**
 * Get rate limit identifier based on context
 */
function getRateLimitIdentifier(context, type, customId) {
    var _a, _b;
    switch (type) {
        case 'user':
            return ((_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid) || context.rawRequest.ip || 'anonymous';
        case 'ip':
            return context.rawRequest.ip || 'unknown-ip';
        case 'phoneNumber':
            return customId || context.rawRequest.ip || 'unknown';
        case 'merchant':
            return ((_b = context.auth) === null || _b === void 0 ? void 0 : _b.uid) || context.rawRequest.ip || 'anonymous-merchant';
        case 'global':
            return 'global';
        default:
            return context.rawRequest.ip || 'unknown';
    }
}
/**
 * Check rate limit for a function
 *
 * @param functionName - Name of the Cloud Function
 * @param identifier - Unique identifier (user ID, IP, phone number, etc.)
 * @param config - Rate limit configuration
 * @returns True if within rate limit, false if exceeded
 */
async function checkRateLimit(functionName, identifier, config) {
    const now = admin.firestore.Timestamp.now();
    const windowStart = admin.firestore.Timestamp.fromMillis(now.toMillis() - config.windowMs);
    // Create a unique document ID for this function + identifier combination
    const rateLimitId = `${functionName}_${identifier}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    const rateLimitRef = getDb().collection('rateLimits').doc(rateLimitId);
    try {
        // Use transaction to ensure atomic read-modify-write
        const result = await getDb().runTransaction(async (transaction) => {
            const doc = await transaction.get(rateLimitRef);
            let requests = [];
            if (doc.exists) {
                const data = doc.data();
                // Filter out requests outside the time window
                requests = data.requests.filter((req) => req.timestamp.toMillis() > windowStart.toMillis());
            }
            // Check if limit exceeded
            const currentCount = requests.length;
            const allowed = currentCount < config.maxRequests;
            if (allowed) {
                // Add new request timestamp
                requests.push({ timestamp: now });
                // Update or create the rate limit record
                transaction.set(rateLimitRef, {
                    identifier,
                    functionName,
                    requests,
                    createdAt: doc.exists
                        ? doc.data().createdAt
                        : now,
                    updatedAt: now,
                }, { merge: true });
            }
            // Calculate reset time (when the oldest request will expire)
            const oldestRequest = requests[0];
            const resetAt = oldestRequest
                ? new Date(oldestRequest.timestamp.toMillis() + config.windowMs)
                : new Date(now.toMillis() + config.windowMs);
            return {
                allowed,
                remaining: Math.max(0, config.maxRequests - currentCount - (allowed ? 1 : 0)),
                resetAt,
            };
        });
        return result;
    }
    catch (error) {
        console.error('Rate limit check failed:', error);
        // In case of error, allow the request (fail open)
        // This prevents rate limiting issues from blocking legitimate requests
        return {
            allowed: true,
            remaining: config.maxRequests,
            resetAt: new Date(now.toMillis() + config.windowMs),
        };
    }
}
/**
 * Rate limit middleware for Cloud Functions
 *
 * Usage:
 * ```typescript
 * export const myFunction = functions.https.onCall(
 *   async (data, context) => {
 *     await rateLimitMiddleware(context, 'myFunction', RATE_LIMITS.API_WRITE);
 *     // Function logic here
 *   }
 * );
 * ```
 */
async function rateLimitMiddleware(context, functionName, config, identifierType = 'user', customIdentifier) {
    // Skip rate limiting if configured
    if (config.skip && config.skip(context)) {
        return;
    }
    // Skip rate limiting in emulator mode
    if (process.env.FUNCTIONS_EMULATOR === 'true') {
        console.log(`⚠️  Rate Limiting: Skipped in emulator for ${functionName}`);
        return;
    }
    const identifier = getRateLimitIdentifier(context, identifierType, customIdentifier);
    const { allowed, remaining, resetAt } = await checkRateLimit(functionName, identifier, config);
    if (!allowed) {
        const resetInMinutes = Math.ceil((resetAt.getTime() - Date.now()) / 60000);
        const errorMessage = config.message ||
            `Rate limit exceeded. Try again in ${resetInMinutes} minute(s).`;
        console.warn(`Rate limit exceeded for ${functionName}:`, {
            identifier,
            resetAt: resetAt.toISOString(),
        });
        throw new functions.https.HttpsError('resource-exhausted', errorMessage, {
            resetAt: resetAt.toISOString(),
            remaining: 0,
        });
    }
    // Log successful rate limit check
    console.log(`Rate limit OK for ${functionName}:`, {
        identifier,
        remaining,
        resetAt: resetAt.toISOString(),
    });
}
/**
 * Clean up old rate limit records (run periodically)
 *
 * This function should be called by a scheduled Cloud Function
 * to clean up rate limit records older than 24 hours.
 */
async function cleanupRateLimits() {
    const twentyFourHoursAgo = admin.firestore.Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);
    const oldRecords = await getDb()
        .collection('rateLimits')
        .where('updatedAt', '<', twentyFourHoursAgo)
        .limit(500) // Process in batches
        .get();
    if (oldRecords.empty) {
        return 0;
    }
    const batch = getDb().batch();
    oldRecords.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });
    await batch.commit();
    console.log(`Cleaned up ${oldRecords.size} old rate limit records`);
    return oldRecords.size;
}
/**
 * Reset rate limit for a specific identifier (admin function)
 *
 * Useful for manually clearing rate limits for specific users/IPs
 */
async function resetRateLimit(functionName, identifier) {
    const rateLimitId = `${functionName}_${identifier}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    const rateLimitRef = getDb().collection('rateLimits').doc(rateLimitId);
    try {
        await rateLimitRef.delete();
        console.log(`Reset rate limit for ${functionName}:${identifier}`);
        return true;
    }
    catch (error) {
        console.error('Failed to reset rate limit:', error);
        return false;
    }
}
/**
 * Get rate limit status for an identifier
 *
 * Useful for checking current rate limit status without incrementing
 */
async function getRateLimitStatus(functionName, identifier, config) {
    const rateLimitId = `${functionName}_${identifier}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    const rateLimitRef = getDb().collection('rateLimits').doc(rateLimitId);
    const doc = await rateLimitRef.get();
    const now = admin.firestore.Timestamp.now();
    const windowStart = admin.firestore.Timestamp.fromMillis(now.toMillis() - config.windowMs);
    let requests = [];
    if (doc.exists) {
        const data = doc.data();
        requests = data.requests.filter((req) => req.timestamp.toMillis() > windowStart.toMillis());
    }
    const current = requests.length;
    const remaining = Math.max(0, config.maxRequests - current);
    const oldestRequest = requests[0];
    const resetAt = oldestRequest
        ? new Date(oldestRequest.timestamp.toMillis() + config.windowMs)
        : new Date(now.toMillis() + config.windowMs);
    return {
        current,
        limit: config.maxRequests,
        remaining,
        resetAt,
    };
}
//# sourceMappingURL=rateLimiter.js.map