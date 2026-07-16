import { UserPreferences } from '../types';

const DEFAULT_PREFERENCES: UserPreferences = {
  openAiKey: '',
  defaultTone: 'Professional',
  defaultLength: 'Medium',
  defaultPurpose: 'Networking',
  isPremium: false,
  senderProfile: '',
  senderProfileName: '',
};

export const getPreferences = (): Promise<UserPreferences> => {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['preferences'], (result) => {
        if (result.preferences) {
          resolve({ ...DEFAULT_PREFERENCES, ...result.preferences });
        } else {
          resolve(DEFAULT_PREFERENCES);
        }
      });
    } else {
      // LocalStorage fallback for web testing
      const cached = localStorage.getItem('preferences');
      if (cached) {
        try {
          resolve({ ...DEFAULT_PREFERENCES, ...JSON.parse(cached) });
        } catch {
          resolve(DEFAULT_PREFERENCES);
        }
      } else {
        resolve(DEFAULT_PREFERENCES);
      }
    }
  });
};

export const savePreferences = (prefs: UserPreferences): Promise<void> => {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ preferences: prefs }, () => {
        resolve();
      });
    } else {
      localStorage.setItem('preferences', JSON.stringify(prefs));
      resolve();
    }
  });
};
