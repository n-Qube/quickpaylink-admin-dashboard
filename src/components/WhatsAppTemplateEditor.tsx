/**
 * Enhanced WhatsApp Template Editor with Live Preview
 *
 * Supports:
 * - Interactive templates (buttons, lists)
 * - Rich text formatting (*bold*, _italic_, ~strikethrough~, ```code```)
 * - Header, body, footer sections
 * - Quick reply buttons
 * - Call-to-action buttons
 * - Live preview panel
 */

import { useState, useEffect } from 'react';
import { Plus, Trash2, Info, Eye, Type, Image as ImageIcon, Video, FileText, MessageSquare, Phone, Globe, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'date' | 'url';
  required: boolean;
  description: string;
  example?: string;
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
  category: 'AUTHENTICATION' | 'UTILITY' | 'MARKETING';
  language: string;

  // Header section
  headerType: 'NONE' | 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  headerText?: string;
  headerMediaUrl?: string;

  // Body section (main message)
  bodyText: string;

  // Footer section (optional)
  footerText?: string;

  // Buttons (interactive)
  buttons: WhatsAppButton[];

  // Variables
  variables: TemplateVariable[];
}

interface WhatsAppTemplateEditorProps {
  initialData?: Partial<WhatsAppTemplateData>;
  onSave: (data: WhatsAppTemplateData) => void;
  onCancel: () => void;
  isEditing?: boolean;
}

export default function WhatsAppTemplateEditor({
  initialData,
  onSave,
  onCancel,
  isEditing = false,
}: WhatsAppTemplateEditorProps) {
  const [formData, setFormData] = useState<WhatsAppTemplateData>({
    name: '',
    description: '',
    category: 'UTILITY',
    language: 'en',
    headerType: 'NONE',
    bodyText: '',
    footerText: '',
    buttons: [],
    variables: [],
    ...initialData,
  });

  const [showButtonForm, setShowButtonForm] = useState(false);
  const [showVariableForm, setShowVariableForm] = useState(false);
  const [cursorPosition, setCursorPosition] = useState<number>(0);

  const [newButton, setNewButton] = useState<WhatsAppButton>({
    type: 'QUICK_REPLY',
    text: '',
  });

  const [newVariable, setNewVariable] = useState<TemplateVariable>({
    name: '',
    type: 'string',
    required: true,
    description: '',
    example: '',
  });

  // Update form data when initialData changes (for editing)
  useEffect(() => {
    if (initialData) {
      console.log('WhatsAppTemplateEditor received initialData:', initialData);

      // Map database field names to component field names
      // Database uses 'content' but component uses 'bodyText'
      const mappedData = {
        name: '',
        description: '',
        category: 'UTILITY' as const,
        language: 'en',
        headerType: 'NONE' as const,
        bodyText: '',
        footerText: '',
        buttons: [],
        variables: [],
        ...initialData,
        // Map 'content' field to 'bodyText' if it exists
        bodyText: (initialData as any).content || initialData.bodyText || '',
      };

      console.log('Mapped data:', mappedData);
      setFormData(mappedData);
    }
  }, [initialData]);

  // Generate preview with variable substitution
  const generatePreview = () => {
    let preview = formData.bodyText;

    // Substitute variables with examples
    formData.variables.forEach((variable, index) => {
      const placeholder = `{{${index + 1}}}`;
      const example = variable.example || `[${variable.name}]`;
      preview = preview.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), example);
    });

    console.log('WhatsApp generatePreview called:', { bodyText: formData.bodyText, preview });
    return preview;
  };

  // Apply text formatting
  const applyFormatting = (format: string) => {
    const textarea = document.getElementById('bodyText') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = formData.bodyText.substring(start, end);

    let formattedText = '';
    switch (format) {
      case 'bold':
        formattedText = `*${selectedText}*`;
        break;
      case 'italic':
        formattedText = `_${selectedText}_`;
        break;
      case 'strikethrough':
        formattedText = `~${selectedText}~`;
        break;
      case 'code':
        formattedText = `\`\`\`${selectedText}\`\`\``;
        break;
      default:
        return;
    }

    const newText =
      formData.bodyText.substring(0, start) +
      formattedText +
      formData.bodyText.substring(end);

    setFormData(prev => ({ ...prev, bodyText: newText }));
  };

  // Insert variable at cursor position
  const insertVariable = (variableIndex: number) => {
    const textarea = document.getElementById('bodyText') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const placeholder = `{{${variableIndex + 1}}}`;

    const newText =
      formData.bodyText.substring(0, start) +
      placeholder +
      formData.bodyText.substring(start);

    setFormData(prev => ({ ...prev, bodyText: newText }));
  };

  // Add button
  const handleAddButton = () => {
    if (!newButton.text) {
      alert('Please enter button text');
      return;
    }

    if (formData.buttons.length >= 3) {
      alert('Maximum 3 buttons allowed');
      return;
    }

    setFormData(prev => ({
      ...prev,
      buttons: [...prev.buttons, newButton],
    }));

    setNewButton({ type: 'QUICK_REPLY', text: '' });
    setShowButtonForm(false);
  };

  // Add variable
  const handleAddVariable = () => {
    if (!newVariable.name || !newVariable.description) {
      alert('Please fill in variable name and description');
      return;
    }

    setFormData(prev => ({
      ...prev,
      variables: [...prev.variables, newVariable],
    }));

    setNewVariable({
      name: '',
      type: 'string',
      required: true,
      description: '',
      example: '',
    });
    setShowVariableForm(false);
  };

  // Character count
  const headerCharCount = formData.headerText?.length || 0;
  const bodyCharCount = formData.bodyText.length;
  const footerCharCount = formData.footerText?.length || 0;

  // Validation
  const isValid = () => {
    if (!formData.name || !formData.bodyText) return false;
    if (bodyCharCount > 1024) return false;
    if (headerCharCount > 60) return false;
    if (footerCharCount > 60) return false;
    return true;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      {/* LEFT PANEL - Editor */}
      <div className="space-y-6 overflow-y-auto pr-4" style={{ maxHeight: 'calc(100vh - 200px)' }}>
        {/* Basic Info */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Template Information</h3>

          <div>
            <label className="block text-sm font-medium mb-1">
              Template Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900"
              placeholder="e.g., payment_confirmation"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Use lowercase with underscores (a-z, 0-9, _)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900"
              rows={2}
              placeholder="Brief description of when this template is used"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as any }))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900"
              >
                <option value="AUTHENTICATION">Authentication</option>
                <option value="UTILITY">Utility</option>
                <option value="MARKETING">Marketing</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Language</label>
              <select
                value={formData.language}
                onChange={(e) => setFormData(prev => ({ ...prev, language: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900"
              >
                <option value="en">English</option>
                <option value="en_US">English (US)</option>
                <option value="en_GB">English (UK)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Header Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Header (Optional)</h3>

          <div>
            <label className="block text-sm font-medium mb-1">Header Type</label>
            <select
              value={formData.headerType}
              onChange={(e) => setFormData(prev => ({ ...prev, headerType: e.target.value as any }))}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900"
            >
              <option value="NONE">No Header</option>
              <option value="TEXT">Text</option>
              <option value="IMAGE">Image</option>
              <option value="VIDEO">Video</option>
              <option value="DOCUMENT">Document</option>
            </select>
          </div>

          {formData.headerType === 'TEXT' && (
            <div>
              <label className="block text-sm font-medium mb-1">Header Text</label>
              <input
                type="text"
                value={formData.headerText || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, headerText: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900"
                placeholder="Header text (max 60 characters)"
                maxLength={60}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {headerCharCount} / 60 characters
              </p>
            </div>
          )}

          {(formData.headerType === 'IMAGE' || formData.headerType === 'VIDEO' || formData.headerType === 'DOCUMENT') && (
            <div>
              <label className="block text-sm font-medium mb-1">Media URL</label>
              <input
                type="url"
                value={formData.headerMediaUrl || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, headerMediaUrl: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900"
                placeholder="https://example.com/media.jpg"
              />
            </div>
          )}
        </div>

        {/* Body Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              Message Body <span className="text-red-500">*</span>
            </h3>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => applyFormatting('bold')}
                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-sm font-bold"
                title="Bold"
              >
                B
              </button>
              <button
                type="button"
                onClick={() => applyFormatting('italic')}
                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-sm italic"
                title="Italic"
              >
                I
              </button>
              <button
                type="button"
                onClick={() => applyFormatting('strikethrough')}
                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-sm line-through"
                title="Strikethrough"
              >
                S
              </button>
              <button
                type="button"
                onClick={() => applyFormatting('code')}
                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-sm font-mono"
                title="Code"
              >
                {'</>'}
              </button>
            </div>
          </div>

          <textarea
            id="bodyText"
            value={formData.bodyText}
            onChange={(e) => setFormData(prev => ({ ...prev, bodyText: e.target.value }))}
            onClick={(e) => setCursorPosition((e.target as HTMLTextAreaElement).selectionStart)}
            onKeyUp={(e) => setCursorPosition((e.target as HTMLTextAreaElement).selectionStart)}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 font-mono text-sm"
            rows={8}
            placeholder="Your message here...&#10;&#10;Use *bold*, _italic_, ~strikethrough~, ```code```&#10;Use {{1}}, {{2}} for variables"
            required
          />
          <p className={cn(
            'text-xs',
            bodyCharCount > 1024 ? 'text-red-500' : 'text-muted-foreground'
          )}>
            {bodyCharCount} / 1024 characters
          </p>

          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <Info className="w-4 h-4 inline mr-1" />
              Use {`{{1}}`}, {`{{2}}`}, etc. for variables. Format: *bold*, _italic_, ~strikethrough~
            </p>
          </div>
        </div>

        {/* Footer Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Footer (Optional)</h3>

          <input
            type="text"
            value={formData.footerText || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, footerText: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900"
            placeholder="Footer text (max 60 characters)"
            maxLength={60}
          />
          <p className="text-xs text-muted-foreground">
            {footerCharCount} / 60 characters
          </p>
        </div>

        {/* Variables Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Variables</h3>
            <button
              type="button"
              onClick={() => setShowVariableForm(true)}
              className="flex items-center gap-2 px-3 py-1 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              <Plus className="w-4 h-4" />
              Add Variable
            </button>
          </div>

          {formData.variables.length > 0 && (
            <div className="space-y-2">
              {formData.variables.map((variable, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded">
                        {`{{${index + 1}}}`}
                      </code>
                      <span className="text-sm font-medium">{variable.name}</span>
                      {variable.example && (
                        <span className="text-xs text-muted-foreground">Example: {variable.example}</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{variable.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => insertVariable(index)}
                      className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800"
                    >
                      Insert
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        variables: prev.variables.filter((_, i) => i !== index),
                      }))}
                      className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {showVariableForm && (
            <div className="p-4 border border-slate-300 dark:border-slate-600 rounded-lg space-y-3">
              <h4 className="font-medium">New Variable</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Variable Name</label>
                  <input
                    type="text"
                    value={newVariable.name}
                    onChange={(e) => setNewVariable({ ...newVariable, name: e.target.value })}
                    className="w-full px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900"
                    placeholder="amount"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Type</label>
                  <select
                    value={newVariable.type}
                    onChange={(e) => setNewVariable({ ...newVariable, type: e.target.value as any })}
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
                  onChange={(e) => setNewVariable({ ...newVariable, description: e.target.value })}
                  className="w-full px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900"
                  placeholder="Transaction amount"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Example Value</label>
                <input
                  type="text"
                  value={newVariable.example || ''}
                  onChange={(e) => setNewVariable({ ...newVariable, example: e.target.value })}
                  className="w-full px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900"
                  placeholder="$50.00"
                />
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

        {/* Buttons Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Buttons (Optional)</h3>
            {formData.buttons.length < 3 && (
              <button
                type="button"
                onClick={() => setShowButtonForm(true)}
                className="flex items-center gap-2 px-3 py-1 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
              >
                <Plus className="w-4 h-4" />
                Add Button
              </button>
            )}
          </div>

          {formData.buttons.length > 0 && (
            <div className="space-y-2">
              {formData.buttons.map((button, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    {button.type === 'PHONE_NUMBER' && <Phone className="w-4 h-4" />}
                    {button.type === 'URL' && <Globe className="w-4 h-4" />}
                    {button.type === 'QUICK_REPLY' && <MessageSquare className="w-4 h-4" />}
                    <span className="text-sm font-medium">{button.text}</span>
                    {button.phoneNumber && (
                      <span className="text-xs text-muted-foreground">({button.phoneNumber})</span>
                    )}
                    {button.url && (
                      <span className="text-xs text-muted-foreground">({button.url})</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      buttons: prev.buttons.filter((_, i) => i !== index),
                    }))}
                    className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {showButtonForm && (
            <div className="p-4 border border-slate-300 dark:border-slate-600 rounded-lg space-y-3">
              <h4 className="font-medium">New Button</h4>
              <div>
                <label className="block text-xs font-medium mb-1">Button Type</label>
                <select
                  value={newButton.type}
                  onChange={(e) => setNewButton({ ...newButton, type: e.target.value as any })}
                  className="w-full px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900"
                >
                  <option value="QUICK_REPLY">Quick Reply</option>
                  <option value="PHONE_NUMBER">Call Phone Number</option>
                  <option value="URL">Visit Website</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Button Text</label>
                <input
                  type="text"
                  value={newButton.text}
                  onChange={(e) => setNewButton({ ...newButton, text: e.target.value })}
                  className="w-full px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900"
                  placeholder="Button label (max 20 chars)"
                  maxLength={20}
                />
              </div>
              {newButton.type === 'PHONE_NUMBER' && (
                <div>
                  <label className="block text-xs font-medium mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={newButton.phoneNumber || ''}
                    onChange={(e) => setNewButton({ ...newButton, phoneNumber: e.target.value })}
                    className="w-full px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900"
                    placeholder="+1234567890"
                  />
                </div>
              )}
              {newButton.type === 'URL' && (
                <div>
                  <label className="block text-xs font-medium mb-1">URL</label>
                  <input
                    type="url"
                    value={newButton.url || ''}
                    onChange={(e) => setNewButton({ ...newButton, url: e.target.value })}
                    className="w-full px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900"
                    placeholder="https://example.com"
                  />
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAddButton}
                  className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
                >
                  Add Button
                </button>
                <button
                  type="button"
                  onClick={() => setShowButtonForm(false)}
                  className="px-3 py-1 text-sm bg-slate-200 dark:bg-slate-700 rounded hover:bg-slate-300 dark:hover:bg-slate-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-700 sticky bottom-0 bg-white dark:bg-slate-800 pb-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => isValid() && onSave(formData)}
            disabled={!isValid()}
            className={cn(
              'px-4 py-2 rounded-lg',
              isValid()
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed'
            )}
          >
            {isEditing ? 'Update Template' : 'Create Template'}
          </button>
        </div>
      </div>

      {/* RIGHT PANEL - Live Preview */}
      <div className="bg-slate-100 dark:bg-slate-900 rounded-lg p-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
        <div className="flex items-center gap-2 mb-4">
          <Eye className="w-5 h-5" />
          <h3 className="text-lg font-semibold">Live Preview</h3>
        </div>

        {/* WhatsApp Message Mockup */}
        <div className="bg-[#E5DDD5] dark:bg-slate-800 rounded-lg p-4">
          <div className="bg-white dark:bg-slate-700 rounded-lg shadow-md max-w-sm p-3 space-y-2">
            {/* Header */}
            {formData.headerType === 'TEXT' && formData.headerText && (
              <div className="font-semibold text-lg">
                {formData.headerText}
              </div>
            )}
            {formData.headerType === 'IMAGE' && (
              <div className="bg-slate-200 dark:bg-slate-600 rounded h-40 flex items-center justify-center">
                <ImageIcon className="w-12 h-12 text-slate-400" />
                <span className="ml-2 text-sm text-slate-500">Image</span>
              </div>
            )}
            {formData.headerType === 'VIDEO' && (
              <div className="bg-slate-200 dark:bg-slate-600 rounded h-40 flex items-center justify-center">
                <Video className="w-12 h-12 text-slate-400" />
                <span className="ml-2 text-sm text-slate-500">Video</span>
              </div>
            )}
            {formData.headerType === 'DOCUMENT' && (
              <div className="bg-slate-200 dark:bg-slate-600 rounded p-3 flex items-center gap-2">
                <FileText className="w-8 h-8 text-slate-400" />
                <span className="text-sm text-slate-500">Document</span>
              </div>
            )}

            {/* Body */}
            <div className="text-sm whitespace-pre-wrap">
              {generatePreview() || <span className="text-slate-400 italic">Enter message body...</span>}
            </div>

            {/* Footer */}
            {formData.footerText && (
              <div className="text-xs text-slate-500 mt-2">
                {formData.footerText}
              </div>
            )}

            {/* Buttons */}
            {formData.buttons.length > 0 && (
              <div className="space-y-1 mt-3 pt-3 border-t border-slate-200 dark:border-slate-600">
                {formData.buttons.map((button, index) => (
                  <button
                    key={index}
                    className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-600 rounded text-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-500 flex items-center justify-center gap-2"
                  >
                    {button.type === 'PHONE_NUMBER' && <Phone className="w-4 h-4" />}
                    {button.type === 'URL' && <Globe className="w-4 h-4" />}
                    {button.text}
                  </button>
                ))}
              </div>
            )}

            {/* Timestamp */}
            <div className="text-xs text-slate-400 text-right">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>

        {/* Template Stats */}
        <div className="mt-4 p-4 bg-white dark:bg-slate-700 rounded-lg space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-600 dark:text-slate-400">Category:</span>
            <span className="font-medium">{formData.category}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600 dark:text-slate-400">Language:</span>
            <span className="font-medium">{formData.language}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600 dark:text-slate-400">Variables:</span>
            <span className="font-medium">{formData.variables.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600 dark:text-slate-400">Buttons:</span>
            <span className="font-medium">{formData.buttons.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600 dark:text-slate-400">Character Count:</span>
            <span className={cn(
              'font-medium',
              bodyCharCount > 1024 ? 'text-red-500' : ''
            )}>
              {bodyCharCount} / 1024
            </span>
          </div>
        </div>

        {/* Guidelines */}
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 text-sm">
          <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Submission Guidelines</h4>
          <ul className="space-y-1 text-blue-700 dark:text-blue-300 text-xs">
            <li>• Templates must be approved by WhatsApp before use</li>
            <li>• Approval typically takes 24-48 hours</li>
            <li>• Be specific and clear in your message</li>
            <li>• Avoid promotional language in UTILITY templates</li>
            <li>• Test with actual data before submission</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
