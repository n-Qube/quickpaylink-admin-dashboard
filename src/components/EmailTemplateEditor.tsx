/**
 * Enhanced Email Template Editor Component
 *
 * Features:
 * - Two-panel layout: Editor on left, live preview on right
 * - Rich text formatting toolbar (bold, italic, underline, etc.)
 * - HTML and plain text editors with syntax highlighting
 * - Variable management with one-click insertion
 * - Live HTML preview with variable substitution
 * - Category and SendGrid template ID management
 * - Responsive design with dark mode support
 */

import { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Eye,
  Code,
  Bold,
  Italic,
  Underline,
  Link as LinkIcon,
  List,
  ListOrdered,
  Image as ImageIcon,
  Save,
  AlertCircle,
  Info,
} from 'lucide-react';

interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'date' | 'url';
  required: boolean;
  description: string;
  example?: string;
}

export interface EmailTemplateData {
  name: string;
  description: string;
  category: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  variables: TemplateVariable[];
  sendgridTemplateId?: string;
}

interface EmailTemplateEditorProps {
  initialData?: Partial<EmailTemplateData>;
  onSave: (data: EmailTemplateData) => void;
  onCancel: () => void;
  isEditing?: boolean;
}

type EditorView = 'visual' | 'html' | 'text';

export default function EmailTemplateEditor({
  initialData,
  onSave,
  onCancel,
  isEditing = false,
}: EmailTemplateEditorProps) {
  const [formData, setFormData] = useState<EmailTemplateData>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    category: initialData?.category || '',
    subject: initialData?.subject || '',
    htmlContent: initialData?.htmlContent || '',
    textContent: initialData?.textContent || '',
    variables: initialData?.variables || [],
    sendgridTemplateId: initialData?.sendgridTemplateId || '',
  });

  const [editorView, setEditorView] = useState<EditorView>('visual');
  const [showVariableForm, setShowVariableForm] = useState(false);
  const [newVariable, setNewVariable] = useState<TemplateVariable>({
    name: '',
    type: 'string',
    required: false,
    description: '',
    example: '',
  });

  // Update form data when initialData changes (for editing)
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        description: initialData.description || '',
        category: initialData.category || '',
        subject: initialData.subject || '',
        htmlContent: initialData.htmlContent || '',
        textContent: initialData.textContent || '',
        variables: initialData.variables || [],
        sendgridTemplateId: initialData.sendgridTemplateId || '',
      });
    }
  }, [initialData]);

  const handleInputChange = (field: keyof EmailTemplateData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddVariable = () => {
    if (!newVariable.name) {
      alert('Please enter a variable name');
      return;
    }

    // Check for duplicate variable names
    if (formData.variables.some((v) => v.name === newVariable.name)) {
      alert('Variable with this name already exists');
      return;
    }

    setFormData((prev) => ({
      ...prev,
      variables: [...prev.variables, newVariable],
    }));

    setNewVariable({
      name: '',
      type: 'string',
      required: false,
      description: '',
      example: '',
    });
    setShowVariableForm(false);
  };

  const handleRemoveVariable = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      variables: prev.variables.filter((_, i) => i !== index),
    }));
  };

  const insertVariable = (variableName: string) => {
    const textarea = document.getElementById('htmlContent') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const placeholder = `{{${variableName}}}`;

    const newText =
      formData.htmlContent.substring(0, start) +
      placeholder +
      formData.htmlContent.substring(start);

    setFormData((prev) => ({ ...prev, htmlContent: newText }));

    // Restore focus and cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
    }, 0);
  };

  const insertHTMLTag = (tag: string) => {
    const textarea = document.getElementById('htmlContent') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = formData.htmlContent.substring(start, end);

    let newText = '';
    switch (tag) {
      case 'bold':
        newText = `<strong>${selectedText || 'text'}</strong>`;
        break;
      case 'italic':
        newText = `<em>${selectedText || 'text'}</em>`;
        break;
      case 'underline':
        newText = `<u>${selectedText || 'text'}</u>`;
        break;
      case 'link':
        newText = `<a href="https://example.com">${selectedText || 'link text'}</a>`;
        break;
      case 'ul':
        newText = `<ul>\n  <li>${selectedText || 'item'}</li>\n</ul>`;
        break;
      case 'ol':
        newText = `<ol>\n  <li>${selectedText || 'item'}</li>\n</ol>`;
        break;
      case 'image':
        newText = `<img src="https://example.com/image.jpg" alt="${selectedText || 'description'}" />`;
        break;
      case 'h1':
        newText = `<h1>${selectedText || 'Heading 1'}</h1>`;
        break;
      case 'h2':
        newText = `<h2>${selectedText || 'Heading 2'}</h2>`;
        break;
      case 'p':
        newText = `<p>${selectedText || 'Paragraph text'}</p>`;
        break;
      default:
        return;
    }

    const updatedContent =
      formData.htmlContent.substring(0, start) +
      newText +
      formData.htmlContent.substring(end);

    setFormData((prev) => ({ ...prev, htmlContent: updatedContent }));
  };

  const generatePreview = () => {
    let preview = formData.htmlContent;

    // Substitute variables with examples
    formData.variables.forEach((variable) => {
      const placeholder = `{{${variable.name}}}`;
      const example = variable.example || `[${variable.name}]`;
      preview = preview.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), example);
    });

    console.log('Email generatePreview called:', { htmlContent: formData.htmlContent, preview });
    return preview;
  };

  const handleSubmit = () => {
    // Validation
    if (!formData.name || !formData.subject || !formData.htmlContent) {
      alert('Please fill in template name, subject, and HTML content');
      return;
    }

    onSave(formData);
  };

  const isValid = () => {
    return formData.name && formData.subject && formData.htmlContent;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      {/* LEFT PANEL - Editor */}
      <div className="space-y-6 overflow-y-auto pr-4" style={{ maxHeight: 'calc(95vh - 150px)' }}>
        {/* Basic Info Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-500" />
            Template Details
          </h3>

          <div>
            <label className="block text-sm font-medium mb-1">
              Template Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="e.g., Merchant Welcome Email"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary focus:border-transparent"
              rows={2}
              placeholder="Brief description of when this template is used"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="e.g., onboarding"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">SendGrid Template ID</label>
              <input
                type="text"
                value={formData.sendgridTemplateId}
                onChange={(e) => handleInputChange('sendgridTemplateId', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="d-1234567890abcdef"
              />
            </div>
          </div>
        </div>

        {/* Email Subject */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Email Subject</h3>

          <div>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => handleInputChange('subject', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-lg font-medium focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="e.g., Welcome to QuickLink Pay, {{merchantName}}!"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Use {`{{variableName}}`} for dynamic content
            </p>
          </div>
        </div>

        {/* Email Content Editor */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Email Content</h3>

            {/* Editor View Toggle */}
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
              <button
                onClick={() => setEditorView('visual')}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  editorView === 'visual'
                    ? 'bg-white dark:bg-slate-700 shadow'
                    : 'hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <Eye className="w-4 h-4 inline mr-1" />
                Visual
              </button>
              <button
                onClick={() => setEditorView('html')}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  editorView === 'html'
                    ? 'bg-white dark:bg-slate-700 shadow'
                    : 'hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <Code className="w-4 h-4 inline mr-1" />
                HTML
              </button>
              <button
                onClick={() => setEditorView('text')}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  editorView === 'text'
                    ? 'bg-white dark:bg-slate-700 shadow'
                    : 'hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Text
              </button>
            </div>
          </div>

          {/* HTML Formatting Toolbar */}
          {editorView === 'html' && (
            <div className="flex flex-wrap gap-1 p-2 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => insertHTMLTag('bold')}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                title="Bold"
              >
                <Bold className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => insertHTMLTag('italic')}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                title="Italic"
              >
                <Italic className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => insertHTMLTag('underline')}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                title="Underline"
              >
                <Underline className="w-4 h-4" />
              </button>
              <div className="w-px bg-slate-300 dark:bg-slate-600 mx-1"></div>
              <button
                type="button"
                onClick={() => insertHTMLTag('link')}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                title="Insert Link"
              >
                <LinkIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => insertHTMLTag('ul')}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                title="Bullet List"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => insertHTMLTag('ol')}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                title="Numbered List"
              >
                <ListOrdered className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => insertHTMLTag('image')}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                title="Insert Image"
              >
                <ImageIcon className="w-4 h-4" />
              </button>
              <div className="w-px bg-slate-300 dark:bg-slate-600 mx-1"></div>
              <button
                type="button"
                onClick={() => insertHTMLTag('h1')}
                className="px-2 py-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-xs font-semibold"
                title="Heading 1"
              >
                H1
              </button>
              <button
                type="button"
                onClick={() => insertHTMLTag('h2')}
                className="px-2 py-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-xs font-semibold"
                title="Heading 2"
              >
                H2
              </button>
              <button
                type="button"
                onClick={() => insertHTMLTag('p')}
                className="px-2 py-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-xs font-semibold"
                title="Paragraph"
              >
                P
              </button>
            </div>
          )}

          {/* HTML Content Editor */}
          {(editorView === 'html' || editorView === 'visual') && (
            <div>
              <label className="block text-sm font-medium mb-1">
                HTML Content <span className="text-red-500">*</span>
              </label>
              <textarea
                id="htmlContent"
                value={formData.htmlContent}
                onChange={(e) => handleInputChange('htmlContent', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 font-mono text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                rows={16}
                placeholder="<html>&#10;  <body>&#10;    <h1>Welcome {{merchantName}}!</h1>&#10;    <p>Thank you for joining QuickLink Pay.</p>&#10;  </body>&#10;</html>"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                {formData.htmlContent.length} characters
              </p>
            </div>
          )}

          {/* Plain Text Content */}
          {editorView === 'text' && (
            <div>
              <label className="block text-sm font-medium mb-1">
                Plain Text Content (Fallback)
              </label>
              <textarea
                value={formData.textContent}
                onChange={(e) => handleInputChange('textContent', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 font-mono text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                rows={16}
                placeholder="Welcome {{merchantName}}!&#10;&#10;Thank you for joining QuickLink Pay."
              />
              <p className="text-xs text-muted-foreground mt-1">
                Plain text version for email clients that don't support HTML
              </p>
            </div>
          )}
        </div>

        {/* Variables Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Template Variables</h3>
            <button
              type="button"
              onClick={() => setShowVariableForm(true)}
              className="flex items-center gap-2 px-3 py-1 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              <Plus className="w-4 h-4" />
              Add Variable
            </button>
          </div>

          {/* Variable List */}
          {formData.variables.length > 0 && (
            <div className="space-y-2">
              {formData.variables.map((variable, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded">
                        {`{{${variable.name}}}`}
                      </code>
                      <span className="text-sm font-medium">{variable.name}</span>
                      {variable.required && (
                        <span className="text-xs text-red-500">Required</span>
                      )}
                      <span className="text-xs text-muted-foreground">({variable.type})</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{variable.description}</p>
                    {variable.example && (
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        Example: {variable.example}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => insertVariable(variable.name)}
                      className="px-3 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800"
                    >
                      Insert
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveVariable(index)}
                      className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Variable Form */}
          {showVariableForm && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Add New Variable</h4>
                <button
                  type="button"
                  onClick={() => setShowVariableForm(false)}
                  className="p-1 hover:bg-blue-100 dark:hover:bg-blue-800 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Variable Name</label>
                  <input
                    type="text"
                    value={newVariable.name}
                    onChange={(e) =>
                      setNewVariable({ ...newVariable, name: e.target.value })
                    }
                    className="w-full px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900"
                    placeholder="merchantName"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Type</label>
                  <select
                    value={newVariable.type}
                    onChange={(e) =>
                      setNewVariable({
                        ...newVariable,
                        type: e.target.value as TemplateVariable['type'],
                      })
                    }
                    className="w-full px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900"
                  >
                    <option value="string">String</option>
                    <option value="number">Number</option>
                    <option value="date">Date</option>
                    <option value="url">URL</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Description</label>
                <input
                  type="text"
                  value={newVariable.description}
                  onChange={(e) =>
                    setNewVariable({ ...newVariable, description: e.target.value })
                  }
                  className="w-full px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900"
                  placeholder="Merchant's first name"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Example Value</label>
                <input
                  type="text"
                  value={newVariable.example}
                  onChange={(e) =>
                    setNewVariable({ ...newVariable, example: e.target.value })
                  }
                  className="w-full px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900"
                  placeholder="John Doe"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="required"
                  checked={newVariable.required}
                  onChange={(e) =>
                    setNewVariable({ ...newVariable, required: e.target.checked })
                  }
                  className="rounded"
                />
                <label htmlFor="required" className="text-sm">
                  Required field
                </label>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAddVariable}
                  className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
                >
                  Add Variable
                </button>
                <button
                  type="button"
                  onClick={() => setShowVariableForm(false)}
                  className="px-3 py-1 text-sm bg-slate-200 dark:bg-slate-700 rounded hover:bg-slate-300 dark:hover:bg-slate-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL - Live Preview */}
      <div className="bg-slate-100 dark:bg-slate-900 rounded-lg p-6 overflow-y-auto border border-slate-200 dark:border-slate-700" style={{ maxHeight: 'calc(95vh - 150px)' }}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Live Preview</h3>
            <div className="flex gap-2">
              <span className={`px-2 py-1 text-xs rounded ${
                isValid() ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
              }`}>
                {isValid() ? 'Valid' : 'Incomplete'}
              </span>
            </div>
          </div>

          {/* Email Preview */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-300 dark:border-slate-600">
            {/* Email Header */}
            <div className="border-b border-slate-200 dark:border-slate-700 p-4">
              <div className="text-xs text-muted-foreground mb-1">From:</div>
              <div className="text-sm font-medium">QuickLink Pay {`<noreply@quicklinkpay.com>`}</div>

              <div className="text-xs text-muted-foreground mt-3 mb-1">To:</div>
              <div className="text-sm font-medium">merchant@example.com</div>

              <div className="text-xs text-muted-foreground mt-3 mb-1">Subject:</div>
              <div className="text-sm font-semibold">{formData.subject || '(No subject)'}</div>
            </div>

            {/* Email Body */}
            <div className="p-6">
              {formData.htmlContent ? (
                <div
                  className="prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: generatePreview() }}
                />
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Email content preview will appear here</p>
                  <p className="text-xs mt-1">Start typing in the HTML editor</p>
                </div>
              )}
            </div>
          </div>

          {/* Template Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <div className="text-xs text-muted-foreground mb-1">Variables</div>
              <div className="text-2xl font-bold">{formData.variables.length}</div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <div className="text-xs text-muted-foreground mb-1">Content Length</div>
              <div className="text-2xl font-bold">{formData.htmlContent.length}</div>
            </div>
          </div>

          {/* Help Text */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
              <Info className="w-4 h-4" />
              Tips
            </h4>
            <ul className="text-xs space-y-1 text-muted-foreground">
              <li>Use {`{{variableName}}`} syntax for dynamic content</li>
              <li>Add example values to variables for better preview</li>
              <li>Test your HTML in different email clients</li>
              <li>Keep HTML simple for better compatibility</li>
              <li>Always provide a plain text fallback</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Action Buttons - Fixed at Bottom */}
      <div className="col-span-2 flex justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-700">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!isValid()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {isEditing ? 'Update Template' : 'Create Template'}
        </button>
      </div>
    </div>
  );
}
