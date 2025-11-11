/**
 * Tax Rules Management Page
 *
 * Allows super admins to configure tax rules for different regions/countries.
 * Tax rules can be location-specific and support various tax types.
 */

import { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Pencil, Trash2 } from 'lucide-react';

interface TaxRule {
  taxRuleId: string;
  name: string;
  description: string;
  taxType: 'VAT' | 'GST' | 'SALES_TAX' | 'SERVICE_TAX' | 'WITHHOLDING_TAX' | 'CUSTOM';
  rate: number; // Percentage (e.g., 15 for 15%)
  countryCode?: string; // Optional: Apply to specific country
  regionId?: string; // Optional: Apply to specific region
  scope: 'GLOBAL' | 'COUNTRY' | 'REGION'; // Scope of applicability
  isActive: boolean;
  isCompound?: boolean; // Whether this tax is compounded with others
  priority?: number; // Order of tax application (lower = first)
  effectiveFrom?: Date | null;
  effectiveTo?: Date | null;
  createdAt?: any;
  updatedAt?: any;
  createdBy?: string;
  updatedBy?: string;
}

interface Country {
  countryCode: string;
  name: string;
  flag?: string;
}

interface Region {
  regionId: string;
  countryCode: string;
  name: string;
}

export default function TaxRules() {
  const { admin } = useAuth();
  const [taxRules, setTaxRules] = useState<TaxRule[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTaxRule, setEditingTaxRule] = useState<TaxRule | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadTaxRules(), loadCountries(), loadRegions()]);
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadTaxRules = async () => {
    const q = query(collection(db, 'taxRules'), orderBy('priority', 'asc'));
    const querySnapshot = await getDocs(q);
    const rules: TaxRule[] = [];
    querySnapshot.forEach((doc) => {
      rules.push({ taxRuleId: doc.id, ...doc.data() } as TaxRule);
    });
    setTaxRules(rules);
  };

  const loadCountries = async () => {
    const querySnapshot = await getDocs(collection(db, 'countries'));
    const countriesList: Country[] = [];
    querySnapshot.forEach((doc) => {
      countriesList.push({ countryCode: doc.id, ...doc.data() } as Country);
    });
    setCountries(countriesList);
  };

  const loadRegions = async () => {
    const regionsList: Region[] = [];
    for (const country of countries) {
      const regionsSnapshot = await getDocs(collection(db, `countries/${country.countryCode}/regions`));
      regionsSnapshot.forEach((doc) => {
        regionsList.push({ regionId: doc.id, countryCode: country.countryCode, ...doc.data() } as Region);
      });
    }
    setRegions(regionsList);
  };

  const saveTaxRule = async (taxRule: TaxRule) => {
    if (!admin) return;

    try {
      setSaving(true);
      setError(null);

      const taxRuleRef = doc(db, 'taxRules', taxRule.taxRuleId);
      const dataToSave: any = {
        name: taxRule.name,
        description: taxRule.description,
        taxType: taxRule.taxType,
        rate: taxRule.rate,
        scope: taxRule.scope,
        isActive: taxRule.isActive,
        isCompound: taxRule.isCompound || false,
        priority: taxRule.priority || 0,
        updatedAt: serverTimestamp(),
        updatedBy: admin.adminId,
      };

      if (taxRule.countryCode) {
        dataToSave.countryCode = taxRule.countryCode;
      }

      if (taxRule.regionId) {
        dataToSave.regionId = taxRule.regionId;
      }

      if (taxRule.effectiveFrom) {
        dataToSave.effectiveFrom = taxRule.effectiveFrom;
      }

      if (taxRule.effectiveTo) {
        dataToSave.effectiveTo = taxRule.effectiveTo;
      }

      if (!taxRule.createdAt) {
        dataToSave.createdAt = serverTimestamp();
        dataToSave.createdBy = admin.adminId;
      }

      await setDoc(taxRuleRef, dataToSave, { merge: true });

      setSuccessMessage('Tax rule saved successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      setShowForm(false);
      setEditingTaxRule(null);
      await loadTaxRules();
    } catch (err: any) {
      console.error('Error saving tax rule:', err);
      setError(err?.message || 'Failed to save tax rule');
    } finally {
      setSaving(false);
    }
  };

  const deleteTaxRule = async (taxRuleId: string) => {
    if (!confirm('Are you sure you want to delete this tax rule?')) return;

    try {
      setSaving(true);
      const taxRuleRef = doc(db, 'taxRules', taxRuleId);
      await deleteDoc(taxRuleRef);
      setSuccessMessage('Tax rule deleted successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      await loadTaxRules();
    } catch (err: any) {
      console.error('Error deleting tax rule:', err);
      setError(err?.message || 'Failed to delete tax rule');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (taxRule: TaxRule) => {
    setEditingTaxRule(taxRule);
    setShowForm(true);
  };

  const handleAddNew = () => {
    setEditingTaxRule(null);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingTaxRule(null);
  };

  if (loading) {
    return (
      <div className="p-6">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tax Rules Management</h1>
          <p className="text-muted-foreground">
            Configure tax rules for different regions and countries
          </p>
        </div>
        <Button onClick={handleAddNew} disabled={showForm}>
          <Plus className="mr-2 h-4 w-4" />
          Add Tax Rule
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingTaxRule ? 'Edit' : 'Add'} Tax Rule</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const taxRule: TaxRule = {
                  taxRuleId: formData.get('taxRuleId') as string,
                  name: formData.get('name') as string,
                  description: formData.get('description') as string,
                  taxType: formData.get('taxType') as TaxRule['taxType'],
                  rate: parseFloat(formData.get('rate') as string),
                  scope: formData.get('scope') as TaxRule['scope'],
                  countryCode: formData.get('countryCode') as string || undefined,
                  regionId: formData.get('regionId') as string || undefined,
                  isActive: (formData.get('isActive') as string) === 'true',
                  isCompound: (formData.get('isCompound') as string) === 'true',
                  priority: parseInt(formData.get('priority') as string) || 0,
                  createdAt: editingTaxRule?.createdAt,
                };
                saveTaxRule(taxRule);
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="taxRuleId">Tax Rule ID *</Label>
                  <Input
                    id="taxRuleId"
                    name="taxRuleId"
                    placeholder="e.g., ghana-vat"
                    required
                    defaultValue={editingTaxRule?.taxRuleId}
                    disabled={!!editingTaxRule}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="e.g., Ghana VAT"
                    required
                    defaultValue={editingTaxRule?.name}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    name="description"
                    placeholder="Description of the tax rule"
                    defaultValue={editingTaxRule?.description}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="taxType">Tax Type *</Label>
                  <select
                    id="taxType"
                    name="taxType"
                    className="w-full px-3 py-2 border rounded-md"
                    required
                    defaultValue={editingTaxRule?.taxType || 'VAT'}
                  >
                    <option value="VAT">VAT (Value Added Tax)</option>
                    <option value="GST">GST (Goods & Services Tax)</option>
                    <option value="SALES_TAX">Sales Tax</option>
                    <option value="SERVICE_TAX">Service Tax</option>
                    <option value="WITHHOLDING_TAX">Withholding Tax</option>
                    <option value="CUSTOM">Custom Tax</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rate">Tax Rate (%) *</Label>
                  <Input
                    id="rate"
                    name="rate"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="e.g., 15"
                    required
                    defaultValue={editingTaxRule?.rate}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scope">Scope *</Label>
                  <select
                    id="scope"
                    name="scope"
                    className="w-full px-3 py-2 border rounded-md"
                    required
                    defaultValue={editingTaxRule?.scope || 'GLOBAL'}
                  >
                    <option value="GLOBAL">Global (All Countries)</option>
                    <option value="COUNTRY">Country-Specific</option>
                    <option value="REGION">Region-Specific</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority (Lower = First)</Label>
                  <Input
                    id="priority"
                    name="priority"
                    type="number"
                    min="0"
                    placeholder="0"
                    defaultValue={editingTaxRule?.priority || 0}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="countryCode">Country (Optional)</Label>
                  <select
                    id="countryCode"
                    name="countryCode"
                    className="w-full px-3 py-2 border rounded-md"
                    defaultValue={editingTaxRule?.countryCode || ''}
                  >
                    <option value="">Select Country</option>
                    {countries.map((country) => (
                      <option key={country.countryCode} value={country.countryCode}>
                        {country.flag} {country.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="regionId">Region (Optional)</Label>
                  <select
                    id="regionId"
                    name="regionId"
                    className="w-full px-3 py-2 border rounded-md"
                    defaultValue={editingTaxRule?.regionId || ''}
                  >
                    <option value="">Select Region</option>
                    {regions.map((region) => (
                      <option key={region.regionId} value={region.regionId}>
                        {region.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="isCompound">Is Compound Tax?</Label>
                  <select
                    id="isCompound"
                    name="isCompound"
                    className="w-full px-3 py-2 border rounded-md"
                    defaultValue={editingTaxRule?.isCompound ? 'true' : 'false'}
                  >
                    <option value="false">No</option>
                    <option value="true">Yes</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="isActive">Status *</Label>
                  <select
                    id="isActive"
                    name="isActive"
                    className="w-full px-3 py-2 border rounded-md"
                    required
                    defaultValue={editingTaxRule?.isActive ? 'true' : 'false'}
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving...' : editingTaxRule ? 'Update' : 'Create'} Tax Rule
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tax Rules List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Tax Rules ({taxRules.length})</h2>

        {taxRules.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-muted-foreground">
                No tax rules configured yet. Click "Add Tax Rule" to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {taxRules.map((taxRule) => (
              <Card key={taxRule.taxRuleId}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {taxRule.name}
                        <span className={`text-sm px-2 py-1 rounded ${taxRule.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {taxRule.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </CardTitle>
                      <CardDescription>{taxRule.description}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(taxRule)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteTaxRule(taxRule.taxRuleId)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-semibold">Type:</span> {taxRule.taxType}
                    </div>
                    <div>
                      <span className="font-semibold">Rate:</span> {taxRule.rate}%
                    </div>
                    <div>
                      <span className="font-semibold">Scope:</span> {taxRule.scope}
                    </div>
                    <div>
                      <span className="font-semibold">Priority:</span> {taxRule.priority || 0}
                    </div>
                    {taxRule.countryCode && (
                      <div>
                        <span className="font-semibold">Country:</span> {taxRule.countryCode}
                      </div>
                    )}
                    {taxRule.regionId && (
                      <div>
                        <span className="font-semibold">Region:</span> {taxRule.regionId}
                      </div>
                    )}
                    <div>
                      <span className="font-semibold">Compound:</span> {taxRule.isCompound ? 'Yes' : 'No'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
