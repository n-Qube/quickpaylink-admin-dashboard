/**
 * Role Editor Component
 *
 * Modal for creating and editing roles with permission configuration
 */

import { useState, useEffect } from 'react';
import { X, Save, Shield, CheckCircle, XCircle, Info } from 'lucide-react';
import { Role } from '@/types/database';

interface RoleEditorProps {
  role: Role | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (roleData: Partial<Role>) => void;
  existingRoles: Role[];
}

interface PermissionConfig {
  label: string;
  key: string;
  actions: ('read' | 'write' | 'delete' | 'export' | 'suspend' | 'terminate' | 'create' | 'update' | 'assignRoles')[];
}

const PERMISSION_MODULES: PermissionConfig[] = [
  {
    label: 'System Configuration',
    key: 'systemConfig',
    actions: ['read', 'write', 'delete'],
  },
  {
    label: 'API Management',
    key: 'apiManagement',
    actions: ['read', 'write', 'delete'],
  },
  {
    label: 'Pricing',
    key: 'pricing',
    actions: ['read', 'write', 'delete'],
  },
  {
    label: 'Merchant Management',
    key: 'merchantManagement',
    actions: ['read', 'write', 'delete', 'suspend', 'terminate'],
  },
  {
    label: 'Analytics',
    key: 'analytics',
    actions: ['read', 'export'],
  },
  {
    label: 'System Health',
    key: 'systemHealth',
    actions: ['read', 'write', 'delete'],
  },
  {
    label: 'Compliance',
    key: 'compliance',
    actions: ['read', 'write', 'delete', 'export'],
  },
  {
    label: 'Audit Logs',
    key: 'auditLogs',
    actions: ['read'],
  },
  {
    label: 'User Management',
    key: 'userManagement',
    actions: ['read', 'create', 'update', 'delete', 'assignRoles'],
  },
  {
    label: 'Role Management',
    key: 'roleManagement',
    actions: ['read', 'create', 'update', 'delete'],
  },
  {
    label: 'Templates',
    key: 'templates',
    actions: ['read', 'create', 'update', 'delete'],
  },
  {
    label: 'Support Tickets',
    key: 'supportTickets',
    actions: ['read', 'create', 'update', 'delete'],
  },
  {
    label: 'AI Prompts',
    key: 'aiPrompts',
    actions: ['read', 'create', 'update', 'delete'],
  },
  {
    label: 'Payouts & Settlements',
    key: 'payouts',
    actions: ['read', 'write', 'delete'],
  },
];

export default function RoleEditor({ role, isOpen, onClose, onSave, existingRoles }: RoleEditorProps) {
  const [formData, setFormData] = useState<Partial<Role>>({
    name: '',
    displayName: '',
    description: '',
    level: 50,
    isSystemRole: false,
    isCustomRole: true,
    canCreateSubRoles: false,
    canManageUsers: false,
    permissions: {
      systemConfig: { read: false, write: false, delete: false },
      apiManagement: { read: false, write: false, delete: false },
      pricing: { read: false, write: false, delete: false },
      merchantManagement: { read: false, write: false, delete: false, suspend: false, terminate: false },
      analytics: { read: false, export: false },
      systemHealth: { read: false, write: false, delete: false },
      compliance: { read: false, write: false, delete: false, export: false },
      auditLogs: { read: false },
      userManagement: { read: false, create: false, update: false, delete: false, assignRoles: false },
      roleManagement: { read: false, create: false, update: false, delete: false },
      templates: { read: false, create: false, update: false, delete: false },
      supportTickets: { read: false, create: false, update: false, delete: false },
      aiPrompts: { read: false, create: false, update: false, delete: false },
      payouts: { read: false, write: false, delete: false },
    },
  });

  useEffect(() => {
    if (role) {
      setFormData(role);
    } else {
      // Reset to defaults for new role
      setFormData({
        name: '',
        displayName: '',
        description: '',
        level: 50,
        isSystemRole: false,
        isCustomRole: true,
        canCreateSubRoles: false,
        canManageUsers: false,
        permissions: {
          systemConfig: { read: false, write: false, delete: false },
          apiManagement: { read: false, write: false, delete: false },
          pricing: { read: false, write: false, delete: false },
          merchantManagement: { read: false, write: false, delete: false, suspend: false, terminate: false },
          analytics: { read: false, export: false },
          systemHealth: { read: false, write: false, delete: false },
          compliance: { read: false, write: false, delete: false, export: false },
          auditLogs: { read: false },
          userManagement: { read: false, create: false, update: false, delete: false, assignRoles: false },
          roleManagement: { read: false, create: false, update: false, delete: false },
          templates: { read: false, create: false, update: false, delete: false },
          supportTickets: { read: false, create: false, update: false, delete: false },
          aiPrompts: { read: false, create: false, update: false, delete: false },
          payouts: { read: false, write: false, delete: false },
        },
      });
    }
  }, [role, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name || !formData.displayName || !formData.description) {
      alert('Please fill in all required fields');
      return;
    }

    // Check for duplicate names
    const isDuplicate = existingRoles.some(
      r => r.name === formData.name && r.roleId !== role?.roleId
    );

    if (isDuplicate) {
      alert('A role with this name already exists');
      return;
    }

    onSave(formData);
  };

  const handlePermissionChange = (module: string, action: string, value: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [module]: {
          ...prev.permissions?.[module as keyof typeof prev.permissions],
          [action]: value,
        },
      },
    }));
  };

  const setAllPermissions = (value: boolean) => {
    const newPermissions = { ...formData.permissions };
    PERMISSION_MODULES.forEach(module => {
      module.actions.forEach(action => {
        if (newPermissions[module.key as keyof typeof newPermissions]) {
          (newPermissions[module.key as keyof typeof newPermissions] as any)[action] = value;
        }
      });
    });
    setFormData(prev => ({ ...prev, permissions: newPermissions }));
  };

  const setModulePermissions = (moduleKey: string, value: boolean) => {
    const module = PERMISSION_MODULES.find(m => m.key === moduleKey);
    if (!module) return;

    const newPermissions = { ...formData.permissions };
    module.actions.forEach(action => {
      if (newPermissions[moduleKey as keyof typeof newPermissions]) {
        (newPermissions[moduleKey as keyof typeof newPermissions] as any)[action] = value;
      }
    });
    setFormData(prev => ({ ...prev, permissions: newPermissions }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-6xl w-full my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 p-1.5 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-lg" />
            <div>
              <h2 className="text-2xl font-bold">
                {role?.roleId ? 'Edit Role' : 'Create New Role'}
              </h2>
              <p className="text-sm text-muted-foreground">
                Configure permissions and access levels
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
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Role Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900"
                  placeholder="e.g., senior_agent"
                  required
                  disabled={role?.isSystemRole}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use lowercase with underscores (a-z, 0-9, _)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Display Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900"
                  placeholder="e.g., Senior Agent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900"
                  rows={3}
                  placeholder="Describe what this role can do..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Hierarchy Level
                </label>
                <input
                  type="number"
                  value={formData.level}
                  onChange={(e) => setFormData(prev => ({ ...prev, level: parseInt(e.target.value) || 50 }))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900"
                  min="1"
                  max="100"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Lower numbers = higher privilege (0 = Super Admin, 100 = lowest)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Parent Role (Optional)
                </label>
                <select
                  value={formData.parentRoleId || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, parentRoleId: e.target.value || undefined }))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900"
                >
                  <option value="">No parent role</option>
                  {existingRoles
                    .filter(r => r.roleId !== role?.roleId) // Can't be parent of itself
                    .map(r => (
                      <option key={r.roleId} value={r.roleId}>
                        {r.displayName} (Level {r.level})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Role Capabilities */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Role Capabilities</h3>

              <div className="space-y-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.canManageUsers || false}
                    onChange={(e) => setFormData(prev => ({ ...prev, canManageUsers: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm font-medium">Can Manage Users</span>
                </label>
                <p className="text-xs text-muted-foreground ml-6">
                  Allows creating and managing user accounts
                </p>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.canCreateSubRoles || false}
                    onChange={(e) => setFormData(prev => ({ ...prev, canCreateSubRoles: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm font-medium">Can Create Sub-Roles</span>
                </label>
                <p className="text-xs text-muted-foreground ml-6">
                  Allows creating roles below this one in hierarchy
                </p>

                {formData.canCreateSubRoles && (
                  <div className="ml-6">
                    <label className="block text-sm font-medium mb-1">
                      Max Sub-Roles (Optional)
                    </label>
                    <input
                      type="number"
                      value={formData.maxSubRoles || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, maxSubRoles: parseInt(e.target.value) || undefined }))}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900"
                      min="1"
                      placeholder="Unlimited"
                    />
                  </div>
                )}

                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-2">
                    <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-700 dark:text-blue-300">
                      <p className="font-medium mb-1">Hierarchical Structure</p>
                      <p className="text-xs">
                        Users with this role can only manage users and create roles that are below them in the hierarchy.
                        The parent role setting establishes the reporting structure.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Permissions Section */}
          <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Permissions</h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAllPermissions(true)}
                  className="px-3 py-1 text-sm bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-800"
                >
                  Grant All
                </button>
                <button
                  type="button"
                  onClick={() => setAllPermissions(false)}
                  className="px-3 py-1 text-sm bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800"
                >
                  Revoke All
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {PERMISSION_MODULES.map(module => (
                <div
                  key={module.key}
                  className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-slate-50 dark:bg-slate-900/50"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">{module.label}</h4>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setModulePermissions(module.key, true)}
                        className="p-1 text-xs text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/20 rounded"
                        title="Grant all"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setModulePermissions(module.key, false)}
                        className="p-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                        title="Revoke all"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {module.actions.map(action => {
                      const modulePerms = formData.permissions?.[module.key as keyof typeof formData.permissions];
                      const isChecked = modulePerms ? (modulePerms as any)[action] === true : false;

                      return (
                        <label key={action} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => handlePermissionChange(module.key, action, e.target.checked)}
                            className="rounded"
                          />
                          <span className="capitalize">{action}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
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
              {role?.roleId ? 'Update Role' : 'Create Role'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
