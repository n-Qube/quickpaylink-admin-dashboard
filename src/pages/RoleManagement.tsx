/**
 * Role Management Page
 *
 * Allows Super Admins to create, view, edit and manage roles with granular permissions
 * Supports hierarchical role structure and custom role creation
 */

import { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  Plus,
  Search,
  Edit2,
  Trash2,
  Copy,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Lock,
  Unlock,
} from 'lucide-react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Role, PermissionSet } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import RoleEditor from '@/components/RoleEditor';

export default function RoleManagement() {
  const { user } = useAuth();
  const { canManageRoles } = usePermissions();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (canManageRoles) {
      loadRoles();
    }
  }, [canManageRoles]);

  const loadRoles = async () => {
    try {
      setLoading(true);
      const rolesSnapshot = await getDocs(collection(db, 'roles'));
      const rolesData = rolesSnapshot.docs.map(doc => ({
        roleId: doc.id,
        ...doc.data(),
      })) as Role[];

      // Sort by level (hierarchy)
      rolesData.sort((a, b) => a.level - b.level);
      setRoles(rolesData);
    } catch (error: any) {
      console.error('Error loading roles:', error);
      setMessage({ type: 'error', text: `Failed to load roles: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async (roleData: Partial<Role>) => {
    try {
      const newRole: Omit<Role, 'roleId'> = {
        ...roleData,
        isSystemRole: false,
        isCustomRole: true,
        createdAt: Timestamp.now(),
        createdBy: user?.adminId || '',
        updatedAt: Timestamp.now(),
        updatedBy: user?.adminId || '',
        usageStats: {
          assignedUsersCount: 0,
        },
        isActive: true,
      } as Omit<Role, 'roleId'>;

      await addDoc(collection(db, 'roles'), newRole);
      setMessage({ type: 'success', text: 'Role created successfully!' });
      setShowCreateModal(false);
      loadRoles();
    } catch (error: any) {
      console.error('Error creating role:', error);
      setMessage({ type: 'error', text: `Failed to create role: ${error.message}` });
    }
  };

  const handleUpdateRole = async (roleId: string, roleData: Partial<Role>) => {
    try {
      const roleRef = doc(db, 'roles', roleId);
      await updateDoc(roleRef, {
        ...roleData,
        updatedAt: Timestamp.now(),
        updatedBy: user?.adminId || '',
      });

      setMessage({ type: 'success', text: 'Role updated successfully!' });
      setEditingRole(null);
      loadRoles();
    } catch (error: any) {
      console.error('Error updating role:', error);
      setMessage({ type: 'error', text: `Failed to update role: ${error.message}` });
    }
  };

  const handleDeleteRole = async (role: Role) => {
    if (role.isSystemRole) {
      setMessage({ type: 'error', text: 'Cannot delete system roles' });
      return;
    }

    if ((role.usageStats?.assignedUsersCount || 0) > 0) {
      setMessage({
        type: 'error',
        text: `Cannot delete role with ${role.usageStats?.assignedUsersCount || 0} assigned users`,
      });
      return;
    }

    if (!confirm(`Are you sure you want to delete the role "${role.displayName}"?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'roles', role.roleId));
      setMessage({ type: 'success', text: 'Role deleted successfully!' });
      loadRoles();
    } catch (error: any) {
      console.error('Error deleting role:', error);
      setMessage({ type: 'error', text: `Failed to delete role: ${error.message}` });
    }
  };

  const handleDuplicateRole = (role: Role) => {
    const duplicatedRole: Partial<Role> = {
      ...role,
      name: `${role.name}_copy`,
      displayName: `${role.displayName} (Copy)`,
      isSystemRole: false,
      isCustomRole: true,
    };
    setEditingRole(duplicatedRole as Role);
    setShowCreateModal(true);
  };

  const toggleExpand = (roleId: string) => {
    const newExpanded = new Set(expandedRoles);
    if (newExpanded.has(roleId)) {
      newExpanded.delete(roleId);
    } else {
      newExpanded.add(roleId);
    }
    setExpandedRoles(newExpanded);
  };

  const filteredRoles = roles.filter(
    (role) =>
      role.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      role.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group roles by parent for hierarchy display
  const getRoleHierarchy = () => {
    const rootRoles = filteredRoles.filter(r => !r.parentRoleId);
    return rootRoles;
  };

  const getChildRoles = (parentId: string) => {
    return filteredRoles.filter(r => r.parentRoleId === parentId);
  };

  const RoleCard = ({ role, depth = 0 }: { role: Role; depth?: number }) => {
    const childRoles = getChildRoles(role.roleId);
    const hasChildren = childRoles.length > 0;
    const isExpanded = expandedRoles.has(role.roleId);

    return (
      <div className="mb-2" style={{ marginLeft: `${depth * 24}px` }}>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              {hasChildren && (
                <button
                  onClick={() => toggleExpand(role.roleId)}
                  className="mt-1 p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              )}
              {!hasChildren && <div className="w-6" />}

              <Shield className="w-10 h-10 p-2 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-lg flex-shrink-0" />

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg">{role.displayName}</h3>
                  {role.isSystemRole && (
                    <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 text-xs rounded-full flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      System
                    </span>
                  )}
                  {role.isCustomRole && (
                    <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs rounded-full">
                      Custom
                    </span>
                  )}
                  {!role.isActive && (
                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 text-xs rounded-full">
                      Inactive
                    </span>
                  )}
                </div>

                <p className="text-sm text-muted-foreground mt-1">{role.description}</p>

                <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {role.usageStats?.assignedUsersCount || 0} users
                  </span>
                  <span>Level: {role.level}</span>
                  {role.canManageUsers && (
                    <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                      <CheckCircle className="w-4 h-4" />
                      Can manage users
                    </span>
                  )}
                  {role.canCreateSubRoles && (
                    <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                      <CheckCircle className="w-4 h-4" />
                      Can create sub-roles
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 ml-4">
              <button
                onClick={() => handleDuplicateRole(role)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                title="Duplicate"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setEditingRole(role);
                  setShowCreateModal(true);
                }}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                title="Edit"
                disabled={role.isSystemRole}
              >
                <Edit2 className={`w-4 h-4 ${role.isSystemRole ? 'text-gray-400' : ''}`} />
              </button>
              <button
                onClick={() => handleDeleteRole(role)}
                className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded transition-colors"
                title="Delete"
                disabled={role.isSystemRole || (role.usageStats?.assignedUsersCount || 0) > 0}
              >
                <Trash2 className={`w-4 h-4 ${(role.isSystemRole || (role.usageStats?.assignedUsersCount || 0) > 0) ? 'text-gray-400' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Render child roles */}
        {hasChildren && isExpanded && (
          <div className="mt-2">
            {childRoles.map(childRole => (
              <RoleCard key={childRole.roleId} role={childRole} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  if (!canManageRoles) {
    return (
      <div className="p-8">
        <div className="max-w-2xl mx-auto text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">
            You don't have permission to manage roles. Contact your administrator for access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Role Management</h1>
        <p className="text-muted-foreground">
          Create and manage roles with granular permissions for your team
        </p>
      </div>

      {/* Message Banner */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300'
              : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span>{message.text}</span>
          </div>
        </div>
      )}

      {/* Actions Bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search roles..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        <button
          onClick={() => {
            setEditingRole(null);
            setShowCreateModal(true);
          }}
          className="ml-4 flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Role
        </button>
      </div>

      {/* Roles List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading roles...</p>
        </div>
      ) : filteredRoles.length === 0 ? (
        <div className="text-center py-12">
          <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No roles found</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery ? 'No roles match your search' : 'Get started by creating your first role'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Create First Role
            </button>
          )}
        </div>
      ) : (
        <div>
          {getRoleHierarchy().map((role) => (
            <RoleCard key={role.roleId} role={role} />
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <RoleEditor
          role={editingRole}
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setEditingRole(null);
          }}
          onSave={(roleData) => {
            if (editingRole?.roleId) {
              handleUpdateRole(editingRole.roleId, roleData);
            } else {
              handleCreateRole(roleData);
            }
          }}
          existingRoles={roles}
        />
      )}
    </div>
  );
}
