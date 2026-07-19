import React, { useState, useEffect } from 'react';
import { Sparkles, Save, Key, Eye, EyeOff, Shield, Settings, Info, CheckCircle, Calendar, Trash2, ExternalLink, Clock, AlertCircle, Upload, X, FileText, Check } from 'lucide-react';
import { getPreferences, savePreferences } from '../services/storage';
import { MessageTone, MessageLength, MessagePurpose, UserPreferences, ScheduledMessage } from '../types';

const TONES: MessageTone[] = ['Professional', 'Friendly', 'Formal', 'Confident', 'Warm', 'Direct', 'Humble'];
const LENGTHS: MessageLength[] = ['Short', 'Medium', 'Long'];
const PURPOSES: MessagePurpose[] = ['Networking', 'Business', 'Internship', 'Mentorship', 'Recruitment', 'Sales', 'General'];

const parseCSV = (text: string): string[][] => {
  const result: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        field += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(field.trim());
      field = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      row.push(field.trim());
      result.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field || row.length > 0) {
    row.push(field.trim());
    result.push(row);
  }
  return result;
};

export const Popup: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [tone, setTone] = useState<MessageTone>('Professional');
  const [length, setLength] = useState<MessageLength>('Medium');
  const [purpose, setPurpose] = useState<MessagePurpose>('Networking');
  const [isPremium, setIsPremium] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // Resume Upload states
  const [senderProfile, setSenderProfile] = useState('');
  const [senderProfileName, setSenderProfileName] = useState('');
  const [resumeUploadError, setResumeUploadError] = useState('');

  // CSV bulk scheduling states
  const [csvUploadSuccess, setCsvUploadSuccess] = useState('');
  const [csvUploadError, setCsvUploadError] = useState('');

  // Scheduling dashboard states
  const [activeTab, setActiveTab] = useState<'settings' | 'scheduler'>('settings');
  const [allSchedules, setAllSchedules] = useState<ScheduledMessage[]>([]);

  const loadSchedules = () => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['scheduled_messages'], (result) => {
        setAllSchedules(result.scheduled_messages || []);
      });
    } else {
      const cached = localStorage.getItem('scheduled_messages');
      setAllSchedules(cached ? JSON.parse(cached) : []);
    }
  };

  // Load preferences and schedules on mount
  useEffect(() => {
    getPreferences().then((prefs) => {
      setApiKey(prefs.openAiKey);
      setTone(prefs.defaultTone);
      setLength(prefs.defaultLength);
      setPurpose(prefs.defaultPurpose);
      setIsPremium(prefs.isPremium);
      setSenderProfile(prefs.senderProfile || '');
      setSenderProfileName(prefs.senderProfileName || '');
      setLoading(false);
    });
    loadSchedules();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(false);

    const updatedPrefs: UserPreferences = {
      openAiKey: apiKey.trim(),
      defaultTone: tone,
      defaultLength: length,
      defaultPurpose: purpose,
      isPremium,
      senderProfile,
      senderProfileName
    };

    await savePreferences(updatedPrefs);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleCancelSchedule = (id: string) => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['scheduled_messages'], (result) => {
        const all = result.scheduled_messages || [];
        const updated = all.filter((m: ScheduledMessage) => m.id !== id);
        chrome.storage.local.set({ scheduled_messages: updated }, () => {
          loadSchedules();
        });
      });
    } else {
      const cached = localStorage.getItem('scheduled_messages');
      const all: ScheduledMessage[] = cached ? JSON.parse(cached) : [];
      const updated = all.filter((m) => m.id !== id);
      localStorage.setItem('scheduled_messages', JSON.stringify(updated));
      loadSchedules();
    }
  };

  const handleResumeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setResumeUploadError('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setResumeUploadError('File is too large. 5MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') {
        setSenderProfile(text);
        setSenderProfileName(file.name);
      } else {
        setResumeUploadError('Could not parse text from file.');
      }
    };
    reader.onerror = () => {
      setResumeUploadError('Error reading file.');
    };
    reader.readAsText(file);
  };

  const handleClearResume = () => {
    setSenderProfile('');
    setSenderProfileName('');
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCsvUploadError('');
    setCsvUploadSuccess('');
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content !== 'string') {
        setCsvUploadError('Could not read CSV file.');
        return;
      }

      try {
        const rows = parseCSV(content);
        if (rows.length <= 1) {
          setCsvUploadError('No valid rows found in CSV. Expected headers: Name, URL, Message, Time.');
          return;
        }

        const newSchedules: ScheduledMessage[] = [];
        let skippedRowsCount = 0;

        for (let i = 1; i < rows.length; i++) {
          const cleanCols = rows[i];
          if (cleanCols.length < 3) {
            if (cleanCols.length > 0 && cleanCols.some(col => col)) {
              skippedRowsCount++;
            }
            continue;
          }

          const [recipientName, conversationUrl, messageText, timeStr] = cleanCols;

          if (!recipientName || !conversationUrl || !messageText) {
            skippedRowsCount++;
            continue;
          }

          let scheduledTime = 0;
          if (timeStr) {
            scheduledTime = new Date(timeStr).getTime();
          }

          if (isNaN(scheduledTime) || scheduledTime <= Date.now()) {
            scheduledTime = Date.now() + 10 * 60 * 1000; // default 10 minutes from now
          }

          newSchedules.push({
            id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
            recipientName,
            conversationUrl,
            messageText,
            scheduledTime,
            status: 'pending'
          });
        }

        if (newSchedules.length === 0) {
          setCsvUploadError('No valid rows found in CSV. Expected headers: Name, URL, Message, Time.');
          return;
        }

        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.get(['scheduled_messages'], (result) => {
            const all = result.scheduled_messages || [];
            const updated = [...all, ...newSchedules];
            chrome.storage.local.set({ scheduled_messages: updated }, () => {
              loadSchedules();
              setCsvUploadSuccess(`Imported ${newSchedules.length} message(s) successfully!${skippedRowsCount > 0 ? ` Skipped ${skippedRowsCount} rows.` : ''}`);
            });
          });
        } else {
          const cached = localStorage.getItem('scheduled_messages');
          const all = cached ? JSON.parse(cached) : [];
          const updated = [...all, ...newSchedules];
          localStorage.setItem('scheduled_messages', JSON.stringify(updated));
          loadSchedules();
          setCsvUploadSuccess(`Imported ${newSchedules.length} message(s) successfully!${skippedRowsCount > 0 ? ` Skipped ${skippedRowsCount} rows.` : ''}`);
        }

      } catch (err: unknown) {
        setCsvUploadError(err instanceof Error ? err.message : 'Error parsing CSV file.');
      }
    };
    reader.readAsText(file);
  };

  if (loading) {
    return (
      <div className="w-[360px] h-[400px] flex items-center justify-center bg-gray-50 dark:bg-[#1d2226]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-linkedin-blue"></div>
      </div>
    );
  }

  return (
    <div className="w-[360px] bg-gray-50 dark:bg-[#121619] font-sans text-gray-800 dark:text-gray-200">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-linkedin-blue to-blue-700 text-white p-4 flex items-center gap-2.5 shadow-md">
        <div className="bg-white/20 p-1.5 rounded-lg">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-sm leading-tight">LinkedIn AI Smart Writer</h1>
          <p className="text-[10px] text-blue-100">AI-Powered Networking Assistant</p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1d2226] text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`flex-1 py-2.5 text-center transition-all flex items-center justify-center gap-1.5 border-b-2 ${
            activeTab === 'settings'
              ? 'border-linkedin-blue text-linkedin-blue'
              : 'border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Preferences</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('scheduler')}
          className={`flex-1 py-2.5 text-center transition-all flex items-center justify-center gap-1.5 border-b-2 relative ${
            activeTab === 'scheduler'
              ? 'border-linkedin-blue text-linkedin-blue'
              : 'border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Schedules</span>
          {allSchedules.filter(m => m.status === 'pending').length > 0 && (
            <span className="absolute right-3 bg-linkedin-blue text-white rounded-full text-[9px] px-1.5 py-0.2 font-bold leading-none">
              {allSchedules.filter(m => m.status === 'pending').length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'settings' ? (
        <form onSubmit={handleSave} className="p-4 space-y-4">
          {/* API Key Panel */}
          <div className="bg-white dark:bg-[#1d2226] p-3 rounded-xl border border-gray-200/80 dark:border-gray-700/80 shadow-sm space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Key className="w-4 h-4 text-linkedin-blue" />
                <span className="font-semibold text-xs text-gray-900 dark:text-white">API Configuration</span>
              </div>
              <span className="text-[9px] bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded font-medium">
                Secure
              </span>
            </div>

            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-or-your-openai-api-key"
                className="w-full text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-[#293138] pl-2.5 pr-8 py-2 focus:outline-none focus:ring-1 focus:ring-linkedin-blue focus:bg-white dark:focus:bg-[#1d2226]"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[9px] text-gray-400 leading-normal flex items-start gap-1">
              <Shield className="w-3.5 h-3.5 shrink-0 text-gray-500 mt-0.5" />
              <span>Saved locally. Key is encrypted and never sent to external servers other than OpenAI.</span>
            </p>
          </div>

          {/* Writer Preferences */}
          <div className="bg-white dark:bg-[#1d2226] p-3 rounded-xl border border-gray-200/80 dark:border-gray-700/80 shadow-sm space-y-3">
            <div className="flex items-center gap-1.5">
              <Settings className="w-4 h-4 text-linkedin-blue" />
              <span className="font-semibold text-xs text-gray-900 dark:text-white">Writing Preferences</span>
            </div>

            {/* Tone Setting */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400 font-medium">Default Tone</span>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value as MessageTone)}
                className="bg-gray-50 dark:bg-[#293138] border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-linkedin-blue font-medium"
              >
                {TONES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Length Setting */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400 font-medium">Default Length</span>
              <select
                value={length}
                onChange={(e) => setLength(e.target.value as MessageLength)}
                className="bg-gray-50 dark:bg-[#293138] border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-linkedin-blue font-medium"
              >
                {LENGTHS.map((len) => (
                  <option key={len} value={len}>{len}</option>
                ))}
              </select>
            </div>

            {/* Purpose Setting */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400 font-medium">Default Goal</span>
              <select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value as MessagePurpose)}
                className="bg-gray-50 dark:bg-[#293138] border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-linkedin-blue font-medium"
              >
                {PURPOSES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Account Limit Type */}
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1">
                LinkedIn Premium
                <span className="relative group cursor-help">
                  <Info className="w-3.5 h-3.5 text-gray-400" />
                  <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-40 bg-black text-white text-[9px] rounded p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    Premium users have a 300 character note limit instead of 200.
                  </span>
                </span>
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPremium}
                  onChange={(e) => setIsPremium(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-8 h-4 bg-gray-200 dark:bg-[#293138] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3.5 after:transition-all peer-checked:bg-linkedin-blue"></div>
              </label>
            </div>
          </div>

          {/* Resume Upload Panel */}
          <div className="bg-white dark:bg-[#1d2226] p-3 rounded-xl border border-gray-200/80 dark:border-gray-700/80 shadow-sm space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-linkedin-blue" />
                <span className="font-semibold text-xs text-gray-900 dark:text-white">Your Resume / Background</span>
              </div>
              {senderProfile ? (
                <span className="text-[9px] bg-blue-100 dark:bg-blue-950 text-linkedin-blue dark:text-blue-300 px-1.5 py-0.5 rounded font-medium">
                  Active
                </span>
              ) : (
                <span className="text-[9px] bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 px-1.5 py-0.5 rounded font-medium">
                  Empty
                </span>
              )}
            </div>

            {senderProfile ? (
              <div className="border border-blue-100 dark:border-blue-900/50 bg-blue-50/20 dark:bg-blue-950/10 rounded-lg p-2 bg-gray-50/10 dark:bg-[#293138]/20 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-800 dark:text-gray-200">
                    <FileText className="w-3.5 h-3.5 text-linkedin-blue" />
                    <span className="truncate max-w-[180px] text-[11px]">{senderProfileName || 'resume.txt'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearResume}
                    className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-red-500 rounded transition-all"
                    title="Remove Resume"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed bg-white dark:bg-[#1d2226] border border-gray-100 dark:border-gray-800 p-1.5 rounded pr-2 font-mono">
                  {senderProfile}
                </p>
              </div>
            ) : (
              <div className="relative border border-dashed border-gray-300 dark:border-gray-700 hover:border-linkedin-blue/60 rounded-lg p-4 text-center cursor-pointer transition-all bg-gray-50/50 dark:bg-[#293138]/20 group">
                <input
                  type="file"
                  accept=".txt,.md,.json"
                  onChange={handleResumeUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Upload className="w-6 h-6 mx-auto text-gray-400 group-hover:text-linkedin-blue transition-all mb-1" />
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Upload Resume File</p>
                <p className="text-[9px] text-gray-400 mt-0.5">Supports .txt, .md, .json text formats</p>
              </div>
            )}

            {resumeUploadError && (
              <div className="text-[10px] text-red-500 flex items-center gap-1 font-medium bg-red-50/50 dark:bg-red-950/20 p-1.5 rounded">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{resumeUploadError}</span>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between gap-3 pt-1">
            {saved ? (
              <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 text-xs font-semibold animate-pulse">
                <CheckCircle className="w-4 h-4" />
                <span>Preferences saved!</span>
              </div>
            ) : (
              <div className="text-[10px] text-gray-400">Restart LinkedIn to apply changes.</div>
            )}

            <button
              type="submit"
              className="px-4 py-2 bg-linkedin-blue hover:bg-linkedin-blue-hover text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Settings</span>
            </button>
          </div>
        </form>
      ) : (
        <div className="p-4 space-y-3.5 max-h-[450px] overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between pb-0.5">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-linkedin-blue" />
              <span className="font-semibold text-xs text-gray-900 dark:text-white">Scheduled Messages</span>
            </div>
            <span className="text-[9px] bg-blue-100 dark:bg-blue-950 text-linkedin-blue dark:text-blue-300 px-2 py-0.5 rounded-full font-medium">
              {allSchedules.length} Total
            </span>
          </div>

          {/* CSV Bulk Scheduler Panel */}
          <div className="bg-white dark:bg-[#1d2226] p-3 rounded-xl border border-gray-200/80 dark:border-gray-700/80 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-gray-900 dark:text-white flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-linkedin-blue" />
                <span>Bulk Import Schedules</span>
              </span>
              <span className="text-[8px] bg-gray-100 dark:bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded uppercase font-semibold">CSV</span>
            </div>

            <div className="relative border border-dashed border-gray-300 dark:border-gray-700 hover:border-linkedin-blue/60 rounded-lg p-2.5 text-center cursor-pointer transition-all bg-gray-50/50 dark:bg-[#293138]/20 group">
              <input
                type="file"
                accept=".csv"
                onChange={handleCsvUpload}
                value=""
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Upload className="w-4.5 h-4.5 mx-auto text-gray-400 group-hover:text-linkedin-blue transition-all mb-1" />
              <p className="text-[10px] font-semibold text-gray-700 dark:text-gray-300">Upload CSV File</p>
              <p className="text-[8px] text-gray-400 mt-0.5">Format: Name, Chat URL, Message, Date Time</p>
            </div>

            {csvUploadSuccess && (
              <div className="text-[9px] text-green-600 dark:text-green-400 bg-green-50/50 dark:bg-green-950/20 p-1.5 rounded flex items-start gap-1 font-semibold">
                <Check className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{csvUploadSuccess}</span>
              </div>
            )}

            {csvUploadError && (
              <div className="text-[9px] text-red-500 bg-red-50/50 dark:bg-red-950/20 p-1.5 rounded flex items-start gap-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{csvUploadError}</span>
              </div>
            )}
          </div>

          {allSchedules.length === 0 ? (
            <div className="bg-white dark:bg-[#1d2226] border border-gray-200 dark:border-gray-700 rounded-xl p-8 text-center text-xs space-y-2 shadow-sm">
              <Clock className="w-8 h-8 mx-auto text-gray-300 dark:text-gray-600" />
              <p className="font-semibold text-gray-600 dark:text-gray-400">No scheduled messages</p>
              <p className="text-[10px] text-gray-400 leading-normal">
                Schedule replies inside LinkedIn chats. The extension will automatically open a hidden tab, send the message, and close the tab when due.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {allSchedules.map((msg) => {
                const isPending = msg.status === 'pending';
                const isFailed = msg.status === 'failed';
                const isSent = msg.status === 'sent';

                const formattedTime = new Date(msg.scheduledTime).toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });

                return (
                  <div key={msg.id} className="bg-white dark:bg-[#1d2226] border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-sm space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-xs text-gray-900 dark:text-white leading-tight">{msg.recipientName}</h4>
                        <span className="text-[9px] text-gray-400 font-medium">Scheduled: {formattedTime}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                          isPending ? 'bg-blue-50 dark:bg-blue-950 text-linkedin-blue dark:text-blue-300' :
                          isSent ? 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300' :
                          'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300'
                        }`}>
                          {msg.status}
                        </span>

                        {isPending && (
                          <button
                            onClick={() => handleCancelSchedule(msg.id)}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-red-500 rounded transition-all"
                            title="Cancel schedule"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-gray-700 dark:text-gray-300 leading-normal line-clamp-2 bg-gray-50/50 dark:bg-[#293138]/40 rounded p-1.5 pr-2 font-mono text-[10px]">
                      {msg.messageText}
                    </p>

                    {isFailed && msg.error && (
                      <div className="text-[9px] text-red-500 bg-red-50/50 dark:bg-red-950/20 border border-red-100 dark:border-red-950/40 p-1.5 rounded flex items-start gap-1 font-medium">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>Error: {msg.error}</span>
                      </div>
                    )}

                    {msg.conversationUrl && (
                      <a
                        href={msg.conversationUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[9px] text-linkedin-blue dark:text-blue-300 font-semibold flex items-center gap-0.5 hover:underline w-fit pt-0.5"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Open Chat Thread</span>
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
