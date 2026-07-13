import { OpenAiService } from '../services/openai';
import { getPreferences } from '../services/storage';
import { GenerationRequest } from '../types';

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'GENERATE_MESSAGES') {
    const request = message.request as GenerationRequest;
    
    // Load preferences from storage to get the API key
    getPreferences()
      .then((prefs) => {
        const mergedRequest = {
          ...request,
          preferences: {
            ...prefs,
            // Override with local requests if present
            openAiKey: prefs.openAiKey || request.preferences?.openAiKey || '',
          }
        };

        if (!mergedRequest.preferences.openAiKey) {
          sendResponse({ success: false, error: 'OpenAI API Key is missing. Click the extension icon in the toolbar to enter your key.' });
          return;
        }

        return OpenAiService.generateSuggestions(mergedRequest);
      })
      .then((suggestions) => {
        if (suggestions) {
          sendResponse({ success: true, suggestions });
        }
      })
      .catch((error) => {
        console.error('Background worker generation failed:', error);
        sendResponse({ success: false, error: error.message || 'Failed to generate message suggestions.' });
      });

    return true; // Keeps the message channel open for async response
  }
});
