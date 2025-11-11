/**
 * Business Type Configuration Management
 *
 * Manage different business categories and their specific requirements
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
  Briefcase,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  AlertCircle,
  CheckCircle2,
  Store,
  Tag,
  Package,
} from 'lucide-react';

interface BusinessType {
  businessTypeId: string;
  name: string;
  description: string;
  category: string; // retail, food_beverage, services, professional, etc.
  icon?: string;
  requirements: {
    requiresInventory: boolean;
    requiresAppointments: boolean;
    requiresDelivery: boolean;
    requiresTableManagement: boolean;
    allowsMultipleLocations: boolean;
  };
  features: {
    enableProductCatalog: boolean;
    enableServiceBooking: boolean;
    enableMenuManagement: boolean;
    enableStaffManagement: boolean;
    enableCustomerRewards: boolean;
  };
  limits: {
    maxProducts: number;
    maxServices: number;
    maxStaff: number;
  };
  isActive: boolean;
  sortOrder: number;
  createdAt?: any;
  updatedAt?: any;
  updatedBy?: string;
}

const BUSINESS_CATEGORIES = [
  { value: 'retail', label: 'Retail & Shops' },
  { value: 'food_beverage', label: 'Food & Beverage' },
  { value: 'services', label: 'Services' },
  { value: 'professional', label: 'Professional Services' },
  { value: 'health_wellness', label: 'Health & Wellness' },
  { value: 'education', label: 'Education & Training' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'other', label: 'Other' },
];

export default function BusinessTypes() {
  const { admin } = useAuth();
  const [businessTypes, setBusinessTypes] = useState<BusinessType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form states
  const [editingType, setEditingType] = useState<BusinessType | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form data state for complex nested objects
  const [formData, setFormData] = useState<BusinessType>({
    businessTypeId: '',
    name: '',
    description: '',
    category: 'retail',
    icon: '',
    requirements: {
      requiresInventory: false,
      requiresAppointments: false,
      requiresDelivery: false,
      requiresTableManagement: false,
      allowsMultipleLocations: true,
    },
    features: {
      enableProductCatalog: true,
      enableServiceBooking: false,
      enableMenuManagement: false,
      enableStaffManagement: false,
      enableCustomerRewards: false,
    },
    limits: {
      maxProducts: 1000,
      maxServices: 100,
      maxStaff: 10,
    },
    isActive: true,
    sortOrder: 0,
  });

  useEffect(() => {
    loadBusinessTypes();
  }, []);

  const loadBusinessTypes = async () => {
    try {
      setLoading(true);
      setError(null);

      const typesRef = collection(db, 'businessTypes');
      const typesSnap = await getDocs(typesRef);
      const typesData = typesSnap.docs
        .map((doc) => ({
          businessTypeId: doc.id,
          ...doc.data(),
        })) as BusinessType[];

      // Client-side sorting to avoid composite index requirement
      typesData.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

      setBusinessTypes(typesData);
    } catch (err: any) {
      console.error('Error loading business types:', err);
      setError(err.message || 'Failed to load business types');
    } finally {
      setLoading(false);
    }
  };

  const saveBusinessType = async (businessType: BusinessType) => {
    if (!admin) return;

    try {
      setSaving(true);
      setError(null);

      const typeRef = doc(db, 'businessTypes', businessType.businessTypeId);
      await setDoc(typeRef, {
        ...businessType,
        updatedAt: serverTimestamp(),
        updatedBy: admin.adminId,
        createdAt: businessType.createdAt || serverTimestamp(),
      });

      setSuccessMessage('Business type saved successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      setShowForm(false);
      setEditingType(null);
      resetForm();
      await loadBusinessTypes();
    } catch (err: any) {
      console.error('Error saving business type:', err);
      setError(err.message || 'Failed to save business type');
    } finally {
      setSaving(false);
    }
  };

  const deleteBusinessType = async (businessTypeId: string) => {
    if (!confirm(`Are you sure you want to delete this business type?`)) return;

    try {
      setSaving(true);
      const typeRef = doc(db, 'businessTypes', businessTypeId);
      await deleteDoc(typeRef);
      setSuccessMessage('Business type deleted successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      await loadBusinessTypes();
    } catch (err: any) {
      setError(err.message || 'Failed to delete business type');
    } finally {
      setSaving(false);
    }
  };

  const toggleTypeStatus = async (businessType: BusinessType) => {
    await saveBusinessType({
      ...businessType,
      isActive: !businessType.isActive,
    });
  };

  const resetForm = () => {
    setFormData({
      businessTypeId: '',
      name: '',
      description: '',
      category: 'retail',
      icon: '',
      requirements: {
        requiresInventory: false,
        requiresAppointments: false,
        requiresDelivery: false,
        requiresTableManagement: false,
        allowsMultipleLocations: true,
      },
      features: {
        enableProductCatalog: true,
        enableServiceBooking: false,
        enableMenuManagement: false,
        enableStaffManagement: false,
        enableCustomerRewards: false,
      },
      limits: {
        maxProducts: 1000,
        maxServices: 100,
        maxStaff: 10,
      },
      isActive: true,
      sortOrder: 0,
    });
  };

  const openEditForm = (businessType: BusinessType) => {
    setFormData(businessType);
    setEditingType(businessType);
    setShowForm(true);
  };

  const openAddForm = () => {
    resetForm();
    setEditingType(null);
    setShowForm(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Briefcase className="h-12 w-12 animate-pulse text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Loading business types...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Business Type Configuration</h1>
        <p className="text-muted-foreground">
          Define and manage business categories and their specific requirements
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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Types</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{businessTypes.length}</div>
            <p className="text-xs text-muted-foreground">Configured business types</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Types</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {businessTypes.filter((t) => t.isActive).length}
            </div>
            <p className="text-xs text-muted-foreground">Currently available</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(businessTypes.map((t) => t.category)).size}
            </div>
            <p className="text-xs text-muted-foreground">Unique categories</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <Button onClick={openAddForm} disabled={showForm}>
          <Plus className="mr-2 h-4 w-4" />
          Add Business Type
        </Button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingType ? 'Edit' : 'Add'} Business Type</CardTitle>
            <CardDescription>
              Configure business category requirements and features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveBusinessType(formData);
              }}
              className="space-y-6"
            >
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="businessTypeId">Type ID</Label>
                    <Input
                      id="businessTypeId"
                      value={formData.businessTypeId}
                      onChange={(e) =>
                        setFormData({ ...formData, businessTypeId: e.target.value })
                      }
                      placeholder="retail_shop"
                      required
                      disabled={!!editingType}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Display Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Retail Shop"
                      required
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      placeholder="General retail store selling products"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <select
                      id="category"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      {BUSINESS_CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="icon">Icon (Emoji)</Label>
                    <Input
                      id="icon"
                      value={formData.icon}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                      placeholder="🏪"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sortOrder">Sort Order</Label>
                    <Input
                      id="sortOrder"
                      type="number"
                      value={formData.sortOrder}
                      onChange={(e) =>
                        setFormData({ ...formData, sortOrder: parseInt(e.target.value) })
                      }
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {/* Requirements */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Requirements</h3>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(formData.requirements).map(([key, value]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <Switch
                        checked={value}
                        onCheckedChange={(checked) =>
                          setFormData({
                            ...formData,
                            requirements: { ...formData.requirements, [key]: checked },
                          })
                        }
                      />
                      <Label className="cursor-pointer">
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Features */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Features</h3>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(formData.features).map(([key, value]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <Switch
                        checked={value}
                        onCheckedChange={(checked) =>
                          setFormData({
                            ...formData,
                            features: { ...formData.features, [key]: checked },
                          })
                        }
                      />
                      <Label className="cursor-pointer">
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Limits */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Limits</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxProducts">Max Products</Label>
                    <Input
                      id="maxProducts"
                      type="number"
                      value={formData.limits.maxProducts}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          limits: { ...formData.limits, maxProducts: parseInt(e.target.value) },
                        })
                      }
                      min="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxServices">Max Services</Label>
                    <Input
                      id="maxServices"
                      type="number"
                      value={formData.limits.maxServices}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          limits: { ...formData.limits, maxServices: parseInt(e.target.value) },
                        })
                      }
                      min="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxStaff">Max Staff</Label>
                    <Input
                      id="maxStaff"
                      type="number"
                      value={formData.limits.maxStaff}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          limits: { ...formData.limits, maxStaff: parseInt(e.target.value) },
                        })
                      }
                      min="0"
                    />
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label className="cursor-pointer">Active</Label>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Business Type'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setEditingType(null);
                    resetForm();
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

      {/* Business Types List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {businessTypes.map((type) => (
          <Card key={type.businessTypeId}>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{type.icon || '📦'}</span>
                    <div>
                      <h3 className="font-semibold">{type.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {BUSINESS_CATEGORIES.find((c) => c.value === type.category)?.label}
                      </p>
                    </div>
                  </div>
                  <Switch checked={type.isActive} onCheckedChange={() => toggleTypeStatus(type)} />
                </div>

                <p className="text-sm text-muted-foreground">{type.description}</p>

                <div className="space-y-2">
                  <div className="text-xs">
                    <span className="font-semibold">Limits:</span> {type.limits.maxProducts} products,{' '}
                    {type.limits.maxServices} services, {type.limits.maxStaff} staff
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {type.requirements.requiresInventory && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                        Inventory
                      </span>
                    )}
                    {type.requirements.requiresAppointments && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                        Appointments
                      </span>
                    )}
                    {type.requirements.requiresDelivery && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                        Delivery
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-1 pt-2">
                  <Button size="sm" variant="outline" onClick={() => openEditForm(type)}>
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteBusinessType(type.businessTypeId)}
                  >
                    <Trash2 className="h-3 w-3 mr-1 text-red-600" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {businessTypes.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No business types configured yet. Click "Add Business Type" to get started.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
