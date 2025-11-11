/**
 * Sidebar Navigation Component
 *
 * Collapsible sidebar with role-based menu items.
 * Shows different navigation options based on admin permissions.
 */

import { Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  LayoutDashboard,
  Settings,
  Users,
  Store,
  DollarSign,
  BarChart3,
  Shield,
  Bell,
  Globe,
  Zap,
  FileText,
  Activity,
  Wallet,
  Lock,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Briefcase,
  Receipt,
  Mail,
  MessageSquare,
  Brain,
} from 'lucide-react';

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  requiredPermission?: { resource: string; action: string };
  requireSuperAdmin?: boolean;
  requireSystemAdmin?: boolean;
}

const navGroups: {
  title: string;
  items: NavItem[];
}[] = [
  {
    title: 'Overview',
    items: [
      {
        label: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
      },
      {
        label: 'Analytics',
        href: '/analytics',
        icon: BarChart3,
        requiredPermission: { resource: 'analytics', action: 'read' },
      },
    ],
  },
  {
    title: 'System Management',
    items: [
      {
        label: 'System Config',
        href: '/system/config',
        icon: Settings,
        requireSuperAdmin: true,
      },
      {
        label: 'Locations',
        href: '/system/locations',
        icon: Globe,
        requiredPermission: { resource: 'systemConfig', action: 'read' },
      },
      {
        label: 'Currencies',
        href: '/system/currencies',
        icon: DollarSign,
        requiredPermission: { resource: 'systemConfig', action: 'read' },
      },
      {
        label: 'Business Types',
        href: '/system/business-types',
        icon: Briefcase,
        requiredPermission: { resource: 'systemConfig', action: 'read' },
      },
      {
        label: 'Tax Rules',
        href: '/system/tax-rules',
        icon: Receipt,
        requiredPermission: { resource: 'systemConfig', action: 'read' },
      },
      {
        label: 'API Management',
        href: '/system/api',
        icon: Zap,
        requireSystemAdmin: true,
      },
    ],
  },
  {
    title: 'Merchant Operations',
    items: [
      {
        label: 'Merchants',
        href: '/merchants',
        icon: Store,
        requiredPermission: { resource: 'merchantManagement', action: 'read' },
      },
      {
        label: 'Risk Management',
        href: '/merchants/risk',
        icon: Shield,
        requiredPermission: { resource: 'merchantManagement', action: 'read' },
      },
      {
        label: 'Payouts & Settlements',
        href: '/merchants/payouts',
        icon: CreditCard,
        requiredPermission: { resource: 'merchantManagement', action: 'read' },
      },
      {
        label: 'Support Tickets',
        href: '/merchants/support-tickets',
        icon: MessageSquare,
        requiredPermission: { resource: 'merchantManagement', action: 'read' },
      },
      {
        label: 'Templates',
        href: '/templates',
        icon: Mail,
        requireSuperAdmin: true,
      },
      {
        label: 'AI Prompts',
        href: '/ai-prompts',
        icon: Brain,
        requireSuperAdmin: true,
      },
    ],
  },
  {
    title: 'Pricing & Billing',
    items: [
      {
        label: 'Subscription Plans',
        href: '/pricing/plans',
        icon: Wallet,
        requiredPermission: { resource: 'pricing', action: 'read' },
      },
      {
        label: 'Pricing Rules',
        href: '/pricing/rules',
        icon: FileText,
        requireSuperAdmin: true,
      },
    ],
  },
  {
    title: 'Platform Health',
    items: [
      {
        label: 'System Health',
        href: '/health',
        icon: Activity,
        requiredPermission: { resource: 'systemHealth', action: 'read' },
      },
      {
        label: 'Alerts',
        href: '/alerts',
        icon: Bell,
        requiredPermission: { resource: 'systemHealth', action: 'read' },
      },
    ],
  },
  {
    title: 'Security & Compliance',
    items: [
      {
        label: 'Audit Logs',
        href: '/audit',
        icon: FileText,
        requiredPermission: { resource: 'auditLogs', action: 'read' },
      },
      {
        label: 'Compliance',
        href: '/compliance',
        icon: Lock,
        requiredPermission: { resource: 'compliance', action: 'read' },
      },
    ],
  },
  {
    title: 'Access Control',
    items: [
      {
        label: 'Role Management',
        href: '/admin/roles',
        icon: Shield,
        requiredPermission: { resource: 'roleManagement', action: 'read' },
      },
      {
        label: 'User Management',
        href: '/admin/users',
        icon: Users,
        requiredPermission: { resource: 'userManagement', action: 'read' },
      },
    ],
  },
];

export default function Sidebar({ open, onToggle }: SidebarProps) {
  const location = useLocation();
  const { admin, hasPermission, isSuperAdmin, isSystemAdmin } = useAuth();
  const [activeAlertsCount, setActiveAlertsCount] = useState<number>(0);

  /**
   * Fetch active alerts count
   */
  useEffect(() => {
    const fetchActiveAlerts = async () => {
      try {
        const alertsRef = collection(db, 'alerts');
        const activeAlertsQuery = query(alertsRef, where('status', '==', 'active'));
        const snapshot = await getDocs(activeAlertsQuery);
        setActiveAlertsCount(snapshot.size);
      } catch (error) {
        console.error('Error fetching active alerts count:', error);
      }
    };

    fetchActiveAlerts();

    // Refresh count every 30 seconds
    const interval = setInterval(fetchActiveAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  /**
   * Check if a navigation item should be visible
   */
  const shouldShowItem = (item: NavItem): boolean => {
    if (!admin) return false;

    // Super admin check
    if (item.requireSuperAdmin && !isSuperAdmin()) {
      return false;
    }

    // System admin check
    if (item.requireSystemAdmin && !isSystemAdmin()) {
      return false;
    }

    // Permission check
    if (item.requiredPermission) {
      return hasPermission(item.requiredPermission.resource, item.requiredPermission.action);
    }

    return true;
  };

  /**
   * Check if a route is currently active
   * Uses exact matching to prevent parent routes from being highlighted
   */
  const isActive = (href: string): boolean => {
    return location.pathname === href;
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-screen bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 transition-all duration-300 flex flex-col',
          open ? 'w-64' : 'w-20',
          'lg:translate-x-0',
          !open && '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo and Toggle */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
          {open && (
            <div className="flex items-center gap-2">
              <Shield className="w-8 h-8 text-primary" />
              <div>
                <h1 className="font-bold text-sm">QuickLink Pay</h1>
                <p className="text-xs text-muted-foreground">Super Admin</p>
              </div>
            </div>
          )}
          {!open && (
            <Shield className="w-8 h-8 text-primary mx-auto" />
          )}

          {/* Toggle button - hidden on mobile */}
          <button
            onClick={onToggle}
            className="hidden lg:flex items-center justify-center w-6 h-6 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            {open ? (
              <ChevronLeft className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Navigation - Scrollable */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent hover:scrollbar-thumb-slate-400 dark:hover:scrollbar-thumb-slate-500">
          {navGroups.map((group) => {
            // Filter items based on permissions
            const visibleItems = group.items.filter(shouldShowItem);

            // Don't render empty groups
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.title} className="mb-6">
                {open && (
                  <h3 className="px-3 mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {group.title}
                  </h3>
                )}

                <div className="space-y-1">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);

                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors relative',
                          active
                            ? 'bg-primary text-primary-foreground'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700',
                          !open && 'justify-center'
                        )}
                        title={!open ? item.label : undefined}
                      >
                        <Icon className={cn('flex-shrink-0', open ? 'w-5 h-5' : 'w-6 h-6')} />
                        {open && (
                          <>
                            <span className="flex-1 text-sm font-medium">
                              {item.label}
                            </span>
                            {item.badge && (
                              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-500 text-white">
                                {item.badge}
                              </span>
                            )}
                            {item.label === 'Alerts' && activeAlertsCount > 0 && (
                              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-500 text-white">
                                {activeAlertsCount}
                              </span>
                            )}
                          </>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* User Info (bottom) - Fixed */}
        {open && admin && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
            <div className="flex items-center gap-3">
              {admin.profile?.avatar ? (
                <img
                  src={admin.profile.avatar}
                  alt={admin.profile.displayName}
                  className="w-10 h-10 rounded-full object-cover border-2 border-primary"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary">
                    {admin.profile.firstName.charAt(0)}
                    {admin.profile.lastName.charAt(0)}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {admin.profile.displayName}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {admin.accessLevel.replace('_', ' ')}
                </p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
