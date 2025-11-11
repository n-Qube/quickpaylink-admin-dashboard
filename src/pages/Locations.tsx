/**
 * Dynamic Location Management Page
 *
 * Manage countries, regions, and cities for the platform
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  Globe,
  MapPin,
  Building2,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface Country {
  countryCode: string;
  name: string;
  dialCode: string;
  currency: string;
  flag?: string;
  isActive: boolean;
  createdAt?: any;
  updatedAt?: any;
  updatedBy?: string;
}

interface Region {
  regionId: string;
  countryCode: string;
  name: string;
  isActive: boolean;
  createdAt?: any;
  updatedAt?: any;
}

interface City {
  cityId: string;
  countryCode: string;
  regionId: string;
  name: string;
  isActive: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export default function Locations() {
  const { admin } = useAuth();
  const [countries, setCountries] = useState<Country[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form states
  const [editingCountry, setEditingCountry] = useState<Country | null>(null);
  const [editingRegion, setEditingRegion] = useState<Region | null>(null);
  const [editingCity, setEditingCity] = useState<City | null>(null);
  const [showCountryForm, setShowCountryForm] = useState(false);
  const [showRegionForm, setShowRegionForm] = useState(false);
  const [showCityForm, setShowCityForm] = useState(false);

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load countries
      const countriesRef = collection(db, 'countries');
      const countriesSnap = await getDocs(query(countriesRef, orderBy('name')));
      const countriesData = countriesSnap.docs.map((doc) => ({
        countryCode: doc.id,
        ...doc.data(),
      })) as Country[];
      setCountries(countriesData);

      // Load all regions and cities (for now, load all)
      // In production, you'd load these on-demand per country
      const allRegions: Region[] = [];
      const allCities: City[] = [];

      for (const country of countriesData) {
        // Load regions for this country
        const regionsRef = collection(db, `countries/${country.countryCode}/regions`);
        const regionsSnap = await getDocs(regionsRef);
        const regionData = regionsSnap.docs.map((doc) => ({
          regionId: doc.id,
          countryCode: country.countryCode,
          ...doc.data(),
        })) as Region[];
        allRegions.push(...regionData);

        // Load cities for this country
        const citiesRef = collection(db, `countries/${country.countryCode}/cities`);
        const citiesSnap = await getDocs(citiesRef);
        const cityData = citiesSnap.docs.map((doc) => ({
          cityId: doc.id,
          countryCode: country.countryCode,
          ...doc.data(),
        })) as City[];
        allCities.push(...cityData);
      }

      setRegions(allRegions);
      setCities(allCities);
    } catch (err: any) {
      console.error('Error loading locations:', err);
      setError(err.message || 'Failed to load locations');
    } finally {
      setLoading(false);
    }
  };

  const saveCountry = async (country: Country) => {
    if (!admin) return;

    try {
      setSaving(true);
      setError(null);

      const countryRef = doc(db, 'countries', country.countryCode);
      const dataToSave: any = {
        name: country.name,
        dialCode: country.dialCode,
        currency: country.currency,
        flag: country.flag || '',
        isActive: country.isActive,
        updatedAt: serverTimestamp(),
        updatedBy: admin.adminId,
      };

      // Only set createdAt if it's a new document
      if (!country.createdAt) {
        dataToSave.createdAt = serverTimestamp();
      }

      await setDoc(countryRef, dataToSave, { merge: true });

      setSuccessMessage('Country saved successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      setShowCountryForm(false);
      setEditingCountry(null);
      await loadLocations();
    } catch (err: any) {
      console.error('Error saving country:', err);
      let errorMessage = 'Failed to save country';

      if (err) {
        if (typeof err === 'string') {
          errorMessage = err;
        } else if (err.message) {
          errorMessage = err.message;
        } else if (err.code) {
          errorMessage = `Error code: ${err.code}`;
        } else {
          try {
            const errStr = JSON.stringify(err);
            if (errStr && errStr !== '{}') {
              errorMessage = errStr;
            }
          } catch (e) {
            // JSON.stringify failed, use default message
          }
        }
      }

      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const saveRegion = async (region: Region) => {
    if (!admin) return;

    try {
      setSaving(true);
      setError(null);

      const regionRef = doc(
        db,
        `countries/${region.countryCode}/regions`,
        region.regionId
      );
      await setDoc(regionRef, {
        ...region,
        updatedAt: serverTimestamp(),
        createdAt: region.createdAt || serverTimestamp(),
      });

      setSuccessMessage('Region saved successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      setShowRegionForm(false);
      setEditingRegion(null);
      await loadLocations();
    } catch (err: any) {
      console.error('Error saving region:', err);
      const errorMessage = err?.message || err?.toString() || 'Failed to save region';
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const saveCity = async (city: City) => {
    if (!admin) return;

    try {
      setSaving(true);
      setError(null);

      const cityRef = doc(db, `countries/${city.countryCode}/cities`, city.cityId);
      await setDoc(cityRef, {
        ...city,
        updatedAt: serverTimestamp(),
        createdAt: city.createdAt || serverTimestamp(),
      });

      setSuccessMessage('City saved successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      setShowCityForm(false);
      setEditingCity(null);
      await loadLocations();
    } catch (err: any) {
      console.error('Error saving city:', err);
      const errorMessage = err?.message || err?.toString() || 'Failed to save city';
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const deleteCountry = async (countryCode: string) => {
    if (!confirm('Are you sure you want to delete this country?')) return;

    try {
      setSaving(true);
      const countryRef = doc(db, 'countries', countryCode);
      await deleteDoc(countryRef);
      setSuccessMessage('Country deleted successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      await loadLocations();
    } catch (err: any) {
      const errorMessage = err?.message || err?.toString() || 'Failed to delete country';
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const deleteRegion = async (countryCode: string, regionId: string) => {
    if (!confirm('Are you sure you want to delete this region?')) return;

    try {
      setSaving(true);
      const regionRef = doc(db, `countries/${countryCode}/regions`, regionId);
      await deleteDoc(regionRef);
      setSuccessMessage('Region deleted successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      await loadLocations();
    } catch (err: any) {
      let errorMessage = 'Failed to delete region';
      if (err) {
        if (typeof err === 'string') {
          errorMessage = err;
        } else if (err.message) {
          errorMessage = err.message;
        } else if (err.code) {
          errorMessage = `Error code: ${err.code}`;
        }
      }
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const deleteCity = async (countryCode: string, cityId: string) => {
    if (!confirm('Are you sure you want to delete this city?')) return;

    try {
      setSaving(true);
      const cityRef = doc(db, `countries/${countryCode}/cities`, cityId);
      await deleteDoc(cityRef);
      setSuccessMessage('City deleted successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      await loadLocations();
    } catch (err: any) {
      let errorMessage = 'Failed to delete city';
      if (err) {
        if (typeof err === 'string') {
          errorMessage = err;
        } else if (err.message) {
          errorMessage = err.message;
        } else if (err.code) {
          errorMessage = `Error code: ${err.code}`;
        }
      }
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Globe className="h-12 w-12 animate-spin text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Loading locations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Location Management</h1>
        <p className="text-muted-foreground">
          Manage countries, regions, and cities for the platform
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

      {/* Location Tabs */}
      <Tabs defaultValue="countries" className="space-y-6">
        <TabsList>
          <TabsTrigger value="countries">
            <Globe className="mr-2 h-4 w-4" />
            Countries ({countries.length})
          </TabsTrigger>
          <TabsTrigger value="regions">
            <MapPin className="mr-2 h-4 w-4" />
            Regions ({regions.length})
          </TabsTrigger>
          <TabsTrigger value="cities">
            <Building2 className="mr-2 h-4 w-4" />
            Cities ({cities.length})
          </TabsTrigger>
        </TabsList>

        {/* Countries Tab */}
        <TabsContent value="countries" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Countries</h2>
            <Button onClick={() => setShowCountryForm(true)} disabled={showCountryForm}>
              <Plus className="mr-2 h-4 w-4" />
              Add Country
            </Button>
          </div>

          {/* Add/Edit Country Form */}
          {showCountryForm && (
            <Card>
              <CardHeader>
                <CardTitle>{editingCountry ? 'Edit' : 'Add'} Country</CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const country: Country = {
                      countryCode: formData.get('countryCode') as string,
                      name: formData.get('name') as string,
                      dialCode: formData.get('dialCode') as string,
                      currency: formData.get('currency') as string,
                      flag: formData.get('flag') as string,
                      isActive: (formData.get('isActive') as string) === 'true',
                      createdAt: editingCountry?.createdAt,
                    };
                    saveCountry(country);
                  }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="countryCode">Country Code (ISO)</Label>
                      <Input
                        id="countryCode"
                        name="countryCode"
                        placeholder="GH"
                        required
                        maxLength={2}
                        defaultValue={editingCountry?.countryCode}
                        disabled={!!editingCountry}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="name">Country Name</Label>
                      <Input
                        id="name"
                        name="name"
                        placeholder="Ghana"
                        required
                        defaultValue={editingCountry?.name}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dialCode">Dial Code</Label>
                      <Input
                        id="dialCode"
                        name="dialCode"
                        placeholder="+233"
                        required
                        defaultValue={editingCountry?.dialCode}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currency">Currency</Label>
                      <Input
                        id="currency"
                        name="currency"
                        placeholder="GHS"
                        required
                        defaultValue={editingCountry?.currency}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="flag">Flag Emoji</Label>
                      <Input
                        id="flag"
                        name="flag"
                        placeholder="🇬🇭"
                        defaultValue={editingCountry?.flag}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="isActive">Status</Label>
                      <select
                        id="isActive"
                        name="isActive"
                        className="w-full px-3 py-2 border rounded-md"
                        defaultValue={editingCountry?.isActive ? 'true' : 'false'}
                      >
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={saving}>
                      <Save className="mr-2 h-4 w-4" />
                      {saving ? 'Saving...' : 'Save Country'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowCountryForm(false);
                        setEditingCountry(null);
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

          {/* Countries List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {countries.map((country) => (
              <Card key={country.countryCode}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">{country.flag || '🌍'}</span>
                        <div>
                          <h3 className="font-semibold">{country.name}</h3>
                          <p className="text-sm text-muted-foreground">{country.countryCode}</p>
                        </div>
                      </div>
                      <div className="space-y-1 text-sm">
                        <p>
                          <span className="text-muted-foreground">Dial Code:</span>{' '}
                          {country.dialCode}
                        </p>
                        <p>
                          <span className="text-muted-foreground">Currency:</span>{' '}
                          {country.currency}
                        </p>
                        <p>
                          <span className="text-muted-foreground">Status:</span>{' '}
                          <span
                            className={
                              country.isActive ? 'text-green-600' : 'text-red-600'
                            }
                          >
                            {country.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditingCountry(country);
                          setShowCountryForm(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteCountry(country.countryCode)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {countries.length === 0 && (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No countries added yet. Click "Add Country" to get started.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Regions Tab */}
        <TabsContent value="regions" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Regions</h2>
            <Button onClick={() => setShowRegionForm(true)} disabled={showRegionForm || countries.length === 0}>
              <Plus className="mr-2 h-4 w-4" />
              Add Region
            </Button>
          </div>

          {countries.length === 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please add at least one country before creating regions.
              </AlertDescription>
            </Alert>
          )}

          {/* Add/Edit Region Form */}
          {showRegionForm && (
            <Card>
              <CardHeader>
                <CardTitle>{editingRegion ? 'Edit' : 'Add'} Region</CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const region: Region = {
                      regionId: formData.get('regionId') as string,
                      countryCode: formData.get('countryCode') as string,
                      name: formData.get('name') as string,
                      isActive: (formData.get('isActive') as string) === 'true',
                      createdAt: editingRegion?.createdAt,
                    };
                    saveRegion(region);
                  }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="regionId">Region ID</Label>
                      <Input
                        id="regionId"
                        name="regionId"
                        placeholder="greater_accra"
                        required
                        defaultValue={editingRegion?.regionId}
                        disabled={!!editingRegion}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="countryCode">Country</Label>
                      <select
                        id="countryCode"
                        name="countryCode"
                        className="w-full px-3 py-2 border rounded-md"
                        required
                        defaultValue={editingRegion?.countryCode}
                        disabled={!!editingRegion}
                      >
                        <option value="">Select Country</option>
                        {countries.map((country) => (
                          <option key={country.countryCode} value={country.countryCode}>
                            {country.flag} {country.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="name">Region Name</Label>
                      <Input
                        id="name"
                        name="name"
                        placeholder="Greater Accra"
                        required
                        defaultValue={editingRegion?.name}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="isActive">Status</Label>
                      <select
                        id="isActive"
                        name="isActive"
                        className="w-full px-3 py-2 border rounded-md"
                        defaultValue={editingRegion?.isActive ? 'true' : 'false'}
                      >
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={saving}>
                      <Save className="mr-2 h-4 w-4" />
                      {saving ? 'Saving...' : 'Save Region'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowRegionForm(false);
                        setEditingRegion(null);
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

          {/* Regions List - Group by Country */}
          {countries.map((country) => {
            const countryRegions = regions.filter((r) => r.countryCode === country.countryCode);
            if (countryRegions.length === 0) return null;

            return (
              <Card key={country.countryCode}>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {country.flag} {country.name} - Regions ({countryRegions.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {countryRegions.map((region) => (
                      <div
                        key={region.regionId}
                        className="flex items-center justify-between p-3 border rounded-md"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{region.name}</p>
                          <p className="text-xs text-muted-foreground">{region.regionId}</p>
                          <p
                            className={`text-xs ${
                              region.isActive ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {region.isActive ? 'Active' : 'Inactive'}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setEditingRegion(region);
                              setShowRegionForm(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteRegion(region.countryCode, region.regionId)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {regions.length === 0 && countries.length > 0 && (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No regions added yet. Click "Add Region" to get started.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Cities Tab */}
        <TabsContent value="cities" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Cities</h2>
            <Button onClick={() => setShowCityForm(true)} disabled={showCityForm || regions.length === 0}>
              <Plus className="mr-2 h-4 w-4" />
              Add City
            </Button>
          </div>

          {regions.length === 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please add at least one region before creating cities.
              </AlertDescription>
            </Alert>
          )}

          {/* Add/Edit City Form */}
          {showCityForm && (
            <Card>
              <CardHeader>
                <CardTitle>{editingCity ? 'Edit' : 'Add'} City</CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const city: City = {
                      cityId: formData.get('cityId') as string,
                      countryCode: formData.get('countryCode') as string,
                      regionId: formData.get('regionId') as string,
                      name: formData.get('name') as string,
                      isActive: (formData.get('isActive') as string) === 'true',
                      createdAt: editingCity?.createdAt,
                    };
                    saveCity(city);
                  }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cityId">City ID</Label>
                      <Input
                        id="cityId"
                        name="cityId"
                        placeholder="accra"
                        required
                        defaultValue={editingCity?.cityId}
                        disabled={!!editingCity}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="countryCode">Country</Label>
                      <select
                        id="countryCode"
                        name="countryCode"
                        className="w-full px-3 py-2 border rounded-md"
                        required
                        defaultValue={editingCity?.countryCode}
                        disabled={!!editingCity}
                        onChange={(e) => {
                          // Filter regions when country changes
                          const form = e.target.form;
                          if (form) {
                            const regionSelect = form.querySelector('#regionId') as HTMLSelectElement;
                            if (regionSelect) {
                              const selectedCountry = e.target.value;
                              const options = regionSelect.querySelectorAll('option');
                              options.forEach((option) => {
                                if (option.value === '') return;
                                const regionCountry = option.getAttribute('data-country');
                                option.style.display = regionCountry === selectedCountry ? '' : 'none';
                              });
                              regionSelect.value = '';
                            }
                          }
                        }}
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
                      <Label htmlFor="regionId">Region</Label>
                      <select
                        id="regionId"
                        name="regionId"
                        className="w-full px-3 py-2 border rounded-md"
                        required
                        defaultValue={editingCity?.regionId}
                        disabled={!!editingCity}
                      >
                        <option value="">Select Region</option>
                        {regions.map((region) => (
                          <option
                            key={region.regionId}
                            value={region.regionId}
                            data-country={region.countryCode}
                            style={{ display: editingCity ? '' : 'none' }}
                          >
                            {region.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="name">City Name</Label>
                      <Input
                        id="name"
                        name="name"
                        placeholder="Accra"
                        required
                        defaultValue={editingCity?.name}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="isActive">Status</Label>
                      <select
                        id="isActive"
                        name="isActive"
                        className="w-full px-3 py-2 border rounded-md"
                        defaultValue={editingCity?.isActive ? 'true' : 'false'}
                      >
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={saving}>
                      <Save className="mr-2 h-4 w-4" />
                      {saving ? 'Saving...' : 'Save City'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowCityForm(false);
                        setEditingCity(null);
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

          {/* Cities List - Group by Country/Region */}
          {countries.map((country) => {
            const countryCities = cities.filter((c) => c.countryCode === country.countryCode);
            if (countryCities.length === 0) return null;

            return (
              <Card key={country.countryCode}>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {country.flag} {country.name} - Cities ({countryCities.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {regions
                    .filter((r) => r.countryCode === country.countryCode)
                    .map((region) => {
                      const regionCities = countryCities.filter((c) => c.regionId === region.regionId);
                      if (regionCities.length === 0) return null;

                      return (
                        <div key={region.regionId}>
                          <h3 className="text-sm font-semibold mb-2">{region.name}</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {regionCities.map((city) => (
                              <div
                                key={city.cityId}
                                className="flex items-center justify-between p-3 border rounded-md"
                              >
                                <div className="flex-1">
                                  <p className="font-medium">{city.name}</p>
                                  <p className="text-xs text-muted-foreground">{city.cityId}</p>
                                  <p
                                    className={`text-xs ${
                                      city.isActive ? 'text-green-600' : 'text-red-600'
                                    }`}
                                  >
                                    {city.isActive ? 'Active' : 'Inactive'}
                                  </p>
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => {
                                      setEditingCity(city);
                                      setShowCityForm(true);
                                    }}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => deleteCity(city.countryCode, city.cityId)}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-600" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                </CardContent>
              </Card>
            );
          })}

          {cities.length === 0 && regions.length > 0 && (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No cities added yet. Click "Add City" to get started.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
