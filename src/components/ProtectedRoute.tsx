/**
 * Protected Route Component
 *
 * Wraps routes that require authentication and optionally specific permissions.
 * Redirects unauthorized users to the login page.
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: {
    resource: string;
    action: string;
  };
  requireSuperAdmin?: boolean;
  requireSystemAdmin?: boolean;
}

export default function ProtectedRoute({
  children,
  requiredPermission,
  requireSuperAdmin = false,
  requireSystemAdmin = false,
}: ProtectedRouteProps) {
  const { user, admin, loading } = useAuth();
  const location = useLocation();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user || !admin) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if account is active
  if (admin.status !== 'active') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center max-w-md">
          <div className="bg-destructive/10 text-destructive p-6 rounded-lg border border-destructive/20">
            <h2 className="text-xl font-bold mb-2">Account {admin.status}</h2>
            <p className="text-sm">
              Your account is currently {admin.status}. Please contact support for assistance.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Check super admin requirement
  if (requireSuperAdmin && admin.accessLevel !== 'super_admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center max-w-md">
          <div className="bg-destructive/10 text-destructive p-6 rounded-lg border border-destructive/20">
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-sm">
              This section requires Super Admin privileges.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Check system admin requirement
  if (requireSystemAdmin && !['super_admin', 'system_admin'].includes(admin.accessLevel)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center max-w-md">
          <div className="bg-destructive/10 text-destructive p-6 rounded-lg border border-destructive/20">
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-sm">
              This section requires System Admin privileges or higher.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Check specific permission requirement
  if (requiredPermission) {
    const { hasPermission } = useAuth();
    const hasAccess = hasPermission(requiredPermission.resource, requiredPermission.action);

    if (!hasAccess) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="text-center max-w-md">
            <div className="bg-destructive/10 text-destructive p-6 rounded-lg border border-destructive/20">
              <h2 className="text-xl font-bold mb-2">Permission Denied</h2>
              <p className="text-sm">
                You don't have permission to access this section.
                <br />
                Required: {requiredPermission.resource}.{requiredPermission.action}
              </p>
            </div>
          </div>
        </div>
      );
    }
  }

  // All checks passed, render the protected content
  return <>{children}</>;
}
