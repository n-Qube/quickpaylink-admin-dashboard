/**
 * Settings Page
 *
 * System configuration and preferences management for administrators.
 */

import { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Bell,
  Shield,
  Globe,
  Mail,
  Database,
  Key,
  Clock,
  Save,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';

interface SystemSettings {
  general: {
    platformName: string;
    supportEmail: string;
    timezone: string;
    maintenanceMode: boolean;
  };
  notifications: {
    emailEnabled: boolean;
    smsEnabled: boolean;
    pushEnabled: boolean;
    alertThreshold: number;
  };
  security: {
    sessionTimeout: number;
    passwordExpiry: number;
    twoFactorRequired: boolean;
    ipWhitelist: string[];
  };
  api: {
    rateLimitEnabled: boolean;
    requestsPerMinute: number;
    apiKeyRotation: number;
  };
}

type SettingsTab = 'general' | 'notifications' | 'security' | 'api';

export default function Settings() {
  const { admin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [settings, setSettings] = useState<SystemSettings>({
    general: {
      platformName: 'QuickPayLink',
      supportEmail: 'support@quickpaylink.com',
      timezone: 'Africa/Accra',
      maintenanceMode: false,
    },
    notifications: {
      emailEnabled: true,
      smsEnabled: false,
      pushEnabled: true,
      alertThreshold: 10,
    },
    security: {
      sessionTimeout: 30,
      passwordExpiry: 90,
      twoFactorRequired: false,
      ipWhitelist: [],
    },
    api: {
      rateLimitEnabled: true,
      requestsPerMinute: 100,
      apiKeyRotation: 365,
    },
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  /**
   * Load settings from Firestore
   */
  const loadSettings = async () => {
    try {
      setLoading(true);
      console.log('⚙️ Loading system settings...');

      const settingsRef = doc(db, 'systemConfig', 'settings');
      const settingsSnap = await getDoc(settingsRef);

      if (settingsSnap.exists()) {
        const data = settingsSnap.data();
        setSettings({
          general: data.general || settings.general,
          notifications: data.notifications || settings.notifications,
          security: data.security || settings.security,
          api: data.api || settings.api,
        });
        console.log('✅ Settings loaded successfully');
      } else {
        console.log('ℹ️ No settings found, using defaults');
      }
    } catch (error) {
      console.error('❌ Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Save settings to Firestore
   */
  const saveSettings = async () => {
    if (!admin) {
      setMessage({ type: 'error', text: 'You must be logged in to save settings' });
      return;
    }

    try {
      setSaving(true);
      console.log('💾 Saving system settings...');

      const settingsRef = doc(db, 'systemConfig', 'settings');
      await setDoc(settingsRef, {
        ...settings,
        updatedAt: serverTimestamp(),
        updatedBy: admin.adminId,
      });

      setMessage({ type: 'success', text: 'Settings saved successfully!' });
      console.log('✅ Settings saved');

      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('❌ Error saving settings:', error);
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  /**
   * Update setting value
   */
  const updateSetting = (section: keyof SystemSettings, field: string, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="h-64 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <SettingsIcon className="w-8 h-8" />
            Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure system preferences and settings
          </p>
        </div>

        <button
          onClick={saveSettings}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saving ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span className="text-sm font-medium">
            {saving ? 'Saving...' : 'Save Changes'}
          </span>
        </button>
      </div>

      {/* Success/Error Message */}
      {message && (
        <div
          className={cn(
            'p-4 rounded-lg',
            message.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
          )}
        >
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-700">
        <div className="flex gap-6 overflow-x-auto">
          {[
            { id: 'general', label: 'General', icon: Globe },
            { id: 'notifications', label: 'Notifications', icon: Bell },
            { id: 'security', label: 'Security', icon: Shield },
            { id: 'api', label: 'API', icon: Database },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as SettingsTab)}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap',
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
        {activeTab === 'general' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">General Settings</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Platform Name
                </label>
                <input
                  type="text"
                  value={settings.general.platformName}
                  onChange={(e) =>
                    updateSetting('general', 'platformName', e.target.value)
                  }
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  <Mail className="w-4 h-4 inline mr-2" />
                  Support Email
                </label>
                <input
                  type="email"
                  value={settings.general.supportEmail}
                  onChange={(e) =>
                    updateSetting('general', 'supportEmail', e.target.value)
                  }
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  <Globe className="w-4 h-4 inline mr-2" />
                  Timezone
                </label>
                <select
                  value={settings.general.timezone}
                  onChange={(e) =>
                    updateSetting('general', 'timezone', e.target.value)
                  }
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900"
                >
                  <option value="Africa/Accra">Africa/Accra (GMT)</option>
                  <option value="America/New_York">America/New_York (EST)</option>
                  <option value="Europe/London">Europe/London (GMT)</option>
                  <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="maintenanceMode"
                  checked={settings.general.maintenanceMode}
                  onChange={(e) =>
                    updateSetting('general', 'maintenanceMode', e.target.checked)
                  }
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-600"
                />
                <label htmlFor="maintenanceMode" className="text-sm font-medium">
                  Enable Maintenance Mode
                </label>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">Notification Settings</h2>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="emailEnabled"
                  checked={settings.notifications.emailEnabled}
                  onChange={(e) =>
                    updateSetting('notifications', 'emailEnabled', e.target.checked)
                  }
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-600"
                />
                <label htmlFor="emailEnabled" className="text-sm font-medium">
                  Enable Email Notifications
                </label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="smsEnabled"
                  checked={settings.notifications.smsEnabled}
                  onChange={(e) =>
                    updateSetting('notifications', 'smsEnabled', e.target.checked)
                  }
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-600"
                />
                <label htmlFor="smsEnabled" className="text-sm font-medium">
                  Enable SMS Notifications
                </label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="pushEnabled"
                  checked={settings.notifications.pushEnabled}
                  onChange={(e) =>
                    updateSetting('notifications', 'pushEnabled', e.target.checked)
                  }
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-600"
                />
                <label htmlFor="pushEnabled" className="text-sm font-medium">
                  Enable Push Notifications
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  <Bell className="w-4 h-4 inline mr-2" />
                  Alert Threshold (number of events)
                </label>
                <input
                  type="number"
                  value={settings.notifications.alertThreshold}
                  onChange={(e) =>
                    updateSetting(
                      'notifications',
                      'alertThreshold',
                      parseInt(e.target.value) || 0
                    )
                  }
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">Security Settings</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  <Clock className="w-4 h-4 inline mr-2" />
                  Session Timeout (minutes)
                </label>
                <input
                  type="number"
                  value={settings.security.sessionTimeout}
                  onChange={(e) =>
                    updateSetting(
                      'security',
                      'sessionTimeout',
                      parseInt(e.target.value) || 0
                    )
                  }
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  <Key className="w-4 h-4 inline mr-2" />
                  Password Expiry (days)
                </label>
                <input
                  type="number"
                  value={settings.security.passwordExpiry}
                  onChange={(e) =>
                    updateSetting(
                      'security',
                      'passwordExpiry',
                      parseInt(e.target.value) || 0
                    )
                  }
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="twoFactorRequired"
                  checked={settings.security.twoFactorRequired}
                  onChange={(e) =>
                    updateSetting('security', 'twoFactorRequired', e.target.checked)
                  }
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-600"
                />
                <label htmlFor="twoFactorRequired" className="text-sm font-medium">
                  Require Two-Factor Authentication
                </label>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'api' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">API Settings</h2>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="rateLimitEnabled"
                  checked={settings.api.rateLimitEnabled}
                  onChange={(e) =>
                    updateSetting('api', 'rateLimitEnabled', e.target.checked)
                  }
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-600"
                />
                <label htmlFor="rateLimitEnabled" className="text-sm font-medium">
                  Enable Rate Limiting
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  <Database className="w-4 h-4 inline mr-2" />
                  Requests Per Minute
                </label>
                <input
                  type="number"
                  value={settings.api.requestsPerMinute}
                  onChange={(e) =>
                    updateSetting(
                      'api',
                      'requestsPerMinute',
                      parseInt(e.target.value) || 0
                    )
                  }
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  <Key className="w-4 h-4 inline mr-2" />
                  API Key Rotation (days)
                </label>
                <input
                  type="number"
                  value={settings.api.apiKeyRotation}
                  onChange={(e) =>
                    updateSetting(
                      'api',
                      'apiKeyRotation',
                      parseInt(e.target.value) || 0
                    )
                  }
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
