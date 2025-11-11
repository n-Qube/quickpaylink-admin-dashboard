/**
 * Permission Checking Hook
 *
 * Provides utilities for checking if the current admin has specific permissions
 */

import { useAuth } from '@/contexts/AuthContext';
import { Role } from '@/types/database';
import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type ResourceType =
  | 'systemConfig'
  | 'apiManagement'
  | 'pricing'
  | 'merchantManagement'
  | 'analytics'
  | 'systemHealth'
  | 'compliance'
  | 'auditLogs'
  | 'userManagement'
  | 'roleManagement'
  | 'templates'
  | 'supportTickets'
  | 'aiPrompts'
  | 'payouts';

export type PermissionAction = 'read' | 'write' | 'delete' | 'suspend' | 'terminate' | 'export' | 'create' | 'update' | 'assignRoles';

interface UsePermissionsReturn {
  can: (resource: ResourceType, action: PermissionAction) => boolean;
  canManageUsers: boolean;
  canManageRoles: boolean;
  canCreateSubUsers: boolean;
  isLoading: boolean;
  role: Role | null;
  accessLevel: string | null;
}

export function usePermissions(): UsePermissionsReturn {
  const { admin } = useAuth();
  const [role, setRole] = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadRole = async () => {
      if (!admin?.roleId) {
        setIsLoading(false);
        return;
      }

      try {
        const roleDoc = await getDoc(doc(db, 'roles', admin.roleId));
        if (roleDoc.exists()) {
          setRole({ roleId: roleDoc.id, ...roleDoc.data() } as Role);
        }
      } catch (error) {
        console.error('Error loading role:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadRole();
  }, [admin?.roleId]);

  const can = (resource: ResourceType, action: PermissionAction): boolean => {
    if (!role || !role.permissions) return false;

    // Super admin has all permissions
    if (admin?.accessLevel === 'super_admin') return true;

    const resourcePerms = role.permissions[resource];
    if (!resourcePerms) return false;

    // Handle boolean permission (like auditLogs.read)
    if (typeof resourcePerms === 'boolean') {
      return resourcePerms;
    }

    // Handle PermissionSet
    if (typeof resourcePerms === 'object') {
      return (resourcePerms as any)[action] === true;
    }

    return false;
  };

  return {
    can,
    canManageUsers: can('userManagement', 'read') || admin?.accessLevel === 'super_admin',
    canManageRoles: can('roleManagement', 'read') || admin?.accessLevel === 'super_admin',
    canCreateSubUsers: admin?.canCreateSubUsers || false,
    isLoading,
    role,
    accessLevel: admin?.accessLevel || null,
  };
}

/**
 * Hook to check if current user can perform an action on a specific resource
 */
export function useCanAccess(resource: ResourceType, action: PermissionAction): boolean {
  const { can } = usePermissions();
  return can(resource, action);
}

/**
 * Hook to check if current user is at least at a certain access level
 */
export function useHasAccessLevel(minLevel: number): boolean {
  const { role } = usePermissions();
  return role ? role.level <= minLevel : false;
}
