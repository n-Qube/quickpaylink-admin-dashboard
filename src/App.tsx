/**
 * Main App Component
 *
 * Sets up routing and authentication context for the application.
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import SystemConfig from '@/pages/SystemConfig';
import Locations from '@/pages/Locations';
import Currencies from '@/pages/Currencies';
import BusinessTypes from '@/pages/BusinessTypes';
import TaxRules from '@/pages/TaxRules';
import APIManagement from '@/pages/APIManagement';
import Merchants from '@/pages/Merchants';
import RiskManagement from '@/pages/RiskManagement';
import SubscriptionPlans from '@/pages/SubscriptionPlans';
import PricingRules from '@/pages/PricingRules';
import Analytics from '@/pages/Analytics';
import SystemHealth from '@/pages/SystemHealth';
import Alerts from '@/pages/Alerts';
import AuditLogs from '@/pages/AuditLogs';
import Compliance from '@/pages/Compliance';
import Profile from '@/pages/Profile';
import Settings from '@/pages/Settings';
import Templates from '@/pages/Templates';
import AIPrompts from '@/pages/AIPrompts';
import Payouts from '@/pages/Payouts';
import SupportTickets from '@/pages/SupportTickets';
import RoleManagement from '@/pages/RoleManagement';
import UserManagement from '@/pages/UserManagement';
import AdminUtility from '@/pages/AdminUtility';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />

          {/* Protected Routes with Layout */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            {/* Nested routes inside the layout */}
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />

            {/* Placeholder routes for navigation items */}
            <Route path="analytics" element={<Analytics />} />
            <Route path="system/config" element={<SystemConfig />} />
            <Route path="system/locations" element={<Locations />} />
            <Route path="system/currencies" element={<Currencies />} />
            <Route path="system/business-types" element={<BusinessTypes />} />
            <Route path="system/tax-rules" element={<TaxRules />} />
            <Route path="system/api" element={<APIManagement />} />
            <Route path="merchants" element={<Merchants />} />
            <Route path="merchants/risk" element={<RiskManagement />} />
            <Route path="merchants/payouts" element={<Payouts />} />
            <Route path="merchants/support-tickets" element={<SupportTickets />} />
            <Route path="pricing/plans" element={<SubscriptionPlans />} />
            <Route path="pricing/rules" element={<PricingRules />} />
            <Route path="health" element={<SystemHealth />} />
            <Route path="alerts" element={<Alerts />} />
            <Route path="audit" element={<AuditLogs />} />
            <Route path="compliance" element={<Compliance />} />
            <Route path="admins" element={<UserManagement />} />
            <Route path="admin/roles" element={<RoleManagement />} />
            <Route path="admin/users" element={<UserManagement />} />
            <Route path="admin/utility" element={<AdminUtility />} />
            <Route path="templates" element={<Templates />} />
            <Route path="ai-prompts" element={<AIPrompts />} />
            <Route path="profile" element={<Profile />} />
            <Route path="settings" element={<Settings />} />

            {/* 404 inside layout */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
