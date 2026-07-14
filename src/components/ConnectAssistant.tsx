import React, { useState, useEffect } from 'react';
import { Sparkles, Check, Copy, RefreshCw, AlertCircle, ChevronDown } from 'lucide-react';
import { ProfileDetails, UserPreferences, MessageTone } from '../types';
import { getPreferences } from '../services/storage';

interface ConnectAssistantProps {
  profile: ProfileDetails;
  nativeTextarea: HTMLTextAreaElement;
  onClose: () => void;
}

const CATEGORIES = [
  'Professional Networking',
  'Alumni Connection',
  'Mentorship Request',
  'Job Opportunity',
  'Founder/Investor Pitch',
  'College Senior outreach',
  'Conference/Speaker invitation',
  'Custom Prompt'
];

const TONES: MessageTone[] = ['Professional', 'Friendly', 'Formal', 'Confident', 'Warm', 'Direct', 'Humble'];

export const ConnectAssistant: React.FC<ConnectAssistantProps> = ({
  profile,
  nativeTextarea,
  onClose
}) => {
  const [prefs, setPrefs] = useState<UserPreferences>({
    openAiKey: '',
    defaultTone: 'Professional',
    defaultLength: 'Medium',
    defaultPurpose: 'Networking',
    isPremium: false,
  });
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [tone, setTone] = useState<MessageTone>('Professional');
  const [customPrompt, setCustomPrompt] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [characterLimit, setCharacterLimit] = useState(200);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [toneDropdownOpen, setToneDropdownOpen] = useState(false);

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

  // Detect character limit from native textarea
  useEffect(() => {
    if (nativeTextarea) {
      const nativeMax = nativeTextarea.getAttribute('maxlength');
      if (nativeMax) {
        setCharacterLimit(parseInt(nativeMax, 10));
      } else {
        setCharacterLimit(prefs.isPremium ? 300 : 200);
      }
    }
  }, [nativeTextarea, prefs.isPremium]);

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    setSuggestions([]);

    try {
      // Send message to background script
      const reqPrefs = { ...prefs, defaultTone: tone };
      chrome.runtime.sendMessage(
        {
          action: 'GENERATE_MESSAGES',
          request: {
            type: 'connection',
            profile,
            category,
            customPrompt: category === 'Custom Prompt' ? customPrompt : '',
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
            setError(response?.error || 'Failed to generate connection notes. Make sure your OpenAI key is saved in the extension popup.');
          }
        }
      );
    } catch (err: unknown) {
      setLoading(false);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    }
  };

  const handleInsert = (text: string) => {
    if (!nativeTextarea) return;
    
    // Set value and trigger native events so React/LinkedIn forms pick it up
    nativeTextarea.value = text;
    
    const event = new Event('input', { bubbles: true });
    nativeTextarea.dispatchEvent(event);
    
    // Trigger keydown/change just in case
    const changeEvent = new Event('change', { bubbles: true });
    nativeTextarea.dispatchEvent(changeEvent);
    
    // Auto-close overlay after successful insertion
    onClose();
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    });
  };

  return (
    <div className="bg-white dark:bg-[#1d2226] border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl p-4 w-[380px] font-sans text-gray-800 dark:text-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800 mb-3">
        <div className="flex items-center gap-2">
          <div className="bg-blue-50 dark:bg-blue-950/30 p-1.5 rounded-lg">
            <Sparkles className="w-5 h-5 text-linkedin-blue" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white">AI Smart Note Writer</h3>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">Context: {profile.name}</p>
          </div>
        </div>
        <span className="text-[10px] bg-blue-100 dark:bg-blue-950 text-linkedin-blue dark:text-blue-300 font-medium px-2 py-0.5 rounded-full">
          {characterLimit} Chars Max
        </span>
      </div>

      {/* Selectors */}
      <div className="space-y-3">
        {/* Category Selector */}
        <div className="relative">
          <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400 block mb-1">Outreach Purpose</label>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-full flex items-center justify-between bg-gray-50 dark:bg-[#293138] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-left font-medium hover:bg-gray-100 dark:hover:bg-[#343e47] transition-all"
          >
            <span>{category}</span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>
          
          {dropdownOpen && (
            <div className="absolute z-50 mt-1 w-full bg-white dark:bg-[#1d2226] border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-48 overflow-y-auto custom-scrollbar">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setCategory(cat);
                    setDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-all ${
                    category === cat ? 'text-linkedin-blue font-semibold bg-blue-50/50 dark:bg-blue-950/20' : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tone Selector */}
        <div className="relative">
          <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400 block mb-1">Tone</label>
          <button
            onClick={() => setToneDropdownOpen(!toneDropdownOpen)}
            className="w-full flex items-center justify-between bg-gray-50 dark:bg-[#293138] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-left font-medium hover:bg-gray-100 dark:hover:bg-[#343e47] transition-all"
          >
            <span>{tone}</span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>

          {toneDropdownOpen && (
            <div className="absolute z-50 mt-1 w-full bg-white dark:bg-[#1d2226] border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl">
              {TONES.map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setTone(t);
                    setToneDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-all ${
                    tone === t ? 'text-linkedin-blue font-semibold bg-blue-50/50 dark:bg-blue-950/20' : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Custom Prompt Input */}
        {category === 'Custom Prompt' && (
          <div>
            <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400 block mb-1">Describe what to write</label>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="e.g. Mention our mutual connection Rahul and request a quick chat about product roles..."
              className="w-full border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-[#293138] px-3 py-2 text-xs resize-none h-16 focus:ring-1 focus:ring-linkedin-blue focus:outline-none focus:bg-white dark:focus:bg-[#1d2226]"
            />
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={handleGenerate}
          disabled={loading || (category === 'Custom Prompt' && !customPrompt.trim())}
          className="w-full py-2 bg-linkedin-blue hover:bg-linkedin-blue-hover text-white text-xs font-semibold rounded-lg shadow flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Analyzing profile & writing...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generate AI Notes</span>
            </>
          )}
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="mt-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 p-2.5 rounded-lg flex gap-2 items-start text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Suggestions Results */}
      {suggestions.length > 0 && (
        <div className="mt-4 space-y-3 pt-3 border-t border-gray-100 dark:border-gray-800">
          <h4 className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">AI Recommendations</h4>
          <div className="space-y-3.5">
            {suggestions.map((text, index) => {
              const textLength = text.length;
              const isOverLimit = textLength > characterLimit;

              return (
                <div
                  key={index}
                  className={`border rounded-lg p-2.5 relative transition-all group ${
                    isOverLimit
                      ? 'border-red-200 dark:border-red-900 bg-red-50/10'
                      : 'border-gray-200 dark:border-gray-700 hover:border-linkedin-blue/50 dark:hover:border-linkedin-blue/30 bg-gray-50/30 dark:bg-gray-800/10'
                  }`}
                >
                  <p className="text-xs leading-relaxed text-gray-800 dark:text-gray-200 pr-2">
                    {text}
                  </p>
                  
                  {/* Card Actions */}
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100/50 dark:border-gray-800/50">
                    <span className={`text-[10px] font-medium ${isOverLimit ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                      {textLength} / {characterLimit} chars
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleCopy(text, index)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-all text-gray-500 dark:text-gray-400"
                        title="Copy to clipboard"
                      >
                        {copiedIndex === index ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      
                      <button
                        disabled={isOverLimit}
                        onClick={() => handleInsert(text)}
                        className="px-2 py-0.5 bg-linkedin-blue hover:bg-linkedin-blue-hover disabled:opacity-40 text-white text-[10px] font-semibold rounded transition-all flex items-center gap-0.5"
                      >
                        Insert
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
