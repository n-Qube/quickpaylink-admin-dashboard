/**
 * AI Prompts Management Page
 *
 * Manage AI prompt templates for Gemini AI integration
 * - Create and edit prompt templates
 * - Manage default templates for each use case
 * - Test prompts with sample data
 */

import { useState, useEffect } from 'react';
import {
  Brain,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Eye,
  Copy,
  CheckCircle,
  X,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Star,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import {
  type AIPromptTemplate,
  getAllPromptTemplates,
  createPromptTemplate,
  updatePromptTemplate,
  deletePromptTemplate,
  togglePromptTemplateStatus,
  setDefaultPromptTemplate,
  createDefaultPromptTemplates,
  validatePromptTemplate,
  getPromptTemplateStats,
} from '../services/aiTemplates';

type UseCaseFilter = 'all' | AIPromptTemplate['useCase'];

export default function AIPrompts() {
  const { admin } = useAuth();
  const [templates, setTemplates] = useState<AIPromptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterUseCase, setFilterUseCase] = useState<UseCaseFilter>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<AIPromptTemplate | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadTemplates();
    loadStats();
  }, []);

  /**
   * Load templates from Firestore
   */
  const loadTemplates = async () => {
    try {
      setLoading(true);
      setMessage(null);
      const data = await getAllPromptTemplates();
      setTemplates(data);
    } catch (error: any) {
      console.error('Error loading AI prompt templates:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to load templates' });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load statistics
   */
  const loadStats = async () => {
    try {
      const data = await getPromptTemplateStats();
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  /**
   * Create default templates
   */
  const handleCreateDefaults = async () => {
    if (!confirm('This will create 6 default AI prompt templates. Continue?')) {
      return;
    }

    try {
      setLoading(true);
      await createDefaultPromptTemplates();
      setMessage({ type: 'success', text: 'Default AI prompt templates created successfully!' });
      await loadTemplates();
      await loadStats();
    } catch (error: any) {
      console.error('Error creating default templates:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to create default templates' });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Delete template
   */
  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      return;
    }

    try {
      await deletePromptTemplate(templateId);
      setMessage({ type: 'success', text: 'Template deleted successfully' });
      await loadTemplates();
      await loadStats();
    } catch (error: any) {
      console.error('Error deleting template:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to delete template' });
    }
  };

  /**
   * Toggle template status
   */
  const handleToggleStatus = async (templateId: string, currentStatus: boolean) => {
    try {
      await togglePromptTemplateStatus(templateId, !currentStatus);
      setMessage({ type: 'success', text: 'Template status updated' });
      await loadTemplates();
    } catch (error: any) {
      console.error('Error toggling template status:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to update template status' });
    }
  };

  /**
   * Set as default template
   */
  const handleSetDefault = async (templateId: string, useCase: AIPromptTemplate['useCase']) => {
    try {
      await setDefaultPromptTemplate(templateId, useCase);
      setMessage({ type: 'success', text: 'Default template updated' });
      await loadTemplates();
    } catch (error: any) {
      console.error('Error setting default template:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to set default template' });
    }
  };

  /**
   * Filter templates
   */
  const getFilteredTemplates = () => {
    return templates.filter((template) => {
      const matchesSearch =
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filterUseCase === 'all' || template.useCase === filterUseCase;

      return matchesSearch && matchesFilter;
    });
  };

  /**
   * Get use case badge
   */
  const getUseCaseBadge = (useCase: AIPromptTemplate['useCase']) => {
    const badges = {
      invoice_extraction: { bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-700 dark:text-blue-300', label: 'Invoice' },
      product_description: { bg: 'bg-purple-100 dark:bg-purple-900', text: 'text-purple-700 dark:text-purple-300', label: 'Product' },
      email_generation: { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-700 dark:text-green-300', label: 'Email' },
      fraud_detection: { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-700 dark:text-red-300', label: 'Fraud' },
      business_insights: { bg: 'bg-yellow-100 dark:bg-yellow-900', text: 'text-yellow-700 dark:text-yellow-300', label: 'Insights' },
      customer_support: { bg: 'bg-indigo-100 dark:bg-indigo-900', text: 'text-indigo-700 dark:text-indigo-300', label: 'Support' },
      custom: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300', label: 'Custom' },
    };

    const badge = badges[useCase];

    return (
      <span className={cn('inline-flex items-center px-2 py-1 rounded text-xs font-medium', badge.bg, badge.text)}>
        {badge.label}
      </span>
    );
  };

  const filteredTemplates = getFilteredTemplates();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl">
              <Brain className="w-7 h-7 text-primary" />
            </div>
            AI Prompt Templates
          </h1>
          <p className="text-muted-foreground mt-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Manage AI prompt templates for Google Gemini integration
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleCreateDefaults}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            title="Create default AI prompt templates"
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium hidden sm:inline">Create Defaults</span>
          </button>
          <button
            onClick={loadTemplates}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            title="Refresh templates"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            <span className="text-sm font-medium hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className={cn(
            'p-4 rounded-lg flex items-start justify-between gap-4',
            message.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
          )}
        >
          <div className="flex items-start gap-3 flex-1">
            {message.type === 'error' && <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
            {message.type === 'success' && <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
            <p className="font-medium">{message.text}</p>
          </div>
          <button onClick={() => setMessage(null)} className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Templates</p>
                <p className="text-2xl font-bold mt-1">{stats.total}</p>
              </div>
              <Brain className="w-8 h-8 text-primary opacity-20" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold mt-1 text-green-600">{stats.active}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Inactive</p>
                <p className="text-2xl font-bold mt-1 text-gray-500">{stats.inactive}</p>
              </div>
              <X className="w-8 h-8 text-gray-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Use Cases</p>
                <p className="text-2xl font-bold mt-1">{Object.keys(stats.byUseCase).length}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-primary opacity-20" />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900"
          />
        </div>

        {/* Use Case Filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <select
            value={filterUseCase}
            onChange={(e) => setFilterUseCase(e.target.value as UseCaseFilter)}
            className="pl-10 pr-8 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 appearance-none cursor-pointer"
          >
            <option value="all">All Use Cases</option>
            <option value="invoice_extraction">Invoice Extraction</option>
            <option value="product_description">Product Description</option>
            <option value="email_generation">Email Generation</option>
            <option value="fraud_detection">Fraud Detection</option>
            <option value="business_insights">Business Insights</option>
            <option value="customer_support">Customer Support</option>
            <option value="custom">Custom</option>
          </select>
        </div>
      </div>

      {/* Templates List */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-4">Loading templates...</p>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
              <Brain className="w-10 h-10 text-primary" />
            </div>
            {searchQuery || filterUseCase !== 'all' ? (
              <>
                <h3 className="text-lg font-semibold mb-2">No templates found</h3>
                <p className="text-muted-foreground mb-4">
                  No templates match your current filters. Try adjusting your search or filter criteria.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFilterUseCase('all');
                  }}
                  className="text-primary hover:underline text-sm font-medium"
                >
                  Clear all filters
                </button>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold mb-2">No AI prompt templates yet</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Create AI prompt templates to power intelligent features like invoice extraction, product description
                  generation, fraud detection, and customer support automation.
                </p>
                <button
                  onClick={handleCreateDefaults}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
                >
                  <Sparkles className="w-5 h-5" />
                  Create Default Templates
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {filteredTemplates.map((template) => (
              <div key={template.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{template.name}</h3>
                      {getUseCaseBadge(template.useCase)}
                      {template.isDefault && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300">
                          <Star className="w-3 h-3" />
                          Default
                        </span>
                      )}
                      <button
                        onClick={() => handleToggleStatus(template.id, template.isActive)}
                        className={cn(
                          'inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors',
                          template.isActive
                            ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                        )}
                        title={template.isActive ? 'Click to deactivate' : 'Click to activate'}
                      >
                        {template.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </div>

                    <p className="text-sm text-muted-foreground mb-3">{template.description}</p>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Variables: {template.variables?.length || 0}</span>
                      <span>•</span>
                      <span>Used: {template.usageCount || 0} times</span>
                      <span>•</span>
                      <span>Temp: {template.temperature}</span>
                      <span>•</span>
                      <span>Max Tokens: {template.maxTokens}</span>
                      <span>•</span>
                      <span>Output: {template.outputFormat}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    {!template.isDefault && (
                      <button
                        onClick={() => handleSetDefault(template.id, template.useCase)}
                        className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                        title="Set as default"
                      >
                        <Star className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">🤖 About AI Prompt Templates</h3>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          AI prompt templates define how the Google Gemini AI model processes different types of requests. Each template
          includes the prompt structure, required variables, output format, and generation parameters. Default templates
          are automatically used for their respective use cases throughout the platform.
        </p>
      </div>
    </div>
  );
}
