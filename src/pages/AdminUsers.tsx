/**
 * Admin Users Management Page
 *
 * Manage admin users, roles, permissions, and access levels
 * Features:
 * - View all admin users with filtering and search
 * - Create new admin users
 * - Edit existing admin users
 * - Manage user status (active, inactive, suspended)
 * - View user activity and sessions
 * - Assign roles and permissions
 */

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, updateDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import type { Admin, AccessLevel, AdminStatus } from '@/types/database';
import {
  Plus,
  Search,
  Edit,
  Shield,
  Lock,
  Unlock,
  UserCheck,
  UserX,
  Calendar,
  Activity,
  Mail,
  Phone,
  Filter,
  X,
  Eye,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function AdminUsers() {
  const { admin: currentAdmin } = useAuth();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [filteredAdmins, setFilteredAdmins] = useState<Admin[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<AdminStatus | 'all'>('all');
  const [filterAccessLevel, setFilterAccessLevel] = useState<AccessLevel | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  const [viewingAdmin, setViewingAdmin] = useState<Admin | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load admin users
  useEffect(() => {
    loadAdmins();
  }, []);

  // Filter admins
  useEffect(() => {
    let filtered = admins;

    // Search filter
    if (searchTerm.trim() !== '') {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (admin) =>
          admin.email.toLowerCase().includes(searchLower) ||
          admin.profile.firstName.toLowerCase().includes(searchLower) ||
          admin.profile.lastName.toLowerCase().includes(searchLower) ||
          admin.profile.displayName.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter((admin) => admin.status === filterStatus);
    }

    // Access level filter
    if (filterAccessLevel !== 'all') {
      filtered = filtered.filter((admin) => admin.accessLevel === filterAccessLevel);
    }

    setFilteredAdmins(filtered);
  }, [searchTerm, filterStatus, filterAccessLevel, admins]);

  const loadAdmins = async () => {
    try {
      setLoading(true);
      setError(null);

      const q = query(collection(db, 'admins'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        adminId: doc.id,
        ...doc.data(),
      })) as Admin[];

      setAdmins(data);
    } catch (err: any) {
      console.error('Error loading admins:', err);
      setError(err.message || 'Failed to load admin users');
    } finally {
      setLoading(false);
    }
  };

  const saveAdmin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentAdmin) return;

    const formData = new FormData(e.currentTarget);

    // Validation
    const email = formData.get('email') as string;
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;

    if (!email || !email.trim() || !email.includes('@')) {
      alert('Please provide a valid email address');
      return;
    }

    if (!firstName || !firstName.trim()) {
      alert('First name is required');
      return;
    }

    if (!lastName || !lastName.trim()) {
      alert('Last name is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const accessLevel = formData.get('accessLevel') as AccessLevel;
      const status = formData.get('status') as AdminStatus;
      const twoFactorEnabled = formData.get('twoFactorEnabled') === 'on';
      const phoneNumber = (formData.get('phoneNumber') as string || '').trim();
      const department = (formData.get('department') as string || '').trim();

      const adminData: any = {
        email: email.trim(),
        profile: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          displayName: `${firstName.trim()} ${lastName.trim()}`,
        },
        accessLevel,
        status,
        auth: {
          ...editingAdmin?.auth,
          twoFactorEnabled,
          passwordHash: editingAdmin?.auth?.passwordHash || 'managed_by_firebase_auth',
          lastPasswordChange: editingAdmin?.auth?.lastPasswordChange || serverTimestamp(),
          lastLogin: editingAdmin?.auth?.lastLogin || serverTimestamp(),
          loginCount: editingAdmin?.auth?.loginCount || 0,
          failedLoginAttempts: editingAdmin?.auth?.failedLoginAttempts || 0,
        },
        roleId: `${accessLevel}_role`,
        permissions: accessLevel === 'super_admin' ? ['*'] : [],
        activeSessions: editingAdmin?.activeSessions || [],
        stats: editingAdmin?.stats || {
          totalLogins: 0,
          totalActions: 0,
          lastActionAt: serverTimestamp(),
          merchantsManaged: 0,
        },
        updatedAt: serverTimestamp(),
        updatedBy: currentAdmin.adminId,
      };

      // Add optional fields
      if (phoneNumber) {
        adminData.phoneNumber = phoneNumber;
      }
      if (department) {
        adminData.profile.department = department;
      }

      let adminId: string;

      if (editingAdmin) {
        // Update existing admin
        adminId = editingAdmin.adminId;
        await updateDoc(doc(db, 'admins', adminId), adminData);
      } else {
        // Create new admin - generate adminId from email
        adminId = `admin_${Date.now()}`;
        adminData.adminId = adminId;
        adminData.createdAt = serverTimestamp();
        adminData.createdBy = currentAdmin.adminId;

        await setDoc(doc(db, 'admins', adminId), adminData);
      }

      setShowModal(false);
      setEditingAdmin(null);
      loadAdmins();
    } catch (err: any) {
      console.error('Error saving admin:', err);
      setError(err.message || 'Failed to save admin user');
      alert(`Failed to save admin: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const updateAdminStatus = async (admin: Admin, newStatus: AdminStatus, reason?: string) => {
    if (!currentAdmin) return;

    const statusActions: Record<AdminStatus, string> = {
      active: 'activate',
      inactive: 'deactivate',
      suspended: 'suspend',
      locked: 'lock',
    };

    const action = statusActions[newStatus];
    if (!confirm(`Are you sure you want to ${action} ${admin.profile.displayName}?`)) {
      return;
    }

    try {
      const updateData: any = {
        status: newStatus,
        updatedAt: serverTimestamp(),
        updatedBy: currentAdmin.adminId,
      };

      if (reason) {
        updateData.statusReason = reason;
      }

      await updateDoc(doc(db, 'admins', admin.adminId), updateData);
      loadAdmins();
    } catch (err: any) {
      console.error('Error updating admin status:', err);
      alert(`Failed to update status: ${err.message}`);
    }
  };

  const getStatusBadge = (status: AdminStatus) => {
    const statusConfig = {
      active: { icon: CheckCircle2, color: 'text-green-600 bg-green-50 dark:bg-green-900/20' },
      inactive: { icon: UserX, color: 'text-gray-600 bg-gray-50 dark:bg-gray-900/20' },
      suspended: { icon: AlertCircle, color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20' },
      locked: { icon: Lock, color: 'text-red-600 bg-red-50 dark:bg-red-900/20' },
    };

    const config = statusConfig[status] || statusConfig.inactive;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3" />
        {status}
      </span>
    );
  };

  const getAccessLevelBadge = (level: AccessLevel) => {
    const levelConfig: Record<AccessLevel, { color: string; icon: any }> = {
      super_admin: { color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300', icon: Shield },
      system_admin: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300', icon: Shield },
      ops_admin: { color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-300', icon: UserCheck },
      finance_admin: { color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300', icon: UserCheck },
      support_admin: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300', icon: UserCheck },
      audit_admin: { color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300', icon: UserCheck },
    };

    const config = levelConfig[level];
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3" />
        {level.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch {
      return 'N/A';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Shield className="h-12 w-12 animate-spin text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Loading admin users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Admin Users</h1>
        <p className="text-muted-foreground">Manage admin users, roles, and permissions</p>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Admins</p>
                <p className="text-2xl font-bold">{admins.length}</p>
              </div>
              <Shield className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-green-600">
                  {admins.filter((a) => a.status === 'active').length}
                </p>
              </div>
              <UserCheck className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Suspended</p>
                <p className="text-2xl font-bold text-orange-600">
                  {admins.filter((a) => a.status === 'suspended').length}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Super Admins</p>
                <p className="text-2xl font-bold text-purple-600">
                  {admins.filter((a) => a.accessLevel === 'super_admin').length}
                </p>
              </div>
              <Shield className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as AdminStatus | 'all')}
              className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
              <option value="locked">Locked</option>
            </select>

            {/* Access Level Filter */}
            <select
              value={filterAccessLevel}
              onChange={(e) => setFilterAccessLevel(e.target.value as AccessLevel | 'all')}
              className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg"
            >
              <option value="all">All Levels</option>
              <option value="super_admin">Super Admin</option>
              <option value="system_admin">System Admin</option>
              <option value="ops_admin">Ops Admin</option>
              <option value="finance_admin">Finance Admin</option>
              <option value="support_admin">Support Admin</option>
              <option value="audit_admin">Audit Admin</option>
            </select>

            {/* Add Admin Button */}
            <Button
              onClick={() => {
                setEditingAdmin(null);
                setShowModal(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Admin
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Admin Users List */}
      <div className="space-y-4">
        {filteredAdmins.map((admin) => (
          <Card key={admin.adminId}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                      {admin.profile.firstName.charAt(0)}
                      {admin.profile.lastName.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{admin.profile.displayName}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="w-3 h-3" />
                        {admin.email}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {getStatusBadge(admin.status)}
                    {getAccessLevelBadge(admin.accessLevel)}
                    {admin.auth.twoFactorEnabled && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                        <Shield className="w-3 h-3" />
                        2FA Enabled
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Department</p>
                      <p className="font-medium">{admin.profile.department || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Logins</p>
                      <p className="font-medium">{admin.stats.totalLogins}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Last Login</p>
                      <p className="font-medium">{formatDate(admin.auth.lastLogin)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Created</p>
                      <p className="font-medium">{formatDate(admin.createdAt)}</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setViewingAdmin(admin);
                      setShowDetailsModal(true);
                    }}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                    title="View Details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      setEditingAdmin(admin);
                      setShowModal(true);
                    }}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                    title="Edit Admin"
                  >
                    <Edit className="w-4 h-4" />
                  </button>

                  {admin.status === 'active' && (
                    <button
                      onClick={() => updateAdminStatus(admin, 'suspended')}
                      className="p-2 hover:bg-orange-100 dark:hover:bg-orange-900 text-orange-600 rounded transition-colors"
                      title="Suspend Admin"
                    >
                      <Lock className="w-4 h-4" />
                    </button>
                  )}

                  {admin.status === 'suspended' && (
                    <button
                      onClick={() => updateAdminStatus(admin, 'active')}
                      className="p-2 hover:bg-green-100 dark:hover:bg-green-900 text-green-600 rounded transition-colors"
                      title="Activate Admin"
                    >
                      <Unlock className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredAdmins.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No admin users found matching your filters.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create/Edit Admin Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">
                  {editingAdmin ? 'Edit Admin User' : 'Create Admin User'}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setEditingAdmin(null);
                  }}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={saveAdmin} className="space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      defaultValue={editingAdmin?.profile.firstName}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      defaultValue={editingAdmin?.profile.lastName}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    defaultValue={editingAdmin?.email}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    name="phoneNumber"
                    type="tel"
                    defaultValue={editingAdmin?.phoneNumber}
                    placeholder="+233 XX XXX XXXX"
                  />
                </div>

                <div>
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    name="department"
                    defaultValue={editingAdmin?.profile.department}
                    placeholder="e.g., Platform Operations"
                  />
                </div>

                {/* Access & Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="accessLevel">Access Level *</Label>
                    <select
                      id="accessLevel"
                      name="accessLevel"
                      defaultValue={editingAdmin?.accessLevel || 'support_admin'}
                      required
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="super_admin">Super Admin</option>
                      <option value="system_admin">System Admin</option>
                      <option value="ops_admin">Ops Admin</option>
                      <option value="finance_admin">Finance Admin</option>
                      <option value="support_admin">Support Admin</option>
                      <option value="audit_admin">Audit Admin</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="status">Status *</Label>
                    <select
                      id="status"
                      name="status"
                      defaultValue={editingAdmin?.status || 'active'}
                      required
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="suspended">Suspended</option>
                      <option value="locked">Locked</option>
                    </select>
                  </div>
                </div>

                {/* Two-Factor Authentication */}
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                  <div>
                    <Label>Two-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">
                      Require 2FA for this admin user
                    </p>
                  </div>
                  <Switch
                    name="twoFactorEnabled"
                    defaultChecked={editingAdmin?.auth.twoFactorEnabled}
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowModal(false);
                      setEditingAdmin(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Saving...' : editingAdmin ? 'Update Admin' : 'Create Admin'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {showDetailsModal && viewingAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Admin Details</h2>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setViewingAdmin(null);
                  }}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Profile */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Profile Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p className="font-medium">{viewingAdmin.profile.displayName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{viewingAdmin.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium">{viewingAdmin.phoneNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Department</p>
                      <p className="font-medium">{viewingAdmin.profile.department || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Access & Status */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Access & Security</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Access Level</p>
                      <div className="mt-1">{getAccessLevelBadge(viewingAdmin.accessLevel)}</div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <div className="mt-1">{getStatusBadge(viewingAdmin.status)}</div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Two-Factor Auth</p>
                      <p className="font-medium">
                        {viewingAdmin.auth.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Failed Login Attempts</p>
                      <p className="font-medium">{viewingAdmin.auth.failedLoginAttempts}</p>
                    </div>
                  </div>
                </div>

                {/* Activity Stats */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Activity Statistics</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Logins</p>
                      <p className="font-medium">{viewingAdmin.stats.totalLogins}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Actions</p>
                      <p className="font-medium">{viewingAdmin.stats.totalActions}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Last Login</p>
                      <p className="font-medium">{formatDate(viewingAdmin.auth.lastLogin)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Last Action</p>
                      <p className="font-medium">{formatDate(viewingAdmin.stats.lastActionAt)}</p>
                    </div>
                  </div>
                </div>

                {/* Active Sessions */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Active Sessions</h3>
                  {viewingAdmin.activeSessions.length > 0 ? (
                    <div className="space-y-2">
                      {viewingAdmin.activeSessions.map((session) => (
                        <div
                          key={session.sessionId}
                          className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg"
                        >
                          <div className="flex justify-between">
                            <p className="text-sm font-medium">{session.ipAddress}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(session.loginAt)}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {session.userAgent}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No active sessions</p>
                  )}
                </div>

                {/* Timestamps */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Record Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Created At</p>
                      <p className="font-medium">{formatDate(viewingAdmin.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Created By</p>
                      <p className="font-medium">{viewingAdmin.createdBy}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Updated At</p>
                      <p className="font-medium">{formatDate(viewingAdmin.updatedAt)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Updated By</p>
                      <p className="font-medium">{viewingAdmin.updatedBy}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
