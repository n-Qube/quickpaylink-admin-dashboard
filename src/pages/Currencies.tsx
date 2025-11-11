/**
 * Multi-Currency Support Management
 *
 * Manage supported currencies, exchange rates, and currency settings
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  DollarSign,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  TrendingUp,
  Globe2,
} from 'lucide-react';

interface Currency {
  currencyCode: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
  exchangeRate: number; // Rate to USD
  isBaseCurrency: boolean;
  isActive: boolean;
  lastRateUpdate?: any;
  createdAt?: any;
  updatedAt?: any;
  updatedBy?: string;
}

export default function Currencies() {
  const { admin } = useAuth();
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form states
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    totalCurrencies: 0,
    activeCurrencies: 0,
    baseCurrency: '',
  });

  useEffect(() => {
    loadCurrencies();
  }, []);

  const loadCurrencies = async () => {
    try {
      setLoading(true);
      setError(null);

      const currenciesRef = collection(db, 'currencies');
      const currenciesSnap = await getDocs(query(currenciesRef, orderBy('name')));
      const currenciesData = currenciesSnap.docs.map((doc) => ({
        currencyCode: doc.id,
        ...doc.data(),
      })) as Currency[];

      setCurrencies(currenciesData);

      // Calculate stats
      const activeCurrencies = currenciesData.filter((c) => c.isActive);
      const baseCurrency = currenciesData.find((c) => c.isBaseCurrency);

      setStats({
        totalCurrencies: currenciesData.length,
        activeCurrencies: activeCurrencies.length,
        baseCurrency: baseCurrency?.currencyCode || 'None',
      });
    } catch (err: any) {
      console.error('Error loading currencies:', err);
      setError(err.message || 'Failed to load currencies');
    } finally {
      setLoading(false);
    }
  };

  const saveCurrency = async (currency: Currency) => {
    if (!admin) return;

    try {
      setSaving(true);
      setError(null);

      // Validate: Only one base currency allowed
      if (currency.isBaseCurrency) {
        const existingBase = currencies.find(
          (c) => c.isBaseCurrency && c.currencyCode !== currency.currencyCode
        );
        if (existingBase) {
          setError(
            `Only one base currency is allowed. ${existingBase.currencyCode} is currently set as base.`
          );
          setSaving(false);
          return;
        }
      }

      // Validate exchange rate for non-base currencies
      if (!currency.isBaseCurrency && (!currency.exchangeRate || currency.exchangeRate <= 0)) {
        setError('Exchange rate must be greater than 0 for non-base currencies');
        setSaving(false);
        return;
      }

      // If this is the base currency, set exchange rate to 1
      if (currency.isBaseCurrency) {
        currency.exchangeRate = 1.0;
      }

      const currencyRef = doc(db, 'currencies', currency.currencyCode);
      await setDoc(currencyRef, {
        ...currency,
        lastRateUpdate: currency.isBaseCurrency ? null : serverTimestamp(),
        updatedAt: serverTimestamp(),
        updatedBy: admin.adminId,
        createdAt: currency.createdAt || serverTimestamp(),
      });

      setSuccessMessage('Currency saved successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      setShowForm(false);
      setEditingCurrency(null);
      await loadCurrencies();
    } catch (err: any) {
      console.error('Error saving currency:', err);
      setError(err.message || 'Failed to save currency');
    } finally {
      setSaving(false);
    }
  };

  const deleteCurrency = async (currencyCode: string) => {
    if (!confirm(`Are you sure you want to delete ${currencyCode}?`)) return;

    const currency = currencies.find((c) => c.currencyCode === currencyCode);
    if (currency?.isBaseCurrency) {
      setError('Cannot delete the base currency. Set another currency as base first.');
      return;
    }

    try {
      setSaving(true);
      const currencyRef = doc(db, 'currencies', currencyCode);
      await deleteDoc(currencyRef);
      setSuccessMessage('Currency deleted successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      await loadCurrencies();
    } catch (err: any) {
      setError(err.message || 'Failed to delete currency');
    } finally {
      setSaving(false);
    }
  };

  const toggleCurrencyStatus = async (currency: Currency) => {
    if (currency.isBaseCurrency && currency.isActive) {
      setError('Cannot deactivate the base currency');
      return;
    }

    await saveCurrency({
      ...currency,
      isActive: !currency.isActive,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <DollarSign className="h-12 w-12 animate-pulse text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Loading currencies...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Currency Management</h1>
        <p className="text-muted-foreground">
          Manage supported currencies and exchange rates for the platform
        </p>
      </div>

      {/* Status Messages */}
      {successMessage && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Currencies</CardTitle>
            <Globe2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCurrencies}</div>
            <p className="text-xs text-muted-foreground">Configured in system</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Currencies</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeCurrencies}</div>
            <p className="text-xs text-muted-foreground">Currently enabled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Base Currency</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.baseCurrency}</div>
            <p className="text-xs text-muted-foreground">Platform default</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Button onClick={() => setShowForm(true)} disabled={showForm}>
            <Plus className="mr-2 h-4 w-4" />
            Add Currency
          </Button>
          <Button variant="outline" onClick={loadCurrencies}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Add/Edit Currency Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingCurrency ? 'Edit' : 'Add'} Currency</CardTitle>
            <CardDescription>
              {editingCurrency
                ? 'Update currency details and exchange rate'
                : 'Add a new currency to the platform'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const currency: Currency = {
                  currencyCode: (formData.get('currencyCode') as string).toUpperCase(),
                  name: formData.get('name') as string,
                  symbol: formData.get('symbol') as string,
                  decimalPlaces: parseInt(formData.get('decimalPlaces') as string),
                  exchangeRate: parseFloat(formData.get('exchangeRate') as string),
                  isBaseCurrency: (formData.get('isBaseCurrency') as string) === 'true',
                  isActive: (formData.get('isActive') as string) === 'true',
                };
                saveCurrency(currency);
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currencyCode">Currency Code (ISO 4217)</Label>
                  <Input
                    id="currencyCode"
                    name="currencyCode"
                    placeholder="USD"
                    required
                    maxLength={3}
                    defaultValue={editingCurrency?.currencyCode}
                    disabled={!!editingCurrency}
                    className="uppercase"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Currency Name</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="US Dollar"
                    required
                    defaultValue={editingCurrency?.name}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="symbol">Symbol</Label>
                  <Input
                    id="symbol"
                    name="symbol"
                    placeholder="$"
                    required
                    defaultValue={editingCurrency?.symbol}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="decimalPlaces">Decimal Places</Label>
                  <Input
                    id="decimalPlaces"
                    name="decimalPlaces"
                    type="number"
                    min="0"
                    max="8"
                    required
                    defaultValue={editingCurrency?.decimalPlaces ?? 2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="exchangeRate">Exchange Rate (to Base)</Label>
                  <Input
                    id="exchangeRate"
                    name="exchangeRate"
                    type="number"
                    step="0.000001"
                    min="0"
                    placeholder="1.000000"
                    required
                    defaultValue={editingCurrency?.exchangeRate}
                  />
                  <p className="text-xs text-muted-foreground">
                    How much 1 unit of base currency equals in this currency
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="isActive">Status</Label>
                  <select
                    id="isActive"
                    name="isActive"
                    className="w-full px-3 py-2 border rounded-md"
                    defaultValue={editingCurrency?.isActive ? 'true' : 'false'}
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center space-x-2 p-4 bg-muted rounded-lg">
                <input
                  type="checkbox"
                  id="isBaseCurrency"
                  name="isBaseCurrency"
                  value="true"
                  defaultChecked={editingCurrency?.isBaseCurrency}
                  className="h-4 w-4"
                />
                <Label htmlFor="isBaseCurrency" className="cursor-pointer">
                  Set as Base Currency (exchange rate will be 1.0)
                </Label>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Currency'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setEditingCurrency(null);
                  }}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Currencies Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Currencies</CardTitle>
          <CardDescription>View and manage all configured currencies</CardDescription>
        </CardHeader>
        <CardContent>
          {currencies.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No currencies configured yet. Click "Add Currency" to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Code</th>
                    <th className="text-left py-3 px-4">Name</th>
                    <th className="text-left py-3 px-4">Symbol</th>
                    <th className="text-right py-3 px-4">Exchange Rate</th>
                    <th className="text-center py-3 px-4">Decimal Places</th>
                    <th className="text-center py-3 px-4">Base</th>
                    <th className="text-center py-3 px-4">Status</th>
                    <th className="text-right py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currencies.map((currency) => (
                    <tr key={currency.currencyCode} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4 font-mono font-semibold">
                        {currency.currencyCode}
                      </td>
                      <td className="py-3 px-4">{currency.name}</td>
                      <td className="py-3 px-4 text-lg">{currency.symbol}</td>
                      <td className="py-3 px-4 text-right font-mono">
                        {currency.exchangeRate.toFixed(6)}
                      </td>
                      <td className="py-3 px-4 text-center">{currency.decimalPlaces}</td>
                      <td className="py-3 px-4 text-center">
                        {currency.isBaseCurrency && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Base
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Switch
                          checked={currency.isActive}
                          onCheckedChange={() => toggleCurrencyStatus(currency)}
                        />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setEditingCurrency(currency);
                              setShowForm(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteCurrency(currency.currencyCode)}
                            disabled={currency.isBaseCurrency}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Currency Configuration Guide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Base Currency</h4>
            <p className="text-sm text-muted-foreground">
              The base currency is the reference currency for all exchange rates. Only one currency
              can be set as base. Its exchange rate is always 1.0.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Exchange Rates</h4>
            <p className="text-sm text-muted-foreground">
              Exchange rates should represent how much of the target currency equals 1 unit of the
              base currency. For example, if USD is base and GHS rate is 12.5, it means 1 USD = 12.5
              GHS.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Decimal Places</h4>
            <p className="text-sm text-muted-foreground">
              Determines the precision for amounts in this currency. Most fiat currencies use 2
              decimal places, while cryptocurrencies may use up to 8.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
