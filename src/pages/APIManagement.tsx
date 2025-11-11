/**
 * API Management Page
 *
 * Manages API integrations and webhooks for the platform.
 * Features:
 * - API Integration management (API keys, credentials, rate limits)
 * - Webhook configuration (endpoints, events, retry policies)
 * - Status monitoring and testing
 */

import { useState, useEffect } from 'react';
import { db, functions } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, serverTimestamp, query, orderBy, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useAuth } from '@/contexts/AuthContext';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Key,
  Webhook as WebhookIcon,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Copy,
  RefreshCw,
  Eye,
  EyeOff,
  Play,
  Loader2
} from 'lucide-react';

// Types
interface APIIntegration {
  integrationId: string;
  name: string;
  description: string;
  provider: 'PAYSTACK' | 'FLUTTERWAVE' | 'STRIPE' | 'GOOGLE_GEMINI' | 'GOOGLE_MAPS' | 'DIALOG_360' | 'SENDGRID' | 'CUSTOM';
  apiKey: string;
  apiSecret?: string;
  environment: 'SANDBOX' | 'PRODUCTION';
  status: 'active' | 'inactive' | 'suspended';
  config: {
    baseUrl?: string;
    timeout?: number;
    rateLimit?: {
      requestsPerMinute: number;
      requestsPerHour: number;
    };
    retryPolicy?: {
      maxRetries: number;
      backoffMultiplier: number;
    };
  };
  usage?: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    lastUsedAt?: any;
  };
  createdAt?: any;
  updatedAt?: any;
  createdBy?: string;
  updatedBy?: string;
}

interface Webhook {
  webhookId: string;
  name: string;
  description: string;
  url: string;
  events: string[];
  status: 'active' | 'inactive' | 'failed';
  secret: string;
  retryPolicy: {
    maxRetries: number;
    retryDelay: number;
  };
  headers?: Record<string, string>;
  lastTriggered?: any;
  successCount: number;
  failureCount: number;
  createdAt?: any;
  updatedAt?: any;
  createdBy?: string;
  updatedBy?: string;
}

type TabType = 'integrations' | 'webhooks';

export default function APIManagement() {
  const { admin } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('integrations');

  // API Integrations State
  const [integrations, setIntegrations] = useState<APIIntegration[]>([]);
  const [filteredIntegrations, setFilteredIntegrations] = useState<APIIntegration[]>([]);
  const [integrationSearch, setIntegrationSearch] = useState('');
  const [showIntegrationModal, setShowIntegrationModal] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState<APIIntegration | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [testingIntegration, setTestingIntegration] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ integrationId: string; success: boolean; message: string; data?: any } | null>(null);

  // Webhooks State
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [filteredWebhooks, setFilteredWebhooks] = useState<Webhook[]>([]);
  const [webhookSearch, setWebhookSearch] = useState('');
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);

  // Available webhook events
  const availableEvents = [
    'payment.created',
    'payment.successful',
    'payment.failed',
    'merchant.created',
    'merchant.verified',
    'merchant.suspended',
    'subscription.created',
    'subscription.renewed',
    'subscription.cancelled',
    'refund.initiated',
    'refund.completed',
    'dispute.opened',
    'dispute.resolved',
  ];

  // Load data
  useEffect(() => {
    loadIntegrations();
    loadWebhooks();
  }, []);

  // Filter integrations
  useEffect(() => {
    if (integrationSearch.trim() === '') {
      setFilteredIntegrations(integrations);
    } else {
      const searchLower = integrationSearch.toLowerCase();
      setFilteredIntegrations(
        integrations.filter(
          (integration) =>
            integration.name.toLowerCase().includes(searchLower) ||
            integration.provider.toLowerCase().includes(searchLower) ||
            integration.description.toLowerCase().includes(searchLower)
        )
      );
    }
  }, [integrationSearch, integrations]);

  // Filter webhooks
  useEffect(() => {
    if (webhookSearch.trim() === '') {
      setFilteredWebhooks(webhooks);
    } else {
      const searchLower = webhookSearch.toLowerCase();
      setFilteredWebhooks(
        webhooks.filter(
          (webhook) =>
            webhook.name.toLowerCase().includes(searchLower) ||
            webhook.url.toLowerCase().includes(searchLower) ||
            webhook.description.toLowerCase().includes(searchLower)
        )
      );
    }
  }, [webhookSearch, webhooks]);

  const loadIntegrations = async () => {
    try {
      const q = query(collection(db, 'apiIntegrations'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        integrationId: doc.id,
        ...doc.data(),
      })) as APIIntegration[];
      setIntegrations(data);
    } catch (error) {
      console.error('Error loading integrations:', error);
    }
  };

  const loadWebhooks = async () => {
    try {
      const q = query(collection(db, 'webhooks'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        webhookId: doc.id,
        ...doc.data(),
      })) as Webhook[];
      setWebhooks(data);
    } catch (error) {
      console.error('Error loading webhooks:', error);
    }
  };

  const saveIntegration = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    // Validate required fields
    const name = formData.get('name') as string;
    const apiKey = formData.get('apiKey') as string;
    const provider = formData.get('provider') as string;
    const environment = formData.get('environment') as string;
    const status = formData.get('status') as string;

    if (!name || !name.trim()) {
      alert('Name is required');
      return;
    }

    if (!apiKey || !apiKey.trim()) {
      alert('API Key is required');
      return;
    }

    if (!provider) {
      alert('Provider is required');
      return;
    }

    if (!environment) {
      alert('Environment is required');
      return;
    }

    if (!status) {
      alert('Status is required');
      return;
    }

    // Build integration data, excluding undefined fields
    const apiSecret = (formData.get('apiSecret') as string || '').trim();
    const baseUrl = (formData.get('baseUrl') as string || '').trim();

    const integrationData: any = {
      name: name.trim(),
      description: (formData.get('description') as string || '').trim(),
      provider: provider as any,
      apiKey: apiKey.trim(),
      environment: environment as any,
      status: status as any,
      config: {
        timeout: parseInt(formData.get('timeout') as string) || 30000,
        rateLimit: {
          requestsPerMinute: parseInt(formData.get('requestsPerMinute') as string) || 60,
          requestsPerHour: parseInt(formData.get('requestsPerHour') as string) || 3600,
        },
        retryPolicy: {
          maxRetries: parseInt(formData.get('maxRetries') as string) || 3,
          backoffMultiplier: parseFloat(formData.get('backoffMultiplier') as string) || 2,
        },
      },
      usage: editingIntegration?.usage || {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
      },
      updatedAt: serverTimestamp(),
      updatedBy: admin?.adminId,
    };

    // Only add optional fields if they have values
    if (apiSecret) {
      integrationData.apiSecret = apiSecret;
    }
    if (baseUrl) {
      integrationData.config.baseUrl = baseUrl;
    }

    try {
      const integrationId = editingIntegration?.integrationId || `int_${Date.now()}`;

      if (!editingIntegration) {
        integrationData.integrationId = integrationId;
        integrationData.createdAt = serverTimestamp();
        integrationData.createdBy = admin?.adminId;
      }

      await setDoc(doc(db, 'apiIntegrations', integrationId), integrationData, { merge: true });

      setShowIntegrationModal(false);
      setEditingIntegration(null);
      loadIntegrations();
    } catch (error: any) {
      console.error('Error saving integration:', error);
      const errorMessage = error?.message || 'Unknown error occurred';
      alert(`Failed to save integration: ${errorMessage}`);
    }
  };

  const deleteIntegration = async (integrationId: string) => {
    if (!confirm('Are you sure you want to delete this API integration? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'apiIntegrations', integrationId));
      loadIntegrations();
    } catch (error) {
      console.error('Error deleting integration:', error);
      alert('Failed to delete integration');
    }
  };

  const saveWebhook = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    // Get selected events
    const selectedEvents = availableEvents.filter(
      (event) => formData.get(`event_${event}`) === 'on'
    );

    // Parse headers if provided
    const headersJson = formData.get('headers') as string;
    let headers: Record<string, string> | undefined;
    if (headersJson.trim()) {
      try {
        headers = JSON.parse(headersJson);
      } catch (error) {
        alert('Invalid JSON format for headers');
        return;
      }
    }

    const webhookData: Partial<Webhook> = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      url: formData.get('url') as string,
      events: selectedEvents,
      status: formData.get('status') as any,
      secret: formData.get('secret') as string || `whsec_${Date.now()}`,
      retryPolicy: {
        maxRetries: parseInt(formData.get('maxRetries') as string) || 3,
        retryDelay: parseInt(formData.get('retryDelay') as string) || 5000,
      },
      headers,
      successCount: editingWebhook?.successCount || 0,
      failureCount: editingWebhook?.failureCount || 0,
      updatedAt: serverTimestamp(),
      updatedBy: admin?.adminId,
    };

    try {
      const webhookId = editingWebhook?.webhookId || `wh_${Date.now()}`;

      if (!editingWebhook) {
        webhookData.webhookId = webhookId;
        webhookData.createdAt = serverTimestamp();
        webhookData.createdBy = admin?.adminId;
      }

      await setDoc(doc(db, 'webhooks', webhookId), webhookData, { merge: true });

      setShowWebhookModal(false);
      setEditingWebhook(null);
      loadWebhooks();
    } catch (error) {
      console.error('Error saving webhook:', error);
      alert('Failed to save webhook');
    }
  };

  const deleteWebhook = async (webhookId: string) => {
    if (!confirm('Are you sure you want to delete this webhook? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'webhooks', webhookId));
      loadWebhooks();
    } catch (error) {
      console.error('Error deleting webhook:', error);
      alert('Failed to delete webhook');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const generateApiKey = () => {
    return `sk_${Math.random().toString(36).substring(2, 15)}_${Math.random().toString(36).substring(2, 15)}`;
  };

  const generateSecret = () => {
    return `whsec_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
  };

  const toggleSecretVisibility = (integrationId: string) => {
    setShowSecrets(prev => ({
      ...prev,
      [integrationId]: !prev[integrationId]
    }));
  };

  const testAPIIntegration = async (integration: APIIntegration) => {
    setTestingIntegration(integration.integrationId);
    setTestResult(null);

    try {
      // Call the Cloud Function to test the API integration
      const testFunction = httpsCallable(functions, 'testAPIIntegration');
      const result = await testFunction({ integrationId: integration.integrationId });

      const data = result.data as { success: boolean; message: string; data?: any };

      setTestResult({
        integrationId: integration.integrationId,
        success: data.success,
        message: data.success ? `✓ ${data.message}` : `✗ ${data.message}`,
        data: data.data,
      });
    } catch (error: any) {
      let errorMessage = 'Connection failed';

      // Handle Firebase Functions errors
      if (error.code === 'unauthenticated') {
        errorMessage = 'You must be logged in to test API integrations.';
      } else if (error.code === 'permission-denied') {
        errorMessage = 'You do not have permission to test API integrations.';
      } else if (error.code === 'not-found') {
        errorMessage = 'API integration not found.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      setTestResult({
        integrationId: integration.integrationId,
        success: false,
        message: `✗ ${errorMessage}`,
      });
    } finally {
      setTestingIntegration(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { icon: CheckCircle2, color: 'text-green-600 bg-green-50' },
      inactive: { icon: XCircle, color: 'text-gray-600 bg-gray-50' },
      suspended: { icon: AlertCircle, color: 'text-red-600 bg-red-50' },
      failed: { icon: XCircle, color: 'text-red-600 bg-red-50' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.inactive;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3" />
        {status}
      </span>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">API Management</h1>
        <p className="text-muted-foreground">
          Manage API integrations and webhook configurations
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-700 mb-6">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('integrations')}
            className={`px-4 py-2 border-b-2 font-medium transition-colors ${
              activeTab === 'integrations'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4" />
              API Integrations
            </div>
          </button>
          <button
            onClick={() => setActiveTab('webhooks')}
            className={`px-4 py-2 border-b-2 font-medium transition-colors ${
              activeTab === 'webhooks'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="flex items-center gap-2">
              <WebhookIcon className="w-4 h-4" />
              Webhooks
            </div>
          </button>
        </div>
      </div>

      {/* API Integrations Tab */}
      {activeTab === 'integrations' && (
        <div>
          {/* Search and Add */}
          <div className="flex justify-between items-center mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <input
                type="text"
                placeholder="Search integrations..."
                value={integrationSearch}
                onChange={(e) => setIntegrationSearch(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>
            <button
              onClick={() => {
                setEditingIntegration(null);
                setShowIntegrationModal(true);
              }}
              className="ml-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Integration
            </button>
          </div>

          {/* Integrations Grid */}
          <div className="grid gap-4">
            {filteredIntegrations.map((integration) => (
              <div
                key={integration.integrationId}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{integration.name}</h3>
                      {getStatusBadge(integration.status)}
                      <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-xs">
                        {integration.provider}
                      </span>
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded text-xs">
                        {integration.environment}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{integration.description}</p>

                    {/* API Key */}
                    <div className="mb-2">
                      <label className="text-xs text-muted-foreground">API Key:</label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded flex-1 overflow-hidden text-ellipsis">
                          {showSecrets[integration.integrationId] ? integration.apiKey : '••••••••••••••••'}
                        </code>
                        <button
                          onClick={() => toggleSecretVisibility(integration.integrationId)}
                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                        >
                          {showSecrets[integration.integrationId] ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => copyToClipboard(integration.apiKey)}
                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Usage Stats */}
                    {integration.usage && (
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>Total: {integration.usage.totalRequests || 0}</span>
                        <span className="text-green-600">Success: {integration.usage.successfulRequests || 0}</span>
                        <span className="text-red-600">Failed: {integration.usage.failedRequests || 0}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => testAPIIntegration(integration)}
                      disabled={testingIntegration === integration.integrationId || integration.status !== 'active'}
                      className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-600 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Test API Connection"
                    >
                      {testingIntegration === integration.integrationId ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setEditingIntegration(integration);
                        setShowIntegrationModal(true);
                      }}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteIntegration(integration.integrationId)}
                      className="p-2 hover:bg-red-100 dark:hover:bg-red-900 text-red-600 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Test Result */}
                {testResult && testResult.integrationId === integration.integrationId && (
                  <div className={`mt-3 p-3 rounded-lg border ${
                    testResult.success
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                      : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  }`}>
                    <p className={`text-sm font-medium ${
                      testResult.success ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
                    }`}>
                      {testResult.message}
                    </p>
                    {testResult.data && (
                      <details className="mt-2">
                        <summary className={`text-xs cursor-pointer ${
                          testResult.success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
                        }`}>
                          View Details
                        </summary>
                        <pre className="mt-2 text-xs bg-white dark:bg-slate-900 p-2 rounded overflow-x-auto">
                          {JSON.stringify(testResult.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                )}
              </div>
            ))}

            {filteredIntegrations.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No integrations found. Add your first API integration to get started.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Webhooks Tab */}
      {activeTab === 'webhooks' && (
        <div>
          {/* Search and Add */}
          <div className="flex justify-between items-center mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <input
                type="text"
                placeholder="Search webhooks..."
                value={webhookSearch}
                onChange={(e) => setWebhookSearch(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>
            <button
              onClick={() => {
                setEditingWebhook(null);
                setShowWebhookModal(true);
              }}
              className="ml-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Webhook
            </button>
          </div>

          {/* Webhooks Grid */}
          <div className="grid gap-4">
            {filteredWebhooks.map((webhook) => (
              <div
                key={webhook.webhookId}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{webhook.name}</h3>
                      {getStatusBadge(webhook.status)}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{webhook.description}</p>

                    {/* URL */}
                    <div className="mb-2">
                      <label className="text-xs text-muted-foreground">Endpoint URL:</label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded flex-1 overflow-hidden text-ellipsis">
                          {webhook.url}
                        </code>
                        <button
                          onClick={() => copyToClipboard(webhook.url)}
                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Events */}
                    <div className="mb-2">
                      <label className="text-xs text-muted-foreground">Events ({webhook.events.length}):</label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {webhook.events.slice(0, 5).map((event) => (
                          <span
                            key={event}
                            className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs"
                          >
                            {event}
                          </span>
                        ))}
                        {webhook.events.length > 5 && (
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-xs">
                            +{webhook.events.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span className="text-green-600">Success: {webhook.successCount}</span>
                      <span className="text-red-600">Failed: {webhook.failureCount}</span>
                      <span>Retries: {webhook.retryPolicy.maxRetries}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingWebhook(webhook);
                        setShowWebhookModal(true);
                      }}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteWebhook(webhook.webhookId)}
                      className="p-2 hover:bg-red-100 dark:hover:bg-red-900 text-red-600 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {filteredWebhooks.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No webhooks found. Add your first webhook to get started.
              </div>
            )}
          </div>
        </div>
      )}

      {/* API Integration Modal */}
      {showIntegrationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">
                {editingIntegration ? 'Edit Integration' : 'Add Integration'}
              </h2>

              <form onSubmit={saveIntegration} className="space-y-4">
                {/* Basic Info */}
                <div>
                  <label className="block text-sm font-medium mb-1">Name *</label>
                  <input
                    type="text"
                    name="name"
                    defaultValue={editingIntegration?.name}
                    required
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    name="description"
                    defaultValue={editingIntegration?.description}
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Provider *</label>
                    <select
                      name="provider"
                      defaultValue={editingIntegration?.provider}
                      required
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg"
                    >
                      <option value="PAYSTACK">Paystack</option>
                      <option value="FLUTTERWAVE">Flutterwave</option>
                      <option value="STRIPE">Stripe</option>
                      <option value="DIALOG_360">360Dialog (WhatsApp Business API)</option>
                      <option value="SENDGRID">SendGrid (Email)</option>
                      <option value="GOOGLE_GEMINI">Google Gemini AI</option>
                      <option value="GOOGLE_MAPS">Google Maps</option>
                      <option value="CUSTOM">Custom</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Environment *</label>
                    <select
                      name="environment"
                      defaultValue={editingIntegration?.environment}
                      required
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg"
                    >
                      <option value="SANDBOX">Sandbox</option>
                      <option value="PRODUCTION">Production</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Status *</label>
                  <select
                    name="status"
                    defaultValue={editingIntegration?.status || 'active'}
                    required
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>

                {/* API Credentials */}
                <div>
                  <label className="block text-sm font-medium mb-1">API Key *</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      name="apiKey"
                      defaultValue={editingIntegration?.apiKey}
                      required
                      className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                        input.value = generateApiKey();
                      }}
                      className="px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">API Secret</label>
                  <input
                    type="text"
                    name="apiSecret"
                    defaultValue={editingIntegration?.apiSecret}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Base URL</label>
                  <input
                    type="url"
                    name="baseUrl"
                    defaultValue={editingIntegration?.config?.baseUrl}
                    placeholder="https://api.example.com"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>

                {/* Configuration */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Configuration</h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Timeout (ms)</label>
                      <input
                        type="number"
                        name="timeout"
                        defaultValue={editingIntegration?.config?.timeout || 30000}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Max Retries</label>
                      <input
                        type="number"
                        name="maxRetries"
                        defaultValue={editingIntegration?.config?.retryPolicy?.maxRetries || 3}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Requests/Minute</label>
                      <input
                        type="number"
                        name="requestsPerMinute"
                        defaultValue={editingIntegration?.config?.rateLimit?.requestsPerMinute || 60}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Requests/Hour</label>
                      <input
                        type="number"
                        name="requestsPerHour"
                        defaultValue={editingIntegration?.config?.rateLimit?.requestsPerHour || 3600}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Backoff Multiplier</label>
                      <input
                        type="number"
                        step="0.1"
                        name="backoffMultiplier"
                        defaultValue={editingIntegration?.config?.retryPolicy?.backoffMultiplier || 2}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowIntegrationModal(false);
                      setEditingIntegration(null);
                    }}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    {editingIntegration ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Webhook Modal */}
      {showWebhookModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">
                {editingWebhook ? 'Edit Webhook' : 'Add Webhook'}
              </h2>

              <form onSubmit={saveWebhook} className="space-y-4">
                {/* Basic Info */}
                <div>
                  <label className="block text-sm font-medium mb-1">Name *</label>
                  <input
                    type="text"
                    name="name"
                    defaultValue={editingWebhook?.name}
                    required
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    name="description"
                    defaultValue={editingWebhook?.description}
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Endpoint URL *</label>
                  <input
                    type="url"
                    name="url"
                    defaultValue={editingWebhook?.url}
                    required
                    placeholder="https://example.com/webhooks"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Status *</label>
                  <select
                    name="status"
                    defaultValue={editingWebhook?.status || 'active'}
                    required
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>

                {/* Events */}
                <div>
                  <label className="block text-sm font-medium mb-2">Events *</label>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                    {availableEvents.map((event) => (
                      <label key={event} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          name={`event_${event}`}
                          defaultChecked={editingWebhook?.events.includes(event)}
                          className="rounded"
                        />
                        <span>{event}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Secret */}
                <div>
                  <label className="block text-sm font-medium mb-1">Webhook Secret *</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      name="secret"
                      defaultValue={editingWebhook?.secret}
                      required
                      className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                        input.value = generateSecret();
                      }}
                      className="px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Retry Policy */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Retry Policy</h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Max Retries</label>
                      <input
                        type="number"
                        name="maxRetries"
                        defaultValue={editingWebhook?.retryPolicy?.maxRetries || 3}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Retry Delay (ms)</label>
                      <input
                        type="number"
                        name="retryDelay"
                        defaultValue={editingWebhook?.retryPolicy?.retryDelay || 5000}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                {/* Custom Headers */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Custom Headers (JSON)
                  </label>
                  <textarea
                    name="headers"
                    defaultValue={editingWebhook?.headers ? JSON.stringify(editingWebhook.headers, null, 2) : ''}
                    rows={3}
                    placeholder='{"Authorization": "Bearer token", "X-Custom-Header": "value"}'
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-sm"
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowWebhookModal(false);
                      setEditingWebhook(null);
                    }}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    {editingWebhook ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
