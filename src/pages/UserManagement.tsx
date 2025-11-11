/**
 * User Management Page
 *
 * Comprehensive admin user management with hierarchical structure
 * Supports creating subordinate users, role assignment, and team management
 */

import { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Lock,
  Unlock,
  Shield,
  Mail,
  Phone,
  Calendar,
  Activity,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  UserPlus,
  Key,
  Eye,
  EyeOff,
} from 'lucide-react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Admin, Role, AdminStatus } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import UserEditor from '@/components/UserEditor';

interface UserWithRole extends Admin {
  roleName?: string;
  subordinatesCount?: number;
}

export default function UserManagement() {
  const { admin: user } = useAuth();
  const { canManageUsers, role: currentUserRole, can } = usePermissions();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AdminStatus | 'all'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'list' | 'hierarchy'>('list');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (canManageUsers) {
      loadData();
    }
  }, [canManageUsers]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load roles
      const rolesSnapshot = await getDocs(collection(db, 'roles'));
      const rolesData = rolesSnapshot.docs.map(doc => ({
        roleId: doc.id,
        ...doc.data(),
      })) as Role[];
      setRoles(rolesData);

      // Load users based on permissions
      let usersQuery;
      if (user?.accessLevel === 'super_admin' || can('userManagement', 'read')) {
        // Super admin or full user management permission - see all users
        usersQuery = collection(db, 'admins');
      } else if (user?.canCreateSubUsers) {
        // Manager - see only their subordinates
        usersQuery = query(
          collection(db, 'admins'),
          where('managerId', '==', user.adminId)
        );
      } else {
        // No permission
        setUsers([]);
        setLoading(false);
        return;
      }

      const usersSnapshot = await getDocs(usersQuery);
      const usersData = usersSnapshot.docs.map(doc => {
        const userData = doc.data() as Admin;
        const userRole = rolesData.find(r => r.roleId === userData.roleId);

        return {
          adminId: doc.id,
          ...userData,
          roleName: userRole?.displayName || 'No Role',
        } as UserWithRole;
      });

      // Calculate subordinates count for each user
      const usersWithSubordinates = usersData.map(u => ({
        ...u,
        subordinatesCount: usersData.filter(sub => sub.managerId === u.adminId).length,
      }));

      setUsers(usersWithSubordinates);
    } catch (error: any) {
      console.error('Error loading data:', error);
      setMessage({ type: 'error', text: `Failed to load users: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (userData: Partial<Admin>) => {
    try {
      // Validate hierarchy
      if (!canCreateUser(userData.roleId!)) {
        setMessage({ type: 'error', text: 'Cannot create user with this role due to hierarchy constraints' });
        return;
      }

      // Check sub-user limit
      if (user?.maxSubUsers && user.createdSubUsersCount >= user.maxSubUsers) {
        setMessage({ type: 'error', text: `You have reached your limit of ${user.maxSubUsers} subordinate users` });
        return;
      }

      const newUser: Omit<Admin, 'adminId'> = {
        ...userData,
        managerId: user?.adminId,
        managerName: user?.profile.displayName,
        canCreateSubUsers: false,
        createdSubUsersCount: 0,
        activeSessions: [],
        stats: {
          totalLogins: 0,
          totalActions: 0,
          lastActionAt: Timestamp.now(),
          merchantsManaged: 0,
        },
        status: 'active',
        createdAt: Timestamp.now(),
        createdBy: user?.adminId || '',
        updatedAt: Timestamp.now(),
        updatedBy: user?.adminId || '',
      } as Omit<Admin, 'adminId'>;

      await addDoc(collection(db, 'admins'), newUser);

      // Update creator's sub-user count
      if (user?.adminId) {
        const userRef = doc(db, 'admins', user.adminId);
        await updateDoc(userRef, {
          createdSubUsersCount: (user.createdSubUsersCount || 0) + 1,
        });
      }

      setMessage({ type: 'success', text: 'User created successfully!' });
      setShowCreateModal(false);
      loadData();
    } catch (error: any) {
      console.error('Error creating user:', error);
      setMessage({ type: 'error', text: `Failed to create user: ${error.message}` });
    }
  };

  const handleUpdateUser = async (userId: string, userData: Partial<Admin>) => {
    try {
      const userRef = doc(db, 'admins', userId);

      // Remove undefined values to avoid Firestore errors
      const cleanedData = Object.entries({
        ...userData,
        updatedAt: Timestamp.now(),
        updatedBy: user?.adminId || '',
      }).reduce((acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = value;
        }
        return acc;
      }, {} as any);

      await updateDoc(userRef, cleanedData);

      setMessage({ type: 'success', text: 'User updated successfully!' });
      setEditingUser(null);
      loadData();
    } catch (error: any) {
      console.error('Error updating user:', error);
      setMessage({ type: 'error', text: `Failed to update user: ${error.message}` });
    }
  };

  const handleDeleteUser = async (userToDelete: UserWithRole) => {
    if (userToDelete.subordinatesCount && userToDelete.subordinatesCount > 0) {
      setMessage({
        type: 'error',
        text: `Cannot delete user with ${userToDelete.subordinatesCount} subordinates. Reassign them first.`,
      });
      return;
    }

    if (!confirm(`Are you sure you want to delete user "${userToDelete.profile.displayName}"?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'admins', userToDelete.adminId));

      // Update manager's sub-user count
      if (userToDelete.managerId) {
        const managerRef = doc(db, 'admins', userToDelete.managerId);
        const manager = users.find(u => u.adminId === userToDelete.managerId);
        if (manager) {
          await updateDoc(managerRef, {
            createdSubUsersCount: Math.max(0, (manager.createdSubUsersCount || 1) - 1),
          });
        }
      }

      setMessage({ type: 'success', text: 'User deleted successfully!' });
      loadData();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      setMessage({ type: 'error', text: `Failed to delete user: ${error.message}` });
    }
  };

  const handleSuspendUser = async (userId: string, suspend: boolean) => {
    try {
      const userRef = doc(db, 'admins', userId);
      await updateDoc(userRef, {
        status: suspend ? 'suspended' : 'active',
        statusReason: suspend ? 'Suspended by administrator' : undefined,
        updatedAt: Timestamp.now(),
        updatedBy: user?.adminId || '',
      });

      setMessage({ type: 'success', text: `User ${suspend ? 'suspended' : 'activated'} successfully!` });
      loadData();
    } catch (error: any) {
      console.error('Error updating user status:', error);
      setMessage({ type: 'error', text: `Failed to update user status: ${error.message}` });
    }
  };

  const canCreateUser = (roleId: string): boolean => {
    // Super admin can create any user
    if (user?.accessLevel === 'super_admin') return true;

    // Check if user can create sub-users
    if (!user?.canCreateSubUsers) return false;

    // Check hierarchy - can only create users with roles of higher level number
    const targetRole = roles.find(r => r.roleId === roleId);
    if (!targetRole || !currentUserRole) return false;

    return targetRole.level > currentUserRole.level;
  };

  const canManageUser = (targetUser: UserWithRole): boolean => {
    // Super admin can manage anyone
    if (user?.accessLevel === 'super_admin') return true;

    // Can manage if you created them
    if (targetUser.managerId === user?.adminId) return true;

    // Can manage if you have full user management permission
    if (can('userManagement', 'update')) return true;

    return false;
  };

  const toggleExpand = (userId: string) => {
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedUsers(newExpanded);
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch =
      u.profile.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.roleName?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getRootUsers = () => {
    return filteredUsers.filter(u => !u.managerId || u.accessLevel === 'super_admin');
  };

  const getSubordinates = (managerId: string) => {
    return filteredUsers.filter(u => u.managerId === managerId);
  };

  const getStatusBadge = (status: AdminStatus) => {
    const badges = {
      active: { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-700 dark:text-green-300', label: 'Active' },
      inactive: { bg: 'bg-gray-100 dark:bg-gray-900', text: 'text-gray-700 dark:text-gray-300', label: 'Inactive' },
      suspended: { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-700 dark:text-red-300', label: 'Suspended' },
      locked: { bg: 'bg-orange-100 dark:bg-orange-900', text: 'text-orange-700 dark:text-orange-300', label: 'Locked' },
    };

    const badge = badges[status] || badges.inactive;
    return (
      <span className={`px-2 py-1 ${badge.bg} ${badge.text} text-xs rounded-full`}>
        {badge.label}
      </span>
    );
  };

  const UserCard = ({ user: userItem, depth = 0 }: { user: UserWithRole; depth?: number }) => {
    const subordinates = getSubordinates(userItem.adminId);
    const hasSubordinates = subordinates.length > 0;
    const isExpanded = expandedUsers.has(userItem.adminId);

    return (
      <div className="mb-2" style={{ marginLeft: `${depth * 24}px` }}>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              {viewMode === 'hierarchy' && hasSubordinates && (
                <button
                  onClick={() => toggleExpand(userItem.adminId)}
                  className="mt-1 p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              )}
              {viewMode === 'hierarchy' && !hasSubordinates && <div className="w-6" />}

              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-semibold text-lg flex-shrink-0">
                {userItem.profile.avatar ? (
                  <img src={userItem.profile.avatar} alt="" className="w-12 h-12 rounded-full" />
                ) : (
                  userItem.profile.displayName.charAt(0).toUpperCase()
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-lg">{userItem.profile.displayName}</h3>
                  {getStatusBadge(userItem.status)}
                  {userItem.accessLevel === 'super_admin' && (
                    <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 text-xs rounded-full flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      Super Admin
                    </span>
                  )}
                  {userItem.auth.twoFactorEnabled && (
                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs rounded-full flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      2FA
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Mail className="w-4 h-4" />
                    {userItem.email}
                  </span>
                  {userItem.phoneNumber && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      {userItem.phoneNumber}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 mt-2 text-sm">
                  <span className="flex items-center gap-1">
                    <Shield className="w-4 h-4" />
                    <span className="font-medium">{userItem.roleName}</span>
                  </span>
                  {userItem.profile.department && (
                    <span className="text-muted-foreground">{userItem.profile.department}</span>
                  )}
                  {hasSubordinates && (
                    <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                      <Users className="w-4 h-4" />
                      {subordinates.length} subordinate{subordinates.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Joined {userItem.createdAt?.toDate?.().toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Activity className="w-3 h-3" />
                    {userItem.stats.totalLogins} logins
                  </span>
                  {userItem.auth.lastLogin && (
                    <span>Last login: {userItem.auth.lastLogin.toDate?.().toLocaleDateString()}</span>
                  )}
                </div>
              </div>
            </div>

            {canManageUser(userItem) && (
              <div className="flex items-center gap-2 ml-4">
                {userItem.status === 'active' ? (
                  <button
                    onClick={() => handleSuspendUser(userItem.adminId, true)}
                    className="p-2 hover:bg-orange-100 dark:hover:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded transition-colors"
                    title="Suspend User"
                  >
                    <Lock className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleSuspendUser(userItem.adminId, false)}
                    className="p-2 hover:bg-green-100 dark:hover:bg-green-900/20 text-green-600 dark:text-green-400 rounded transition-colors"
                    title="Activate User"
                  >
                    <Unlock className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => {
                    setEditingUser(userItem);
                    setShowCreateModal(true);
                  }}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                  title="Edit User"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteUser(userItem)}
                  className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded transition-colors"
                  title="Delete User"
                  disabled={userItem.accessLevel === 'super_admin' || (userItem.subordinatesCount || 0) > 0}
                >
                  <Trash2 className={`w-4 h-4 ${userItem.accessLevel === 'super_admin' || (userItem.subordinatesCount || 0) > 0 ? 'text-gray-400' : ''}`} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Render subordinates in hierarchy view */}
        {viewMode === 'hierarchy' && hasSubordinates && isExpanded && (
          <div className="mt-2">
            {subordinates.map(subordinate => (
              <UserCard key={subordinate.adminId} user={subordinate} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  if (!canManageUsers && !user?.canCreateSubUsers) {
    return (
      <div className="p-8">
        <div className="max-w-2xl mx-auto text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">
            You don't have permission to manage users. Contact your administrator for access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">User Management</h1>
        <p className="text-muted-foreground">
          Manage admin users, assign roles, and organize your team hierarchy
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Users</p>
              <p className="text-2xl font-bold">{users.length}</p>
            </div>
            <Users className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active Users</p>
              <p className="text-2xl font-bold text-green-600">
                {users.filter(u => u.status === 'active').length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">My Team</p>
              <p className="text-2xl font-bold text-blue-600">
                {users.filter(u => u.managerId === user?.adminId).length}
              </p>
            </div>
            <UserPlus className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Suspended</p>
              <p className="text-2xl font-bold text-red-600">
                {users.filter(u => u.status === 'suspended').length}
              </p>
            </div>
            <Lock className="w-8 h-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as AdminStatus | 'all')}
            className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
            <option value="locked">Locked</option>
          </select>

          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-700 shadow'
                  : 'hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('hierarchy')}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                viewMode === 'hierarchy'
                  ? 'bg-white dark:bg-slate-700 shadow'
                  : 'hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Hierarchy
            </button>
          </div>

          {(user?.canCreateSubUsers || can('userManagement', 'create')) && (
            <button
              onClick={() => {
                setEditingUser(null);
                setShowCreateModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create User
            </button>
          )}
        </div>
      </div>

      {/* Users List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading users...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No users found</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery || statusFilter !== 'all' ? 'No users match your filters' : 'Get started by creating your first user'}
          </p>
          {!searchQuery && statusFilter === 'all' && (user?.canCreateSubUsers || can('userManagement', 'create')) && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Create First User
            </button>
          )}
        </div>
      ) : (
        <div>
          {viewMode === 'hierarchy' ? (
            getRootUsers().map((user) => (
              <UserCard key={user.adminId} user={user} />
            ))
          ) : (
            filteredUsers.map((user) => (
              <UserCard key={user.adminId} user={user} />
            ))
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <UserEditor
          user={editingUser}
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setEditingUser(null);
          }}
          onSave={(userData) => {
            if (editingUser?.adminId) {
              handleUpdateUser(editingUser.adminId, userData);
            } else {
              handleCreateUser(userData);
            }
          }}
          availableRoles={roles.filter(r => canCreateUser(r.roleId))}
          currentUserRole={currentUserRole}
        />
      )}
    </div>
  );
}
