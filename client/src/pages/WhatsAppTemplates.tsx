import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { api } from '../lib/api';
import { toast } from 'sonner';
import { useSettings } from '../context/AppContext';

interface Template {
  id?: string;
  name: string;
  header?: string;
  body: string;
  footer?: string;
}

const WhatsAppTemplates: React.FC = () => {
  const navigate = useNavigate();
  const { isDark = false } = useOutletContext<{ isDark?: boolean }>() || {};
  const { whatsappEnabled } = useSettings();

  // Component state
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  useEffect(() => {
    if (!whatsappEnabled) {
      toast.error('WhatsApp integration is globally disabled.');
      navigate('/settings');
    }
  }, [whatsappEnabled, navigate]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<string>('checking...');
  const [sessionName, setSessionName] = useState<string>('sms-send-updates');

  // Form state
  const [isNew, setIsNew] = useState(false);
  const [editForm, setEditForm] = useState<Template>({
    name: '',
    header: '',
    body: '',
    footer: ''
  });

  // Sample values for variable preview
  const [sampleValues, setSampleValues] = useState<Record<string, string>>({
    customer: 'John Doe',
    Adress: 'Flat 402, Skyline Towers, Mumbai',
    phase: 'Copper Piping',
    technician: 'Ramesh Kumar',
    outstanding: '4500'
  });

  // Fetch templates and WhatsApp status
  const fetchData = async () => {
    setLoading(true);
    try {
      // Get templates
      const templatesData = await api.get('/whatsapp/templates');
      setTemplates(templatesData || []);
      
      // Auto-select first template if available
      if (templatesData && templatesData.length > 0) {
        setSelectedTemplate(templatesData[0]);
        setEditForm(templatesData[0]);
        setIsNew(false);
      } else {
        setIsNew(true);
        setEditForm({ name: '', header: '', body: '', footer: '' });
      }

      // Get WhatsApp status
      const statusData = await api.get('/whatsapp/status');
      setSessionStatus(statusData.connected ? 'CONNECTED' : 'DISCONNECTED');

      // Get dynamic session name from settings
      const settingsData = await api.get('/settings');
      if (settingsData.whatsapp_session_name) {
        setSessionName(settingsData.whatsapp_session_name);
      } else {
        setSessionName('sms-send-updates');
      }
    } catch (err: any) {
      console.error('Error fetching data:', err);
      toast.error('Failed to load WhatsApp data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter templates
  const filteredTemplates = templates.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.body.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Extract variables (e.g. {{customer}}) from template
  const extractVariables = (template: Template) => {
    const combinedText = `${template.header || ''} ${template.body} ${template.footer || ''}`;
    const regex = /\{\{([^}]+)\}\}/g;
    const vars: string[] = [];
    let match;
    while ((match = regex.exec(combinedText)) !== null) {
      if (!vars.includes(match[1])) {
        vars.push(match[1]);
      }
    }
    return vars;
  };

  const currentVariables = selectedTemplate ? extractVariables(selectedTemplate) : extractVariables(editForm);

  // Select a template
  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setEditForm(template);
    setIsNew(false);
  };

  // Click "+ New Template"
  const handleNewTemplateClick = () => {
    setSelectedTemplate(null);
    setIsNew(true);
    setEditForm({
      name: '',
      header: 'Hello {{customer}},',
      body: 'Your installation for {{Adress}} has been updated.\n\n✅ Phase Completed: {{phase}}\n👤 Technician: {{technician}}\n\nThis phase has been completed successfully.',
      footer: 'Thank you for choosing Satguru Engineers. 🙏'
    });
  };

  // Form fields change
  const handleFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  // Sample values change
  const handleSampleValueChange = (varName: string, value: string) => {
    setSampleValues(prev => ({ ...prev, [varName]: value }));
  };

  // Save template
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.name.trim()) {
      toast.error('Template name is required');
      return;
    }
    if (!editForm.body.trim()) {
      toast.error('Template body is required');
      return;
    }

    setSaving(true);
    try {
      if (isNew) {
        await api.post('/whatsapp/templates', editForm);
        toast.success(`Template "${editForm.name}" created successfully`);
      } else {
        await api.put(`/whatsapp/templates/${selectedTemplate?.id || editForm.name}`, {
          header: editForm.header,
          body: editForm.body,
          footer: editForm.footer
        });
        toast.success(`Template "${editForm.name}" updated successfully`);
      }
      
      // Re-fetch all templates
      const templatesData = await api.get('/whatsapp/templates');
      setTemplates(templatesData || []);
      
      // Find and select the saved template
      const saved = templatesData?.find((t: Template) => t.name === editForm.name);
      if (saved) {
        setSelectedTemplate(saved);
        setEditForm(saved);
        setIsNew(false);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  // Delete template
  const handleDelete = async () => {
    if (!selectedTemplate) return;
    if (!window.confirm(`Are you sure you want to delete the template "${selectedTemplate.name}"?`)) return;

    try {
      await api.delete(`/whatsapp/templates/${selectedTemplate.id || selectedTemplate.name}`);
      toast.success(`Template "${selectedTemplate.name}" deleted successfully`);
      
      const updated = templates.filter(t => t.name !== selectedTemplate.name);
      setTemplates(updated);
      
      if (updated.length > 0) {
        handleSelectTemplate(updated[0]);
      } else {
        handleNewTemplateClick();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete template');
    }
  };

  // Copy template text to clipboard
  const handleCopy = () => {
    const formatted = `*Header:* ${editForm.header || ''}\n*Body:* ${editForm.body}\n*Footer:* ${editForm.footer || ''}`;
    navigator.clipboard.writeText(formatted);
    toast.success('Template code copied to clipboard');
  };

  // Render template preview with sample values
  const renderPreview = (text: string = '') => {
    let rendered = text;
    Object.entries(sampleValues).forEach(([key, val]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      rendered = rendered.replace(regex, val || `{{${key}}}`);
    });
    return rendered;
  };

  // Variable color mapper
  const getVarBadgeColor = (varName: string, index: number) => {
    const colors = [
      'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      'bg-amber-500/10 text-amber-500 border-amber-500/20',
      'bg-rose-500/10 text-rose-500 border-rose-500/20',
      'bg-blue-500/10 text-blue-500 border-blue-500/20',
      'bg-purple-500/10 text-purple-500 border-purple-500/20'
    ];
    return colors[index % colors.length];
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-slate-50 text-slate-800'} p-4 md:p-6`}>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)} 
            className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all cursor-pointer ${
              isDark ? 'border-zinc-800 bg-zinc-900 hover:bg-zinc-850' : 'border-slate-200 bg-white hover:bg-slate-100'
            }`}
          >
            <i className="fa-solid fa-arrow-left text-sm"></i>
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Templates</h1>
            <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
              Create reusable message templates for each WhatsApp session
            </p>
          </div>
        </div>

        {/* Session status badge */}
        <div className={`self-start md:self-center px-4 py-2 rounded-full border flex items-center gap-2 text-xs font-bold ${
          sessionStatus === 'CONNECTED' 
            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
            : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
        }`}>
          <span className={`w-2 h-2 rounded-full ${sessionStatus === 'CONNECTED' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
          Active Session: <span className="underline">{sessionName}</span>
        </div>
      </div>

      {/* Main 3-panel container */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        
        {/* PANEL 1: Saved Templates List */}
        <div className={`w-full md:w-64 shrink-0 p-4 rounded-3xl border shadow-sm ${
          isDark ? 'bg-zinc-900/60 border-zinc-850' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Saved Templates ({filteredTemplates.length})
            </h3>
            <button 
              onClick={handleNewTemplateClick}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
            >
              + New
            </button>
          </div>

          {/* Search Input */}
          <div className="relative mb-4">
            <i className={`fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-xs ${
              isDark ? 'text-zinc-500' : 'text-slate-400'
            }`}></i>
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-9 pr-4 py-2 rounded-xl text-xs border outline-none transition-all ${
                isDark 
                  ? 'bg-zinc-950 border-zinc-800 text-zinc-200 focus:border-zinc-700' 
                  : 'bg-slate-50 border-slate-200 text-slate-700 focus:border-slate-300'
              }`}
            />
          </div>

          {/* Templates list */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {loading ? (
              <div className="text-center py-8 text-xs text-slate-400">
                <i className="fa-solid fa-spinner fa-spin mr-2"></i> Loading templates...
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                No templates found
              </div>
            ) : (
              filteredTemplates.map(t => {
                const isSelected = selectedTemplate?.name === t.name;
                return (
                  <div
                    key={t.name}
                    onClick={() => handleSelectTemplate(t)}
                    className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                      isSelected 
                        ? 'border-blue-500 bg-blue-500/5' 
                        : isDark 
                          ? 'border-zinc-800/80 bg-zinc-900/30 hover:bg-zinc-800/40' 
                          : 'border-slate-100 bg-slate-50/50 hover:bg-slate-100/50'
                    }`}
                  >
                    <h4 className={`text-xs font-bold truncate ${isDark ? 'text-zinc-200' : 'text-slate-700'}`}>
                      {t.name}
                    </h4>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* PANEL 2: Editor */}
        <div className={`flex-1 p-6 rounded-3xl border shadow-sm ${
          isDark ? 'bg-zinc-900/60 border-zinc-850' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-dashed border-slate-200 dark:border-zinc-800">
            <div>
              <h2 className={`font-bold text-sm uppercase tracking-wider ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>
                {isNew ? 'Create New Template' : 'Edit Template'}
              </h2>
              <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                Saved under <span className="underline font-semibold">{sessionName}</span>
              </p>
            </div>
            
            {/* Header controls: Guide, Copy, Delete */}
            <div className="flex items-center gap-2">
              {/* Variable Guide Tooltip Button */}
              <div className="group relative inline-block">
                <button
                  type="button"
                  title="Variable Guide"
                  className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all cursor-help ${
                    isDark ? 'border-zinc-800 bg-zinc-900 text-blue-400 hover:bg-zinc-850' : 'border-slate-200 bg-white text-blue-500 hover:bg-slate-50'
                  }`}
                >
                  <i className="fa-solid fa-circle-info text-sm"></i>
                </button>
                
                {/* Tooltip Card (Positioned top-full, right-0 to expand leftwards & downwards) */}
                <span className="absolute right-0 top-full mt-2 w-72 p-4 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none block">
                  <span className="flex flex-col gap-3 text-[11px] leading-relaxed font-sans normal-case tracking-normal text-left">
                    <span className="border-b border-slate-100 dark:border-zinc-900 pb-1.5 block">
                      <span className="font-extrabold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5 text-xs">
                        <i className="fa-brands fa-whatsapp text-emerald-500 text-sm"></i> Template Variables Guide
                      </span>
                    </span>
                    
                    {/* System variables */}
                    <span className="flex flex-col gap-1">
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400 uppercase text-[9px] tracking-wider">System-Supplied (Auto)</span>
                      <span className="grid grid-cols-2 gap-x-2 text-[10px] text-slate-500 dark:text-zinc-400 font-mono">
                        <span className="font-bold">{"{{customer}}"}</span>
                        <span className="text-right font-sans">Customer Name</span>
                        <span className="font-bold">{"{{address}}"}</span>
                        <span className="text-right font-sans">Address</span>
                        <span className="font-bold">{"{{phase}}"}</span>
                        <span className="text-right font-sans">Phase Name</span>
                        <span className="font-bold">{"{{technician}}"}</span>
                        <span className="text-right font-sans">Technician</span>
                      </span>
                    </span>

                    {/* Interactive variables */}
                    <span className="flex flex-col gap-1">
                      <span className="font-extrabold text-blue-600 dark:text-blue-400 uppercase text-[9px] tracking-wider">Interactive (Takes Input)</span>
                      <span className="grid grid-cols-2 gap-x-2 text-[10px] text-slate-500 dark:text-zinc-400 font-mono">
                        <span className="font-bold">{"{{outstanding}}"}</span>
                        <span className="text-right font-sans">Payment Field</span>
                        <span className="font-bold">{"{{date}}"}</span>
                        <span className="text-right font-sans">Date Field</span>
                        <span className="font-bold">{"{{txt}}"}</span>
                        <span className="text-right font-sans">Custom Text Field</span>
                      </span>
                    </span>
                  </span>
                  
                  {/* Arrow tail pointing up to the info button */}
                  <span className="absolute bottom-full right-4 border-8 border-transparent border-b-white dark:border-b-zinc-950 block"></span>
                </span>
              </div>

              {!isNew && (
                <>
                  <button
                    type="button"
                    onClick={handleCopy}
                    title="Copy template code"
                    className={`w-9 h-9 rounded-xl border flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer ${
                      isDark ? 'border-zinc-800 bg-zinc-900 hover:bg-zinc-850 text-zinc-300' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <i className="fa-solid fa-copy text-xs"></i>
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    title="Delete template"
                    className={`w-9 h-9 rounded-xl border flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer ${
                      isDark ? 'border-rose-950 bg-rose-950/20 text-rose-400 hover:bg-rose-950/40' : 'border-rose-100 bg-rose-50 text-rose-600 hover:bg-rose-100'
                    }`}
                  >
                    <i className="fa-solid fa-trash-can text-xs"></i>
                  </button>
                </>
              )}
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-3">
            {/* Template Name */}
            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${
                isDark ? 'text-zinc-400' : 'text-slate-500'
              }`}>
                Template Name
              </label>
              <input
                type="text"
                name="name"
                value={editForm.name}
                onChange={handleFieldChange}
                disabled={!isNew}
                placeholder="e.g. Phases-Complete"
                className={`w-full px-4 py-2.5 rounded-xl text-sm border outline-none transition-all ${
                  !isNew
                    ? isDark 
                      ? 'bg-zinc-950 border-zinc-850 text-zinc-500 cursor-not-allowed' 
                      : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                    : isDark 
                      ? 'bg-zinc-950 border-zinc-800 text-zinc-200 focus:border-zinc-700' 
                      : 'bg-white border-slate-200 text-slate-700 focus:border-slate-300'
                }`}
              />
              {isNew && (
                <p className={`text-[10px] mt-1 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                  Required. Enter a unique, URL-friendly name.
                </p>
              )}
            </div>

            {/* Header */}
            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${
                isDark ? 'text-zinc-400' : 'text-slate-500'
              }`}>
                Header text (Optional)
              </label>
              <input
                type="text"
                name="header"
                value={editForm.header || ''}
                onChange={handleFieldChange}
                placeholder="e.g. Hello {{customer}},"
                className={`w-full px-4 py-2.5 rounded-xl text-sm border outline-none transition-all ${
                  isDark 
                    ? 'bg-zinc-950 border-zinc-800 text-zinc-200 focus:border-zinc-700' 
                    : 'bg-white border-slate-200 text-slate-700 focus:border-slate-300'
                }`}
              />
            </div>

            {/* Body */}
            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${
                isDark ? 'text-zinc-400' : 'text-slate-500'
              }`}>
                Message Body
              </label>
              <textarea
                name="body"
                rows={8}
                value={editForm.body}
                onChange={handleFieldChange}
                placeholder="Type your message body. Use {{variable}} for custom values."
                className={`w-full px-4 py-2.5 rounded-xl text-sm border outline-none transition-all resize-none ${
                  isDark 
                    ? 'bg-zinc-950 border-zinc-800 text-zinc-200 focus:border-zinc-700' 
                    : 'bg-white border-slate-200 text-slate-700 focus:border-slate-300'
                }`}
              />
            </div>

            {/* Footer */}
            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${
                isDark ? 'text-zinc-400' : 'text-slate-500'
              }`}>
                Footer text (Optional)
              </label>
              <input
                type="text"
                name="footer"
                value={editForm.footer || ''}
                onChange={handleFieldChange}
                placeholder="e.g. Thank you for choosing Satguru Engineers."
                className={`w-full px-4 py-2.5 rounded-xl text-sm border outline-none transition-all ${
                  isDark 
                    ? 'bg-zinc-950 border-zinc-800 text-zinc-200 focus:border-zinc-700' 
                    : 'bg-white border-slate-200 text-slate-700 focus:border-slate-300'
                }`}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-zinc-800">
              {!isNew && (
                <button
                  type="button"
                  onClick={handleNewTemplateClick}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                    isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-750'
                  }`}
                >
                  Create New Template
                </button>
              )}
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-lg shadow-blue-500/20 flex items-center gap-2"
              >
                {saving && <i className="fa-solid fa-spinner fa-spin text-xs"></i>}
                {isNew ? 'Create Template' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>

        {/* PANEL 3: Preview */}
        <div className={`w-full md:w-72 shrink-0 p-5 rounded-3xl border shadow-sm ${
          isDark ? 'bg-zinc-900/60 border-zinc-850' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Live Preview
            </h3>
          </div>

          {/* Chat Mockup */}
          <div className={`p-4 rounded-2xl mb-6 relative overflow-hidden flex flex-col justify-end min-h-[220px] ${
            isDark ? 'bg-zinc-950 border border-zinc-850' : 'bg-slate-100 border border-slate-200'
          }`}
          style={{
            backgroundImage: `radial-gradient(${isDark ? '#27272a' : '#cbd5e1'} 1px, transparent 0)`,
            backgroundSize: '16px 16px'
          }}>
            {/* WhatsApp Bubble */}
            <div className={`max-w-[90%] rounded-2xl px-3.5 py-2 text-xs shadow-sm self-start leading-relaxed whitespace-pre-wrap ${
              isDark ? 'bg-emerald-950 text-zinc-100 border border-emerald-900' : 'bg-emerald-100 text-slate-800'
            }`}>
              {/* Header */}
              {editForm.header && (
                <div className="font-semibold text-emerald-500 mb-1">
                  {renderPreview(editForm.header)}
                </div>
              )}
              {/* Body */}
              <div className="text-xs">
                {renderPreview(editForm.body) || 'Type template body...'}
              </div>
              {/* Footer */}
              {editForm.footer && (
                <div className={`mt-1.5 pt-1 border-t text-[10px] text-right italic ${
                  isDark ? 'text-zinc-500 border-emerald-900' : 'text-slate-500 border-emerald-200/50'
                }`}>
                  {renderPreview(editForm.footer)}
                </div>
              )}
            </div>
          </div>

          {/* Variables Inputs Section */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Variables ({currentVariables.length})
            </h4>

            {currentVariables.length === 0 ? (
              <p className={`text-xs ${isDark ? 'text-zinc-600' : 'text-slate-400'}`}>
                No variables detected. Add them using {"{{variable_name}}"} format.
              </p>
            ) : (
              <div className="space-y-3">
                {currentVariables.map((v, i) => (
                  <div key={v} className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${getVarBadgeColor(v, i)}`}>
                        {v}
                      </span>
                    </div>
                    <input
                      type="text"
                      placeholder={`Sample ${v}`}
                      value={sampleValues[v] || ''}
                      onChange={(e) => handleSampleValueChange(v, e.target.value)}
                      className={`w-full px-3 py-1.5 rounded-lg text-xs border outline-none transition-all ${
                        isDark 
                          ? 'bg-zinc-950 border-zinc-800 text-zinc-300 focus:border-zinc-700' 
                          : 'bg-slate-50 border-slate-200 text-slate-600 focus:border-slate-300'
                      }`}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default WhatsAppTemplates;
