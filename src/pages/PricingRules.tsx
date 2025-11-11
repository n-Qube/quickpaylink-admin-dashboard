/**
 * Pricing Rules Management Page
 *
 * Manage pricing rules for discounts, promotions, and special pricing.
 * Features:
 * - View all pricing rules
 * - Create new rules
 * - Edit existing rules
 * - Activate/deactivate rules
 * - Configure applicability and conditions
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Plus,
  Edit,
  Tag,
  TrendingDown,
  Calendar,
  Users,
  AlertCircle
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, addDoc, updateDoc, Timestamp } from 'firebase/firestore';
import type { PricingRule } from '@/types/database';

type PricingRuleType = 'volume_discount' | 'promotional' | 'partner_pricing' | 'regional' | 'early_bird' | 'referral';
type DiscountType = 'percentage' | 'fixed_amount';

export default function PricingRules() {
  const { admin } = useAuth();
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRule, setEditingRule] = useState<PricingRule | null>(null);
  const [formData, setFormData] = useState<Partial<PricingRule>>({
    name: '',
    description: '',
    type: 'promotional',
    discount: {
      type: 'percentage',
      value: 10,
    },
    applicability: {
      plans: [],
      countries: [],
      businessTypes: [],
      partnerIds: [],
      newCustomersOnly: false,
    },
    conditions: {
      minimumCommitment: undefined,
      minimumSpend: undefined,
      billingCycle: [],
      promoCode: '',
      promoCodeRequired: false,
    },
    maxRedemptions: undefined,
    redemptionCount: 0,
    applyToFirstPaymentOnly: false,
    applyToAllPayments: true,
    maxRecurringMonths: undefined,
    active: true,
    priority: 1,
  });

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      setLoading(true);
      const rulesRef = collection(db, 'pricingRules');
      const rulesSnap = await getDocs(rulesRef);

      const rulesList: PricingRule[] = [];
      rulesSnap.forEach((doc) => {
        rulesList.push({ ruleId: doc.id, ...doc.data() } as PricingRule);
      });

      // Sort by priority
      rulesList.sort((a, b) => a.priority - b.priority);

      setRules(rulesList);
    } catch (error) {
      console.error('Error loading rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRule = async () => {
    try {
      const rulesRef = collection(db, 'pricingRules');
      await addDoc(rulesRef, {
        ...formData,
        applicableFrom: formData.applicableFrom || Timestamp.now(),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: admin?.adminId,
        updatedBy: admin?.adminId,
      });

      await loadRules();
      setShowCreateModal(false);
      resetForm();
      console.log('Rule created successfully');
    } catch (error) {
      console.error('Error creating rule:', error);
    }
  };

  const handleUpdateRule = async (ruleId: string, updates: Partial<PricingRule>) => {
    try {
      const ruleRef = doc(db, 'pricingRules', ruleId);
      await updateDoc(ruleRef, {
        ...updates,
        updatedAt: Timestamp.now(),
        updatedBy: admin?.adminId,
      });

      await loadRules();
      console.log('Rule updated successfully');
    } catch (error) {
      console.error('Error updating rule:', error);
    }
  };

  const handleToggleRuleStatus = async (rule: PricingRule) => {
    await handleUpdateRule(rule.ruleId, { active: !rule.active });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'promotional',
      discount: {
        type: 'percentage',
        value: 10,
      },
      applicability: {
        plans: [],
        countries: [],
        businessTypes: [],
        partnerIds: [],
        newCustomersOnly: false,
      },
      conditions: {
        minimumCommitment: undefined,
        minimumSpend: undefined,
        billingCycle: [],
        promoCode: '',
        promoCodeRequired: false,
      },
      maxRedemptions: undefined,
      redemptionCount: 0,
      applyToFirstPaymentOnly: false,
      applyToAllPayments: true,
      maxRecurringMonths: undefined,
      active: true,
      priority: 1,
    });
  };

  const handleEditRule = (rule: PricingRule) => {
    setFormData(rule);
    setEditingRule(rule);
    setShowCreateModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingRule) return;

    await handleUpdateRule(editingRule.ruleId, formData);
    setShowCreateModal(false);
    setEditingRule(null);
    resetForm();
  };

  const getRuleTypeBadge = (type: PricingRuleType) => {
    const colors = {
      volume_discount: 'bg-blue-500',
      promotional: 'bg-purple-500',
      partner_pricing: 'bg-green-500',
      regional: 'bg-yellow-500',
      early_bird: 'bg-orange-500',
      referral: 'bg-pink-500',
    };
    return colors[type] || 'bg-gray-500';
  };

  const formatDiscount = (discount: { type: DiscountType; value: number }) => {
    if (discount.type === 'percentage') {
      return `${discount.value}% off`;
    }
    return `GHS ${discount.value} off`;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pricing Rules</h1>
          <p className="text-muted-foreground">
            Manage discounts, promotions, and special pricing
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Rule
        </Button>
      </div>

      {/* Rules Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rules</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rules.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Rules</CardTitle>
            <AlertCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {rules.filter(r => r.active).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Redemptions</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {rules.reduce((sum, r) => sum + r.redemptionCount, 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Discount</CardTitle>
            <TrendingDown className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {rules.length > 0
                ? Math.round(
                    rules
                      .filter(r => r.discount.type === 'percentage')
                      .reduce((sum, r) => sum + r.discount.value, 0) / rules.length
                  )
                : 0}
              %
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rules List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading rules...</p>
          </div>
        ) : rules.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">No pricing rules yet</p>
              <Button className="mt-4" onClick={() => setShowCreateModal(true)}>
                Create your first rule
              </Button>
            </CardContent>
          </Card>
        ) : (
          rules.map((rule) => (
            <Card key={rule.ruleId}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle>{rule.name}</CardTitle>
                      <Badge className={getRuleTypeBadge(rule.type)}>
                        {rule.type.replace('_', ' ')}
                      </Badge>
                      {rule.conditions.promoCode && (
                        <Badge variant="outline">
                          Code: {rule.conditions.promoCode}
                        </Badge>
                      )}
                    </div>
                    <CardDescription>{rule.description}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={rule.active}
                      onCheckedChange={() => handleToggleRuleStatus(rule)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Discount</p>
                    <p className="text-lg font-semibold text-green-600">
                      {formatDiscount(rule.discount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Redemptions</p>
                    <p className="text-lg font-semibold">
                      {rule.redemptionCount}
                      {rule.maxRedemptions && ` / ${rule.maxRedemptions}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Priority</p>
                    <p className="text-lg font-semibold">#{rule.priority}</p>
                  </div>
                </div>

                {rule.applicability && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Applicability</p>
                    <div className="flex flex-wrap gap-2">
                      {rule.applicability.plans && rule.applicability.plans.length > 0 && (
                        <Badge variant="outline">Plans: {rule.applicability.plans.join(', ')}</Badge>
                      )}
                      {rule.applicability.countries && rule.applicability.countries.length > 0 && (
                        <Badge variant="outline">Countries: {rule.applicability.countries.join(', ')}</Badge>
                      )}
                      {rule.applicability.newCustomersOnly && (
                        <Badge variant="outline">New Customers Only</Badge>
                      )}
                    </div>
                  </div>
                )}

                {rule.applicableFrom && (
                  <div className="flex items-center gap-4 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      From: {new Date(rule.applicableFrom.seconds * 1000).toLocaleDateString()}
                    </span>
                    {rule.applicableTo && (
                      <span className="text-muted-foreground">
                        To: {new Date(rule.applicableTo.seconds * 1000).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditRule(rule)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Badge variant={rule.active ? 'default' : 'secondary'}>
                    {rule.active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>
                    {editingRule ? 'Edit Rule' : 'Create New Rule'}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditingRule(null);
                      resetForm();
                    }}
                  >
                    ×
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Rule Name</Label>
                      <Input
                        id="name"
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Black Friday 2024"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="type">Rule Type</Label>
                      <select
                        id="type"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={formData.type}
                        onChange={(e) =>
                          setFormData({ ...formData, type: e.target.value as PricingRuleType })
                        }
                      >
                        <option value="promotional">Promotional</option>
                        <option value="volume_discount">Volume Discount</option>
                        <option value="partner_pricing">Partner Pricing</option>
                        <option value="regional">Regional</option>
                        <option value="early_bird">Early Bird</option>
                        <option value="referral">Referral</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe the rule..."
                    />
                  </div>
                </div>

                {/* Discount Configuration */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Discount</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="discountType">Discount Type</Label>
                      <select
                        id="discountType"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={formData.discount?.type}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            discount: { ...formData.discount!, type: e.target.value as DiscountType },
                          })
                        }
                      >
                        <option value="percentage">Percentage</option>
                        <option value="fixed_amount">Fixed Amount</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="discountValue">
                        Value {formData.discount?.type === 'percentage' ? '(%)' : '(GHS)'}
                      </Label>
                      <Input
                        id="discountValue"
                        type="number"
                        value={formData.discount?.value || 0}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            discount: { ...formData.discount!, value: parseFloat(e.target.value) },
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority (lower = higher priority)</Label>
                      <Input
                        id="priority"
                        type="number"
                        value={formData.priority || 1}
                        onChange={(e) =>
                          setFormData({ ...formData, priority: parseInt(e.target.value) })
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Applicability */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Applicability</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="plans">Plans (comma-separated)</Label>
                      <Input
                        id="plans"
                        value={formData.applicability?.plans?.join(', ') || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            applicability: {
                              ...formData.applicability!,
                              plans: e.target.value.split(',').map(s => s.trim()).filter(Boolean),
                            },
                          })
                        }
                        placeholder="e.g., starter, professional"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="countries">Countries (comma-separated)</Label>
                      <Input
                        id="countries"
                        value={formData.applicability?.countries?.join(', ') || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            applicability: {
                              ...formData.applicability!,
                              countries: e.target.value.split(',').map(s => s.trim()).filter(Boolean),
                            },
                          })
                        }
                        placeholder="e.g., GH, NG"
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="newCustomersOnly"
                      checked={formData.applicability?.newCustomersOnly || false}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          applicability: { ...formData.applicability!, newCustomersOnly: checked },
                        })
                      }
                    />
                    <Label htmlFor="newCustomersOnly">New Customers Only</Label>
                  </div>
                </div>

                {/* Conditions */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Conditions</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="promoCode">Promo Code</Label>
                      <Input
                        id="promoCode"
                        value={formData.conditions?.promoCode || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            conditions: { ...formData.conditions!, promoCode: e.target.value },
                          })
                        }
                        placeholder="e.g., SUMMER2024"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxRedemptions">Max Redemptions</Label>
                      <Input
                        id="maxRedemptions"
                        type="number"
                        value={formData.maxRedemptions || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, maxRedemptions: parseInt(e.target.value) })
                        }
                        placeholder="Leave empty for unlimited"
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="promoCodeRequired"
                      checked={formData.conditions?.promoCodeRequired || false}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          conditions: { ...formData.conditions!, promoCodeRequired: checked },
                        })
                      }
                    />
                    <Label htmlFor="promoCodeRequired">Promo Code Required</Label>
                  </div>
                </div>

                {/* Payment Application */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Payment Application</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="applyToFirstPaymentOnly"
                        checked={formData.applyToFirstPaymentOnly || false}
                        onCheckedChange={(checked) =>
                          setFormData({
                            ...formData,
                            applyToFirstPaymentOnly: checked,
                            applyToAllPayments: checked ? false : formData.applyToAllPayments,
                          })
                        }
                      />
                      <Label htmlFor="applyToFirstPaymentOnly">First Payment Only</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="applyToAllPayments"
                        checked={formData.applyToAllPayments || false}
                        onCheckedChange={(checked) =>
                          setFormData({
                            ...formData,
                            applyToAllPayments: checked,
                            applyToFirstPaymentOnly: checked ? false : formData.applyToFirstPaymentOnly,
                          })
                        }
                      />
                      <Label htmlFor="applyToAllPayments">All Payments</Label>
                    </div>
                  </div>
                  {formData.applyToAllPayments && (
                    <div className="space-y-2">
                      <Label htmlFor="maxRecurringMonths">Max Recurring Months</Label>
                      <Input
                        id="maxRecurringMonths"
                        type="number"
                        value={formData.maxRecurringMonths || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, maxRecurringMonths: parseInt(e.target.value) })
                        }
                        placeholder="Leave empty for unlimited"
                      />
                    </div>
                  )}
                </div>

                {/* Status */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Status</h3>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="active"
                      checked={formData.active || false}
                      onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                    />
                    <Label htmlFor="active">Active</Label>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4">
                  <Button
                    className="flex-1"
                    onClick={editingRule ? handleSaveEdit : handleCreateRule}
                  >
                    {editingRule ? 'Save Changes' : 'Create Rule'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditingRule(null);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
