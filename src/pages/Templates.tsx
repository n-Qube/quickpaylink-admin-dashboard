/**
 * Templates Management Page
 *
 * Manage Email and WhatsApp message templates
 * - Email templates for SendGrid
 * - WhatsApp templates for 360Dialog
 */

import { useState, useEffect } from 'react';
import {
  Mail,
  MessageSquare,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Send,
  Eye,
  Copy,
  Check,
  X,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import TemplateEditorModal from '@/components/TemplateEditorModal';
import { createDefaultTemplates } from '../services/whatsappTemplates';
import { createDefaultEmailTemplates } from '../services/emailTemplates';
import {
  collection,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  where,
} from 'firebase/firestore';

type TemplateType = 'email' | 'whatsapp';
type TemplateStatus = 'draft' | 'active' | 'pending_approval' | 'rejected' | 'archived';
type WhatsAppCategory = 'AUTHENTICATION' | 'UTILITY' | 'MARKETING';

interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  category: string;
  variables: TemplateVariable[];
  sendgridTemplateId?: string;
  status: TemplateStatus;
  usageCount: number;
  createdAt: any;
  updatedAt: any;
  createdBy: string;
}

interface WhatsAppTemplate {
  id: string;
  name: string;
  description: string;
  content: string;
  category: WhatsAppCategory;
  language: string;
  variables: TemplateVariable[];
  dialog360TemplateId?: string;
  status: TemplateStatus;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  usageCount: number;
  createdAt: any;
  updatedAt: any;
  createdBy: string;
}

interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'date' | 'url';
  required: boolean;
  description: string;
}

export default function Templates() {
  const { admin } = useAuth();
  const [activeTab, setActiveTab] = useState<TemplateType>('email');
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [whatsappTemplates, setWhatsAppTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<TemplateStatus | 'all'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | WhatsAppTemplate | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadTemplates();
  }, [activeTab]);

  /**
   * Load templates from Firestore
   */
  const loadTemplates = async () => {
    try {
      setLoading(true);
      setMessage(null); // Clear any previous error messages
      console.log(`Loading ${activeTab} templates...`);

      if (activeTab === 'email') {
        const templatesRef = collection(db, 'emailTemplates');
        // Try without orderBy first to check if collection exists
        const snapshot = await getDocs(templatesRef);

        const templates = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as EmailTemplate[];

        // Sort in memory instead
        templates.sort((a, b) => {
          const aTime = a.createdAt?.toDate?.() || new Date(0);
          const bTime = b.createdAt?.toDate?.() || new Date(0);
          return bTime.getTime() - aTime.getTime();
        });

        setEmailTemplates(templates);
        console.log(`✅ Loaded ${templates.length} email templates`);
      } else {
        const templatesRef = collection(db, 'whatsappTemplates');
        const snapshot = await getDocs(templatesRef);

        const templates = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as WhatsAppTemplate[];

        // Sort in memory instead
        templates.sort((a, b) => {
          const aTime = a.createdAt?.toDate?.() || new Date(0);
          const bTime = b.createdAt?.toDate?.() || new Date(0);
          return bTime.getTime() - aTime.getTime();
        });

        setWhatsAppTemplates(templates);
        console.log(`✅ Loaded ${templates.length} WhatsApp templates`);
      }
    } catch (error: any) {
      console.error('Error loading templates:', error);

      // Provide more specific error messages
      let errorMessage = 'Failed to load templates';
      if (error.code === 'permission-denied') {
        errorMessage = 'Permission denied. Please check Firestore security rules.';
      } else if (error.code === 'unavailable') {
        errorMessage = 'Firebase connection error. Please check your internet connection.';
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }

      setMessage({ type: 'error', text: errorMessage });

      // Still set empty arrays so UI shows "no templates" instead of error state
      if (activeTab === 'email') {
        setEmailTemplates([]);
      } else {
        setWhatsAppTemplates([]);
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Create default WhatsApp templates
   */
  const handleCreateDefaultTemplates = async () => {
    if (!confirm('This will create 5 default WhatsApp templates (OTP, Invoice, Reminder, Receipt, Welcome). Continue?')) {
      return;
    }

    try {
      setLoading(true);
      await createDefaultTemplates();
      setMessage({ type: 'success', text: 'Default WhatsApp templates created successfully!' });
      await loadTemplates();
    } catch (error: any) {
      console.error('Error creating default templates:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to create default templates' });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Create default Email templates
   */
  const handleCreateDefaultEmailTemplates = async () => {
    if (!confirm('This will create 6 default Email templates (OTP, Invoice, Receipt, Reminder, Welcome, Password Reset). Continue?')) {
      return;
    }

    try {
      setLoading(true);
      await createDefaultEmailTemplates();
      setMessage({ type: 'success', text: 'Default email templates created successfully!' });
      await loadTemplates();
    } catch (error: any) {
      console.error('Error creating default email templates:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to create default email templates' });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Filter templates based on search and status
   */
  const getFilteredTemplates = () => {
    const templates = activeTab === 'email' ? emailTemplates : whatsappTemplates;

    return templates.filter(template => {
      const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           template.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === 'all' || template.status === filterStatus;

      return matchesSearch && matchesStatus;
    });
  };

  /**
   * Create new template
   */
  const handleCreateTemplate = async (templateData: Partial<EmailTemplate | WhatsAppTemplate>) => {
    try {
      if (!admin) return;

      const collectionName = activeTab === 'email' ? 'emailTemplates' : 'whatsappTemplates';
      const newTemplate = {
        ...templateData,
        status: 'draft' as TemplateStatus,
        usageCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: admin.adminId,
      };

      await addDoc(collection(db, collectionName), newTemplate);

      setMessage({ type: 'success', text: 'Template created successfully' });
      setShowCreateModal(false);
      loadTemplates();
    } catch (error) {
      console.error('Error creating template:', error);
      setMessage({ type: 'error', text: 'Failed to create template' });
    }
  };

  /**
   * Update existing template
   */
  const handleUpdateTemplate = async (templateId: string, templateData: Partial<EmailTemplate | WhatsAppTemplate>) => {
    try {
      if (!admin) return;

      const collectionName = activeTab === 'email' ? 'emailTemplates' : 'whatsappTemplates';
      const templateRef = doc(db, collectionName, templateId);

      await updateDoc(templateRef, {
        ...templateData,
        updatedAt: serverTimestamp(),
      });

      setMessage({ type: 'success', text: 'Template updated successfully' });
      setEditingTemplate(null);
      setShowCreateModal(false);
      loadTemplates();
    } catch (error) {
      console.error('Error updating template:', error);
      setMessage({ type: 'error', text: 'Failed to update template' });
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
      const collectionName = activeTab === 'email' ? 'emailTemplates' : 'whatsappTemplates';
      await deleteDoc(doc(db, collectionName, templateId));

      setMessage({ type: 'success', text: 'Template deleted successfully' });
      loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      setMessage({ type: 'error', text: 'Failed to delete template' });
    }
  };

  /**
   * Duplicate template
   */
  const handleDuplicateTemplate = async (template: EmailTemplate | WhatsAppTemplate) => {
    try {
      if (!admin) return;

      const collectionName = activeTab === 'email' ? 'emailTemplates' : 'whatsappTemplates';
      const { id, createdAt, updatedAt, createdBy, usageCount, ...templateData } = template;

      const duplicatedTemplate = {
        ...templateData,
        name: `${template.name} (Copy)`,
        status: 'draft' as TemplateStatus,
        usageCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: admin.adminId,
      };

      await addDoc(collection(db, collectionName), duplicatedTemplate);

      setMessage({ type: 'success', text: 'Template duplicated successfully' });
      loadTemplates();
    } catch (error) {
      console.error('Error duplicating template:', error);
      setMessage({ type: 'error', text: 'Failed to duplicate template' });
    }
  };

  /**
   * Open edit modal
   */
  const handleEditTemplate = (template: EmailTemplate | WhatsAppTemplate) => {
    console.log('handleEditTemplate called with template:', template);
    setEditingTemplate(template);
    setShowCreateModal(true);
  };

  /**
   * Get status badge styling
   */
  const getStatusBadge = (status: TemplateStatus) => {
    // Handle undefined or null status
    if (!status) {
      status = 'draft' as TemplateStatus;
    }

    const badges = {
      draft: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300', icon: Edit2 },
      active: { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-700 dark:text-green-300', icon: CheckCircle },
      pending_approval: { bg: 'bg-yellow-100 dark:bg-yellow-900', text: 'text-yellow-700 dark:text-yellow-300', icon: Clock },
      rejected: { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-700 dark:text-red-300', icon: X },
      archived: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-500 dark:text-gray-400', icon: AlertCircle },
    };

    const badge = badges[status] || badges.draft; // Default to draft if status not found
    const Icon = badge.icon;

    return (
      <span className={cn('inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium', badge.bg, badge.text)}>
        <Icon className="w-3 h-3" />
        {status.replace('_', ' ')}
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
              {activeTab === 'email' ? <Mail className="w-7 h-7 text-primary" /> : <MessageSquare className="w-7 h-7 text-primary" />}
            </div>
            Message Templates
          </h1>
          <p className="text-muted-foreground mt-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Create and manage email and WhatsApp templates for merchant communications
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'email' && (
            <button
              onClick={handleCreateDefaultEmailTemplates}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
              title="Create default email templates"
            >
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium hidden sm:inline">Create Defaults</span>
            </button>
          )}
          {activeTab === 'whatsapp' && (
            <button
              onClick={handleCreateDefaultTemplates}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
              title="Create default WhatsApp templates"
            >
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium hidden sm:inline">Create Defaults</span>
            </button>
          )}
          <button
            onClick={loadTemplates}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            title="Refresh templates"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            <span className="text-sm font-medium hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-semibold">Create Template</span>
          </button>
        </div>
      </div>

      {/* Success/Error Message */}
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
            <div>
              <p className="font-medium">{message.text}</p>
              {message.type === 'error' && (
                <button
                  onClick={loadTemplates}
                  className="mt-2 text-sm underline hover:no-underline"
                >
                  Try again
                </button>
              )}
            </div>
          </div>
          <button
            onClick={() => setMessage(null)}
            className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-700">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('email')}
            className={cn(
              'flex items-center gap-2 px-4 py-3 border-b-2 transition-colors',
              activeTab === 'email'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <Mail className="w-4 h-4" />
            Email Templates
            <span className={cn(
              'px-2 py-0.5 rounded-full text-xs font-medium',
              activeTab === 'email'
                ? 'bg-primary/10 text-primary'
                : 'bg-muted text-muted-foreground'
            )}>
              {emailTemplates.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('whatsapp')}
            className={cn(
              'flex items-center gap-2 px-4 py-3 border-b-2 transition-colors',
              activeTab === 'whatsapp'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <MessageSquare className="w-4 h-4" />
            WhatsApp Templates
            <span className={cn(
              'px-2 py-0.5 rounded-full text-xs font-medium',
              activeTab === 'whatsapp'
                ? 'bg-primary/10 text-primary'
                : 'bg-muted text-muted-foreground'
            )}>
              {whatsappTemplates.length}
            </span>
          </button>
        </div>
      </div>

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

        {/* Status Filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as TemplateStatus | 'all')}
            className="pl-10 pr-8 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 appearance-none cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="pending_approval">Pending Approval</option>
            <option value="rejected">Rejected</option>
            <option value="archived">Archived</option>
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
              {activeTab === 'email' ? (
                <Mail className="w-10 h-10 text-primary" />
              ) : (
                <MessageSquare className="w-10 h-10 text-primary" />
              )}
            </div>
            {searchQuery || filterStatus !== 'all' ? (
              <>
                <h3 className="text-lg font-semibold mb-2">No templates found</h3>
                <p className="text-muted-foreground mb-4">
                  No templates match your current filters. Try adjusting your search or filter criteria.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFilterStatus('all');
                  }}
                  className="text-primary hover:underline text-sm font-medium"
                >
                  Clear all filters
                </button>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold mb-2">
                  No {activeTab} templates yet
                </h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  {activeTab === 'email'
                    ? 'Create professional email templates with dynamic variables for consistent merchant communication via SendGrid.'
                    : 'Create WhatsApp message templates for instant merchant notifications via 360Dialog. Templates require approval before use.'}
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
                >
                  <Plus className="w-5 h-5" />
                  Create Your First {activeTab === 'email' ? 'Email' : 'WhatsApp'} Template
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 p-4">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="p-6 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-primary/50 dark:hover:border-primary/50 hover:shadow-lg transition-all duration-200 bg-white dark:bg-slate-800/50 backdrop-blur-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{template.name}</h3>
                      {getStatusBadge(template.status)}
                      {activeTab === 'whatsapp' && (template as WhatsAppTemplate).category && (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                          {(template as WhatsAppTemplate).category}
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground mb-3">
                      {template.description}
                    </p>

                    {activeTab === 'email' && (
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                        Subject: {(template as EmailTemplate).subject}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Variables: {template.variables?.length || 0}</span>
                      <span>•</span>
                      <span>Used: {template.usageCount || 0} times</span>
                      <span>•</span>
                      <span>
                        Created: {template.createdAt?.toDate
                          ? new Date(template.createdAt.toDate()).toLocaleDateString()
                          : 'N/A'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleDuplicateTemplate(template)}
                      className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                      title="Duplicate"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEditTemplate(template)}
                      className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {activeTab === 'whatsapp' && (template as WhatsAppTemplate).approvalStatus === 'rejected' && (
                  <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                    <p className="text-sm text-red-700 dark:text-red-300">
                      <strong>Rejection Reason:</strong> {(template as WhatsAppTemplate).rejectionReason}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            {activeTab === 'email' ? '📧 Email Templates' : '💬 WhatsApp Templates'}
          </h3>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            {activeTab === 'email'
              ? 'Email templates are sent via SendGrid. Create templates with dynamic variables and track delivery rates.'
              : 'WhatsApp templates must be approved by WhatsApp before use via 360Dialog. Allow 24-48 hours for approval.'}
          </p>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
          <h3 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
            ⚠️ Important
          </h3>
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            {activeTab === 'email'
              ? 'Test all email templates before marking as active. Ensure SendGrid template IDs are correctly configured.'
              : 'WhatsApp template rejections are common. Follow guidelines strictly: clear purpose, no promotional content in utility templates.'}
          </p>
        </div>
      </div>

      {/* Template Editor Modal */}
      <TemplateEditorModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingTemplate(null);
        }}
        templateType={activeTab}
        initialData={editingTemplate || undefined}
        onSave={(data) => {
          if (editingTemplate) {
            handleUpdateTemplate(editingTemplate.id, data);
          } else {
            handleCreateTemplate(data);
          }
        }}
        isEditing={!!editingTemplate}
      />
    </div>
  );
}
