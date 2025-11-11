import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { isValidMerchantId, sanitizeString } from '../utils/validation';

const getDb = () => admin.firestore();

/**
 * Configuration Management Cloud Functions
 *
 * Provides API endpoints for mobile app to fetch system configurations
 * All configurations are managed by Super Admin web app
 */

/**
 * Get System Configuration
 *
 * Returns centralized system configuration including:
 * - Countries, regions, cities
 * - Business types and industries
 * - Currencies
 * - Global feature toggles
 */
export const getSystemConfig = functions.https.onCall(async (data, context) => {
  try {
    const configDoc = await getDb().collection('systemConfig').doc('main').get();

    if (!configDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'System configuration not found'
      );
    }

    const config = configDoc.data();

    // Filter to only return enabled items by default
    const filterEnabled = data.includeDisabled !== true;

    if (filterEnabled && config) {
      // Filter countries
      if (config.countries) {
        config.countries = config.countries.filter((c: any) => c.enabled !== false);
        // Filter regions and cities within countries
        config.countries = config.countries.map((country: any) => ({
          ...country,
          regions: (country.regions || [])
            .filter((r: any) => r.enabled !== false)
            .map((region: any) => ({
              ...region,
              cities: (region.cities || []).filter((c: any) => c.enabled !== false),
            })),
        }));
      }

      // Filter business types
      if (config.businessTypes) {
        config.businessTypes = config.businessTypes.filter((b: any) => b.enabled !== false);
      }

      // Filter industries
      if (config.industries) {
        config.industries = config.industries.filter((i: any) => i.enabled !== false);
      }

      // Filter currencies
      if (config.currencies) {
        config.currencies = config.currencies.filter((c: any) => c.enabled !== false);
      }
    }

    return {
      success: true,
      config: config,
      timestamp: admin.firestore.Timestamp.now(),
    };
  } catch (error) {
    console.error('Error fetching system config:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to fetch system configuration',
      { error: error instanceof Error ? error.message : String(error) }
    );
  }
});

/**
 * Get Subscription Plans
 *
 * Returns all available subscription plans
 * Optionally filter by active status
 */
export const getSubscriptionPlans = functions.https.onCall(async (data, context) => {
  try {
    const onlyActive = data.onlyActive !== false; // Default to true

    let query: FirebaseFirestore.Query = getDb()
      .collection('subscriptionPlans')
      .orderBy('displayOrder');

    if (onlyActive) {
      query = query.where('active', '==', true);
    }

    const snapshot = await query.get();

    const plans = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return {
      success: true,
      plans: plans,
      count: plans.length,
    };
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to fetch subscription plans',
      { error: error instanceof Error ? error.message : String(error) }
    );
  }
});

/**
 * Get Subscription Plan by ID
 *
 * Returns a specific subscription plan
 */
export const getSubscriptionPlan = functions.https.onCall(async (data, context) => {
  try {
    const { planId } = data;

    if (!planId || typeof planId !== 'string') {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'planId is required and must be a string'
      );
    }

    // Sanitize planId to prevent injection
    const safePlanId = sanitizeString(planId);

    const planDoc = await getDb().collection('subscriptionPlans').doc(safePlanId).get();

    if (!planDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        `Plan ${safePlanId} not found`
      );
    }

    return {
      success: true,
      plan: {
        id: planDoc.id,
        ...planDoc.data(),
      },
    };
  } catch (error) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    console.error('Error fetching subscription plan:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to fetch subscription plan',
      { error: error instanceof Error ? error.message : String(error) }
    );
  }
});

/**
 * Get Merchant Subscription
 *
 * Returns the merchant's current subscription with plan details
 */
export const getMerchantSubscription = functions.https.onCall(async (data, context) => {
  try {
    // Require authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated'
      );
    }

    const merchantId = data.merchantId || context.auth.uid;

    // Validate merchantId format
    if (!isValidMerchantId(merchantId)) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Invalid merchant ID format'
      );
    }

    // Ensure user can only access their own data (or is admin)
    if (data.merchantId && data.merchantId !== context.auth.uid) {
      // TODO: Add admin check when admin role is implemented
      throw new functions.https.HttpsError(
        'permission-denied',
        'Cannot access other merchant subscriptions'
      );
    }

    // Get merchant subscription
    const subscriptionDoc = await getDb()
      .collection('merchantSubscriptions')
      .doc(merchantId)
      .get();

    if (!subscriptionDoc.exists) {
      // Return free plan as default
      const freePlanSnapshot = await getDb()
        .collection('subscriptionPlans')
        .where('tier', '==', 'free')
        .where('active', '==', true)
        .limit(1)
        .get();

      if (freePlanSnapshot.empty) {
        throw new functions.https.HttpsError(
          'not-found',
          'No subscription found and no free plan available'
        );
      }

      const freePlan = freePlanSnapshot.docs[0];

      return {
        success: true,
        subscription: null,
        plan: {
          id: freePlan.id,
          ...freePlan.data(),
        },
        isDefaultFreePlan: true,
      };
    }

    const subscription = subscriptionDoc.data();

    // Get plan details
    const planDoc = await getDb().collection('subscriptionPlans').doc(subscription?.planId).get();

    if (!planDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'Subscription plan not found'
      );
    }

    return {
      success: true,
      subscription: {
        ...subscription,
        merchantId: subscriptionDoc.id,
      },
      plan: {
        id: planDoc.id,
        ...planDoc.data(),
      },
      isDefaultFreePlan: false,
    };
  } catch (error) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    console.error('Error fetching merchant subscription:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to fetch merchant subscription',
      { error: error instanceof Error ? error.message : String(error) }
    );
  }
});

/**
 * Subscribe Merchant to Plan
 *
 * Creates or updates a merchant's subscription
 */
export const subscribeToPlan = functions.https.onCall(async (data, context) => {
  try {
    // Require authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated'
      );
    }

    const { planId, billingCycle, paymentMethod } = data;

    if (!planId || typeof planId !== 'string') {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'planId is required and must be a string'
      );
    }

    // Validate billing cycle if provided
    if (billingCycle && !['monthly', 'yearly'].includes(billingCycle)) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'billingCycle must be either "monthly" or "yearly"'
      );
    }

    // Sanitize inputs
    const safePlanId = sanitizeString(planId);
    const safePaymentMethod = paymentMethod ? sanitizeString(paymentMethod) : null;

    const merchantId = context.auth.uid;

    // Verify plan exists
    const planDoc = await getDb().collection('subscriptionPlans').doc(safePlanId).get();

    if (!planDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        `Plan ${safePlanId} not found`
      );
    }

    const plan = planDoc.data();

    if (!plan?.active) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Plan is not active'
      );
    }

    const now = admin.firestore.Timestamp.now();
    const startDate = now.toDate();

    // Calculate trial end date if applicable
    let trialEndDate = null;
    if (plan.pricing?.trialDays && plan.pricing.trialDays > 0) {
      const trialEnd = new Date(startDate);
      trialEnd.setDate(trialEnd.getDate() + plan.pricing.trialDays);
      trialEndDate = admin.firestore.Timestamp.fromDate(trialEnd);
    }

    // Calculate next billing date
    const nextBillingDateCalc = new Date(startDate);
    if (billingCycle === 'yearly') {
      nextBillingDateCalc.setFullYear(nextBillingDateCalc.getFullYear() + 1);
    } else {
      nextBillingDateCalc.setMonth(nextBillingDateCalc.getMonth() + 1);
    }

    const subscription = {
      merchantId: merchantId,
      planId: safePlanId,
      status: trialEndDate ? 'trial' : 'active',
      startDate: now,
      trialEndDate: trialEndDate,
      billingCycle: billingCycle || 'monthly',
      paymentMethod: safePaymentMethod,
      nextBillingDate: admin.firestore.Timestamp.fromDate(nextBillingDateCalc),
      createdAt: now,
      updatedAt: now,
    };

    // Create or update subscription
    await getDb()
      .collection('merchantSubscriptions')
      .doc(merchantId)
      .set(subscription, { merge: true });

    // Update merchant record
    await getDb()
      .collection('merchants')
      .doc(merchantId)
      .update({
        subscriptionPlanId: safePlanId,
        subscriptionStatus: subscription.status,
        updatedAt: now,
      });

    console.log(`✅ Merchant ${merchantId} subscribed to plan ${safePlanId}`);

    return {
      success: true,
      subscription: subscription,
      plan: {
        id: planDoc.id,
        ...plan,
      },
    };
  } catch (error) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    console.error('Error subscribing to plan:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to subscribe to plan',
      { error: error instanceof Error ? error.message : String(error) }
    );
  }
});

/**
 * Check Feature Access
 *
 * Checks if merchant has access to a specific feature
 */
export const checkFeatureAccess = functions.https.onCall(async (data, context) => {
  try {
    // Require authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated'
      );
    }

    const { featureName } = data;

    if (!featureName || typeof featureName !== 'string') {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'featureName is required and must be a string'
      );
    }

    // Sanitize feature name to prevent injection
    const safeFeatureName = sanitizeString(featureName);

    const merchantId = context.auth.uid;

    // Get merchant subscription
    const subscriptionDoc = await getDb()
      .collection('merchantSubscriptions')
      .doc(merchantId)
      .get();

    let planId: string;

    if (!subscriptionDoc.exists) {
      // Get free plan
      const freePlanSnapshot = await getDb()
        .collection('subscriptionPlans')
        .where('tier', '==', 'free')
        .where('active', '==', true)
        .limit(1)
        .get();

      if (freePlanSnapshot.empty) {
        return { success: true, hasAccess: false, reason: 'No plan found' };
      }

      planId = freePlanSnapshot.docs[0].id;
    } else {
      const subscription = subscriptionDoc.data();
      planId = subscription?.planId;
    }

    // Get plan features
    const planDoc = await getDb().collection('subscriptionPlans').doc(planId).get();

    if (!planDoc.exists) {
      return { success: true, hasAccess: false, reason: 'Plan not found' };
    }

    const plan = planDoc.data();
    const features = plan?.features || {};
    const hasAccess = features[safeFeatureName] === true;

    return {
      success: true,
      hasAccess: hasAccess,
      featureName: safeFeatureName,
      planId: planId,
      planName: plan?.name,
    };
  } catch (error) {
    console.error('Error checking feature access:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to check feature access',
      { error: error instanceof Error ? error.message : String(error) }
    );
  }
});

/**
 * Check Usage Limit
 *
 * Checks if merchant is within usage limits for a specific resource
 */
export const checkUsageLimit = functions.https.onCall(async (data, context) => {
  try {
    // Require authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated'
      );
    }

    const { limitName, currentUsage } = data;

    if (!limitName || typeof limitName !== 'string') {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'limitName is required and must be a string'
      );
    }

    if (typeof currentUsage !== 'number' || currentUsage < 0) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'currentUsage must be a non-negative number'
      );
    }

    // Sanitize limit name to prevent injection
    const safeLimitName = sanitizeString(limitName);

    const merchantId = context.auth.uid;

    // Get merchant subscription and plan (same logic as checkFeatureAccess)
    const subscriptionDoc = await getDb()
      .collection('merchantSubscriptions')
      .doc(merchantId)
      .get();

    let planId: string;

    if (!subscriptionDoc.exists) {
      const freePlanSnapshot = await getDb()
        .collection('subscriptionPlans')
        .where('tier', '==', 'free')
        .where('active', '==', true)
        .limit(1)
        .get();

      if (freePlanSnapshot.empty) {
        return {
          success: true,
          withinLimit: false,
          reason: 'No plan found',
        };
      }

      planId = freePlanSnapshot.docs[0].id;
    } else {
      const subscription = subscriptionDoc.data();
      planId = subscription?.planId;
    }

    const planDoc = await getDb().collection('subscriptionPlans').doc(planId).get();

    if (!planDoc.exists) {
      return {
        success: true,
        withinLimit: false,
        reason: 'Plan not found',
      };
    }

    const plan = planDoc.data();
    const limits = plan?.limits || {};
    const limit = limits[safeLimitName];

    // null means unlimited
    if (limit === null || limit === undefined) {
      return {
        success: true,
        withinLimit: true,
        limit: null, // unlimited
        currentUsage: currentUsage,
        remaining: null, // unlimited
      };
    }

    const withinLimit = currentUsage < limit;
    const remaining = Math.max(0, limit - currentUsage);

    return {
      success: true,
      withinLimit: withinLimit,
      limit: limit,
      currentUsage: currentUsage,
      remaining: remaining,
      planId: planId,
      planName: plan?.name,
    };
  } catch (error) {
    console.error('Error checking usage limit:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to check usage limit',
      { error: error instanceof Error ? error.message : String(error) }
    );
  }
});
