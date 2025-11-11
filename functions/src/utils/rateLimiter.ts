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

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

// Lazy-load Firestore to avoid initialization errors
const getDb = () => admin.firestore();

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /** Maximum number of requests allowed */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Custom error message */
  message?: string;
  /** Skip rate limiting for certain conditions */
  skip?: (context: functions.https.CallableContext) => boolean;
}

/**
 * Rate limit record stored in Firestore
 */
interface RateLimitRecord {
  identifier: string;
  functionName: string;
  requests: Array<{
    timestamp: admin.firestore.Timestamp;
    context?: string;
  }>;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

/**
 * Predefined rate limit configurations
 */
export const RATE_LIMITS = {
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
} as const;

/**
 * Get rate limit identifier based on context
 */
export function getRateLimitIdentifier(
  context: functions.https.CallableContext,
  type: 'user' | 'ip' | 'phoneNumber' | 'merchant' | 'global',
  customId?: string
): string {
  switch (type) {
    case 'user':
      return context.auth?.uid || context.rawRequest.ip || 'anonymous';
    case 'ip':
      return context.rawRequest.ip || 'unknown-ip';
    case 'phoneNumber':
      return customId || context.rawRequest.ip || 'unknown';
    case 'merchant':
      return context.auth?.uid || context.rawRequest.ip || 'anonymous-merchant';
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
export async function checkRateLimit(
  functionName: string,
  identifier: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const now = admin.firestore.Timestamp.now();
  const windowStart = admin.firestore.Timestamp.fromMillis(
    now.toMillis() - config.windowMs
  );

  // Create a unique document ID for this function + identifier combination
  const rateLimitId = `${functionName}_${identifier}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  const rateLimitRef = getDb().collection('rateLimits').doc(rateLimitId);

  try {
    // Use transaction to ensure atomic read-modify-write
    const result = await getDb().runTransaction(async (transaction) => {
      const doc = await transaction.get(rateLimitRef);

      let requests: Array<{ timestamp: admin.firestore.Timestamp }> = [];

      if (doc.exists) {
        const data = doc.data() as RateLimitRecord;
        // Filter out requests outside the time window
        requests = data.requests.filter(
          (req) => req.timestamp.toMillis() > windowStart.toMillis()
        );
      }

      // Check if limit exceeded
      const currentCount = requests.length;
      const allowed = currentCount < config.maxRequests;

      if (allowed) {
        // Add new request timestamp
        requests.push({ timestamp: now });

        // Update or create the rate limit record
        transaction.set(
          rateLimitRef,
          {
            identifier,
            functionName,
            requests,
            createdAt: doc.exists
              ? (doc.data() as RateLimitRecord).createdAt
              : now,
            updatedAt: now,
          } as RateLimitRecord,
          { merge: true }
        );
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
  } catch (error) {
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
export async function rateLimitMiddleware(
  context: functions.https.CallableContext,
  functionName: string,
  config: RateLimitConfig,
  identifierType: 'user' | 'ip' | 'phoneNumber' | 'merchant' | 'global' = 'user',
  customIdentifier?: string
): Promise<void> {
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

  const { allowed, remaining, resetAt } = await checkRateLimit(
    functionName,
    identifier,
    config
  );

  if (!allowed) {
    const resetInMinutes = Math.ceil((resetAt.getTime() - Date.now()) / 60000);
    const errorMessage =
      config.message ||
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
export async function cleanupRateLimits(): Promise<number> {
  const twentyFourHoursAgo = admin.firestore.Timestamp.fromMillis(
    Date.now() - 24 * 60 * 60 * 1000
  );

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
export async function resetRateLimit(
  functionName: string,
  identifier: string
): Promise<boolean> {
  const rateLimitId = `${functionName}_${identifier}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  const rateLimitRef = getDb().collection('rateLimits').doc(rateLimitId);

  try {
    await rateLimitRef.delete();
    console.log(`Reset rate limit for ${functionName}:${identifier}`);
    return true;
  } catch (error) {
    console.error('Failed to reset rate limit:', error);
    return false;
  }
}

/**
 * Get rate limit status for an identifier
 *
 * Useful for checking current rate limit status without incrementing
 */
export async function getRateLimitStatus(
  functionName: string,
  identifier: string,
  config: RateLimitConfig
): Promise<{ current: number; limit: number; remaining: number; resetAt: Date }> {
  const rateLimitId = `${functionName}_${identifier}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  const rateLimitRef = getDb().collection('rateLimits').doc(rateLimitId);

  const doc = await rateLimitRef.get();

  const now = admin.firestore.Timestamp.now();
  const windowStart = admin.firestore.Timestamp.fromMillis(
    now.toMillis() - config.windowMs
  );

  let requests: Array<{ timestamp: admin.firestore.Timestamp }> = [];

  if (doc.exists) {
    const data = doc.data() as RateLimitRecord;
    requests = data.requests.filter(
      (req) => req.timestamp.toMillis() > windowStart.toMillis()
    );
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
