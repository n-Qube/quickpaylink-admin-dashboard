/**
 * Template Editor Modal Component
 *
 * Modal for creating and editing Email and WhatsApp templates
 */

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import WhatsAppTemplateEditor from './WhatsAppTemplateEditor';
import EmailTemplateEditor from './EmailTemplateEditor';

interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'date' | 'url';
  required: boolean;
  description: string;
}

interface EmailTemplateData {
  name: string;
  description: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  category: string;
  variables: TemplateVariable[];
  sendgridTemplateId?: string;
}

interface WhatsAppButton {
  type: 'QUICK_REPLY' | 'PHONE_NUMBER' | 'URL';
  text: string;
  phoneNumber?: string;
  url?: string;
}

interface WhatsAppTemplateData {
  name: string;
  description: string;
  content: string;
  category: 'AUTHENTICATION' | 'UTILITY' | 'MARKETING';
  language: string;
  variables: TemplateVariable[];

  // Interactive template fields
  headerType?: 'NONE' | 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  headerText?: string;
  headerMediaUrl?: string;
  bodyText?: string;
  footerText?: string;
  buttons?: WhatsAppButton[];
}

interface TemplateEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  templateType: 'email' | 'whatsapp';
  initialData?: Partial<EmailTemplateData | WhatsAppTemplateData>;
  onSave: (data: Partial<EmailTemplateData | WhatsAppTemplateData>) => void;
  isEditing?: boolean;
}

export default function TemplateEditorModal({
  isOpen,
  onClose,
  templateType,
  initialData,
  onSave,
  isEditing = false,
}: TemplateEditorModalProps) {
  const [formData, setFormData] = useState<Partial<EmailTemplateData | WhatsAppTemplateData>>({
    name: '',
    description: '',
    variables: [],
    ...initialData,
  });

  const [newVariable, setNewVariable] = useState<TemplateVariable>({
    name: '',
    type: 'string',
    required: true,
    description: '',
  });

  const [showVariableForm, setShowVariableForm] = useState(false);

  useEffect(() => {
    console.log('TemplateEditorModal useEffect triggered:', { initialData, templateType, isOpen });

    // Only update form data when modal opens or when initialData changes
    if (initialData && isEditing) {
      // Editing mode - load the template data
      console.log('Setting formData from initialData (editing mode):', initialData);
      setFormData({ ...initialData });
    } else if (isOpen && !isEditing) {
      // Create mode - reset to defaults
      console.log('Resetting formData to defaults (create mode)');
      setFormData({
        name: '',
        description: '',
        variables: [],
        ...(templateType === 'email'
          ? { subject: '', htmlContent: '', textContent: '', category: '' }
          : { content: '', category: 'UTILITY' as const, language: 'en' }),
      });
    }
  }, [initialData, templateType, isOpen, isEditing]);

  if (!isOpen) return null;

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddVariable = () => {
    if (!newVariable.name || !newVariable.description) {
      alert('Please fill in variable name and description');
      return;
    }

    setFormData((prev) => ({
      ...prev,
      variables: [...(prev.variables || []), newVariable],
    }));

    setNewVariable({
      name: '',
      type: 'string',
      required: true,
      description: '',
    });
    setShowVariableForm(false);
  };

  const handleRemoveVariable = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      variables: prev.variables?.filter((_, i) => i !== index) || [],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name || !formData.description) {
      alert('Please fill in all required fields');
      return;
    }

    if (templateType === 'email') {
      const emailData = formData as Partial<EmailTemplateData>;
      if (!emailData.subject || !emailData.htmlContent) {
        alert('Please fill in email subject and content');
        return;
      }
    } else {
      const whatsappData = formData as Partial<WhatsAppTemplateData>;
      if (!whatsappData.content) {
        alert('Please fill in message content');
        return;
      }

      // WhatsApp character limit
      if (whatsappData.content.length > 1024) {
        alert('WhatsApp message content cannot exceed 1024 characters');
        return;
      }
    }

    onSave(formData);
  };

  const insertVariable = (variableName: string) => {
    // For email templates, insert variable at the end of HTML content
    const emailData = formData as Partial<EmailTemplateData>;
    handleInputChange('htmlContent', `${emailData.htmlContent || ''}{{${variableName}}}`);
  };

  // If editing WhatsApp template, use the enhanced editor
  if (templateType === 'whatsapp') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-7xl w-full max-h-[95vh] overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
            <div>
              <h2 className="text-2xl font-bold">
                {isEditing ? 'Edit WhatsApp Template' : 'Create WhatsApp Template'}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Interactive WhatsApp Template with Live Preview
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(95vh - 100px)' }}>
            <WhatsAppTemplateEditor
              initialData={formData as Partial<WhatsAppTemplateData>}
              onSave={(data) => {
                // Merge the enhanced data with basic metadata
                const mergedData = {
                  name: data.name,
                  description: data.description,
                  category: data.category,
                  language: data.language,
                  variables: data.variables,
                  // Enhanced interactive fields
                  headerType: data.headerType,
                  headerText: data.headerText,
                  headerMediaUrl: data.headerMediaUrl,
                  bodyText: data.bodyText,
                  footerText: data.footerText,
                  buttons: data.buttons,
                  // Keep backward compatibility with 'content' field
                  content: data.bodyText || '',
                };
                onSave(mergedData);
              }}
              onCancel={onClose}
              isEditing={isEditing}
            />
          </div>
        </div>
      </div>
    );
  }

  // Email template editor with enhanced UI
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-7xl w-full max-h-[95vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-2xl font-bold">
              {isEditing ? 'Edit Email Template' : 'Create Email Template'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Rich Email Template with Live Preview
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(95vh - 100px)' }}>
          <EmailTemplateEditor
            initialData={formData as Partial<EmailTemplateData>}
            onSave={(data) => {
              onSave(data);
            }}
            onCancel={onClose}
            isEditing={isEditing}
          />
        </div>
      </div>
    </div>
  );
}
