/**
 * User Editor Component
 *
 * Modal for creating and editing admin users with role assignment
 */

import { useState, useEffect } from 'react';
import { X, Save, User, Mail, Phone, Lock, Shield, Building, AlertCircle } from 'lucide-react';
import { Admin, Role } from '@/types/database';
import { Timestamp } from 'firebase/firestore';

interface UserEditorProps {
  user: Partial<Admin> | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (userData: Partial<Admin>) => void;
  availableRoles: Role[];
  currentUserRole: Role | null;
}

export default function UserEditor({
  user,
  isOpen,
  onClose,
  onSave,
  availableRoles,
  currentUserRole,
}: UserEditorProps) {
  const [formData, setFormData] = useState<Partial<Admin>>({
    email: '',
    phoneNumber: '',
    profile: {
      firstName: '',
      lastName: '',
      displayName: '',
      department: '',
    },
    roleId: '',
    permissions: [],
    accessLevel: 'support_admin',
    auth: {
      passwordHash: '', // This will be set server-side
      lastPasswordChange: Timestamp.now(),
      twoFactorEnabled: false,
      lastLogin: Timestamp.now(),
      loginCount: 0,
      failedLoginAttempts: 0,
    },
  });

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [enableSubUserCreation, setEnableSubUserCreation] = useState(false);
  const [maxSubUsers, setMaxSubUsers] = useState<number | ''>('');

  useEffect(() => {
    if (user) {
      setFormData(user);
      setEnableSubUserCreation(user.canCreateSubUsers || false);
      setMaxSubUsers(user.maxSubUsers || '');
    } else {
      // Reset for new user
      setFormData({
        email: '',
        phoneNumber: '',
        profile: {
          firstName: '',
          lastName: '',
          displayName: '',
          department: '',
        },
        roleId: '',
        permissions: [],
        accessLevel: 'support_admin',
        auth: {
          passwordHash: '',
          lastPasswordChange: Timestamp.now(),
          twoFactorEnabled: false,
          lastLogin: Timestamp.now(),
          loginCount: 0,
          failedLoginAttempts: 0,
        },
      });
      setPassword('');
      setConfirmPassword('');
      setEnableSubUserCreation(false);
      setMaxSubUsers('');
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.email || !formData.profile?.firstName || !formData.profile?.lastName || !formData.roleId) {
      alert('Please fill in all required fields');
      return;
    }

    // Password validation for new users
    if (!user?.adminId) {
      if (!password || password.length < 8) {
        alert('Password must be at least 8 characters long');
        return;
      }

      if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
      }
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      alert('Please enter a valid email address');
      return;
    }

    // Get selected role's access level
    const selectedRole = availableRoles.find(r => r.roleId === formData.roleId);
    if (!selectedRole) {
      alert('Please select a valid role');
      return;
    }

    const userData: Partial<Admin> = {
      ...formData,
      profile: {
        ...formData.profile!,
        displayName: `${formData.profile!.firstName} ${formData.profile!.lastName}`,
      },
      canCreateSubUsers: enableSubUserCreation,
      maxSubUsers: enableSubUserCreation && maxSubUsers ? Number(maxSubUsers) : undefined,
      // Note: Password handling should be done server-side via Cloud Functions
      // This is just for demonstration. In production, trigger a password reset email
    };

    onSave(userData);
  };

  const handleRoleChange = (roleId: string) => {
    const selectedRole = availableRoles.find(r => r.roleId === roleId);
    if (selectedRole) {
      setFormData(prev => ({
        ...prev,
        roleId,
        accessLevel: getAccessLevelFromRole(selectedRole),
      }));
    }
  };

  const getAccessLevelFromRole = (role: Role): any => {
    // Map role level to access level
    if (role.level <= 10) return 'super_admin';
    if (role.level <= 20) return 'system_admin';
    if (role.level <= 30) return 'ops_admin';
    if (role.level <= 40) return 'finance_admin';
    if (role.level <= 50) return 'support_admin';
    if (role.level <= 60) return 'audit_admin';
    if (role.level <= 70) return 'merchant_support_lead';
    return 'merchant_support_agent';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-3xl w-full my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <User className="w-8 h-8 p-1.5 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-lg" />
            <div>
              <h2 className="text-2xl font-bold">
                {user?.adminId ? 'Edit User' : 'Create New User'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {user?.adminId ? 'Update user information and permissions' : 'Add a new team member with assigned role'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Personal Information</h3>

              <div>
                <label className="block text-sm font-medium mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.profile?.firstName}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    profile: { ...prev.profile!, firstName: e.target.value },
                  }))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.profile?.lastName}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    profile: { ...prev.profile!, lastName: e.target.value },
                  }))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900"
                    placeholder="user@example.com"
                    required
                    disabled={!!user?.adminId} // Can't change email for existing users
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                    className="w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900"
                    placeholder="+1234567890"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Department</label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <input
                    type="text"
                    value={formData.profile?.department}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      profile: { ...prev.profile!, department: e.target.value },
                    }))}
                    className="w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900"
                    placeholder="e.g., Support, Sales, Operations"
                  />
                </div>
              </div>
            </div>

            {/* Role and Security */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Role & Permissions</h3>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Role <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <select
                    value={formData.roleId}
                    onChange={(e) => handleRoleChange(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900"
                    required
                  >
                    <option value="">Select a role</option>
                    {availableRoles.map(role => (
                      <option key={role.roleId} value={role.roleId}>
                        {role.displayName} (Level {role.level})
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {currentUserRole
                    ? `You can assign roles with level > ${currentUserRole.level}`
                    : 'Select role to assign to this user'}
                </p>
              </div>

              {/* Password fields for new users */}
              {!user?.adminId && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-10 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900"
                        placeholder="Min. 8 characters"
                        minLength={8}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <AlertCircle className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Confirm Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900"
                        placeholder="Repeat password"
                        minLength={8}
                        required
                      />
                    </div>
                    {password && confirmPassword && password !== confirmPassword && (
                      <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                    )}
                  </div>
                </>
              )}

              <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <h4 className="font-medium text-sm">User Capabilities</h4>

                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={enableSubUserCreation}
                    onChange={(e) => {
                      setEnableSubUserCreation(e.target.checked);
                      if (!e.target.checked) {
                        setMaxSubUsers('');
                      }
                    }}
                    className="rounded mt-1"
                  />
                  <div>
                    <span className="text-sm font-medium">Allow Sub-User Creation</span>
                    <p className="text-xs text-muted-foreground">
                      User can create and manage their own team members
                    </p>
                  </div>
                </label>

                {enableSubUserCreation && (
                  <div className="ml-6">
                    <label className="block text-sm font-medium mb-1">
                      Max Sub-Users (Optional)
                    </label>
                    <input
                      type="number"
                      value={maxSubUsers}
                      onChange={(e) => setMaxSubUsers(e.target.value ? parseInt(e.target.value) : '')}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900"
                      min="1"
                      placeholder="Unlimited"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Leave empty for unlimited subordinates
                    </p>
                  </div>
                )}

                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-blue-700 dark:text-blue-300">
                      <p className="font-medium mb-1">Security Note</p>
                      <p>
                        In production, passwords should be set via email verification.
                        Users will receive a password reset link to set their own secure password.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              <Save className="w-4 h-4" />
              {user?.adminId ? 'Update User' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
