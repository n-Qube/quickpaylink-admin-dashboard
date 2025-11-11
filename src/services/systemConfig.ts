/**
 * System Configuration Service
 *
 * Handles system-wide configuration including currencies, business types,
 * tax rules, subscription plans, and pricing rules.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../lib/firebase';

// Types
export interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  decimals: number;
  isActive: boolean;
  exchangeRate: number; // relative to base currency (USD)
  createdAt: Date;
  updatedAt: Date;
}

export interface BusinessType {
  id: string;
  name: string;
  description: string;
  category: string;
  isActive: boolean;
  requiresSpecialVerification: boolean;
  createdAt: Date;
}

export interface TaxRule {
  id: string;
  name: string;
  country: string;
  taxType: 'VAT' | 'GST' | 'Sales Tax' | 'Other';
  rate: number;
  isActive: boolean;
  applicableBusinessTypes: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly';
  features: string[];
  transactionLimit: number;
  apiCallLimit: number;
  isActive: boolean;
  isPopular: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PricingRule {
  id: string;
  name: string;
  description: string;
  ruleType: 'percentage' | 'fixed' | 'tiered';
  value: number;
  minAmount?: number;
  maxAmount?: number;
  applicableMerchants: 'all' | 'specific' | 'plan-based';
  merchantIds?: string[];
  subscriptionPlans?: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * ============================================================================
 * CURRENCIES
 * ============================================================================
 */

export async function getCurrencies(): Promise<Currency[]> {
  try {
    const q = query(collection(db, COLLECTIONS.CURRENCIES), orderBy('code', 'asc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as Currency[];
  } catch (error) {
    console.error('Error getting currencies:', error);
    throw new Error('Failed to fetch currencies');
  }
}

export async function createCurrency(currencyData: Omit<Currency, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, COLLECTIONS.CURRENCIES), {
      ...currencyData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating currency:', error);
    throw new Error('Failed to create currency');
  }
}

export async function updateCurrency(currencyId: string, updates: Partial<Currency>): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.CURRENCIES, currencyId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating currency:', error);
    throw new Error('Failed to update currency');
  }
}

export async function deleteCurrency(currencyId: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.CURRENCIES, currencyId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting currency:', error);
    throw new Error('Failed to delete currency');
  }
}

/**
 * ============================================================================
 * BUSINESS TYPES
 * ============================================================================
 */

export async function getBusinessTypes(): Promise<BusinessType[]> {
  try {
    const q = query(collection(db, COLLECTIONS.BUSINESS_TYPES), orderBy('name', 'asc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
    })) as BusinessType[];
  } catch (error) {
    console.error('Error getting business types:', error);
    throw new Error('Failed to fetch business types');
  }
}

export async function createBusinessType(data: Omit<BusinessType, 'id' | 'createdAt'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, COLLECTIONS.BUSINESS_TYPES), {
      ...data,
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating business type:', error);
    throw new Error('Failed to create business type');
  }
}

export async function updateBusinessType(id: string, updates: Partial<BusinessType>): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.BUSINESS_TYPES, id);
    await updateDoc(docRef, updates);
  } catch (error) {
    console.error('Error updating business type:', error);
    throw new Error('Failed to update business type');
  }
}

export async function deleteBusinessType(id: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.BUSINESS_TYPES, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting business type:', error);
    throw new Error('Failed to delete business type');
  }
}

/**
 * ============================================================================
 * TAX RULES
 * ============================================================================
 */

export async function getTaxRules(): Promise<TaxRule[]> {
  try {
    const q = query(collection(db, COLLECTIONS.TAX_RULES), orderBy('country', 'asc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as TaxRule[];
  } catch (error) {
    console.error('Error getting tax rules:', error);
    throw new Error('Failed to fetch tax rules');
  }
}

export async function createTaxRule(data: Omit<TaxRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, COLLECTIONS.TAX_RULES), {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating tax rule:', error);
    throw new Error('Failed to create tax rule');
  }
}

export async function updateTaxRule(id: string, updates: Partial<TaxRule>): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.TAX_RULES, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating tax rule:', error);
    throw new Error('Failed to update tax rule');
  }
}

export async function deleteTaxRule(id: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.TAX_RULES, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting tax rule:', error);
    throw new Error('Failed to delete tax rule');
  }
}

/**
 * ============================================================================
 * SUBSCRIPTION PLANS
 * ============================================================================
 */

export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  try {
    const q = query(collection(db, COLLECTIONS.SUBSCRIPTION_PLANS), orderBy('price', 'asc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as SubscriptionPlan[];
  } catch (error) {
    console.error('Error getting subscription plans:', error);
    throw new Error('Failed to fetch subscription plans');
  }
}

export async function createSubscriptionPlan(
  data: Omit<SubscriptionPlan, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, COLLECTIONS.SUBSCRIPTION_PLANS), {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating subscription plan:', error);
    throw new Error('Failed to create subscription plan');
  }
}

export async function updateSubscriptionPlan(id: string, updates: Partial<SubscriptionPlan>): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.SUBSCRIPTION_PLANS, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating subscription plan:', error);
    throw new Error('Failed to update subscription plan');
  }
}

export async function deleteSubscriptionPlan(id: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.SUBSCRIPTION_PLANS, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting subscription plan:', error);
    throw new Error('Failed to delete subscription plan');
  }
}

/**
 * ============================================================================
 * PRICING RULES
 * ============================================================================
 */

export async function getPricingRules(): Promise<PricingRule[]> {
  try {
    const q = query(collection(db, COLLECTIONS.PRICING_RULES), orderBy('name', 'asc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as PricingRule[];
  } catch (error) {
    console.error('Error getting pricing rules:', error);
    throw new Error('Failed to fetch pricing rules');
  }
}

export async function createPricingRule(
  data: Omit<PricingRule, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, COLLECTIONS.PRICING_RULES), {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating pricing rule:', error);
    throw new Error('Failed to create pricing rule');
  }
}

export async function updatePricingRule(id: string, updates: Partial<PricingRule>): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.PRICING_RULES, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating pricing rule:', error);
    throw new Error('Failed to update pricing rule');
  }
}

export async function deletePricingRule(id: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.PRICING_RULES, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting pricing rule:', error);
    throw new Error('Failed to delete pricing rule');
  }
}
