import React, { useState, useEffect } from 'react';
import { Sparkles, Save, Key, Eye, EyeOff, Shield, Settings, Info, CheckCircle } from 'lucide-react';
import { getPreferences, savePreferences } from '../services/storage';
import { MessageTone, MessageLength, MessagePurpose, UserPreferences } from '../types';

const TONES: MessageTone[] = ['Professional', 'Friendly', 'Formal', 'Confident', 'Warm', 'Direct', 'Humble'];
const LENGTHS: MessageLength[] = ['Short', 'Medium', 'Long'];
const PURPOSES: MessagePurpose[] = ['Networking', 'Business', 'Internship', 'Mentorship', 'Recruitment', 'Sales', 'General'];

export const Popup: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [tone, setTone] = useState<MessageTone>('Professional');
  const [length, setLength] = useState<MessageLength>('Medium');
  const [purpose, setPurpose] = useState<MessagePurpose>('Networking');
  const [isPremium, setIsPremium] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load preferences on mount
  useEffect(() => {
    getPreferences().then((prefs) => {
      setApiKey(prefs.openAiKey);
      setTone(prefs.defaultTone);
      setLength(prefs.defaultLength);
      setPurpose(prefs.defaultPurpose);
      setIsPremium(prefs.isPremium);
      setLoading(false);
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(false);

    const updatedPrefs: UserPreferences = {
      openAiKey: apiKey.trim(),
      defaultTone: tone,
      defaultLength: length,
      defaultPurpose: purpose,
      isPremium
    };

    await savePreferences(updatedPrefs);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
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
    </div>
  );
};
