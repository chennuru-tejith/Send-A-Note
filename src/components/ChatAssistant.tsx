import React, { useState, useEffect } from 'react';
import { Sparkles, Check, Copy, RefreshCw, AlertCircle, Send } from 'lucide-react';
import { ProfileDetails, UserPreferences, MessageTone } from '../types';
import { getPreferences } from '../services/storage';

interface ChatAssistantProps {
  profile: ProfileDetails;
  nativeTextarea: HTMLDivElement | HTMLTextAreaElement; // LinkedIn uses contenteditable div or textarea
  chatHistory: string[];
  onInsertMessage: (text: string) => void;
}

const QUICK_PROMPTS = [
  'Reply Positively',
  'Polite Reminder',
  'Follow-up',
  'Request Call',
  'Schedule Meeting',
  'Job Referral',
  'Thank You',
  'Collaboration Request',
  'Ask for Time'
];

const TONES: MessageTone[] = ['Professional', 'Friendly', 'Formal', 'Confident', 'Warm', 'Direct', 'Humble'];

export const ChatAssistant: React.FC<ChatAssistantProps> = ({
  profile,
  chatHistory,
  onInsertMessage
}) => {
  const [prefs, setPrefs] = useState<UserPreferences>({
    openAiKey: '',
    defaultTone: 'Professional',
    defaultLength: 'Medium',
    defaultPurpose: 'Networking',
    isPremium: false,
  });
  const [tone, setTone] = useState<MessageTone>('Professional');
  const [customPrompt, setCustomPrompt] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Load preferences from storage and listen for updates
  useEffect(() => {
    getPreferences().then((loadedPrefs) => {
      setPrefs(loadedPrefs);
      setTone(loadedPrefs.defaultTone);
    });

    const handleStorageChange = (changes: Record<string, chrome.storage.StorageChange>) => {
      if (changes.preferences) {
        const newPrefs = changes.preferences.newValue as UserPreferences;
        setPrefs(newPrefs);
      }
    };

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener(handleStorageChange);
    }

    return () => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
        chrome.storage.onChanged.removeListener(handleStorageChange);
      }
    };
  }, []);

  const handleGenerate = async (promptCategory: string, userText?: string) => {
    setLoading(true);
    setError('');
    setSuggestions([]);

    try {
      const reqPrefs = { ...prefs, defaultTone: tone };
      chrome.runtime.sendMessage(
        {
          action: 'GENERATE_MESSAGES',
          request: {
            type: 'chat',
            profile,
            category: promptCategory,
            customPrompt: userText || '',
            chatHistory,
            preferences: reqPrefs
          }
        },
        (response) => {
          setLoading(false);
          if (chrome.runtime.lastError) {
            setError(chrome.runtime.lastError.message || 'Failed to communicate with the background worker.');
            return;
          }
          if (response && response.success && response.suggestions) {
            setSuggestions(response.suggestions);
          } else {
            setError(response?.error || 'Failed to generate replies. Make sure your OpenAI API key is configured.');
          }
        }
      );
    } catch (err: unknown) {
      setLoading(false);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    }
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    });
  };

  return (
    <div className="bg-white dark:bg-[#1d2226] border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-3.5 my-2 w-full font-sans text-gray-800 dark:text-gray-200">
      {/* Top Banner */}
      <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-linkedin-blue animate-pulse" />
          <span className="font-semibold text-xs text-gray-900 dark:text-white">AI Reply Assistant</span>
        </div>
        
        {/* Tone Selector */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-gray-400">Tone:</span>
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value as MessageTone)}
            className="text-[10px] bg-gray-50 dark:bg-[#293138] border border-gray-200 dark:border-gray-700 rounded px-1.5 py-0.5 font-medium focus:outline-none"
          >
            {TONES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Quick Prompts Scroll Grid */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 custom-scrollbar">
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            disabled={loading}
            onClick={() => handleGenerate(prompt)}
            className="whitespace-nowrap px-2.5 py-1 text-[11px] font-medium border border-gray-200 dark:border-gray-700 rounded-full hover:border-linkedin-blue dark:hover:border-linkedin-blue hover:text-linkedin-blue transition-all bg-gray-50/50 dark:bg-[#293138]/50 disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Custom prompt search row */}
      <div className="mt-2 flex gap-1.5 items-center">
        <input
          type="text"
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          placeholder="Type custom action (e.g. invite him as guest speaker)..."
          className="flex-1 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-[#293138] px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-linkedin-blue focus:bg-white dark:focus:bg-[#1d2226]"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && customPrompt.trim() && !loading) {
              handleGenerate('Custom Action', customPrompt);
            }
          }}
        />
        <button
          onClick={() => handleGenerate('Custom Action', customPrompt)}
          disabled={loading || !customPrompt.trim()}
          className="p-1.5 bg-linkedin-blue hover:bg-linkedin-blue-hover text-white rounded-lg transition-all disabled:opacity-50"
        >
          {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="mt-2.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 p-2 rounded-lg flex gap-1.5 items-start text-[11px]">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Reply suggestions */}
      {suggestions.length > 0 && (
        <div className="mt-3 space-y-2 border-t border-gray-100 dark:border-gray-800 pt-2.5">
          <h4 className="text-[9px] font-bold tracking-wider text-gray-400 uppercase">Suggested Replies</h4>
          <div className="space-y-2">
            {suggestions.map((text, index) => (
              <div
                key={index}
                className="border border-gray-200 dark:border-gray-700 hover:border-linkedin-blue/40 rounded-lg p-2 bg-gray-50/20 dark:bg-gray-800/10 text-xs leading-relaxed"
              >
                <p className="text-gray-800 dark:text-gray-200">{text}</p>
                <div className="flex justify-end gap-1.5 mt-2 border-t border-gray-100/50 dark:border-gray-800/50 pt-1.5">
                  <button
                    onClick={() => handleCopy(text, index)}
                    className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-all text-gray-500 dark:text-gray-400"
                    title="Copy to clipboard"
                  >
                    {copiedIndex === index ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                  </button>
                  <button
                    onClick={() => onInsertMessage(text)}
                    className="px-2 py-0.5 bg-linkedin-blue hover:bg-linkedin-blue-hover text-white text-[10px] font-semibold rounded transition-all"
                  >
                    Insert
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
